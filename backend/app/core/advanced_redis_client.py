# Advanced Redis Client for Phase K Track 3
"""
Production-ready Redis client with advanced features:
- Connection pooling and sentinel support
- Multi-layer caching strategies
- Cache warming and invalidation
- Performance monitoring
- Failover handling
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Any

import redis.asyncio as redis
from redis.asyncio import ConnectionPool, Sentinel
from redis.backoff import ExponentialBackoff
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError
from redis.retry import Retry

from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheStrategy:
    """Cache strategy definitions"""
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind" 
    WRITE_AROUND = "write_around"
    READ_THROUGH = "read_through"
    REFRESH_AHEAD = "refresh_ahead"

class CacheMetrics:
    """Cache performance metrics tracking"""
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.writes = 0
        self.errors = 0
        self.response_times = deque(maxlen=1000)
        self.last_reset = datetime.now(UTC)
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0
    
    @property
    def avg_response_time(self) -> float:
        return sum(self.response_times) / len(self.response_times) if self.response_times else 0.0
    
    def record_hit(self, response_time: float = 0.0):
        self.hits += 1
        if response_time > 0:
            self.response_times.append(response_time)
    
    def record_miss(self, response_time: float = 0.0):
        self.misses += 1
        if response_time > 0:
            self.response_times.append(response_time)
    
    def record_write(self):
        self.writes += 1
    
    def record_error(self):
        self.errors += 1

class AdvancedRedisClient:
    """
    Advanced Redis client with production features:
    - Connection pooling and sentinel support
    - Multi-layer caching with TTL management
    - Performance monitoring and metrics
    - Automatic failover and circuit breaker
    - Cache warming and batch operations
    """
    
    def __init__(self):
        self.client: redis.Redis | None = None
        self.sentinel: Sentinel | None = None
        self.connected = False
        self.connection_pool = None
        self.metrics = CacheMetrics()
        self.cache_layers = {}
        self.warming_tasks = set()
        
        # Circuit breaker state
        self.circuit_breaker = {
            'failure_count': 0,
            'last_failure': None,
            'state': 'closed',  # closed, open, half_open
            'failure_threshold': 5,
            'recovery_timeout': 60
        }
        
        # Performance tracking
        self.operation_stats = defaultdict(lambda: {'count': 0, 'total_time': 0.0})
        
    async def initialize(self) -> bool:
        """Initialize Redis connection with sentinel support"""
        try:
            if settings.redis_sentinel_hosts:
                # Use Redis Sentinel for high availability
                sentinel_hosts = [
                    (host.split(':')[0], int(host.split(':')[1])) 
                    for host in settings.redis_sentinel_hosts.split(',')
                ]
                
                self.sentinel = Sentinel(
                    sentinel_hosts,
                    socket_timeout=0.5,
                    password=settings.redis_password if hasattr(settings, 'redis_password') else None
                )
                
                # Get primary Redis connection
                self.client = self.sentinel.master_for(
                    'lokifi-primary',
                    socket_timeout=0.5,
                    password=settings.redis_password if hasattr(settings, 'redis_password') else None,
                    retry=Retry(backoff=ExponentialBackoff(), retries=3),
                    health_check_interval=30
                )
                
                logger.info("Redis Sentinel connection established")
                
            else:
                # Standard Redis connection with pooling
                self.connection_pool = ConnectionPool(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    password=settings.redis_password if hasattr(settings, 'redis_password') else None,
                    max_connections=20,
                    retry_on_timeout=True,
                    retry=Retry(backoff=ExponentialBackoff(), retries=3),
                    health_check_interval=30
                )
                
                self.client = redis.Redis(connection_pool=self.connection_pool)
                logger.info(f"Redis connection pool established: {settings.redis_host}:{settings.redis_port}")
            
            # Test connection
            await self.client.ping()
            self.connected = True
            
            # Initialize cache layers
            await self._initialize_cache_layers()
            
            # Start background tasks
            asyncio.create_task(self._metrics_reporter())
            asyncio.create_task(self._cache_warmer())
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self.connected = False
            return False
    
    async def _initialize_cache_layers(self):
        """Initialize multi-layer cache structure"""
        self.cache_layers = {
            'hot': {'ttl': 300, 'max_size': 1000},      # 5 min, frequently accessed
            'warm': {'ttl': 1800, 'max_size': 5000},    # 30 min, moderately accessed  
            'cold': {'ttl': 3600, 'max_size': 10000},   # 1 hour, rarely accessed
            'session': {'ttl': 7200, 'max_size': 2000}, # 2 hours, user sessions
            'persistent': {'ttl': 86400, 'max_size': 1000} # 24 hours, long-term cache
        }
        
        for layer in self.cache_layers:
            try:
                # Set up layer-specific configurations
                await self.client.config_set('maxmemory-policy', 'allkeys-lru')
            except Exception as e:
                logger.warning(f"Failed to configure cache layer {layer}: {e}")
    
    async def is_available(self) -> bool:
        """Enhanced availability check with circuit breaker"""
        if self.circuit_breaker['state'] == 'open':
            # Check if recovery timeout has passed
            if (datetime.now(UTC) - 
                self.circuit_breaker['last_failure']).seconds >= self.circuit_breaker['recovery_timeout']:
                self.circuit_breaker['state'] = 'half_open'
                logger.info("Circuit breaker moving to half-open state")
            else:
                return False
        
        try:
            if not self.client:
                return False
                
            await self.client.ping()
            
            # Reset circuit breaker on successful ping
            if self.circuit_breaker['state'] != 'closed':
                self.circuit_breaker = {
                    'failure_count': 0,
                    'last_failure': None, 
                    'state': 'closed',
                    'failure_threshold': 5,
                    'recovery_timeout': 60
                }
                logger.info("Circuit breaker reset to closed state")
            
            return True
            
        except (RedisConnectionError, RedisError) as e:
            self._handle_circuit_breaker_failure()
            logger.error(f"Redis availability check failed: {e}")
            return False
    
    def _handle_circuit_breaker_failure(self):
        """Handle circuit breaker failure logic"""
        self.circuit_breaker['failure_count'] += 1
        self.circuit_breaker['last_failure'] = datetime.now(UTC)
        self.metrics.record_error()
        
        if (self.circuit_breaker['failure_count'] >= self.circuit_breaker['failure_threshold'] 
            and self.circuit_breaker['state'] == 'closed'):
            self.circuit_breaker['state'] = 'open'
            logger.warning("Circuit breaker opened due to repeated failures")
    
    async def get_with_layers(self, key: str, layer: str = 'warm') -> str | None:
        """Get value with multi-layer cache support"""
        start_time = time.time()
        
        try:
            if not await self.is_available():
                self.metrics.record_miss(time.time() - start_time)
                return None
            
            # Try to get from specified layer first
            layered_key = f"{layer}:{key}"
            result = await self.client.get(layered_key)
            
            if result:
                self.metrics.record_hit(time.time() - start_time)
                return result.decode('utf-8') if isinstance(result, bytes) else result
            
            # Try other layers if not found
            for layer_name in self.cache_layers:
                if layer_name != layer:
                    layered_key = f"{layer_name}:{key}"
                    result = await self.client.get(layered_key)
                    if result:
                        # Promote to requested layer
                        await self.set_with_layer(key, result, layer)
                        self.metrics.record_hit(time.time() - start_time)
                        return result.decode('utf-8') if isinstance(result, bytes) else result
            
            self.metrics.record_miss(time.time() - start_time)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get layered cache key {key}: {e}")
            self.metrics.record_error()
            return None
    
    async def set_with_layer(
        self, 
        key: str, 
        value: str, 
        layer: str = 'warm', 
        custom_ttl: int | None = None
    ) -> bool:
        """Set value in specific cache layer"""
        try:
            if not await self.is_available():
                return False
            
            layer_config = self.cache_layers.get(layer, self.cache_layers['warm'])
            ttl = custom_ttl or layer_config['ttl']
            layered_key = f"{layer}:{key}"
            
            await self.client.setex(layered_key, ttl, value)
            self.metrics.record_write()
            
            # Track operation stats
            self.operation_stats[f'set_{layer}']['count'] += 1
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set layered cache key {key} in layer {layer}: {e}")
            self.metrics.record_error()
            return False
    
    async def cache_warm_batch(self, keys: list[str], layer: str = 'warm') -> dict[str, Any]:
        """Warm cache with batch operation"""
        if not await self.is_available():
            return {}
        
        try:
            pipeline = self.client.pipeline()
            layered_keys = [f"{layer}:{key}" for key in keys]
            
            for layered_key in layered_keys:
                pipeline.get(layered_key)
            
            results = await pipeline.execute()
            
            # Return as dict
            cache_data = {}
            for i, key in enumerate(keys):
                if results[i]:
                    cache_data[key] = results[i].decode('utf-8') if isinstance(results[i], bytes) else results[i]
            
            logger.info(f"Cache warmed with {len(cache_data)} items in layer {layer}")
            return cache_data
            
        except Exception as e:
            logger.error(f"Failed to warm cache batch: {e}")
            return {}
    
    async def invalidate_pattern(self, pattern: str, layer: str | None = None) -> int:
        """Invalidate cache keys matching pattern"""
        try:
            if not await self.is_available():
                return 0
            
            if layer:
                search_pattern = f"{layer}:{pattern}"
            else:
                search_pattern = f"*:{pattern}"
            
            keys = await self.client.keys(search_pattern)
            if keys:
                deleted = await self.client.delete(*keys)
                logger.info(f"Invalidated {deleted} keys matching pattern: {pattern}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Failed to invalidate pattern {pattern}: {e}")
            return 0
    
    async def get_metrics(self) -> dict[str, Any]:
        """Get comprehensive cache metrics"""
        return {
            'hit_rate': self.metrics.hit_rate,
            'hits': self.metrics.hits,
            'misses': self.metrics.misses,
            'writes': self.metrics.writes,
            'errors': self.metrics.errors,
            'avg_response_time': self.metrics.avg_response_time,
            'circuit_breaker': self.circuit_breaker.copy(),
            'operation_stats': dict(self.operation_stats),
            'connection_status': self.connected,
            'cache_layers': self.cache_layers
        }
    
    async def _metrics_reporter(self):
        """Background task to report metrics"""
        while True:
            try:
                await asyncio.sleep(60)  # Report every minute
                metrics = await self.get_metrics()
                logger.info(f"Redis metrics: Hit rate: {metrics['hit_rate']:.1f}%, "
                          f"Ops: {metrics['hits'] + metrics['misses']}, "
                          f"Avg response: {metrics['avg_response_time']:.2f}ms")
            except Exception as e:
                logger.error(f"Metrics reporter error: {e}")
    
    async def _cache_warmer(self):
        """Background task for cache warming"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Warm frequently accessed notification data
                await self._warm_notification_cache()
                
            except Exception as e:
                logger.error(f"Cache warmer error: {e}")
    
    async def _warm_notification_cache(self):
        """Warm notification-specific cache"""
        try:
            # This would integrate with notification service
            # to pre-load frequently accessed notification data
            warm_keys = [
                "notification_stats:*",
                "unread_count:*", 
                "notification_prefs:*"
            ]
            
            for pattern in warm_keys:
                await self.cache_warm_batch([pattern], 'hot')
                
        except Exception as e:
            logger.error(f"Failed to warm notification cache: {e}")

# Global advanced Redis client instance
advanced_redis_client = AdvancedRedisClient()