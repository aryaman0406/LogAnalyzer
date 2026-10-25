"""FastAPI server with background investigations, SSE, and SQLite history."""
from __future__ import annotations
import asyncio, csv, json, os, sqlite3, time, uuid
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.agent import Investigator
from agent.llm import LLMClient
from agent.tools import detect_anomalies
from api.hardware import detect_hardware
from api.services.ml_model_client import get_ml_model_client

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "investigations.sqlite3"
INCIDENTS = json.loads((ROOT / "sample_app" / "incidents_catalog.json").read_text(encoding="utf-8"))

@asynccontextmanager
async def lifespan(_: FastAPI):
    global loop
    loop = asyncio.get_running_loop()
    with db(): pass
    # Background warm_up for ML model client without blocking or failing startup
    async def _safe_warmup():
        try:
            await get_ml_model_client().warm_up()
        except Exception:
            pass
    asyncio.create_task(_safe_warmup())
    yield

app = FastAPI(title="Incident Agent API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

queues: dict[str, asyncio.Queue] = {}
done: set[str] = set()
loop: asyncio.AbstractEventLoop | None = None

class StartRequest(BaseModel):
    incident_id: str | None = None
    log_file: str = "data/logs/sample_app.jsonl"
    use_anomaly_detector: bool = True
    use_tools: bool = True
    provider: str | None = None
    model: str | None = None

class StartResponse(BaseModel): investigation_id: str
class ApprovalRequest(BaseModel): approved: bool
class Incident(BaseModel): id: str; title: str; description: str
class LogLine(BaseModel): line_number: int; timestamp: str; level: str; message: str; cited: bool = False
class LogsResponse(BaseModel): rows: list[LogLine]; total: int
class SourceFile(BaseModel): path: str; start_line: int; lines: list[str]
class AnomalyPredictRequest(BaseModel): log_file: str = "data/logs/sample_app.jsonl"

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS investigations(id TEXT PRIMARY KEY, incident_id TEXT, status TEXT, created_at REAL, result TEXT, trace TEXT, log_file TEXT, state TEXT)")
    return conn

@app.get("/api/incidents", response_model=list[Incident])
def list_incidents():
    return INCIDENTS

@app.get("/api/logs", response_model=LogsResponse)
def list_logs(level: str = "", q: str = "", offset: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=1000)):
    path = ROOT / "data" / "logs" / "sample_app.jsonl"
    if not path.exists(): return {"rows": [], "total": 0}
    rows = []; total = 0
    with path.open(encoding="utf-8", errors="replace") as stream:
        for number, line in enumerate(stream, 1):
            try: item = json.loads(line)
            except json.JSONDecodeError: item = {"timestamp": "", "level": "UNKNOWN", "message": line.rstrip("\n")}
            if level and item.get("level", "").upper() != level.upper(): continue
            if q and q.casefold() not in line.casefold(): continue
            if offset <= total < offset + limit:
                rows.append({"line_number": number, "timestamp": item.get("timestamp", ""), "level": item.get("level", "UNKNOWN"), "message": item.get("message", line.rstrip("\n"))})
            total += 1
    return {"rows": rows, "total": total}

@app.get("/api/files", response_model=SourceFile)
def source_file(path: str, start_line: int = Query(1, ge=1)):
    target = (ROOT / path).resolve()
    if target != ROOT and ROOT not in target.parents: raise HTTPException(400, "path is outside repository")
    if not target.is_file(): raise HTTPException(404, "file not found")
    lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"path": str(target.relative_to(ROOT)), "start_line": start_line, "lines": [f"{n}: {lines[n-1]}" for n in range(start_line, min(len(lines), start_line+199)+1)]}

# ── Investigation Lifecycle Endpoints ────────────────────────────────────────

def _run_investigation(ident: str, req: StartRequest) -> None:
    queue = queues[ident]
    streamed = []
    def send(event: dict):
        streamed.append(event)
        if loop: loop.call_soon_threadsafe(queue.put_nowait, event)
    with db() as conn: conn.execute("UPDATE investigations SET status='running' WHERE id=?", (ident,))
    try:
        if req.incident_id:
            os.environ["ACTIVE_INCIDENT"] = req.incident_id
        if req.provider:
            os.environ["LLM_PROVIDER"] = req.provider
        if req.model:
            os.environ["LLM_MODEL"] = req.model

        result = Investigator().investigate(
            req.incident_id or "Uploaded log incident",
            log_file=req.log_file,
            use_tools=req.use_tools,
            use_anomaly_detector=req.use_anomaly_detector,
            on_event=send
        )
        state_json = json.dumps(result.get("state", {}))
        with db() as conn:
            conn.execute("UPDATE investigations SET status='complete', result=?, trace=?, state=? WHERE id=?",
                         (json.dumps(result["result"]), json.dumps(result["trace"]), state_json, ident))
    except Exception as exc:
        if not any(e.get("type") == "error" and e.get("content", {}).get("message") == str(exc) for e in streamed):
            event = {"type": "error", "step": 0, "timestamp": time.time(), "content": {"message": str(exc)}}
            send(event)
        with db() as conn:
            conn.execute("UPDATE investigations SET status='error', result=?, trace=? WHERE id=?",
                         (json.dumps({"error": str(exc)}), json.dumps(streamed), ident))
    finally:
        done.add(ident)
        send({"type": "done", "step": -1, "timestamp": time.time(), "content": {}})

@app.post("/api/investigations", response_model=StartResponse, status_code=202)
@app.post("/investigations", response_model=StartResponse, status_code=202)
def start_investigation(req: StartRequest, background: BackgroundTasks):
    if req.incident_id and req.incident_id not in {i["id"] for i in INCIDENTS}: raise HTTPException(404, "unknown incident")
    ident = str(uuid.uuid4())
    queues[ident] = asyncio.Queue()
    with db() as conn:
        conn.execute("INSERT INTO investigations(id, incident_id, status, created_at, log_file) VALUES(?,?,?,?,?)",
                     (ident, req.incident_id, "queued", time.time(), req.log_file))
    background.add_task(_run_investigation, ident, req)
    return {"investigation_id": ident}

@app.get("/api/investigations/{ident}/stream")
@app.get("/investigations/{ident}/stream")
async def stream(ident: str):
    if ident not in queues: raise HTTPException(404, "investigation not found")
    async def events():
        queue = queues[ident]
        while True:
            try: event = await asyncio.wait_for(queue.get(), timeout=15)
            except asyncio.TimeoutError:
                if ident in done: break
                yield ": keepalive\n\n"; continue
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] == "done": break
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/api/investigations/{ident}")
@app.get("/investigations/{ident}")
def get_investigation(ident: str):
    with db() as conn: row = conn.execute("SELECT * FROM investigations WHERE id=?", (ident,)).fetchone()
    if not row: raise HTTPException(404, "investigation not found")
    d = dict(row)
    return {
        **d,
        "result": json.loads(d["result"]) if d["result"] else None,
        "trace": json.loads(d["trace"]) if d["trace"] else [],
        "state": json.loads(d.get("state") or "{}") if d.get("state") else {}
    }

@app.get("/api/investigations/{ident}/trace")
@app.get("/investigations/{ident}/trace")
def get_investigation_trace(ident: str):
    inv = get_investigation(ident)
    return {"investigation_id": ident, "trace": inv["trace"]}

@app.get("/api/investigations")
@app.get("/investigations")
def history():
    with db() as conn: rows = conn.execute("SELECT id, incident_id, status, created_at, result FROM investigations ORDER BY created_at DESC LIMIT 200").fetchall()
    return [{**dict(r), "result": json.loads(r["result"]) if r["result"] else None} for r in rows]

@app.post("/api/investigations/{ident}/patch/preview")
def patch_preview(ident: str):
    report = get_investigation(ident)["result"]
    if not report or "suggested_fix" not in report: raise HTTPException(409, "no suggested fix is available")
    return {"diff": "", "suggested_fix": report["suggested_fix"], "message": "No patch was generated; review the suggested fix before implementing."}

@app.post("/api/investigations/{ident}/patch/apply")
def patch_apply(ident: str, approval: ApprovalRequest):
    if not approval.approved: raise HTTPException(403, "explicit approval is required")
    raise HTTPException(501, "Patch application is not implemented; source remains unchanged")

# ── V2 Models & Anomaly Endpoints ────────────────────────────────────────────

@app.get("/api/models")
@app.get("/models")
def list_models():
    """List available LLM providers, Gemini primary engine, and custom ML service status."""
    ml_client = get_ml_model_client()
    return {
        "providers": [
            {"id": "gemini", "name": "Google Gemini (Recommended)", "model": "gemini-2.0-flash", "available": bool(os.getenv("GEMINI_API_KEY")), "primary": True},
            {"id": "openai", "name": "OpenAI", "model": "gpt-4o-mini", "available": bool(os.getenv("OPENAI_API_KEY"))},
            {"id": "anthropic", "name": "Anthropic", "model": "claude-3-5-haiku-latest", "available": bool(os.getenv("ANTHROPIC_API_KEY"))},
            {"id": "local", "name": "Diagnostic Engine (Offline)", "model": "diagnostic-engine", "available": True, "adapter_ready": True}
        ],
        "external_ml_service": {
            "configured": ml_client.is_configured,
            "base_url": ml_client.base_url or "NOT_CONFIGURED (set ML_MODEL_API_URL)"
        }
    }

@app.get("/api/models/ml-service/status")
def ml_service_status():
    """Check health and connectivity of the external Custom ML Model service."""
    return get_ml_model_client().check_health()

@app.get("/api/models/status")
@app.get("/models/status")
def models_status():
    """Return active provider, external ML service status, and hardware diagnostics."""
    client = LLMClient()
    hw = detect_hardware()
    ml_client = get_ml_model_client()
    ml_health = ml_client.check_health()

    from ml.predict import MODEL as ANOMALY_MODEL
    anomaly_available = ANOMALY_MODEL.exists()

    rag_index_path = ROOT / "data" / "rag_index" / "chunks_metadata.json"
    rag_ready = rag_index_path.is_file()

    return {
        "active_provider": client.provider,
        "active_model": client.model,
        "adapter_loaded": False,
        "status": "ready",
        "hardware": hw,
        "anomaly_detector": {
            "available": anomaly_available,
            "status": "READY" if anomaly_available else "UNAVAILABLE",
            "model_path": "ml/models/hdfs_rf.joblib"
        },
        "rag": {
            "available": rag_ready,
            "status": "READY" if rag_ready else "UNAVAILABLE",
            "index_path": "data/rag_index/chunks_metadata.json"
        },
        "external_ml_service": {
            "configured": ml_client.is_configured,
            "available": ml_health.get("available", False),
            "status": ml_health.get("status", "NOT_CONFIGURED"),
            "base_url": ml_client.base_url or "UNCONFIGURED"
        }
    }

@app.post("/api/models/anomaly/predict")
@app.post("/models/anomaly/predict")
def predict_anomaly(req: AnomalyPredictRequest):
    """Run anomaly detector inference on a log file."""
    output = detect_anomalies(req.log_file)
    return json.loads(output)

@app.get("/api/eval/results")
@app.get("/api/evaluation")
@app.get("/evaluation")
def eval_results():
    csv_path = ROOT / "experiments" / "results.csv"
    if not csv_path.exists():
        csv_path = ROOT / "eval" / "results.csv"
    llm_eval_path = ROOT / "ml" / "results" / "llm_evaluation.json"

    rows = []
    if csv_path.exists():
        with csv_path.open(encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))

    llm_metrics = None
    if llm_eval_path.exists():
        try:
            llm_metrics = json.loads(llm_eval_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    return {
        "available": bool(rows or llm_metrics),
        "rows": rows,
        "llm_evaluation": llm_metrics
    }

@app.get("/api/model/metrics")
def model_metrics():
    path = ROOT / "ml" / "results" / "metrics.json"
    models = json.loads(path.read_text()) if path.exists() else []
    return {"available": bool(models), "models": models}
