class HeadcountError(Exception):
    """Base error for all headcount tool errors."""
    def __init__(self, message, error_type="UNKNOWN"):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)


class DataNotFoundError(HeadcountError):
    def __init__(self, message):
        super().__init__(message, "DATA_NOT_FOUND")


class ValidationError(HeadcountError):
    def __init__(self, field, value, reason, valid_options=None):
        self.field = field
        self.value = value
        self.reason = reason
        self.valid_options = valid_options
        message = f"Validation error on '{field}': {reason}"
        super().__init__(message, "VALIDATION_ERROR")


class ComputationError(HeadcountError):
    def __init__(self, message):
        super().__init__(message, "COMPUTATION_ERROR")


class SanityCheckError(HeadcountError):
    def __init__(self, message):
        super().__init__(message, "SANITY_CHECK_FAILED")
