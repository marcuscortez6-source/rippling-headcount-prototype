import math

from backend.data_store import get_region_data, get_global_assumptions
from backend.errors import SanityCheckError
from backend.validators import validate_region


def calculate_max_capacity(region: str) -> dict:
    """Calculate the maximum ticket capacity for a region."""
    region = validate_region(region)
    data = get_region_data(region)
    assumptions = get_global_assumptions()

    agents = data["active_agents"]
    aht = data["aht_minutes"]
    hours = assumptions["working_hours_per_month"]
    shrinkage = assumptions["shrinkage_rate"]
    utilization = assumptions["utilization_target"]

    audit_trail = []

    # Step 1: Total available hours
    total_hours = agents * hours
    audit_trail.append({
        "step": 1,
        "description": "Total available hours",
        "calculation": f"{agents} agents × {hours} hrs/month",
        "result": total_hours,
    })

    # Step 2: Productive hours (after shrinkage)
    productive_hours = total_hours * (1 - shrinkage)
    audit_trail.append({
        "step": 2,
        "description": "Productive hours (after shrinkage)",
        "calculation": f"{total_hours} hrs × (1 - {shrinkage})",
        "result": productive_hours,
    })

    # Step 3: Utilized hours
    utilized_hours = productive_hours * utilization
    audit_trail.append({
        "step": 3,
        "description": "Utilized hours",
        "calculation": f"{productive_hours} hrs × {utilization}",
        "result": utilized_hours,
    })

    # Step 4: Utilized minutes
    utilized_minutes = utilized_hours * 60
    audit_trail.append({
        "step": 4,
        "description": "Utilized minutes",
        "calculation": f"{utilized_hours} hrs × 60 min/hr",
        "result": utilized_minutes,
    })

    # Step 5: Max tickets
    max_tickets = int(utilized_minutes / aht)
    audit_trail.append({
        "step": 5,
        "description": "Max tickets (utilized minutes ÷ AHT)",
        "calculation": f"{utilized_minutes} min ÷ {aht} min/ticket",
        "result": max_tickets,
    })

    # Sanity checks
    if max_tickets <= 0:
        raise SanityCheckError("Capacity must be positive")
    if max_tickets >= 500000:
        raise SanityCheckError("Capacity exceeds sanity threshold")
    if audit_trail[-1]["result"] != max_tickets:
        raise SanityCheckError("Audit trail doesn't match result")

    return {
        "region": region,
        "max_tickets": max_tickets,
        "agents": agents,
        "aht_minutes": aht,
        "audit_trail": audit_trail,
    }


def calculate_required_headcount(region: str, volume_change_pct=None, new_volume=None,
                                  aht_change_minutes=None, new_aht=None,
                                  override_utilization=None, override_shrinkage=None,
                                  override_hours=None) -> dict:
    """Calculate required headcount for a region with optional scenario adjustments.

    CSV data is NEVER modified. Override parameters are in-memory only
    and used solely for what-if computation.
    """
    region = validate_region(region)
    data = get_region_data(region)
    assumptions = get_global_assumptions()

    current_agents = data["active_agents"]
    current_aht = data["aht_minutes"]
    current_volume = data["projected_tickets"]
    hours = override_hours if override_hours is not None else assumptions["working_hours_per_month"]
    shrinkage = override_shrinkage if override_shrinkage is not None else assumptions["shrinkage_rate"]
    utilization = override_utilization if override_utilization is not None else assumptions["utilization_target"]

    audit_trail = []

    # Step 1: Determine effective volume
    if new_volume is not None:
        effective_volume = int(new_volume)
        vol_desc = f"Override volume: {new_volume}"
    elif volume_change_pct is not None:
        effective_volume = int(current_volume * (1 + volume_change_pct / 100))
        vol_desc = f"{current_volume} × (1 + {volume_change_pct}% / 100)"
    else:
        effective_volume = current_volume
        vol_desc = f"Unchanged: {current_volume}"
    audit_trail.append({
        "step": 1,
        "description": "Effective volume",
        "calculation": vol_desc,
        "result": effective_volume,
    })

    # Step 2: Determine effective AHT
    if new_aht is not None:
        effective_aht = float(new_aht)
        aht_desc = f"Override AHT: {new_aht}"
    elif aht_change_minutes is not None:
        effective_aht = current_aht + aht_change_minutes
        aht_desc = f"{current_aht} + {aht_change_minutes} min"
    else:
        effective_aht = current_aht
        aht_desc = f"Unchanged: {current_aht}"
    audit_trail.append({
        "step": 2,
        "description": "Effective AHT",
        "calculation": aht_desc,
        "result": effective_aht,
    })

    # Step 3: Required minutes
    required_minutes = effective_volume * effective_aht
    audit_trail.append({
        "step": 3,
        "description": "Required minutes",
        "calculation": f"{effective_volume} tickets × {effective_aht} min/ticket",
        "result": required_minutes,
    })

    # Step 4: Minutes per agent
    minutes_per_agent = hours * 60 * (1 - shrinkage) * utilization
    audit_trail.append({
        "step": 4,
        "description": "Productive minutes per agent",
        "calculation": f"{hours} hrs × 60 × (1 - {shrinkage}) × {utilization}",
        "result": minutes_per_agent,
    })

    # Step 5: Required agents
    required_agents = math.ceil(required_minutes / minutes_per_agent)
    audit_trail.append({
        "step": 5,
        "description": "Required agents (rounded up)",
        "calculation": f"⌈{required_minutes} ÷ {minutes_per_agent}⌉",
        "result": required_agents,
    })

    # Step 6: Net new needed
    net_new = max(0, required_agents - current_agents)
    audit_trail.append({
        "step": 6,
        "description": "Net new agents needed",
        "calculation": f"max(0, {required_agents} - {current_agents})",
        "result": net_new,
    })

    # Sanity checks
    if required_agents < 0:
        raise SanityCheckError("Required agents cannot be negative")
    if net_new > 0 and net_new != required_agents - current_agents:
        raise SanityCheckError("Net new calculation mismatch")
    if required_agents != math.ceil(required_minutes / minutes_per_agent):
        raise SanityCheckError("Required agents calculation mismatch")

    return {
        "region": region,
        "current_agents": current_agents,
        "required_agents": required_agents,
        "net_new_needed": net_new,
        "effective_volume": effective_volume,
        "effective_aht": effective_aht,
        "current_volume": current_volume,
        "current_aht": current_aht,
        "minutes_per_agent": minutes_per_agent,
        "audit_trail": audit_trail,
    }


def calculate_capacity_from_headcount(region: str, target_agents: int,
                                      new_aht=None,
                                      override_utilization=None,
                                      override_shrinkage=None,
                                      override_hours=None) -> dict:
    """Given a target headcount, calculate the max volume they can handle.

    Inverse of calculate_required_headcount. CSV data is NEVER modified.
    Override parameters are in-memory only for what-if computation.
    """
    region = validate_region(region)
    data = get_region_data(region)
    assumptions = get_global_assumptions()

    current_agents = data["active_agents"]
    current_aht = data["aht_minutes"]
    current_volume = data["projected_tickets"]
    hours = override_hours if override_hours is not None else assumptions["working_hours_per_month"]
    shrinkage = override_shrinkage if override_shrinkage is not None else assumptions["shrinkage_rate"]
    utilization = override_utilization if override_utilization is not None else assumptions["utilization_target"]
    effective_aht = float(new_aht) if new_aht is not None else current_aht

    audit_trail = []

    # Step 1: Target agents
    audit_trail.append({
        "step": 1,
        "description": "Target agents",
        "calculation": f"User override: {target_agents} (current: {current_agents})",
        "result": target_agents,
    })

    # Step 2: Effective AHT
    aht_desc = f"Override AHT: {effective_aht}" if new_aht is not None else f"Unchanged: {effective_aht}"
    audit_trail.append({
        "step": 2,
        "description": "Effective AHT",
        "calculation": aht_desc,
        "result": effective_aht,
    })

    # Step 3: Productive minutes per agent
    minutes_per_agent = hours * 60 * (1 - shrinkage) * utilization
    audit_trail.append({
        "step": 3,
        "description": "Productive minutes per agent",
        "calculation": f"{hours} hrs × 60 × (1 - {shrinkage}) × {utilization}",
        "result": minutes_per_agent,
    })

    # Step 4: Total productive minutes
    total_minutes = target_agents * minutes_per_agent
    audit_trail.append({
        "step": 4,
        "description": "Total productive minutes",
        "calculation": f"{target_agents} agents × {minutes_per_agent}",
        "result": total_minutes,
    })

    # Step 5: Max volume (tickets)
    max_volume = int(total_minutes / effective_aht)
    audit_trail.append({
        "step": 5,
        "description": "Max ticket volume",
        "calculation": f"floor({total_minutes} ÷ {effective_aht})",
        "result": max_volume,
    })

    # Step 6: Volume delta
    volume_delta = max_volume - current_volume
    audit_trail.append({
        "step": 6,
        "description": "Volume change from current",
        "calculation": f"{max_volume} - {current_volume}",
        "result": volume_delta,
    })

    # Sanity check
    if max_volume < 0:
        raise SanityCheckError("Max volume cannot be negative")

    return {
        "region": region,
        "target_agents": target_agents,
        "current_agents": current_agents,
        "headcount_delta": target_agents - current_agents,
        "max_volume": max_volume,
        "current_volume": current_volume,
        "volume_delta": volume_delta,
        "effective_aht": effective_aht,
        "current_aht": current_aht,
        "minutes_per_agent": minutes_per_agent,
        "audit_trail": audit_trail,
    }


def calculate_utilization(region: str, ticket_volume=None) -> dict:
    """Calculate projected utilization rate for a region."""
    region = validate_region(region)
    data = get_region_data(region)
    assumptions = get_global_assumptions()

    agents = data["active_agents"]
    aht = data["aht_minutes"]
    volume = ticket_volume if ticket_volume is not None else data["projected_tickets"]
    hours = assumptions["working_hours_per_month"]
    shrinkage = assumptions["shrinkage_rate"]
    utilization_target = assumptions["utilization_target"]

    audit_trail = []

    # Step 1: Required minutes
    required_minutes = volume * aht
    audit_trail.append({
        "step": 1,
        "description": "Required minutes for ticket volume",
        "calculation": f"{volume} tickets × {aht} min/ticket",
        "result": required_minutes,
    })

    # Step 2: Available minutes (after shrinkage, before utilization target)
    available_minutes = agents * hours * 60 * (1 - shrinkage)
    audit_trail.append({
        "step": 2,
        "description": "Available minutes (after shrinkage)",
        "calculation": f"{agents} agents × {hours} hrs × 60 × (1 - {shrinkage})",
        "result": available_minutes,
    })

    # Step 3: Projected utilization
    projected_utilization = required_minutes / available_minutes
    audit_trail.append({
        "step": 3,
        "description": "Projected utilization",
        "calculation": f"{required_minutes} ÷ {available_minutes}",
        "result": round(projected_utilization, 6),
    })

    # Step 4: vs target
    vs_target = projected_utilization - utilization_target
    audit_trail.append({
        "step": 4,
        "description": "Utilization vs target",
        "calculation": f"{round(projected_utilization, 6)} - {utilization_target}",
        "result": round(vs_target, 6),
    })

    # Step 5: Max capacity and headroom
    capacity_result = calculate_max_capacity(region)
    max_capacity = capacity_result["max_tickets"]
    headroom_tickets = max_capacity - volume
    audit_trail.append({
        "step": 5,
        "description": "Headroom tickets",
        "calculation": f"{max_capacity} max - {volume} volume",
        "result": headroom_tickets,
    })

    return {
        "region": region,
        "projected_utilization": round(projected_utilization, 6),
        "utilization_target": utilization_target,
        "vs_target": round(vs_target, 6),
        "ticket_volume": volume,
        "max_capacity": max_capacity,
        "headroom_tickets": headroom_tickets,
        "audit_trail": audit_trail,
    }
