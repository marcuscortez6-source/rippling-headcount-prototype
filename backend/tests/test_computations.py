import pytest

from backend.computation_engine import (
    calculate_max_capacity,
    calculate_required_headcount,
    calculate_utilization,
)
from backend.data_store import get_region_data, get_global_assumptions
from backend.validators import validate_region
from backend.errors import ValidationError


class TestDataStore:
    """Verify CSVs load correctly."""

    def test_emea_region_data(self):
        data = get_region_data("EMEA")
        assert data["active_agents"] == 80
        assert data["aht_minutes"] == 12.0
        assert data["projected_tickets"] == 35000

    def test_namer_region_data(self):
        data = get_region_data("NAMER")
        assert data["active_agents"] == 100
        assert data["aht_minutes"] == 15.0
        assert data["projected_tickets"] == 40000

    def test_apac_region_data(self):
        data = get_region_data("APAC")
        assert data["active_agents"] == 50
        assert data["aht_minutes"] == 10.0
        assert data["projected_tickets"] == 25000

    def test_global_assumptions(self):
        data = get_global_assumptions()
        assert data["working_hours_per_month"] == 160.0
        assert data["shrinkage_rate"] == 0.20
        assert data["utilization_target"] == 0.85


class TestValidators:
    def test_valid_regions(self):
        assert validate_region("NAMER") == "NAMER"
        assert validate_region("namer") == "NAMER"
        assert validate_region("emea") == "EMEA"

    def test_region_aliases(self):
        assert validate_region("Asia") == "APAC"
        assert validate_region("EU") == "EMEA"
        assert validate_region("North America") == "NAMER"
        assert validate_region("ASIA-PACIFIC") == "APAC"

    def test_invalid_region(self):
        with pytest.raises(ValidationError):
            validate_region("LATAM")


class TestMaxCapacity:
    """Golden answers: NAMER=43520, EMEA=43520, APAC=32640."""

    def test_namer_capacity(self):
        result = calculate_max_capacity("NAMER")
        assert result["max_tickets"] == 43520
        assert result["agents"] == 100
        assert result["aht_minutes"] == 15.0

    def test_emea_capacity(self):
        result = calculate_max_capacity("EMEA")
        assert result["max_tickets"] == 43520
        assert result["agents"] == 80
        assert result["aht_minutes"] == 12.0

    def test_apac_capacity(self):
        result = calculate_max_capacity("APAC")
        assert result["max_tickets"] == 32640
        assert result["agents"] == 50

    def test_audit_trail_has_five_steps(self):
        result = calculate_max_capacity("NAMER")
        assert len(result["audit_trail"]) == 5

    def test_audit_trail_final_step_matches(self):
        result = calculate_max_capacity("NAMER")
        final_step = result["audit_trail"][-1]
        assert final_step["result"] == result["max_tickets"]

    def test_region_alias_works(self):
        result = calculate_max_capacity("ASIA")
        assert result["region"] == "APAC"
        assert result["max_tickets"] == 32640

    def test_invalid_region_raises(self):
        with pytest.raises(ValidationError):
            calculate_max_capacity("LATAM")


class TestRequiredHeadcount:
    """Golden answer for Prompt 3: APAC +30% vol, +2 min AHT -> 10 net-new."""

    def test_apac_whatif_prompt3(self):
        """The EXACT scenario from the Rippling exercise."""
        result = calculate_required_headcount(
            "APAC", volume_change_pct=30, aht_change_minutes=2
        )
        assert result["required_agents"] == 60
        assert result["net_new_needed"] == 10
        assert result["effective_volume"] == 32500
        assert result["effective_aht"] == 12.0
        assert result["current_agents"] == 50
        assert result["minutes_per_agent"] == 6528.0

    def test_ceiling_rounding(self):
        """390,000 / 6,528 = 59.7426... must round UP to 60, not down to 59."""
        result = calculate_required_headcount(
            "APAC", volume_change_pct=30, aht_change_minutes=2
        )
        assert result["required_agents"] == 60  # ceil(59.74), not floor

    def test_net_new_consistency(self):
        """net_new must equal required - current."""
        result = calculate_required_headcount(
            "APAC", volume_change_pct=30, aht_change_minutes=2
        )
        assert result["net_new_needed"] == result["required_agents"] - result["current_agents"]

    def test_no_change_returns_zero_net_new(self):
        """NAMER with no changes: 100 agents, capacity 43,520 > projected 40,000."""
        result = calculate_required_headcount("NAMER")
        # 40000 * 15 = 600,000 min / 6,528 = ceil(91.91) = 92 agents needed
        # 92 < 100 current -> net_new = 0
        assert result["net_new_needed"] == 0
        assert result["required_agents"] == 92

    def test_absolute_volume_override(self):
        """new_volume should replace projected_tickets entirely."""
        result = calculate_required_headcount("NAMER", new_volume=50000)
        # 50000 * 15 = 750,000 / 6,528 = ceil(114.89) = 115
        assert result["required_agents"] == 115
        assert result["net_new_needed"] == 15
        assert result["effective_volume"] == 50000

    def test_absolute_aht_override(self):
        """new_aht should replace current AHT entirely."""
        result = calculate_required_headcount("EMEA", new_aht=15)
        # 35000 * 15 = 525,000 / 6,528 = ceil(80.44) = 81
        assert result["required_agents"] == 81
        assert result["effective_aht"] == 15.0

    def test_volume_decrease(self):
        """Negative volume change should reduce required agents."""
        result = calculate_required_headcount("NAMER", volume_change_pct=-20)
        # 40000 * 0.80 = 32000 tickets
        # 32000 * 15 = 480,000 / 6,528 = ceil(73.53) = 74
        assert result["effective_volume"] == 32000
        assert result["required_agents"] == 74
        assert result["net_new_needed"] == 0  # 74 < 100


class TestUtilization:
    def test_namer_utilization(self):
        result = calculate_utilization("NAMER")
        assert result["max_capacity"] == 43520
        assert result["headroom_tickets"] == 3520  # 43520 - 40000
        # Utilization: (40000 * 15) / (100 * 160 * 60 * 0.80) = 600000 / 768000 = 0.78125
        assert abs(result["projected_utilization"] - 0.78125) < 0.001
