"""
Performance monitoring utilities for Phase K
"""

import logging
import time
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from functools import wraps
from typing import Any

logger = logging.getLogger(__name__)

class PerformanceMetrics:
    """Performance metrics collector"""
    
    def __init__(self):
        self.metrics: dict[str, dict[str, float]] = {}
    
    def record(self, operation: str, duration: float, success: bool = True):
        """Record operation metrics"""
        
        if operation not in self.metrics:
            self.metrics[operation] = {
                'total_calls': 0,
                'total_duration': 0.0,
                'avg_duration': 0.0,
                'min_duration': float('inf'),
                'max_duration': 0.0,
                'success_count': 0,
                'error_count': 0
            }
        
        stats = self.metrics[operation]
        stats['total_calls'] += 1
        stats['total_duration'] += duration
        stats['avg_duration'] = stats['total_duration'] / stats['total_calls']
        stats['min_duration'] = min(stats['min_duration'], duration)
        stats['max_duration'] = max(stats['max_duration'], duration)
        
        if success:
            stats['success_count'] += 1
        else:
            stats['error_count'] += 1
    
    def get_summary(self) -> dict[str, Any]:
        """Get performance summary"""
        return {
            'operations': len(self.metrics),
            'metrics': self.metrics
        }

# Global metrics instance
performance_metrics = PerformanceMetrics()

@asynccontextmanager
async def measure_async(operation: str) -> AsyncGenerator[None, None]:
    """Context manager for measuring async operations"""
    
    start_time = time.time()
    success = True
    
    try:
        yield
    except Exception:
        success = False
        raise
    finally:
        duration = time.time() - start_time
        performance_metrics.record(operation, duration, success)

def measure_sync(operation: str):
    """Decorator for measuring sync operations"""
    
    def decorator(func: Callable[..., Any]):
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            start_time = time.time()
            success = True
            
            try:
                return func(*args, **kwargs)
            except Exception:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                performance_metrics.record(operation, duration, success)
        
        return wrapper
    return decorator
