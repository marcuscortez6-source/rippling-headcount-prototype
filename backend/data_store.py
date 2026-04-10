import csv
from pathlib import Path

from backend.errors import DataNotFoundError
from backend.validators import validate_region

_DATA_DIR = Path(__file__).parent.parent / "data"

# ---------------------------------------------------------------------------
# Load CSVs at module level (once on import)
# ---------------------------------------------------------------------------

# Global assumptions  –  parameter -> float value
_assumptions: dict[str, float] = {}
with open(_DATA_DIR / "global_assumptions.csv", newline="") as f:
    for row in csv.DictReader(f):
        _assumptions[row["parameter"]] = float(row["value"])

# Roster & handle times  –  region -> {active_agents, avg_handle_time_minutes}
_roster: dict[str, dict] = {}
with open(_DATA_DIR / "roster_and_handle_times.csv", newline="") as f:
    for row in csv.DictReader(f):
        _roster[row["region"]] = {
            "active_agents": int(row["active_agents"]),
            "avg_handle_time_minutes": float(row["avg_handle_time_minutes"]),
        }

# Projected volume  –  region -> projected_tickets_next_month
_volume: dict[str, int] = {}
with open(_DATA_DIR / "projected_volume.csv", newline="") as f:
    for row in csv.DictReader(f):
        _volume[row["region"]] = int(row["projected_tickets_next_month"])

# Derive the canonical region list from the roster CSV
_regions: list[str] = list(_roster.keys())

print(f"data_store: loaded {len(_regions)} regions, {len(_assumptions)} assumptions")

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_global_assumptions() -> dict:
    """Return global workforce-planning assumptions as a dict of floats."""
    return dict(_assumptions)


def get_region_data(region: str) -> dict:
    """Return joined roster + volume data for a single region."""
    region = validate_region(region)

    if region not in _roster:
        raise DataNotFoundError(f"Region '{region}' not found in roster data")
    if region not in _volume:
        raise DataNotFoundError(f"Region '{region}' not found in volume data")

    return {
        "region": region,
        "active_agents": _roster[region]["active_agents"],
        "aht_minutes": _roster[region]["avg_handle_time_minutes"],
        "projected_tickets": _volume[region],
    }


def get_all_regions() -> list[str]:
    """Return the list of region names derived from the CSV data."""
    return list(_regions)


if __name__ == "__main__":
    data = get_region_data("EMEA")
    assert data["active_agents"] == 80
    assert data["aht_minutes"] == 12.0
    assumptions = get_global_assumptions()
    assert assumptions["shrinkage_rate"] == 0.20
    print("✅ data_store verified against CSVs")
