# Incident Agent V2

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-Ready-4285F4.svg)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An autonomous incident investigation and log analysis platform. Combines **Google Gemini 2.0 Flash** for natural-language root-cause reasoning, **FAISS vector RAG** for runbook retrieval, an **external custom ML inference service** on Render for failure pattern classification, and **Drain3 / Random Forest** sequence anomaly scoring.

---

## Architecture Overview

```mermaid
flowchart LR
    Logs[Application Logs] --> Controller[Agent Controller]
    Controller <--> Gemini[Google Gemini 2.0 Flash]
    Controller <--> Tools[Diagnostic Tools]
    Tools --> Git[Git History & AST]
    Tools --> RAG[FAISS Vector RAG]
    Tools --> ML[External ML Microservice\non Render]
    Tools --> Anomaly[Drain3 / RF Detector]
    Controller --> UI[React Console]
```

### Core Components

- **Reasoning Engine:** Google Gemini ReAct loop with grounded AST verification, Git forensics, and offline safe mode fallback.
- **External ML Microservice:** Independently deployed on Render (`incident-ml-service.onrender.com`) for log classification and suspect line ranking.
- **Technical Documentation RAG:** In-memory FAISS cosine similarity index (`data/rag_index`) querying system architecture and the incident catalog.
- **Target Simulation:** FastAPI sample e-commerce application with 8 reproducible incident modes (`INC-01` to `INC-08`).
- **Investigation Console:** High-density React 18 / Vite / Tailwind UI with dark/light themes, live trace streaming, and timeline replay.

---

## Quick Start

### 1. Installation

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..
```

### 2. Environment Setup

Create `.env` from `.env.example`:
```powershell
Copy-Item .env.example .env
```
Key variables:
- `GEMINI_API_KEY`: Required for Gemini natural-language reasoning.
- `ML_MODEL_API_URL`: URL of the external ML service (`https://incident-ml-service.onrender.com`).
- `API_PORT`: `8000` (Backend API).

### 3. Run Locally

Open separate terminals:

```powershell
# Terminal 1: Backend API
uvicorn api.main:app --reload --port 8000

# Terminal 2: Sample Target App
uvicorn sample_app.main:app --reload --port 8001

# Terminal 3: Frontend Console
cd frontend && npm run dev
```

Open **`http://127.0.0.1:5173`** in your browser.

### 4. Simulate Incident Traffic

Generate reproducible incident traffic against the target app:
```powershell
python -m sample_app.traffic --url http://127.0.0.1:8001 --incident INC-07
```

---

## Testing

Run the automated test suite (36 unit & integration tests):
```powershell
python -m pytest -q
```

Build the frontend for production:
```powershell
cd frontend && npm run build
```

---

## Primary API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/investigations` | `POST` | Start an autonomous incident investigation |
| `/api/investigations/{id}` | `GET` | Get status, final diagnosis report, and grounded evidence |
| `/api/investigations/{id}/stream` | `GET` | SSE stream of live agent thoughts and tool calls |
| `/api/models/status` | `GET` | Health check for Gemini, RAG index, and external ML service |
| `/api/logs` | `GET` | Tail and filter application logs |

---

## Preview

![Investigation Console](docs/screenshots/after/investigate_form_1440_dark.png)

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
