TOOLS = [
    {
        "name": "get_region_data",
        "description": (
            "Retrieve current staffing data for a specific region, including "
            "the number of active agents, average handle time (AHT), and "
            "projected ticket volume for next month.\n\n"
            "USE THIS WHEN the user asks about a region's current agent count, "
            "handle time, projected tickets, or wants a factual overview of a "
            "region's staffing situation.\n\n"
            "DO NOT USE THIS WHEN the user asks about capacity calculations, "
            "what-if scenarios, or utilization rates — use the dedicated "
            "calculation tools instead.\n\n"
            "Returns a dict with region name, active_agents (int), "
            "aht_minutes (float), and projected_tickets (int)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "enum": ["NAMER", "EMEA", "APAC"],
                    "description": "The region to retrieve data for.",
                },
            },
            "required": ["region"],
        },
    },
    {
        "name": "get_global_assumptions",
        "description": (
            "Retrieve the global workforce planning assumptions used in all "
            "calculations: working hours per month, shrinkage rate, and "
            "utilization target.\n\n"
            "USE THIS WHEN the user asks about shrinkage, utilization target, "
            "working hours, or wants to understand the model's underlying "
            "assumptions.\n\n"
            "DO NOT USE THIS WHEN the user asks about region-specific data "
            "like agent counts or handle times — use get_region_data instead.\n\n"
            "Returns a dict with working_hours_per_month (float), "
            "shrinkage_rate (float), and utilization_target (float)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "calculate_max_capacity",
        "description": (
            "Calculate the maximum number of tickets a region's current team "
            "can handle in one month, given current staffing, AHT, and global "
            "assumptions (shrinkage, utilization target).\n\n"
            "USE THIS WHEN the user asks how many tickets a team can handle, "
            "about a region's capacity or throughput, or whether a team can "
            "absorb a given volume.\n\n"
            "DO NOT USE THIS WHEN the user describes a what-if scenario with "
            "changed volume or AHT — use run_whatif_scenario instead.\n\n"
            "Returns max_tickets (int), agents (int), aht_minutes (float), "
            "and a step-by-step audit_trail showing every intermediate "
            "calculation. Always present the audit trail to the user."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "enum": ["NAMER", "EMEA", "APAC"],
                    "description": "The region to calculate capacity for.",
                },
            },
            "required": ["region"],
        },
    },
    {
        "name": "run_whatif_scenario",
        "description": (
            "Run a what-if headcount projection for a region with hypothetical "
            "changes to ticket volume and/or average handle time. Calculates "
            "how many agents would be required under the new conditions and "
            "how many net-new hires are needed.\n\n"
            "USE THIS WHEN the user describes a hypothetical scenario such as "
            "'what if volume increases by 30%', 'what if AHT goes up by 2 "
            "minutes', or any combination of volume and AHT changes.\n\n"
            "DO NOT USE THIS WHEN the user asks about current-state data, "
            "simple capacity checks, or utilization rates without changes.\n\n"
            "Accepts volume changes as either a percentage (volume_change_pct) "
            "or an absolute override (new_volume), and AHT changes as either "
            "an additive delta (aht_change_minutes) or an absolute override "
            "(new_aht). Do not provide both forms for the same parameter.\n\n"
            "Returns required_agents (int), net_new_needed (int), "
            "effective_volume (int), effective_aht (float), current vs "
            "modified comparison, minutes_per_agent (float), and a "
            "step-by-step audit_trail."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "enum": ["NAMER", "EMEA", "APAC"],
                    "description": "The region to run the scenario for.",
                },
                "volume_change_pct": {
                    "type": "number",
                    "description": (
                        "Percentage change in ticket volume. E.g., 30 means "
                        "+30%, -20 means -20%. Mutually exclusive with new_volume."
                    ),
                },
                "new_volume": {
                    "type": "integer",
                    "description": (
                        "Absolute ticket volume override. Replaces the projected "
                        "volume entirely. Mutually exclusive with volume_change_pct."
                    ),
                },
                "aht_change_minutes": {
                    "type": "number",
                    "description": (
                        "Additive change to AHT in minutes. E.g., 2 adds 2 minutes "
                        "to current AHT. Mutually exclusive with new_aht."
                    ),
                },
                "new_aht": {
                    "type": "number",
                    "description": (
                        "Absolute AHT override in minutes. Replaces the current "
                        "AHT entirely. Mutually exclusive with aht_change_minutes."
                    ),
                },
            },
            "required": ["region"],
        },
    },
    {
        "name": "calculate_utilization",
        "description": (
            "Calculate the projected utilization rate for a region and compare "
            "it against the 85% target. Shows whether the team is over- or "
            "under-utilized and how much ticket headroom remains.\n\n"
            "USE THIS WHEN the user asks about utilization, headroom, whether "
            "a team is over- or understaffed, or how close a region is to "
            "capacity.\n\n"
            "DO NOT USE THIS WHEN the user asks about what-if scenarios with "
            "changed volume or AHT — use run_whatif_scenario instead.\n\n"
            "Returns projected_utilization (float, as decimal e.g. 0.78), "
            "utilization_target (float), vs_target (float, negative means "
            "under target), ticket_volume (int), max_capacity (int), "
            "headroom_tickets (int), and a step-by-step audit_trail."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "enum": ["NAMER", "EMEA", "APAC"],
                    "description": "The region to calculate utilization for.",
                },
                "ticket_volume": {
                    "type": "integer",
                    "description": (
                        "Optional custom ticket volume. If omitted, uses the "
                        "projected volume from the data."
                    ),
                },
            },
            "required": ["region"],
        },
    },
]
