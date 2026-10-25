"""Validated, bounded, read-only-by-default investigation tools."""
from __future__ import annotations
import json, os, re, shlex, subprocess
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MAX_CHARS = 3000

# Directories and files excluded from code search to keep response times fast and focus on real source
EXCLUDED_DIR_NAMES = {
    ".git", ".venv", "venv", "node_modules", "__pycache__",
    "dist", "build", ".pytest_cache", "data"
}

# Non-source and binary extensions to skip in search_code
BINARY_OR_LARGE_EXTENSIONS = {
    ".joblib", ".bin", ".pt", ".pth", ".npy", ".npz", ".exe", ".dll", ".so",
    ".dylib", ".wasm", ".sqlite3", ".db", ".zip", ".tar", ".gz", ".png",
    ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf"
}

def _is_binary_or_large(path: Path) -> bool:
    """Return True if the file exceeds 1 MB or contains binary data."""
    try:
        if path.stat().st_size > 1_000_000:
            return True
        if path.suffix.lower() in BINARY_OR_LARGE_EXTENSIONS:
            return True
        with path.open("rb") as f:
            chunk = f.read(1024)
            if b"\x00" in chunk:
                return True
    except OSError:
        return True
    return False

# Execution context for investigation-level caching (e.g. precomputed ML result)
# Uses contextvars.ContextVar so concurrent investigations in different async tasks / threads remain isolated
import contextvars
_CURRENT_ML_RESULT: contextvars.ContextVar[Any | None] = contextvars.ContextVar("_CURRENT_ML_RESULT", default=None)

def set_current_ml_result(ml_result: Any | None) -> contextvars.Token:
    """Store the precomputed MlResult in the current context."""
    return _CURRENT_ML_RESULT.set(ml_result)

def get_current_ml_result() -> Any | None:
    """Retrieve the precomputed MlResult for the current context."""
    return _CURRENT_ML_RESULT.get()

TOOL_SCHEMAS = [
 {"type":"function","function":{"name":"read_logs","description":"Read bounded structured log lines with optional filters.","parameters":{"type":"object","properties":{"file":{"type":"string"},"start_time":{"type":"string"},"end_time":{"type":"string"},"level":{"type":"string"},"limit":{"type":"integer"}},"required":["file"]}}},
 {"type":"function","function":{"name":"grep_logs","description":"Search log text and include nearby context.","parameters":{"type":"object","properties":{"file":{"type":"string"},"pattern":{"type":"string"},"context_lines":{"type":"integer"}},"required":["file","pattern"]}}},
 {"type":"function","function":{"name":"log_stats","description":"Count log severity by fixed time bucket.","parameters":{"type":"object","properties":{"file":{"type":"string"},"bucket_minutes":{"type":"integer"}},"required":["file"]}}},
 {"type":"function","function":{"name":"search_code","description":"Search repository source with line numbers.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
 {"type":"function","function":{"name":"read_file","description":"Read a repository file by line range.","parameters":{"type":"object","properties":{"path":{"type":"string"},"start_line":{"type":"integer"},"end_line":{"type":"integer"}},"required":["path"]}}},
 {"type":"function","function":{"name":"git_log","description":"Read repository history.","parameters":{"type":"object","properties":{"since":{"type":"string"},"until":{"type":"string"},"path":{"type":"string"}}}}},
 {"type":"function","function":{"name":"git_diff","description":"Read the patch introduced by a commit.","parameters":{"type":"object","properties":{"commit":{"type":"string"}},"required":["commit"]}}},
 {"type":"function","function":{"name":"search_docs","description":"Search local project documentation.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
 {"type":"function","function":{"name":"detect_anomalies","description":"Score sessions with the trained local detector if available.","parameters":{"type":"object","properties":{"log_file":{"type":"string"}},"required":["log_file"]}}},
 {"type":"function","function":{"name":"predict_custom_ml","description":"Query independent external Custom ML model service for incident classification and candidate affected files.","parameters":{"type":"object","properties":{"log_file":{"type":"string"},"incident_id":{"type":"string"}},"required":["log_file"]}}},
 {"type":"function","function":{"name":"run_command","description":"Run a constrained local diagnostic command (python -m, pytest, cat).","parameters":{"type":"object","properties":{"cmd":{"type":"string"}},"required":["cmd"]}}}
]

def _path(value: str) -> Path:
    path = (ROOT / value).resolve()
    if path != ROOT and ROOT not in path.parents:
        raise ValueError("path is outside repository")
    if not path.is_file(): raise ValueError("file does not exist")
    return path

def _clip(text: str) -> str:
    return text if len(text) <= MAX_CHARS else text[:MAX_CHARS] + "\n...[truncated]"

def read_logs(file: str, start_time: str = "", end_time: str = "", level: str = "", limit: int = 100) -> str:
    path = _path(file); limit = max(1, min(int(limit), 500))
    rows=[]
    with path.open(encoding="utf-8",errors="replace") as stream:
        for line in stream:
            try: row=json.loads(line)
            except json.JSONDecodeError: row={"timestamp":"","level":"","message":line.rstrip("\n")}
            if level and row.get("level","").upper()!=level.upper(): continue
            ts=row.get("timestamp","")
            if start_time and ts < start_time: continue
            if end_time and ts > end_time: continue
            rows.append(row)
            if len(rows)>=limit: break
    return _clip("\n".join(json.dumps(r,ensure_ascii=False) for r in rows))

def grep_logs(file: str, pattern: str, context_lines: int = 2) -> str:
    lines=_path(file).read_text(encoding="utf-8",errors="replace").splitlines(); context=max(0,min(int(context_lines),10)); out=[]
    rx=re.compile(pattern,re.I)
    for i,line in enumerate(lines):
        if rx.search(line): out.extend(f"{j+1}: {lines[j]}" for j in range(max(0,i-context),min(len(lines),i+context+1)))
    return _clip("\n".join(dict.fromkeys(out)) or "No matches")

def log_stats(file: str, bucket_minutes: int = 5) -> str:
    width=max(1,min(int(bucket_minutes),1440))*60; buckets=defaultdict(Counter)
    with _path(file).open(encoding="utf-8",errors="replace") as stream:
        for line in stream:
            try: row=json.loads(line); stamp=datetime.fromisoformat(row["timestamp"])
            except (ValueError,KeyError,TypeError): continue
            epoch=int(stamp.timestamp()); key=datetime.fromtimestamp(epoch-epoch%width).isoformat(timespec="minutes")
            buckets[key][row.get("level","UNKNOWN").upper()]+=1
    return _clip(json.dumps({k:dict(v) for k,v in sorted(buckets.items())},indent=2))

def search_code(query: str) -> str:
    terms = query.casefold().split()
    hits = []
    for root, dirs, files in os.walk(ROOT):
        # Prune excluded directories in-place so os.walk does not descend into them
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIR_NAMES]
        for file in files:
            p = Path(root) / file
            if _is_binary_or_large(p):
                continue
            try:
                lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
            except (UnicodeDecodeError, OSError):
                continue
            for n, line in enumerate(lines, 1):
                if all(t in line.casefold() for t in terms):
                    hits.append(f"{p.relative_to(ROOT)}:{n}: {line.strip()}")
                if len(hits) >= 50:
                    return _clip("\n".join(hits))
    return _clip("\n".join(hits) or "No matches")

def read_file(path: str, start_line: int = 1, end_line: int = 100) -> str:
    lines=_path(path).read_text(encoding="utf-8",errors="replace").splitlines(); start=max(1,int(start_line)); end=min(len(lines),max(start,int(end_line)),start+199)
    return _clip("\n".join(f"{i}: {lines[i-1]}" for i in range(start,end+1)))

def git_log(since: str = "", until: str = "", path: str = "") -> str:
    # If the currently investigated log is an external log (e.g. real_log_1.txt or outside sample_app),
    # repo commits are completely unrelated to the external project incident.
    active_inc = os.getenv("ACTIVE_INCIDENT", "")
    # Check if the log is external (e.g. Travis CI real_log or not matching local codebase)
    if not active_inc and not path:
        # Check if caller specified a specific repo path
        pass
    args=["git","log","--date=iso","--pretty=format:%h %ad %s","-n","40"]
    if since: args += [f"--since={since}"]
    if until: args += [f"--until={until}"]
    if path: args += ["--",str(Path(path))]
    result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,timeout=5,check=False)
    return _clip(result.stdout or result.stderr)

def git_diff(commit: str) -> str:
    if not re.fullmatch(r"[0-9a-fA-F]{4,40}",commit): raise ValueError("commit must be a hexadecimal Git object ID")
    result=subprocess.run(["git","show","--format=fuller","--no-ext-diff","--",commit],cwd=ROOT,capture_output=True,text=True,timeout=5)
    if result.returncode: result=subprocess.run(["git","show","--format=fuller","--no-ext-diff",commit],cwd=ROOT,capture_output=True,text=True,timeout=5)
    return _clip(result.stdout or result.stderr)

def search_docs(query: str) -> str:
    try:
        from agent.rag import search_documentation
        rag_hits = search_documentation(query, top_k=3)
        if rag_hits and "No relevant" not in rag_hits:
            return _clip(rag_hits)
    except Exception:
        pass
    docs=[]
    for base in (ROOT/"data"/"docs",ROOT):
        for p in base.rglob("*.md"):
            if any(ignored in p.parts for ignored in (".git", "node_modules", ".venv", "dist", "__pycache__")):
                continue
            try: docs.append((p,p.read_text(encoding="utf-8")))
            except OSError: pass
    terms=query.casefold().split(); scored=[]
    for p,text in docs:
        score=sum(text.casefold().count(t) for t in terms)
        if score: scored.append((score,p,text))
    return _clip("\n\n".join(f"## {p.relative_to(ROOT)}\n{text[:900]}" for _,p,text in sorted(scored,key=lambda item:item[0],reverse=True)[:3]) or "No local documentation matches")

def detect_anomalies(log_file: str) -> str:
    from ml.predict import predict_file, MODEL
    if not MODEL.exists():
        return _clip(json.dumps({
            "available": False,
            "anomalous": False,
            "score": 0.0,
            "model": "none",
            "events": [],
            "explanation": "No trained anomaly detector model found at ml/models/hdfs_rf.joblib."
        }, indent=2))
    try:
        raw_text = _path(log_file).read_text(encoding="utf-8", errors="replace")
        import re
        has_hdfs_blocks = bool(re.search(r"blk_-?\d+", raw_text))
        if not has_hdfs_blocks:
            return _clip(json.dumps({
                "available": True,
                "applicable": False,
                "anomalous": False,
                "score": 0.0,
                "model": "random_forest",
                "trained_on": "HDFS log block sessions (LogHub dataset)",
                "events": [],
                "explanation": "Not applicable: The local anomaly detector was trained on HDFS log block sessions. The analysed log does not contain HDFS block identifiers (e.g. Travis CI or web app log)."
            }, indent=2))

        scored = predict_file(_path(log_file))
        if not scored:
            return _clip(json.dumps({
                "available": True,
                "applicable": True,
                "anomalous": False,
                "score": 0.0,
                "model": "random_forest",
                "trained_on": "HDFS log block sessions (LogHub dataset)",
                "events": [],
                "explanation": "No valid log sessions parsed to score."
            }, indent=2))
        max_score = max((s.get("score", 0.0) for s in scored), default=0.0)
        anomalous = any(s.get("is_anomalous", False) for s in scored)
        return _clip(json.dumps({
            "available": True,
            "applicable": True,
            "anomalous": anomalous,
            "score": round(float(max_score), 3),
            "model": "random_forest",
            "trained_on": "HDFS log block sessions (LogHub dataset)",
            "events": scored[:5],
            "explanation": f"Evaluated {len(scored)} session(s); {sum(1 for s in scored if s.get('is_anomalous'))} anomalous flagged."
        }, indent=2))
    except Exception as exc:
        return _clip(json.dumps({
            "available": False,
            "anomalous": False,
            "score": 0.0,
            "model": "error",
            "events": [],
            "explanation": f"Inference error: {str(exc)}"
        }, indent=2))

def predict_custom_ml(log_file: str, incident_id: str = "", ml_result: Any | None = None) -> str:
    """Invoke or retrieve external Custom ML Model service predictions for the incident."""
    cached = ml_result if ml_result is not None else get_current_ml_result()
    if cached is not None:
        # Reuse precomputed ML model result from investigation initialization
        return _clip(json.dumps({
            "available": cached.available,
            "degraded": not cached.available,
            "model_version": cached.model_version,
            "predicted_category": "ranked_log_lines",
            "top_lines": cached.top_lines,
            "warnings": cached.warnings,
            "reason": cached.reason
        }, indent=2))

    try:
        from api.services.ml_model_client import get_ml_model_client
        client = get_ml_model_client()
        if not client.is_configured:
            return _clip(json.dumps({
                "available": False,
                "degraded": True,
                "predicted_category": "unavailable",
                "confidence": 0.0,
                "explanation": "External ML Model service is not configured (ML_MODEL_API_URL is unset). Continuing in native diagnostics mode."
            }, indent=2))

        path = _path(log_file)
        log_text = ""
        try:
            log_text = path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass

        import asyncio
        try:
            running_loop = asyncio.get_running_loop()
        except RuntimeError:
            running_loop = None

        if running_loop and running_loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                res = pool.submit(lambda: asyncio.run(client.predict(log_text, top_k=10))).result()
        else:
            res = asyncio.run(client.predict(log_text, top_k=10))

        return _clip(json.dumps({
            "available": res.available,
            "degraded": not res.available,
            "model_version": res.model_version,
            "predicted_category": "ranked_log_lines",
            "top_lines": res.top_lines,
            "warnings": res.warnings,
            "reason": res.reason
        }, indent=2))
    except Exception as exc:
        return _clip(json.dumps({
            "available": False,
            "degraded": True,
            "explanation": f"ML model client error: {type(exc).__name__}"
        }, indent=2))

def run_command(cmd: str) -> str:
    try: parts=shlex.split(cmd)
    except ValueError as exc: raise ValueError("invalid command") from exc
    if not parts or len(parts)>12: raise ValueError("command is empty or too long")
    allowed=(parts[0]=="pytest" and all(not p.startswith("-") or p in {"-q","-x","--collect-only"} for p in parts[1:])) or (parts[0]=="cat" and len(parts)==2) or (parts[:2]==["python","-m"] and len(parts)>=3 and parts[2] in {"pytest","compileall"})
    if not allowed: raise ValueError("command not allowlisted")
    if parts[0]=="cat":
        return read_file(parts[1])
    result=subprocess.run(parts,cwd=ROOT,capture_output=True,text=True,timeout=15,check=False)
    return _clip(f"exit={result.returncode}\n{result.stdout}\n{result.stderr}")

TOOL_FUNCTIONS = {f.__name__: f for f in (read_logs,grep_logs,log_stats,search_code,read_file,git_log,git_diff,search_docs,detect_anomalies,predict_custom_ml,run_command)}

def execute_tool(name: str, arguments: dict[str, Any], ml_result: Any | None = None) -> str:
    """Dispatch an allowlisted tool with bounded serialized output."""
    if name not in TOOL_FUNCTIONS: raise ValueError(f"unknown tool: {name}")
    try:
        if name == "predict_custom_ml":
            args = dict(arguments)
            if ml_result is not None and "ml_result" not in args:
                args["ml_result"] = ml_result
            return _clip(str(TOOL_FUNCTIONS[name](**args)))
        return _clip(str(TOOL_FUNCTIONS[name](**arguments)))
    except Exception as exc: return _clip(json.dumps({"error":type(exc).__name__,"detail":str(exc)}))
