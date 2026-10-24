# Incident Agent V2: Modular AI Log Analyzer with Technical RAG, Gemini Reasoning & Independent Custom ML Inference

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-Ready-4285F4.svg)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An autonomous incident investigation and log analysis platform. Incident Agent V2 decouples domain-specific machine learning inference into an independent microservice while integrating **Google Gemini 2.0 Flash** for natural-language reasoning, **FAISS vector RAG** for technical runbook retrieval, **Drain3 & Random Forest** sequence anomaly detection, and a deterministic state machine over application logs, Git commits, and source code ASTs.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph TargetApp [Incident Simulation]
        Traffic[Traffic Generator] --> App[FastAPI Sample App]
        App --> Logs[(Structured JSONL Logs)]
        GitRepo[(Git History)]
        SrcCode[(Source Code AST)]
    end

    subgraph MainApp [Main Platform: Incident Agent V2]
        Controller[Agent Controller / ReAct Loop]
        State[Investigation State Machine]
        Controller <--> State

        subgraph ReasoningEngine [Primary Reasoning Engine]
            Gemini[Google Gemini 2.0 Flash<br/>google.genai SDK]
            DiagMode[Diagnostic Safe Mode<br/>Offline Fallback]
        end
        Controller <--> Gemini

        subgraph Tools [Allowlisted Diagnostic Tools]
            ToolLogs[Log Search & Stats<br/>read_logs, grep_logs, log_stats]
            ToolGit[Git Forensics<br/>git_log, git_diff]
            ToolCode[Source Inspection<br/>search_code, read_file]
            ToolRAG[Technical RAG<br/>search_docs via FAISS]
            ToolAnomaly[Sequence Anomaly Detector<br/>detect_anomalies via Drain3/RF]
            ToolExtML[External ML Client<br/>predict_custom_ml via HTTP]
        end
        Controller --> Tools
    end

    subgraph ExternalService [Independent Custom ML Service (Render)]
        MLService[FastAPI ML Inference Service<br/>POST /predict | GET /health]
        CustomWeights[(Trained Custom ML Model)]
        MLService --> CustomWeights
    end

    Logs --> ToolLogs
    GitRepo --> ToolGit
    SrcCode --> ToolCode
    RAGIndex[(FAISS Vector Index)] --> ToolRAG
    DrainModel[(Drain3 / RF Model)] --> ToolAnomaly
    ToolExtML <-->|REST API + Retries| MLService

    Tools --> Evidence[(Grounded Evidence Accumulator)]
    Evidence --> Report[Final Verified Root-Cause Diagnosis]
    Report --> UI[Interactive React / Vite Console]
```

---

## 2. Service Separation & Responsibilities

The system is decoupled into two independent, modular services:

| Component | Repository Location | Hosting / Deployment | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Main Platform** | Root (`api/`, `agent/`, `frontend/`) | Local / Render / Docker | Log ingestion, AST inspections, Git commit forensics, FAISS runbook RAG, state tracking, and Gemini generative diagnosis. |
| **Custom ML Service** | `ml_service/` | Independent Web Service (Render) | Log classification, candidate affected file/function prediction, sequence pattern inference. |

### How RAG, Gemini, and the Custom Model Cooperate

1. **Log Preprocessing:** The user or pipeline submits structured application logs. Sensitive tokens (passwords, auth headers, api keys) are automatically redacted.
2. **Custom Model Signals:** The agent queries `predict_custom_ml`. The external model returns candidate failure categories, confidence, and suspected files. **Gemini treats these predictions as hypotheses to verify, never as final proof.**
3. **Local Sequence Anomaly Scoring:** Retained in-process Drain3 and Random Forest classifiers score session frequency deviation against baseline traffic.
4. **Technical Documentation RAG:** The agent queries `search_docs`, retrieving relevant runbooks and architectural catalog entries using FAISS cosine similarity.
5. **Grounded Source & Git Verification:** The agent queries `git_log`, `git_diff`, `read_file`, and `search_code` to confirm that candidate files and functions actually exist in the repository.
6. **Gemini Synthesis:** Google Gemini correlates the accumulated evidence, eliminates unsupported hypotheses, and emits a validated JSON diagnostic report.
7. **Graceful Degraded Mode:** If the external ML service is unreachable or unconfigured, the agent automatically continues using native log diagnostics, AST analysis, RAG, and Gemini without interruption.

---

## 3. External Custom ML Model API Contract

The external service exposes a versioned, stateless REST API:

### `GET /health`
Returns service availability, model version, and uptime.

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "service": "custom-log-ml",
  "model_version": "1.0.0",
  "uptime_seconds": 1284.5
}
```

### `POST /predict` (Alias: `POST /api/v1/predict`)
Accepts structured log entries and precomputed features, returning model predictions.

**Request (`application/json`):**
```json
{
  "incident_id": "INC-07",
  "log_entries": [
    {
      "timestamp": "2026-10-23T23:18:00Z",
      "level": "ERROR",
      "message": "IndexError: list index out of range in paginate",
      "source": "sample_app.incidents"
    }
  ],
  "features": {
    "error_rate": 0.45,
    "total_logs": 100
  }
}
```

**Response (`200 OK`):**
```json
{
  "model_version": "1.0.0",
  "predicted_category": "pagination_boundary_error",
  "confidence": 0.94,
  "suspected_files": [
    "sample_app/incidents.py"
  ],
  "suspected_functions": [
    "paginate"
  ],
  "severity": "high",
  "anomaly_score": 0.88,
  "features_extracted": {
    "total_logs": 100,
    "error_count": 45,
    "error_rate": 0.45
  }
}
```

### Authentication & Error Handling
- **Bearer Token Auth:** If `ML_SERVICE_API_KEY` is configured, requests must include `Authorization: Bearer <token>`.
- **Transient Retries:** The main backend client (`api/services/ml_model_client.py`) automatically retries transient server errors (`502`, `503`, `504`, `ConnectionError`) up to 2 times with exponential backoff.
- **Client Errors:** Client errors (`4xx`) fail immediately without useless retries.
- **Privacy Safeguard:** Error logs never output raw secrets, API tokens, or unredacted production logs.

---

## 4. Deploying the Custom ML Service to Render

The `ml_service/` folder contains a standalone, production-ready containerized service:

1. **Push to Git Repository:**
   Push your codebase or the `ml_service/` folder to GitHub or GitLab.
2. **Create New Web Service on Render:**
   - Go to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
   - Connect your repository.
   - Set **Root Directory** to `ml_service` (or point Dockerfile Path to `ml_service/Dockerfile`).
   - Select **Docker** environment.
   - Choose your instance type (Free or Starter).
3. **Configure Environment Variables on Render:**
   - `PORT=8002`
   - `ML_SERVICE_API_KEY` (optional token for securing the endpoint)
4. **Deploy & Copy URL:**
   Once deployed, copy your Render URL (e.g., `https://custom-log-ml.onrender.com`).
5. **Connect to Main Application:**
   In your root `.env` file, set:
   ```env
   ML_MODEL_API_URL=https://custom-log-ml.onrender.com
   ML_MODEL_API_KEY=your_optional_token_here
   ```

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *None* | Required for Google Gemini 2.0 Flash reasoning |
| `LLM_PROVIDER` | `gemini` | Primary LLM provider (`gemini`, `openai`, `anthropic`, `local`) |
| `ML_MODEL_API_URL` | *None* | External Custom ML service URL (leave blank for degraded mode) |
| `ML_MODEL_API_KEY` | *None* | Bearer token for authenticating with external model service |
| `ML_MODEL_TIMEOUT` | `5.0` | Timeout in seconds for external model calls |
| `RAG_INDEX_DIR` | `data/rag_index` | FAISS documentation index directory |
| `ANOMALY_MODEL_PATH` | `ml/models/hdfs_rf.joblib` | Trained Random Forest anomaly detector path |

---

## 6. Quick Start & Local Execution

### 1. Setup Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 2. Build Documentation RAG Index
```powershell
python -c "from agent.rag import get_rag_pipeline; n = get_rag_pipeline().build_index(); print(f'Indexed {n} documentation chunks.')"
```

### 3. Run Automated Test Suite
```powershell
python -m pytest -q
```

---

## 7. End-to-End Execution Workflow

### Terminal 1: Start Main Backend API
```powershell
uvicorn api.main:app --reload --port 8000
```

### Terminal 2: Start Sample E-Commerce Target App
```powershell
uvicorn sample_app.main:app --reload --port 8001
```

### Terminal 3: (Optional) Run Independent ML Service Locally
```powershell
uvicorn ml_service.main:app --reload --port 8002
```

### Terminal 4: Simulate Incident Traffic
```powershell
python -m sample_app.traffic --url http://127.0.0.1:8001 --incident INC-07
```

### Terminal 5: Launch React Frontend Console
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser to investigate incidents, review live reasoning traces, and inspect grounded citations.

---

## 8. Attribution & Licensing

- **HDFS Dataset:** Log analysis benchmarks adapt data from [LogHub](https://github.com/logpai/loghub) ([HDFS 2k log dataset](https://github.com/logpai/loghub/tree/master/HDFS)).
- **Drain3:** Online log template mining powered by [Drain3](https://github.com/logpai/Drain3) by LogPAI.
- **License:** Distributed under the MIT License. See [LICENSE](LICENSE) for details.
