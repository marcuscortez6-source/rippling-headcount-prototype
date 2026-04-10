import json
import logging
import uuid
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path

TRACES_DIR = Path(__file__).parent.parent / "traces"
TRACES_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("headcount_agent")


@dataclass
class AgentTrace:
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    user_query: str = ""
    tool_called: str = ""
    tool_params: dict = field(default_factory=dict)
    tool_result: dict = field(default_factory=dict)
    total_latency_ms: float = 0
    input_tokens: int = 0
    output_tokens: int = 0
    response_text: str = ""
    confidence: str = ""
    error: str = ""


def log_trace(trace: AgentTrace):
    trace_dict = asdict(trace)
    logger.info(json.dumps(trace_dict, default=str))
    with open(TRACES_DIR / "traces.jsonl", "a") as f:
        f.write(json.dumps(trace_dict, default=str) + "\n")
