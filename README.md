# Rippling Headcount Planning AI Prototype

An AI-powered workforce headcount planning tool that helps support teams forecast staffing needs. Built with FastAPI (backend) and React (frontend), using Claude as the conversational AI layer.

## Architecture

The system uses a strict three-layer architecture:

```
Presentation (React)  →  AI Router (Claude)  →  Computation Engine (Python)
```

- **Presentation Layer** — React frontend that provides the chat interface and displays results.
- **AI Router** — Claude interprets natural-language queries, selects the right computation tool, and formats responses. The AI never performs arithmetic — it only decides *what* to compute.
- **Computation Engine** — Deterministic Python functions that perform all math (capacity calculations, headcount gaps, utilization rates). Results are reproducible and auditable.

This separation ensures that all numerical outputs are exact and verifiable, not LLM-generated.

## Data Source

All planning data lives in CSV files under `data/`:

- `global_assumptions.csv` — working hours, shrinkage rate, utilization target
- `roster_and_handle_times.csv` — per-region agent counts and average handle times
- `projected_volume.csv` — per-region projected ticket volumes

CSVs are the single source of truth. Changing a CSV value is immediately reflected in the app without code modifications.

## Project Structure

```
backend/           FastAPI server, AI routing, computation engine, data layer
frontend/          React app (Vite)
eval/              Evaluation suite for AI response quality
traces/            Observability trace logs
data/              CSV source-of-truth files
```

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your Anthropic API key to .env
```

## Running

**Backend:**
```bash
uvicorn backend.api_server:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
