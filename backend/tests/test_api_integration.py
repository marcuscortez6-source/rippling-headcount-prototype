"""API integration tests using FastAPI TestClient (in-process, no server needed).

Tests every endpoint with golden values derived from CSV data.
"""
import pytest
from fastapi.testclient import TestClient
from backend.api_server import app

client = TestClient(app)


class TestDataEndpoints:
    def test_regions_returns_three(self):
        r = client.get("/api/data/regions")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        regions = {d["region"] for d in data}
        assert regions == {"NAMER", "EMEA", "APAC"}

    def test_regions_namer_values(self):
        data = client.get("/api/data/regions").json()
        namer = next(d for d in data if d["region"] == "NAMER")
        assert namer["active_agents"] == 100
        assert namer["aht_minutes"] == 15.0
        assert namer["projected_tickets"] == 40000

    def test_regions_total_agents(self):
        data = client.get("/api/data/regions").json()
        total = sum(d["active_agents"] for d in data)
        assert total == 230

    def test_assumptions(self):
        r = client.get("/api/data/assumptions")
        assert r.status_code == 200
        data = r.json()
        assert data["working_hours_per_month"] == 160.0
        assert data["shrinkage_rate"] == 0.20
        assert data["utilization_target"] == 0.85

    def test_health(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestComputeCapacity:
    def test_returns_three_regions(self):
        r = client.get("/api/compute/capacity")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_golden_values(self):
        data = client.get("/api/compute/capacity").json()
        by_region = {d["region"]: d for d in data}
        assert by_region["NAMER"]["max_tickets"] == 43520
        assert by_region["EMEA"]["max_tickets"] == 43520
        assert by_region["APAC"]["max_tickets"] == 32640

    def test_has_audit_trails(self):
        data = client.get("/api/compute/capacity").json()
        for item in data:
            assert "audit_trail" in item
            assert len(item["audit_trail"]) == 5


class TestComputeUtilization:
    def test_returns_three_regions(self):
        r = client.get("/api/compute/utilization")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_golden_values(self):
        data = client.get("/api/compute/utilization").json()
        by_region = {d["region"]: d for d in data}
        assert by_region["NAMER"]["headroom_tickets"] == 3520
        assert by_region["EMEA"]["headroom_tickets"] == 8520
        assert by_region["APAC"]["headroom_tickets"] == 7640
        assert abs(by_region["NAMER"]["projected_utilization"] - 0.78125) < 0.0001


class TestScenarioEndpoint:
    def test_apac_classic_scenario(self):
        r = client.post("/api/compute/scenario", json={
            "region": "APAC", "volume_change_pct": 30, "aht_change_minutes": 2
        })
        assert r.status_code == 200
        data = r.json()
        assert data["required_agents"] == 60
        assert data["net_new_needed"] == 10
        assert data["effective_volume"] == 32500
        assert data["effective_aht"] == 12.0

    def test_with_utilization_override(self):
        r = client.post("/api/compute/scenario", json={
            "region": "NAMER", "override_utilization": 0.90
        })
        assert r.status_code == 200
        data = r.json()
        assert data["required_agents"] == 87
        assert data["minutes_per_agent"] == 6912.0

    def test_with_shrinkage_override(self):
        r = client.post("/api/compute/scenario", json={
            "region": "NAMER", "override_shrinkage": 0.30
        })
        data = r.json()
        assert data["required_agents"] == 106

    def test_no_changes_namer(self):
        r = client.post("/api/compute/scenario", json={"region": "NAMER"})
        data = r.json()
        assert data["required_agents"] == 92  # ceil(600000/6528)
        assert data["net_new_needed"] == 0  # 92 < 100

    def test_null_optional_fields_accepted(self):
        r = client.post("/api/compute/scenario", json={
            "region": "NAMER", "new_volume": 30000,
            "new_aht": None, "override_utilization": None,
            "override_shrinkage": None, "override_hours": None,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["required_agents"] == 69  # ceil(30000*15/6528)

    def test_invalid_region(self):
        from backend.errors import ValidationError
        with pytest.raises((ValidationError, Exception)):
            client.post("/api/compute/scenario", json={"region": "LATAM"})


class TestCapacityFromHeadcountEndpoint:
    def test_apac_60_agents(self):
        r = client.post("/api/compute/capacity-from-headcount", json={
            "region": "APAC", "target_agents": 60
        })
        assert r.status_code == 200
        data = r.json()
        assert data["max_volume"] == 39168
        assert data["headcount_delta"] == 10
        assert data["volume_delta"] == 14168

    def test_with_aht_override(self):
        r = client.post("/api/compute/capacity-from-headcount", json={
            "region": "APAC", "target_agents": 60, "new_aht": 12
        })
        data = r.json()
        assert data["max_volume"] == 32640
        assert data["effective_aht"] == 12.0

    def test_with_all_overrides(self):
        r = client.post("/api/compute/capacity-from-headcount", json={
            "region": "EMEA", "target_agents": 80,
            "override_utilization": 0.90, "override_shrinkage": 0.15, "override_hours": 150,
        })
        data = r.json()
        assert data["max_volume"] == 45900
        assert data["minutes_per_agent"] == 6885.0

    def test_missing_target_agents(self):
        r = client.post("/api/compute/capacity-from-headcount", json={"region": "NAMER"})
        assert r.status_code == 422  # Pydantic requires target_agents

    def test_null_optional_fields_accepted(self):
        r = client.post("/api/compute/capacity-from-headcount", json={
            "region": "NAMER", "target_agents": 100,
            "new_aht": None, "override_utilization": None,
        })
        assert r.status_code == 200
        assert r.json()["max_volume"] == 43520


class TestResetEndpoint:
    def test_reset_ok(self):
        r = client.post("/api/reset", json={"session_id": "test-123"})
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
