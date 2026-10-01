"""Errors raised when an external ML/AI service cannot produce a result."""


class ExternalServiceError(Exception):
    """An upstream service failed; no substitute result is ever invented."""

    def __init__(self, service: str, status_code: int, detail: str):
        super().__init__(f"{service}: {detail}")
        self.service = service
        self.status_code = status_code
        self.detail = detail
