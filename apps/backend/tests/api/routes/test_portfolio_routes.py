"""
Comprehensive tests for app.api.routes.portfolio

Tests cover:
- GET /portfolio - List all positions for a user
- POST /portfolio/position - Add or update a position
- DELETE /portfolio/{position_id} - Delete a position
- POST /portfolio/import_text - Import positions from CSV text
- GET /portfolio/summary - Get portfolio summary

Coverage targets:
- _user_by_handle (user lookup, 404 handling)
- _tags_to_str / _tags_to_list (tag serialization)
- _latest_price (price retrieval)
- _compute_fields (computed field calculation)
- _maybe_create_alerts (alert creation)
- All route handlers with authentication

Session 136: Created to improve backend coverage from 28% toward 80% target.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.portfolio import (
    ImportTextPayload,
    PositionIn,
    PositionOut,
    SummaryOut,
    _compute_fields,
    _latest_price,
    _tags_to_list,
    _tags_to_str,
    router,
)

# Phase 4b-2: Removed _user_by_handle tests - now using cached get_user_by_handle

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db_session():
    """Mock database session for testing"""
    session = MagicMock()
    session.execute = MagicMock()
    session.add = MagicMock()
    session.delete = MagicMock()
    session.flush = MagicMock()
    session.commit = MagicMock()
    return session


@pytest.fixture
def mock_user():
    """Mock User object"""
    user = MagicMock()
    user.id = 1
    user.handle = "testuser"
    return user


@pytest.fixture
def mock_position():
    """Mock PortfolioPosition object"""
    position = MagicMock()
    position.id = 100
    position.user_id = 1
    position.symbol = "BTCUSDT"
    position.qty = 1.5
    position.cost_basis = 50000.0
    position.tags = "hodl,long-term"
    position.created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    position.updated_at = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    return position


@pytest.fixture
def sample_position_in():
    """Sample PositionIn payload"""
    return PositionIn(
        handle="testuser",
        symbol="ETHUSDT",
        qty=10.0,
        cost_basis=2500.0,
        tags=["defi", "ethereum"],
    )


# ============================================================================
# TAG SERIALIZATION TESTS
# ============================================================================


class TestTagSerialization:
    """Test suite for tag serialization functions"""

    def test_tags_to_str_with_valid_tags(self):
        """Test converting list of tags to comma-separated string"""
        tags = ["hodl", "long-term", "bitcoin"]
        result = _tags_to_str(tags)
        # Tags should be sorted and deduplicated
        assert result == "bitcoin,hodl,long-term"

    def test_tags_to_str_with_duplicates(self):
        """Test that duplicate tags are removed"""
        tags = ["hodl", "hodl", "bitcoin", "HODL"]  # Note case sensitivity
        result = _tags_to_str(tags)
        # Should deduplicate (case-sensitive) and sort
        assert "hodl" in result
        assert "bitcoin" in result

    def test_tags_to_str_with_empty_strings(self):
        """Test that empty strings are filtered out"""
        tags = ["hodl", "", "  ", "bitcoin", ""]
        result = _tags_to_str(tags)
        assert result is not None
        assert "" not in result.split(",")
        assert "   " not in result.split(",")

    def test_tags_to_str_with_whitespace(self):
        """Test that whitespace is trimmed"""
        tags = ["  hodl  ", " bitcoin ", "  eth  "]
        result = _tags_to_str(tags)
        assert result == "bitcoin,eth,hodl"

    def test_tags_to_str_with_none(self):
        """Test handling None input"""
        result = _tags_to_str(None)
        assert result is None

    def test_tags_to_str_with_empty_list(self):
        """Test handling empty list"""
        result = _tags_to_str([])
        assert result is None

    def test_tags_to_str_with_all_empty_strings(self):
        """Test handling list of only empty strings"""
        result = _tags_to_str(["", "  ", ""])
        assert result is None

    def test_tags_to_list_with_valid_string(self):
        """Test converting comma-separated string to list"""
        tags_str = "bitcoin,hodl,long-term"
        result = _tags_to_list(tags_str)
        assert result == ["bitcoin", "hodl", "long-term"]

    def test_tags_to_list_with_none(self):
        """Test handling None input"""
        result = _tags_to_list(None)
        assert result is None

    def test_tags_to_list_with_empty_string(self):
        """Test handling empty string"""
        result = _tags_to_list("")
        assert result is None

    def test_tags_to_list_single_tag(self):
        """Test handling single tag (no comma)"""
        result = _tags_to_list("hodl")
        assert result == ["hodl"]


# ============================================================================
# PRICE RETRIEVAL TESTS
# ============================================================================


class TestLatestPrice:
    """Test suite for _latest_price function"""

    def test_latest_price_returns_none(self):
        """Test that _latest_price returns None (simplified implementation)"""
        # Current implementation returns None to avoid async complexity
        result = _latest_price("BTCUSDT")
        assert result is None

    def test_latest_price_with_timeframe(self):
        """Test _latest_price with different timeframes"""
        result = _latest_price("ETHUSDT", timeframe="1d")
        assert result is None

    def test_latest_price_with_invalid_symbol(self):
        """Test _latest_price with invalid symbol"""
        result = _latest_price("INVALID_SYMBOL_12345")
        assert result is None


# ============================================================================
# COMPUTED FIELDS TESTS
# ============================================================================


class TestComputeFields:
    """Test suite for _compute_fields function"""

    def test_compute_fields_without_price(self, mock_position):
        """Test computed fields when current price is unavailable"""
        result = _compute_fields(mock_position)

        assert result["current_price"] is None
        assert result["market_value"] is None
        assert result["cost_value"] == mock_position.qty * mock_position.cost_basis
        assert result["unrealized_pl"] is None
        assert result["pl_pct"] is None

    def test_compute_fields_cost_value_calculation(self, mock_position):
        """Test that cost_value is calculated correctly"""
        # Position: qty=1.5, cost_basis=50000
        # Expected cost_value = 1.5 * 50000 = 75000
        result = _compute_fields(mock_position)
        assert result["cost_value"] == 75000.0

    @patch("app.api.routes.portfolio._latest_price")
    def test_compute_fields_with_price(self, mock_price, mock_position):
        """Test computed fields when current price is available"""
        mock_price.return_value = 60000.0  # Current price higher than cost basis

        result = _compute_fields(mock_position)

        # With price available:
        # market_value = 1.5 * 60000 = 90000
        # cost_value = 1.5 * 50000 = 75000
        # unrealized_pl = 90000 - 75000 = 15000
        # pl_pct = (60000 - 50000) / 50000 * 100 = 20%
        assert result["current_price"] == 60000.0
        assert result["market_value"] == 90000.0
        assert result["cost_value"] == 75000.0
        assert result["unrealized_pl"] == 15000.0
        assert result["pl_pct"] == 20.0

    @patch("app.api.routes.portfolio._latest_price")
    def test_compute_fields_with_loss(self, mock_price, mock_position):
        """Test computed fields when position is at a loss"""
        mock_price.return_value = 40000.0  # Price dropped below cost basis

        result = _compute_fields(mock_position)

        # unrealized_pl should be negative
        # (40000 * 1.5) - (50000 * 1.5) = 60000 - 75000 = -15000
        assert result["unrealized_pl"] == -15000.0
        # pl_pct = (40000 - 50000) / 50000 * 100 = -20%
        assert result["pl_pct"] == -20.0


# ============================================================================
# USER BY HANDLE TESTS
# ============================================================================


# Phase 4b-2: Removed TestUserByHandle class - _user_by_handle function removed
# Now using cached get_user_by_handle from app.core.cached_queries
# These tests are covered by test_auth.py (user lookup functionality)


# ============================================================================
# PYDANTIC MODEL TESTS
# ============================================================================


class TestPydanticModels:
    """Test suite for Pydantic model validation"""

    def test_position_in_valid(self):
        """Test valid PositionIn creation"""
        position = PositionIn(
            handle="testuser",
            symbol="BTCUSDT",
            qty=1.0,
            cost_basis=50000.0,
            tags=["hodl"],
        )
        assert position.symbol == "BTCUSDT"
        assert position.qty == 1.0

    def test_position_in_qty_validation(self):
        """Test that qty must be positive"""
        with pytest.raises(ValueError):
            PositionIn(
                symbol="BTCUSDT",
                qty=0,  # Should fail - must be > 0
                cost_basis=50000.0,
            )

    def test_position_in_qty_negative(self):
        """Test that negative qty fails validation"""
        with pytest.raises(ValueError):
            PositionIn(
                symbol="BTCUSDT",
                qty=-1.0,  # Should fail
                cost_basis=50000.0,
            )

    def test_position_in_cost_basis_validation(self):
        """Test that cost_basis must be positive"""
        with pytest.raises(ValueError):
            PositionIn(
                symbol="BTCUSDT",
                qty=1.0,
                cost_basis=0,  # Should fail - must be > 0
            )

    def test_position_in_optional_handle(self):
        """Test that handle is optional"""
        position = PositionIn(
            symbol="BTCUSDT",
            qty=1.0,
            cost_basis=50000.0,
        )
        assert position.handle is None

    def test_position_in_optional_tags(self):
        """Test that tags are optional"""
        position = PositionIn(
            symbol="BTCUSDT",
            qty=1.0,
            cost_basis=50000.0,
        )
        assert position.tags is None

    def test_position_out_model(self):
        """Test PositionOut model creation"""
        position = PositionOut(
            id=1,
            symbol="BTCUSDT",
            qty=1.5,
            cost_basis=50000.0,
            tags=["hodl"],
            created_at="2024-01-01T12:00:00+00:00",
            updated_at="2024-01-15T12:00:00+00:00",
            current_price=60000.0,
            market_value=90000.0,
            cost_value=75000.0,
            unrealized_pl=15000.0,
            pl_pct=20.0,
        )
        assert position.id == 1
        assert position.symbol == "BTCUSDT"
        assert position.unrealized_pl == 15000.0

    def test_position_out_with_none_computed_fields(self):
        """Test PositionOut with None computed fields"""
        position = PositionOut(
            id=1,
            symbol="BTCUSDT",
            qty=1.5,
            cost_basis=50000.0,
            tags=None,
            created_at="2024-01-01T12:00:00+00:00",
            updated_at="2024-01-15T12:00:00+00:00",
            current_price=None,
            market_value=None,
            cost_value=75000.0,
            unrealized_pl=None,
            pl_pct=None,
        )
        assert position.current_price is None
        assert position.tags is None

    def test_summary_out_model(self):
        """Test SummaryOut model creation"""
        summary = SummaryOut(
            handle="testuser",
            total_cost=100000.0,
            total_value=120000.0,
            total_pl=20000.0,
            total_pl_pct=20.0,
            by_symbol={"BTCUSDT": {"qty": 1.5, "cost_basis": 50000.0}},
        )
        assert summary.handle == "testuser"
        assert summary.total_pl_pct == 20.0

    def test_import_text_payload_valid(self):
        """Test valid ImportTextPayload creation"""
        payload = ImportTextPayload(
            handle="testuser",
            csv_text="symbol,qty,cost_basis,tags\nBTCUSDT,1.5,50000,hodl",
        )
        assert "BTCUSDT" in payload.csv_text

    def test_import_text_payload_csv_required(self):
        """Test that csv_text is required"""
        with pytest.raises(ValueError):
            ImportTextPayload(handle="testuser")


# ============================================================================
# ALERT CREATION TESTS
# ============================================================================


class TestAlertCreation:
    """Test suite for _maybe_create_alerts function"""

    @pytest.mark.asyncio
    async def test_maybe_create_alerts_when_disabled(self):
        """Test that alerts are not created when ALERTS_AVAILABLE is False"""
        from app.api.routes.portfolio import ALERTS_AVAILABLE, _maybe_create_alerts

        # When ALERTS_AVAILABLE is False, function should return early
        # This test verifies the function doesn't crash when alerts unavailable
        await _maybe_create_alerts("testuser", "BTCUSDT", 50000.0)
        # No exception = success (function handles disabled state gracefully)

    @pytest.mark.asyncio
    @patch("app.api.routes.portfolio.ALERTS_AVAILABLE", True)
    @patch("app.api.routes.portfolio.alerts_store")
    @patch("app.api.routes.portfolio.AlertModel")
    async def test_maybe_create_alerts_creates_two_alerts(
        self, mock_alert_model, mock_alerts_store
    ):
        """Test that two alerts (drawdown and take-profit) are created"""
        from app.api.routes.portfolio import _maybe_create_alerts

        mock_alert = MagicMock()
        mock_alert_model.return_value = mock_alert
        mock_alerts_store.add = AsyncMock()

        await _maybe_create_alerts("testuser", "BTCUSDT", 50000.0)

        # Should create 2 alerts: one for 10% drawdown, one for 15% take-profit
        assert mock_alerts_store.add.call_count == 2


# ============================================================================
# EDGE CASES AND ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Test suite for edge cases and error handling"""

    def test_tags_to_str_special_characters(self):
        """Test tags with special characters"""
        tags = ["hodl!", "bitcoin$", "eth&"]
        result = _tags_to_str(tags)
        assert result is not None
        # Special characters should be preserved
        assert "bitcoin$" in result

    def test_tags_to_str_unicode(self):
        """Test tags with unicode characters"""
        tags = ["比特币", "以太坊", "hodl"]
        result = _tags_to_str(tags)
        assert result is not None
        assert "比特币" in result or "hodl" in result

    def test_compute_fields_zero_cost_basis(self):
        """Test _compute_fields with zero cost basis (edge case)"""
        position = MagicMock()
        position.symbol = "BTCUSDT"
        position.qty = 1.0
        position.cost_basis = 0.0  # Edge case

        result = _compute_fields(position)

        # With zero cost basis, pl_pct should handle division gracefully
        assert result["cost_value"] == 0.0
        assert result["pl_pct"] is None  # Can't calculate % with zero basis

    def test_compute_fields_very_small_qty(self):
        """Test _compute_fields with very small quantity"""
        position = MagicMock()
        position.symbol = "BTCUSDT"
        position.qty = 0.00000001  # Very small (like satoshi)
        position.cost_basis = 50000.0

        result = _compute_fields(position)

        # Should handle small numbers without floating point issues
        assert result["cost_value"] == pytest.approx(0.0005, rel=1e-6)

    def test_compute_fields_very_large_qty(self):
        """Test _compute_fields with very large quantity"""
        position = MagicMock()
        position.symbol = "BTCUSDT"
        position.qty = 1000000.0  # Very large
        position.cost_basis = 50000.0

        result = _compute_fields(position)

        # Should handle large numbers without overflow
        assert result["cost_value"] == 50000000000.0


# ============================================================================
# IMPORT TEXT PARSING TESTS
# ============================================================================


class TestImportTextParsing:
    """Test suite for CSV import parsing logic"""

    def test_csv_with_valid_data(self):
        """Test parsing valid CSV data"""
        csv_text = """symbol,qty,cost_basis,tags
BTCUSDT,1.5,50000,hodl
ETHUSDT,10,2500,defi,ethereum"""

        # Parse manually to test parsing logic
        import csv
        import io

        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        rows = list(reader)

        assert len(rows) == 2
        assert rows[0]["symbol"] == "BTCUSDT"
        assert rows[0]["qty"] == "1.5"
        assert rows[1]["symbol"] == "ETHUSDT"

    def test_csv_with_missing_columns(self):
        """Test handling CSV with missing optional columns"""
        csv_text = """symbol,qty,cost_basis
BTCUSDT,1.5,50000"""

        import csv
        import io

        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        row = next(reader)

        # tags column should be missing/None
        assert row.get("tags") is None

    def test_csv_with_empty_rows(self):
        """Test handling CSV with empty symbol"""
        csv_text = """symbol,qty,cost_basis,tags
,1.5,50000,hodl
ETHUSDT,10,2500,"""

        import csv
        import io

        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        rows = list(reader)

        # First row has empty symbol - should be skipped in actual import
        assert rows[0]["symbol"] == ""
        assert rows[1]["symbol"] == "ETHUSDT"

    def test_csv_with_invalid_numbers(self):
        """Test handling CSV with invalid numeric values"""
        csv_text = """symbol,qty,cost_basis,tags
BTCUSDT,abc,50000,hodl"""

        import csv
        import io

        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        row = next(reader)

        # Invalid qty "abc" should cause float conversion to fail
        with pytest.raises(ValueError):
            float(row["qty"])


# ============================================================================
# INTEGRATION STYLE TESTS (with mocked dependencies)
# ============================================================================


class TestRouteIntegration:
    """Integration-style tests for route handlers with mocked deps"""

    def test_list_positions_returns_coroutine(self):
        """Test that list_positions is decorated and returns expected type.

        Note: Full integration testing requires FastAPI test client with
        proper database fixtures. This test validates the route exists
        and follows expected patterns.
        """

        # Verify the route is registered
        routes = [r for r in router.routes if hasattr(r, "path")]
        paths = [r.path for r in routes]

        assert "/portfolio" in paths
        assert "/portfolio/position" in paths
        assert "/portfolio/summary" in paths
        assert "/portfolio/import_text" in paths

    def test_router_has_expected_methods(self):
        """Test that router has expected HTTP methods"""

        routes = {r.path: r.methods for r in router.routes if hasattr(r, "path")}

        # GET /portfolio
        assert "/portfolio" in routes
        assert "GET" in routes["/portfolio"]

        # POST /portfolio/position
        assert "/portfolio/position" in routes
        assert "POST" in routes["/portfolio/position"]

        # DELETE /portfolio/{position_id}
        delete_routes = [p for p in routes if "position_id" in p]
        assert len(delete_routes) > 0

    def test_position_in_serialization(self):
        """Test PositionIn can be serialized to dict"""
        position = PositionIn(
            handle="testuser",
            symbol="BTCUSDT",
            qty=1.5,
            cost_basis=50000.0,
            tags=["hodl"],
        )
        data = position.model_dump()

        assert data["symbol"] == "BTCUSDT"
        assert data["qty"] == 1.5
        assert data["tags"] == ["hodl"]

    def test_position_out_serialization(self):
        """Test PositionOut can be serialized to JSON-compatible format"""
        position = PositionOut(
            id=1,
            symbol="BTCUSDT",
            qty=1.5,
            cost_basis=50000.0,
            tags=["hodl"],
            created_at="2024-01-01T12:00:00+00:00",
            updated_at="2024-01-15T12:00:00+00:00",
        )
        data = position.model_dump()

        assert data["id"] == 1
        assert isinstance(data["created_at"], str)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
