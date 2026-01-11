import asyncio

import pytest
from fastapi import FastAPI

from app.services.j53_scheduler import (
    J53OptimizationScheduler,
    get_scheduler_status,
    j53_lifespan_manager,
    j53_router,
    scheduler,
)


class TestJ53SchedulerStatus:
    """Test J5.3 Scheduler status endpoint"""

    @pytest.mark.asyncio
    async def test_get_scheduler_status(self):
        """Test scheduler status endpoint returns disabled status"""
        response = await get_scheduler_status()
        assert response["status"] == "disabled"
        assert "reason" in response
        assert "message" in response

    @pytest.mark.asyncio
    async def test_scheduler_status_disabled_reason(self):
        """Test scheduler status includes disabled reason"""
        response = await get_scheduler_status()
        assert "async" in response["reason"].lower()

    @pytest.mark.asyncio
    async def test_scheduler_status_message(self):
        """Test scheduler status includes message about future restoration"""
        response = await get_scheduler_status()
        assert "future" in response["message"].lower()


class TestJ53OptimizationScheduler:
    """Test J5.3 Optimization Scheduler class"""

    def test_scheduler_initialization(self):
        """Test scheduler initializes in disabled mode"""
        test_scheduler = J53OptimizationScheduler()
        assert test_scheduler.active is False

    @pytest.mark.asyncio
    async def test_scheduler_start_disabled(self):
        """Test scheduler start when disabled doesn't raise"""
        test_scheduler = J53OptimizationScheduler()
        # Should not raise any exception
        await test_scheduler.start()
        assert test_scheduler.active is False

    @pytest.mark.asyncio
    async def test_scheduler_stop_disabled(self):
        """Test scheduler stop when disabled doesn't raise"""
        test_scheduler = J53OptimizationScheduler()
        # Should not raise any exception
        await test_scheduler.stop()

    @pytest.mark.asyncio
    async def test_scheduler_start_stop_sequence(self):
        """Test scheduler start/stop sequence"""
        test_scheduler = J53OptimizationScheduler()
        await test_scheduler.start()
        assert test_scheduler.active is False
        await test_scheduler.stop()
        assert test_scheduler.active is False


class TestJ53LifespanManager:
    """Test J5.3 lifespan manager"""

    @pytest.mark.asyncio
    async def test_lifespan_manager_startup(self):
        """Test lifespan manager startup sequence"""
        app = FastAPI()
        async with j53_lifespan_manager(app) as result:
            # Manager should yield without error
            assert result is None

    @pytest.mark.asyncio
    async def test_lifespan_manager_shutdown(self):
        """Test lifespan manager shutdown sequence"""
        app = FastAPI()
        # Should complete without errors
        async with j53_lifespan_manager(app):
            pass


class TestJ53RouterSetup:
    """Test J5.3 Router configuration"""

    def test_j53_router_exists(self):
        """Test j53_router is properly configured"""
        assert j53_router is not None

    def test_j53_router_has_status_route(self):
        """Test j53_router has status endpoint"""
        routes = [route.path for route in j53_router.routes]
        assert any("/j53/status" in route for route in routes)


class TestSchedulerGlobalInstance:
    """Test global scheduler instance"""

    def test_scheduler_instance_exists(self):
        """Test global scheduler instance is created"""
        assert scheduler is not None

    def test_scheduler_instance_is_j53_class(self):
        """Test global scheduler is instance of J53OptimizationScheduler"""
        assert isinstance(scheduler, J53OptimizationScheduler)

    def test_scheduler_instance_inactive(self):
        """Test global scheduler instance starts inactive"""
        assert scheduler.active is False

    @pytest.mark.asyncio
    async def test_scheduler_instance_start(self):
        """Test global scheduler instance can start (disabled mode)"""
        await scheduler.start()
        # Should remain disabled
        assert scheduler.active is False

    @pytest.mark.asyncio
    async def test_scheduler_instance_stop(self):
        """Test global scheduler instance can stop"""
        await scheduler.stop()


class TestJ53IntegrationWithFastAPI:
    """Test J5.3 integration with FastAPI"""

    @pytest.mark.asyncio
    async def test_lifespan_context_manager_protocol(self):
        """Test lifespan manager follows context manager protocol"""
        app = FastAPI()
        # Should support async context manager protocol
        async with j53_lifespan_manager(app):
            pass  # Should complete without error
