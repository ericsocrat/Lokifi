"""
Enhanced Rate Limiting Service
"""

import logging
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

class EnhancedRateLimiter:
    """Memory-based rate limiter with sliding window"""
    
    def __init__(self):
        self.requests: dict[str, list] = defaultdict(list)
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
        
        # Rate limits per endpoint type
        self.limits = {
            "auth": {"requests": 5, "window": 300},      # 5 requests per 5 minutes
            "api": {"requests": 100, "window": 60},      # 100 requests per minute
            "websocket": {"requests": 50, "window": 60}, # 50 connections per minute
            "upload": {"requests": 10, "window": 60},    # 10 uploads per minute
        }
    
    async def check_rate_limit(self, 
                              identifier: str, 
                              limit_type: str = "api") -> tuple[bool, float | None]:
        """Check if request is within rate limit"""
        current_time = time.time()
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_old_entries(current_time)
            self.last_cleanup = current_time
        
        limit_config = self.limits.get(limit_type, self.limits["api"])
        max_requests = limit_config["requests"]
        window_size = limit_config["window"]
        
        # Get request history for this identifier
        request_times = self.requests[identifier]
        
        # Remove requests outside the current window
        cutoff_time = current_time - window_size
        request_times[:] = [t for t in request_times if t > cutoff_time]
        
        # Check if under limit
        if len(request_times) < max_requests:
            request_times.append(current_time)
            return True, None
        else:
            # Calculate retry after time
            oldest_request = min(request_times)
            retry_after = oldest_request + window_size - current_time
            return False, max(retry_after, 0)
    
    async def _cleanup_old_entries(self, current_time: float):
        """Remove old entries to prevent memory bloat"""
        max_window = max(config["window"] for config in self.limits.values())
        cutoff_time = current_time - max_window
        
        for identifier in list(self.requests.keys()):
            request_times = self.requests[identifier]
            request_times[:] = [t for t in request_times if t > cutoff_time]
            
            # Remove empty entries
            if not request_times:
                del self.requests[identifier]

# Global instance
enhanced_rate_limiter = EnhancedRateLimiter()
