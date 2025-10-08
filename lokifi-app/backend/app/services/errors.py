class ProviderError(Exception):
    """Generic data provider error."""


class RateLimitError(ProviderError):
    """Raised when a provider returns a rate limit (HTTP 429)."""


class NotFoundError(ProviderError):
    """Raised when the symbol/timeframe cannot be found."""
