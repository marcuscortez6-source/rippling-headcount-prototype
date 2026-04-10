"""Data integrity tests: CSV → data_store → computation_engine → API.

Ensures numbers flow unchanged from source CSV files through every layer.
CSV files are NEVER modified — verified by timestamp check.
"""
import csv
import os
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.data_store import get_region_data, get_global_assumptions, get_all_regions
from backend.computation_engine import (
    calculate_max_capacity,
    calculate_utilization,
    calculate_required_headcount,
    calculate_capacity_from_headcount,
)
from backend.api_server import app

DATA_DIR = Path(__file__).parent.parent.parent / "data"
client = TestClient(app)


class TestCSVMatchesDataStore:
    def test_roster_csv_matches(self):
        with open(DATA_DIR / "roster_and_handle_times.csv") as f:
            for row in csv.DictReader(f):
                rd = get_region_data(row["region"])
                assert rd["active_agents"] == int(row["active_agents"])
                assert rd["aht_minutes"] == float(row["avg_handle_time_minutes"])

    def test_volume_csv_matches(self):
        with open(DATA_DIR / "projected_volume.csv") as f:
            for row in csv.DictReader(f):
                rd = get_region_data(row["region"])
                assert rd["projected_tickets"] == int(row["projected_tickets_next_month"])

    def test_assumptions_csv_matches(self):
        assumptions = get_global_assumptions()
        with open(DATA_DIR / "global_assumptions.csv") as f:
            for row in csv.DictReader(f):
                assert assumptions[row["parameter"]] == float(row["value"])

    def test_three_regions_loaded(self):
        regions = get_all_regions()
        assert set(regions) == {"NAMER", "EMEA", "APAC"}


class TestGoldenValuesMatchValidationCSV:
    """Compare computation engine output against calculation_validation.csv."""

    def test_namer_capacity_steps(self):
        r = calculate_max_capacity("NAMER")
        trail = {s["step"]: s["result"] for s in r["audit_trail"]}
        assert trail[1] == 16000    # 100 * 160
        assert trail[2] == 12800.0  # 16000 * 0.80
        assert trail[3] == 10880.0  # 12800 * 0.85
        assert trail[4] == 652800.0  # 10880 * 60
        assert trail[5] == 43520    # 652800 / 15

    def test_emea_capacity_final(self):
        r = calculate_max_capacity("EMEA")
        assert r["max_tickets"] == 43520

    def test_apac_capacity_final(self):
        r = calculate_max_capacity("APAC")
        assert r["max_tickets"] == 32640

    def test_apac_whatif_steps(self):
        r = calculate_required_headcount("APAC", volume_change_pct=30, aht_change_minutes=2)
        trail = {s["step"]: s["result"] for s in r["audit_trail"]}
        assert trail[1] == 32500     # 25000 * 1.30
        assert trail[2] == 12.0      # 10 + 2
        assert trail[3] == 390000.0  # 32500 * 12
        assert trail[4] == 6528.0    # minutes_per_agent
        assert trail[5] == 60        # ceil(390000 / 6528)
        assert trail[6] == 10        # 60 - 50


class TestAPIMatchesDirectEngine:
    def test_capacity_endpoint_matches(self):
        api_resp = client.get("/api/compute/capacity").json()
        for api_item in api_resp:
            direct = calculate_max_capacity(api_item["region"])
            assert api_item["max_tickets"] == direct["max_tickets"]
            assert api_item["agents"] == direct["agents"]

    def test_utilization_endpoint_matches(self):
        api_resp = client.get("/api/compute/utilization").json()
        for api_item in api_resp:
            direct = calculate_utilization(api_item["region"])
            assert api_item["projected_utilization"] == direct["projected_utilization"]
            assert api_item["headroom_tickets"] == direct["headroom_tickets"]

    def test_scenario_endpoint_matches(self):
        body = {"region": "APAC", "volume_change_pct": 30, "aht_change_minutes": 2}
        api_resp = client.post("/api/compute/scenario", json=body).json()
        direct = calculate_required_headcount("APAC", volume_change_pct=30, aht_change_minutes=2)
        assert api_resp["required_agents"] == direct["required_agents"]
        assert api_resp["net_new_needed"] == direct["net_new_needed"]

    def test_cfh_endpoint_matches(self):
        body = {"region": "APAC", "target_agents": 60}
        api_resp = client.post("/api/compute/capacity-from-headcount", json=body).json()
        direct = calculate_capacity_from_headcount("APAC", 60)
        assert api_resp["max_volume"] == direct["max_volume"]
        assert api_resp["headcount_delta"] == direct["headcount_delta"]


class TestCSVNeverModified:
    def test_csvs_unchanged_after_computations(self):
        csv_files = list(DATA_DIR.glob("*.csv"))
        assert len(csv_files) >= 3

        # Record timestamps
        before = {f: os.path.getmtime(f) for f in csv_files}

        # Run 50 varied computations
        for region in get_all_regions():
            calculate_max_capacity(region)
            calculate_utilization(region)
            calculate_required_headcount(region)
            calculate_required_headcount(region, new_volume=50000, new_aht=15)
            calculate_required_headcount(region, override_utilization=0.90)
            calculate_required_headcount(region, override_shrinkage=0.30)
            calculate_required_headcount(region, override_hours=140)
            calculate_capacity_from_headcount(region, 80)
            calculate_capacity_from_headcount(region, 120, new_aht=15)
            calculate_capacity_from_headcount(region, 100, override_utilization=0.90)

        # API calls too
        client.get("/api/compute/capacity")
        client.get("/api/compute/utilization")
        client.post("/api/compute/scenario", json={"region": "NAMER", "new_volume": 99999})
        client.post("/api/compute/capacity-from-headcount", json={"region": "EMEA", "target_agents": 200})

        # Verify no CSV was touched
        after = {f: os.path.getmtime(f) for f in csv_files}
        for f in csv_files:
            assert before[f] == after[f], f"CSV file was modified: {f.name}"
