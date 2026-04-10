"""Tests for new computation functions: calculate_capacity_from_headcount and override parameters.

All golden values derived from CSV data:
  NAMER: 100 agents, 15m AHT, 40,000 vol
  EMEA:  80 agents, 12m AHT, 35,000 vol
  APAC:  50 agents, 10m AHT, 25,000 vol
  Assumptions: 160 hrs, 0.20 shrinkage, 0.85 utilization
  minutes_per_agent = 160 * 60 * 0.80 * 0.85 = 6,528
"""
import math
import pytest
from backend.computation_engine import (
    calculate_capacity_from_headcount,
    calculate_required_headcount,
)

MPA = 6528.0  # minutes_per_agent at default assumptions


# ── calculate_capacity_from_headcount: baseline (no overrides) ────────────────

class TestCapacityFromHeadcountBaseline:
    def test_namer_unchanged(self):
        r = calculate_capacity_from_headcount("NAMER", 100)
        assert r["max_volume"] == 43520  # int(100 * 6528 / 15)
        assert r["volume_delta"] == 3520  # 43520 - 40000
        assert r["headcount_delta"] == 0
        assert r["minutes_per_agent"] == MPA

    def test_emea_unchanged(self):
        r = calculate_capacity_from_headcount("EMEA", 80)
        assert r["max_volume"] == 43520  # int(80 * 6528 / 12)
        assert r["volume_delta"] == 8520

    def test_apac_unchanged(self):
        r = calculate_capacity_from_headcount("APAC", 50)
        assert r["max_volume"] == 32640  # int(50 * 6528 / 10)
        assert r["volume_delta"] == 7640

    def test_apac_add_10(self):
        r = calculate_capacity_from_headcount("APAC", 60)
        # 60 * 6528 / 10 = 391680 / 10 = 39168
        assert r["max_volume"] == 39168
        assert r["volume_delta"] == 14168  # 39168 - 25000
        assert r["headcount_delta"] == 10

    def test_namer_increase_to_115(self):
        r = calculate_capacity_from_headcount("NAMER", 115)
        # 115 * 6528 / 15 = 750720 / 15 = 50048
        assert r["max_volume"] == 50048
        assert r["headcount_delta"] == 15

    def test_namer_decrease_to_80(self):
        r = calculate_capacity_from_headcount("NAMER", 80)
        # 80 * 6528 / 15 = 522240 / 15 = 34816
        assert r["max_volume"] == 34816
        assert r["headcount_delta"] == -20
        assert r["volume_delta"] == -5184  # 34816 - 40000


# ── calculate_capacity_from_headcount: with AHT override ─────────────────────

class TestCapacityFromHeadcountAHT:
    def test_apac_higher_aht(self):
        r = calculate_capacity_from_headcount("APAC", 50, new_aht=12)
        # 50 * 6528 / 12 = 326400 / 12 = 27200
        assert r["max_volume"] == 27200
        assert r["effective_aht"] == 12.0
        assert r["volume_delta"] == 2200  # 27200 - 25000


# ── calculate_capacity_from_headcount: with operational overrides ─────────────

class TestCapacityFromHeadcountOverrides:
    def test_higher_utilization(self):
        r = calculate_capacity_from_headcount("NAMER", 100, override_utilization=0.90)
        mpa = 160 * 60 * 0.80 * 0.90  # 6912
        assert r["minutes_per_agent"] == 6912.0
        assert r["max_volume"] == int(100 * 6912 / 15)  # 46080

    def test_higher_shrinkage(self):
        r = calculate_capacity_from_headcount("NAMER", 100, override_shrinkage=0.25)
        mpa = 160 * 60 * 0.75 * 0.85  # 6120
        assert r["minutes_per_agent"] == 6120.0
        assert r["max_volume"] == int(100 * 6120 / 15)  # 40800

    def test_lower_hours(self):
        r = calculate_capacity_from_headcount("NAMER", 100, override_hours=140)
        mpa = 140 * 60 * 0.80 * 0.85  # 5712
        assert r["minutes_per_agent"] == 5712.0
        assert r["max_volume"] == int(100 * 5712 / 15)  # 38080

    def test_all_overrides_combined(self):
        r = calculate_capacity_from_headcount(
            "EMEA", 80,
            override_utilization=0.90, override_shrinkage=0.15, override_hours=150,
        )
        mpa = 150 * 60 * 0.85 * 0.90  # 6885
        assert r["minutes_per_agent"] == 6885.0
        assert r["max_volume"] == int(80 * 6885 / 12)  # 45900


# ── calculate_required_headcount: with override parameters ────────────────────

class TestRequiredHeadcountOverrides:
    def test_higher_utilization(self):
        r = calculate_required_headcount("NAMER", override_utilization=0.90)
        mpa = 160 * 60 * 0.80 * 0.90  # 6912
        assert r["minutes_per_agent"] == 6912.0
        assert r["required_agents"] == math.ceil(600000 / 6912)  # 87
        assert r["net_new_needed"] == 0  # 87 < 100

    def test_higher_shrinkage_needs_more_agents(self):
        r = calculate_required_headcount("NAMER", override_shrinkage=0.30)
        mpa = 160 * 60 * 0.70 * 0.85  # 5712
        assert r["minutes_per_agent"] == 5712.0
        assert r["required_agents"] == math.ceil(600000 / 5712)  # 106
        assert r["net_new_needed"] == 6

    def test_lower_hours_needs_more_agents(self):
        r = calculate_required_headcount("NAMER", override_hours=140)
        mpa = 140 * 60 * 0.80 * 0.85  # 5712
        assert r["required_agents"] == math.ceil(600000 / 5712)  # 106
        assert r["net_new_needed"] == 6

    def test_apac_scenario_with_util_override(self):
        r = calculate_required_headcount(
            "APAC", volume_change_pct=30, aht_change_minutes=2,
            override_utilization=0.90,
        )
        # vol=32500, aht=12, required_min=390000
        # mpa=160*60*0.80*0.90=6912
        # agents=ceil(390000/6912)=ceil(56.42)=57
        assert r["required_agents"] == 57
        assert r["net_new_needed"] == 7

    def test_all_overrides_combined(self):
        r = calculate_required_headcount(
            "EMEA", new_volume=50000, new_aht=15,
            override_utilization=0.80, override_shrinkage=0.25, override_hours=150,
        )
        mpa = 150 * 60 * 0.75 * 0.80  # 5400
        assert r["minutes_per_agent"] == 5400.0
        assert r["required_agents"] == math.ceil(750000 / 5400)  # 139
        assert r["net_new_needed"] == 59


# ── Inverse consistency (roundtrip property) ──────────────────────────────────

class TestInverseConsistency:
    def test_apac_roundtrip(self):
        """If APAC needs 60 agents for 32500@12m, then 60 agents can handle ≥32500."""
        fwd = calculate_required_headcount("APAC", volume_change_pct=30, aht_change_minutes=2)
        assert fwd["required_agents"] == 60
        inv = calculate_capacity_from_headcount("APAC", 60, new_aht=12)
        assert inv["max_volume"] >= 32500

    def test_namer_roundtrip(self):
        """If NAMER needs 115 agents for 50k, then 115 agents can handle ≥50k."""
        fwd = calculate_required_headcount("NAMER", new_volume=50000)
        assert fwd["required_agents"] == 115
        inv = calculate_capacity_from_headcount("NAMER", 115)
        assert inv["max_volume"] >= 50000


# ── Edge cases ────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_full_utilization(self):
        r = calculate_capacity_from_headcount("NAMER", 100, override_utilization=1.0)
        mpa = 160 * 60 * 0.80 * 1.0  # 7680
        assert r["max_volume"] == int(100 * 7680 / 15)  # 51200

    def test_zero_shrinkage(self):
        r = calculate_capacity_from_headcount("NAMER", 100, override_shrinkage=0.0)
        mpa = 160 * 60 * 1.0 * 0.85  # 8160
        assert r["max_volume"] == int(100 * 8160 / 15)  # 54400

    def test_audit_trail_length(self):
        r = calculate_capacity_from_headcount("NAMER", 100)
        assert len(r["audit_trail"]) == 6

    def test_audit_trail_final_matches_result(self):
        r = calculate_capacity_from_headcount("NAMER", 100)
        assert r["audit_trail"][4]["result"] == r["max_volume"]  # step 5

    def test_region_alias(self):
        r = calculate_capacity_from_headcount("Asia", 50)
        assert r["region"] == "APAC"
        assert r["max_volume"] == 32640
