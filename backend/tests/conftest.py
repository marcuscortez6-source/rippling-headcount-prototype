import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (requires API key)")
    config.addinivalue_line("markers", "ai: marks tests requiring Claude API")
