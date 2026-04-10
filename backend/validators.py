from backend.errors import ValidationError

VALID_REGIONS = {"NAMER", "EMEA", "APAC"}
REGION_ALIASES = {
    "NA": "NAMER", "NORTH AMERICA": "NAMER", "US": "NAMER", "AMERICAS": "NAMER",
    "EUROPE": "EMEA", "EU": "EMEA",
    "ASIA": "APAC", "ASIA PACIFIC": "APAC", "ASIA-PACIFIC": "APAC",
}


def validate_region(region: str) -> str:
    """Normalize a region string to its canonical name (NAMER, EMEA, or APAC).

    Accepts aliases like 'NA', 'Europe', 'Asia-Pacific' and resolves them.
    Raises ValidationError if the region is not recognized.
    """
    normalized = region.strip().upper()
    if normalized in REGION_ALIASES:
        return REGION_ALIASES[normalized]
    if normalized in VALID_REGIONS:
        return normalized
    raise ValidationError(
        field="region",
        value=region,
        reason=f"'{region}' is not a recognized region.",
        valid_options=list(VALID_REGIONS),
    )


def validate_percentage(value: float, field_name: str) -> float:
    """Validate that a percentage value is within a reasonable range (-100, 1000)."""
    if value <= -100 or value >= 1000:
        raise ValidationError(
            field=field_name,
            value=value,
            reason=f"Must be greater than -100 and less than 1000, got {value}.",
        )
    return value


def validate_aht(value: float, field_name: str) -> float:
    """Validate that an average handle time is within a reasonable range (0, 120)."""
    if value <= 0 or value >= 120:
        raise ValidationError(
            field=field_name,
            value=value,
            reason=f"Must be greater than 0 and less than 120 minutes, got {value}.",
        )
    return value


def validate_volume(value: int, field_name: str) -> int:
    """Validate that a ticket volume is within a reasonable range [0, 10_000_000)."""
    if value < 0 or value >= 10_000_000:
        raise ValidationError(
            field=field_name,
            value=value,
            reason=f"Must be >= 0 and < 10,000,000, got {value}.",
        )
    return value
