import os
import uuid
from collections import OrderedDict
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from backend.ai_router import HeadcountAgent
from backend.data_store import get_region_data, get_global_assumptions, get_all_regions
from backend.computation_engine import calculate_max_capacity, calculate_utilization, calculate_required_headcount, calculate_capacity_from_headcount

app = FastAPI(title="Rippling Headcount Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_SESSIONS = 100
_sessions: OrderedDict[str, HeadcountAgent] = OrderedDict()


def _get_or_create_agent(session_id: str) -> HeadcountAgent:
    if session_id in _sessions:
        _sessions.move_to_end(session_id)
        return _sessions[session_id]
    if len(_sessions) >= MAX_SESSIONS:
        _sessions.popitem(last=False)
    agent = HeadcountAgent()
    _sessions[session_id] = agent
    return agent


# --- Request/Response models ---

class AskRequest(BaseModel):
    question: str
    session_id: str = None


class AskResponse(BaseModel):
    response: str
    tool_called: str
    tool_params: dict
    tool_result: dict
    confidence: dict
    trace_id: str
    latency_ms: float
    session_id: str


class ResetRequest(BaseModel):
    session_id: str


# --- Endpoints ---

@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest):
    session_id = req.session_id or str(uuid.uuid4())
    agent = _get_or_create_agent(session_id)
    try:
        result = agent.ask(req.question)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    return AskResponse(
        response=result["response"],
        tool_called=result["tool_called"],
        tool_params=result["tool_params"],
        tool_result=result["tool_result"],
        confidence=result["confidence"],
        trace_id=result["trace_id"],
        latency_ms=result["latency_ms"],
        session_id=session_id,
    )


@app.post("/api/reset")
def reset(req: ResetRequest):
    if req.session_id in _sessions:
        _sessions[req.session_id].reset()
    return {"status": "ok"}


@app.get("/api/data/regions")
def regions():
    return [get_region_data(r) for r in get_all_regions()]


@app.get("/api/data/assumptions")
def assumptions():
    return get_global_assumptions()


@app.get("/api/compute/capacity")
def compute_capacity():
    """Compute max capacity for all regions — pure Python, no AI."""
    return [calculate_max_capacity(r) for r in get_all_regions()]


@app.get("/api/compute/utilization")
def compute_utilization():
    """Compute projected utilization for all regions — pure Python, no AI."""
    return [calculate_utilization(r) for r in get_all_regions()]


class ScenarioRequest(BaseModel):
    region: str
    volume_change_pct: Optional[float] = None
    new_volume: Optional[int] = None
    aht_change_minutes: Optional[float] = None
    new_aht: Optional[float] = None
    # Optional overrides — CSV is NEVER modified, these are in-memory only
    override_utilization: Optional[float] = None
    override_shrinkage: Optional[float] = None
    override_hours: Optional[float] = None


@app.post("/api/compute/scenario")
def compute_scenario(req: ScenarioRequest):
    """Run a what-if scenario — pure Python, no AI. CSV data is read-only."""
    return calculate_required_headcount(
        region=req.region,
        volume_change_pct=req.volume_change_pct,
        new_volume=req.new_volume,
        aht_change_minutes=req.aht_change_minutes,
        new_aht=req.new_aht,
        override_utilization=req.override_utilization,
        override_shrinkage=req.override_shrinkage,
        override_hours=req.override_hours,
    )


class HeadcountScenarioRequest(BaseModel):
    region: str
    target_agents: int
    new_aht: Optional[float] = None
    override_utilization: Optional[float] = None
    override_shrinkage: Optional[float] = None
    override_hours: Optional[float] = None


@app.post("/api/compute/capacity-from-headcount")
def compute_capacity_from_headcount(req: HeadcountScenarioRequest):
    """Given target headcount, compute max volume — pure Python, CSV read-only."""
    return calculate_capacity_from_headcount(
        region=req.region,
        target_agents=req.target_agents,
        new_aht=req.new_aht,
        override_utilization=req.override_utilization,
        override_shrinkage=req.override_shrinkage,
        override_hours=req.override_hours,
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "model": "claude-sonnet-4-20250514"}
