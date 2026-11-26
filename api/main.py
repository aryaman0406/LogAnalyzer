"""FastAPI server with background investigations, SSE, and SQLite history."""
from __future__ import annotations
import asyncio, csv, json, os, sqlite3, time, uuid
from contextlib import asynccontextmanager
import logging
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError
from agent.agent import Investigator
from agent.llm import LLMClient
from agent.tools import detect_anomalies
from api.hardware import detect_hardware
from api.services.ml_model_client import get_ml_model_client

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "investigations.sqlite3"
INCIDENTS = json.loads((ROOT / "sample_app" / "incidents_catalog.json").read_text(encoding="utf-8"))
logger = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_LOG_BYTES = 5 * 1024 * 1024
IMAGE_SIGNATURES = {
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/gif": lambda data: data.startswith((b"GIF87a", b"GIF89a")),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}

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
    allow_headers=["*"],
    allow_credentials=True,
)

queues: dict[str, asyncio.Queue] = {}
done: set[str] = set()
loop: asyncio.AbstractEventLoop | None = None
# Max concurrent investigation results kept in memory before evicting oldest ones
_MAX_CACHED_INVESTIGATIONS = 200

class StartRequest(BaseModel):
    incident_id: str | None = None
    log_file: str = "data/logs/sample_app.jsonl"
    log_content: str | None = None
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
class ImageDiagnosis(BaseModel):
    error_detected: bool
    summary: str
    detected_errors: list[str]
    likely_cause: str
    suggested_fix: str
    extracted_text: str
    confidence: float | None = Field(default=None, ge=0, le=1)

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS investigations(id TEXT PRIMARY KEY, incident_id TEXT, status TEXT, created_at REAL, result TEXT, trace TEXT, log_file TEXT, state TEXT)")
    return conn

@app.get("/api/incidents", response_model=list[Incident])
def list_incidents():
    return INCIDENTS

@app.post("/api/images/analyze", response_model=ImageDiagnosis)
async def analyze_error_image(request: Request):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(503, "Image analysis requires GEMINI_API_KEY.")

    mime_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    signature_check = IMAGE_SIGNATURES.get(mime_type)
    if signature_check is None:
        raise HTTPException(415, "Upload a PNG, JPEG, GIF, or WebP image.")

    image = bytearray()
    async for chunk in request.stream():
        image.extend(chunk)
        if len(image) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Images must be 10 MB or smaller.")

    if not image or not signature_check(image):
        raise HTTPException(415, "The uploaded file does not match its image type.")

    client = LLMClient(provider="gemini")
    if client.provider not in {"gemini", "google"}:
        reason = client.llm_fallback.get("reason") or "Gemini is unavailable."
        raise HTTPException(503, reason)

    try:
        response_text = client.analyze_image(bytes(image), mime_type)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc

    try:
        return ImageDiagnosis.model_validate_json(response_text)
    except ValidationError as exc:
        logger.warning("Gemini returned an invalid image diagnosis response")
        raise HTTPException(502, "Gemini returned an invalid image diagnosis response.") from exc

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
    uploaded_log: Path | None = None
    def send(event: dict):
        streamed.append(event)
        if loop: loop.call_soon_threadsafe(queue.put_nowait, event)
    with db() as conn: conn.execute("UPDATE investigations SET status='running' WHERE id=?", (ident,))
    try:
        log_file = req.log_file
        if req.log_content is not None:
            upload_dir = ROOT / "data" / "uploads"
            upload_dir.mkdir(parents=True, exist_ok=True)
            uploaded_log = upload_dir / f"{ident}.log"
            uploaded_log.write_text(req.log_content, encoding="utf-8")
            log_file = uploaded_log.relative_to(ROOT).as_posix()

        # Pass provider/model/incident_id directly to Investigator rather than
        # mutating os.environ (which is shared across all threads and would cause
        # race conditions when multiple investigations run concurrently).
        result = Investigator().investigate(
            req.incident_id or "Uploaded log incident",
            log_file=log_file,
            use_tools=req.use_tools,
            use_anomaly_detector=req.use_anomaly_detector,
            on_event=send,
            provider=req.provider,
            model=req.model,
            incident_id=req.incident_id,
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
        if uploaded_log:
            try:
                uploaded_log.unlink(missing_ok=True)
            except OSError:
                logger.exception("Unable to remove temporary uploaded log")
        done.add(ident)
        send({"type": "done", "step": -1, "timestamp": time.time(), "content": {}})
        # Evict oldest entries to prevent unbounded memory growth
        if len(done) > _MAX_CACHED_INVESTIGATIONS:
            oldest = next(iter(done))
            done.discard(oldest)
            queues.pop(oldest, None)

@app.post("/api/investigations", response_model=StartResponse, status_code=202)
@app.post("/investigations", response_model=StartResponse, status_code=202)
def start_investigation(req: StartRequest, background: BackgroundTasks):
    if req.incident_id and req.incident_id not in {i["id"] for i in INCIDENTS}: raise HTTPException(404, "unknown incident")
    if req.log_content is not None and len(req.log_content.encode("utf-8")) > MAX_LOG_BYTES:
        raise HTTPException(413, "Uploaded or pasted logs must be 5 MB or smaller.")
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
    """List implemented LLM providers and custom ML service status."""
    ml_client = get_ml_model_client()
    llm_client = LLMClient()
    gemini_ready = llm_client.provider in {"gemini", "google"}
    return {
        "providers": [
            {"id": "gemini", "name": "Google Gemini", "model": llm_client.model, "available": gemini_ready, "primary": True},
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
        "adapter_loaded": client.provider in {"gemini", "google"},
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
