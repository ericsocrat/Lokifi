"""
Tests for app.api.routes.alerts

Comprehensive tests for Alerts API Routes.
Tests alert CRUD operations, streaming, and auth.
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.alerts import (
    CreateAlert,
    PctChangeConfig,
    PriceThresholdConfig,
    create_alert,
    delete_alert,
    list_alerts,
    router,
    stream_alerts,
    toggle_alert,
)

# ============================================================================
# PYDANTIC MODEL TESTS
# ============================================================================


class TestPriceThresholdConfig:
    """Tests for PriceThresholdConfig model"""

    def test_default_direction_is_above(self):
        """Test default direction is above"""
        config = PriceThresholdConfig(price=100.0)
        assert config.direction == "above"

    def test_direction_above(self):
        """Test direction can be above"""
        config = PriceThresholdConfig(direction="above", price=100.0)
        assert config.direction == "above"

    def test_direction_below(self):
        """Test direction can be below"""
        config = PriceThresholdConfig(direction="below", price=50.0)
        assert config.direction == "below"

    def test_price_required(self):
        """Test price is required"""
        config = PriceThresholdConfig(price=99.99)
        assert config.price == 99.99


class TestPctChangeConfig:
    """Tests for PctChangeConfig model"""

    def test_default_direction_is_abs(self):
        """Test default direction is abs"""
        config = PctChangeConfig()
        assert config.direction == "abs"

    def test_default_window_minutes(self):
        """Test default window is 60 minutes"""
        config = PctChangeConfig()
        assert config.window_minutes == 60

    def test_default_threshold_pct(self):
        """Test default threshold is 1.0%"""
        config = PctChangeConfig()
        assert config.threshold_pct == 1.0

    def test_direction_up(self):
        """Test direction can be up"""
        config = PctChangeConfig(direction="up")
        assert config.direction == "up"

    def test_direction_down(self):
        """Test direction can be down"""
        config = PctChangeConfig(direction="down")
        assert config.direction == "down"

    def test_window_minutes_range(self):
        """Test window minutes within valid range"""
        config = PctChangeConfig(window_minutes=1440)
        assert config.window_minutes == 1440


class TestCreateAlertModel:
    """Tests for CreateAlert model"""

    def test_price_threshold_type(self):
        """Test price_threshold type"""
        alert = CreateAlert(
            type="price_threshold",
            symbol="BTCUSD",
            config={"direction": "above", "price": 50000},
        )
        assert alert.type == "price_threshold"

    def test_pct_change_type(self):
        """Test pct_change type"""
        alert = CreateAlert(
            type="pct_change",
            symbol="ETHUSD",
            config={"direction": "up", "threshold_pct": 5.0},
        )
        assert alert.type == "pct_change"

    def test_default_timeframe(self):
        """Test default timeframe is 1h"""
        alert = CreateAlert(type="price_threshold", symbol="BTC", config={})
        assert alert.timeframe == "1h"

    def test_default_min_interval_sec(self):
        """Test default min_interval_sec is 300"""
        alert = CreateAlert(type="price_threshold", symbol="BTC", config={})
        assert alert.min_interval_sec == 300

    def test_handle_is_optional(self):
        """Test handle is optional"""
        alert = CreateAlert(type="price_threshold", symbol="BTC", config={})
        assert alert.handle is None


# ============================================================================
# LIST ALERTS TESTS
# ============================================================================


class TestListAlerts:
    """Tests for list_alerts endpoint"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.get_user_alerts", new_callable=AsyncMock)
    @patch("app.api.routes.alerts.require_handle")
    async def test_returns_user_alerts(self, mock_require, mock_get_alerts):
        """Test returns alerts for authenticated user"""
        mock_require.return_value = "testuser"
        mock_get_alerts.return_value = [{"id": "123", "owner_handle": "testuser"}]

        result = await list_alerts(authorization="Bearer token")

        assert len(result) == 1
        assert result[0]["id"] == "123"
        mock_get_alerts.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.get_user_alerts", new_callable=AsyncMock)
    @patch("app.api.routes.alerts.require_handle")
    async def test_filters_other_users_alerts(self, mock_require, mock_get_alerts):
        """Test filters out other users' alerts (done by cached query)"""
        mock_require.return_value = "testuser"
        # Cached query already filters, so only return user's alerts
        mock_get_alerts.return_value = [{"id": "123", "owner_handle": "testuser"}]

        result = await list_alerts(authorization="Bearer token")

        assert len(result) == 1
        assert result[0]["id"] == "123"
        mock_get_alerts.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.get_user_alerts", new_callable=AsyncMock)
    @patch("app.api.routes.alerts.require_handle")
    async def test_includes_legacy_alerts_with_none_owner(
        self, mock_require, mock_get_alerts
    ):
        """Test includes legacy alerts with None owner (done by cached query)"""
        mock_require.return_value = "testuser"
        # Cached query includes legacy alerts
        mock_get_alerts.return_value = [{"id": "legacy", "owner_handle": None}]

        result = await list_alerts(authorization="Bearer token")

        assert len(result) == 1
        assert result[0]["id"] == "legacy"
        mock_get_alerts.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.get_user_alerts", new_callable=AsyncMock)
    @patch("app.api.routes.alerts.require_handle")
    async def test_returns_empty_list_when_no_alerts(
        self, mock_require, mock_get_alerts
    ):
        """Test returns empty list when no alerts"""
        mock_require.return_value = "testuser"
        mock_get_alerts.return_value = []

        result = await list_alerts(authorization="Bearer token")

        assert result == []
        mock_get_alerts.assert_called_once_with("testuser")


# ============================================================================
# CREATE ALERT TESTS
# ============================================================================


class TestCreateAlert:
    """Tests for create_alert endpoint"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_creates_price_threshold_alert(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test creates price threshold alert"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold",
            symbol="BTCUSD",
            config={"direction": "above", "price": 50000},
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["type"] == "price_threshold"
        assert result["symbol"] == "BTCUSD"
        assert result["owner_handle"] == "testuser"
        mock_store.add.assert_called_once()
        mock_invalidate.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_creates_pct_change_alert(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test creates percent change alert"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="pct_change",
            symbol="ETHUSD",
            config={"direction": "up", "window_minutes": 60, "threshold_pct": 5.0},
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["type"] == "pct_change"
        assert result["symbol"] == "ETHUSD"
        mock_invalidate.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.require_handle")
    async def test_rejects_invalid_config(self, mock_require):
        """Test rejects invalid config"""
        mock_require.return_value = "testuser"

        payload = CreateAlert(
            type="price_threshold",
            symbol="BTCUSD",
            config={"invalid_key": "bad"},  # Missing required 'price'
        )

        with pytest.raises(HTTPException) as exc_info:
            await create_alert(payload, authorization="Bearer token")

        assert exc_info.value.status_code == 422
        assert "Invalid config" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_alert_has_generated_id(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test alert has generated UUID id"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold", symbol="BTC", config={"price": 100}
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert "id" in result
        assert len(result["id"]) == 32  # UUID hex

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_alert_has_created_at_timestamp(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test alert has created_at timestamp"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold", symbol="BTC", config={"price": 100}
        )

        before = time.time()
        result = await create_alert(payload, authorization="Bearer token")
        after = time.time()

        assert before <= result["created_at"] <= after

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_alert_is_active_by_default(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test alert is active by default"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold", symbol="BTC", config={"price": 100}
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["active"] is True


# ============================================================================
# DELETE ALERT TESTS
# ============================================================================


class TestDeleteAlert:
    """Tests for delete_alert endpoint"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_deletes_own_alert(self, mock_require, mock_store, mock_invalidate):
        """Test deletes user's own alert"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "alert123"
        mock_alert.owner_handle = "testuser"
        mock_store.list = AsyncMock(return_value=[mock_alert])
        mock_store.remove = AsyncMock(return_value=True)

        result = await delete_alert(alert_id="alert123", authorization="Bearer token")

        assert result["deleted"] is True
        assert result["id"] == "alert123"
        mock_invalidate.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_deletes_legacy_alert(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test deletes legacy alert with None owner"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "legacy123"
        mock_alert.owner_handle = None
        mock_store.list = AsyncMock(return_value=[mock_alert])
        mock_store.remove = AsyncMock(return_value=True)

        result = await delete_alert(alert_id="legacy123", authorization="Bearer token")

        assert result["deleted"] is True

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_returns_404_for_nonexistent_alert(self, mock_require, mock_store):
        """Test returns 404 for nonexistent alert"""
        mock_require.return_value = "testuser"
        mock_store.list = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await delete_alert(alert_id="nonexistent", authorization="Bearer token")

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_returns_403_for_other_users_alert(self, mock_require, mock_store):
        """Test returns 403 for other user's alert"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "other123"
        mock_alert.owner_handle = "otheruser"
        mock_store.list = AsyncMock(return_value=[mock_alert])

        with pytest.raises(HTTPException) as exc_info:
            await delete_alert(alert_id="other123", authorization="Bearer token")

        assert exc_info.value.status_code == 403


# ============================================================================
# TOGGLE ALERT TESTS
# ============================================================================


class TestToggleAlert:
    """Tests for toggle_alert endpoint"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_activates_alert(self, mock_require, mock_store, mock_invalidate):
        """Test activates alert"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "alert123"
        mock_alert.owner_handle = "testuser"
        mock_store.list = AsyncMock(return_value=[mock_alert])

        updated_alert = MagicMock()
        updated_alert.id = "alert123"
        updated_alert.active = True
        mock_store.set_active = AsyncMock(return_value=updated_alert)

        result = await toggle_alert(
            alert_id="alert123", active=True, authorization="Bearer token"
        )

        assert result["id"] == "alert123"
        assert result["active"] is True
        mock_invalidate.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_deactivates_alert(self, mock_require, mock_store, mock_invalidate):
        """Test deactivates alert"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "alert123"
        mock_alert.owner_handle = "testuser"
        mock_store.list = AsyncMock(return_value=[mock_alert])

        updated_alert = MagicMock()
        updated_alert.id = "alert123"
        updated_alert.active = False
        mock_store.set_active = AsyncMock(return_value=updated_alert)

        result = await toggle_alert(
            alert_id="alert123", active=False, authorization="Bearer token"
        )

        assert result["active"] is False
        mock_invalidate.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_toggle_returns_404_for_nonexistent(self, mock_require, mock_store):
        """Test toggle returns 404 for nonexistent alert"""
        mock_require.return_value = "testuser"
        mock_store.list = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await toggle_alert(
                alert_id="nonexistent", active=True, authorization="Bearer token"
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_toggle_returns_403_for_other_users_alert(
        self, mock_require, mock_store
    ):
        """Test toggle returns 403 for other user's alert"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "other123"
        mock_alert.owner_handle = "otheruser"
        mock_store.list = AsyncMock(return_value=[mock_alert])

        with pytest.raises(HTTPException) as exc_info:
            await toggle_alert(
                alert_id="other123", active=True, authorization="Bearer token"
            )

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.invalidate_alerts_cache")
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_toggle_handles_store_returning_none(
        self, mock_require, mock_store, mock_invalidate
    ):
        """Test toggle handles store returning None (no cache invalidation on failure)"""
        mock_require.return_value = "testuser"

        mock_alert = MagicMock()
        mock_alert.id = "alert123"
        mock_alert.owner_handle = "testuser"
        mock_store.list = AsyncMock(return_value=[mock_alert])
        mock_store.set_active = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await toggle_alert(
                alert_id="alert123", active=True, authorization="Bearer token"
            )

        assert exc_info.value.status_code == 404
        # Cache invalidation not called when store.set_active returns None
        mock_invalidate.assert_not_called()


# ============================================================================
# STREAM ALERTS TESTS
# ============================================================================


class TestStreamAlerts:
    """Tests for stream_alerts endpoint"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.hub")
    @patch("app.api.routes.alerts.auth_handle_from_header")
    async def test_stream_returns_event_source_response(self, mock_auth, mock_hub):
        """Test stream returns EventSourceResponse"""
        mock_auth.return_value = "testuser"
        mock_hub.register = AsyncMock(return_value=AsyncMock())

        result = await stream_alerts(authorization="Bearer token")

        # EventSourceResponse is returned
        assert result is not None

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.hub")
    @patch("app.api.routes.alerts.auth_handle_from_header")
    async def test_stream_registers_with_hub(self, mock_auth, mock_hub):
        """Test stream registers with hub"""
        mock_auth.return_value = "testuser"
        mock_hub.register = AsyncMock(return_value=AsyncMock())

        await stream_alerts(authorization="Bearer token")

        mock_hub.register.assert_called_once()


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestAlertsRouter:
    """Tests for router configuration"""

    def test_router_exists(self):
        """Test router is defined"""
        assert router is not None

    def test_router_has_get_alerts(self):
        """Test router has GET /alerts endpoint"""
        routes = [r.path for r in router.routes]
        assert "/alerts" in routes

    def test_router_has_post_alerts(self):
        """Test router has POST /alerts endpoint"""
        paths_methods = [(r.path, list(r.methods)) for r in router.routes]
        assert any(
            path == "/alerts" and "POST" in methods for path, methods in paths_methods
        )

    def test_router_has_delete_alert(self):
        """Test router has DELETE /alerts/{alert_id} endpoint"""
        paths_methods = [(r.path, list(r.methods)) for r in router.routes]
        assert any(
            "/alerts/{alert_id}" in path and "DELETE" in methods
            for path, methods in paths_methods
        )

    def test_router_has_toggle_alert(self):
        """Test router has POST /alerts/{alert_id}/toggle endpoint"""
        routes = [r.path for r in router.routes]
        assert "/alerts/{alert_id}/toggle" in routes

    def test_router_has_stream_alerts(self):
        """Test router has GET /alerts/stream endpoint"""
        routes = [r.path for r in router.routes]
        assert "/alerts/stream" in routes


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Edge case tests"""

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_create_alert_with_custom_min_interval(
        self, mock_require, mock_store
    ):
        """Test creating alert with custom min_interval_sec"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold",
            symbol="BTC",
            min_interval_sec=600,
            config={"price": 100},
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["min_interval_sec"] == 600

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_create_alert_with_custom_timeframe(self, mock_require, mock_store):
        """Test creating alert with custom timeframe"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold",
            symbol="BTC",
            timeframe="4h",
            config={"price": 100},
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["timeframe"] == "4h"

    @pytest.mark.asyncio
    @patch("app.api.routes.alerts.store")
    @patch("app.api.routes.alerts.require_handle")
    async def test_create_alert_last_triggered_is_none(self, mock_require, mock_store):
        """Test new alert has last_triggered_at as None"""
        mock_require.return_value = "testuser"
        mock_store.add = AsyncMock()

        payload = CreateAlert(
            type="price_threshold", symbol="BTC", config={"price": 100}
        )

        result = await create_alert(payload, authorization="Bearer token")

        assert result["last_triggered_at"] is None

    def test_pct_change_config_window_minutes_min(self):
        """Test PctChangeConfig window_minutes minimum is 1"""
        config = PctChangeConfig(window_minutes=1)
        assert config.window_minutes == 1

    def test_pct_change_config_window_minutes_max(self):
        """Test PctChangeConfig window_minutes maximum is 1440"""
        config = PctChangeConfig(window_minutes=1440)
        assert config.window_minutes == 1440
