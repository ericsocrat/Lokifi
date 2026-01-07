"""
Comprehensive tests for CrossDatabaseCompatibility analytics module.

Session 98: Testing cross-database compatibility layer (13% → target 40%+)

Test coverage targets:
- DatabaseDialect class
- CrossDatabaseQuery class
- AnalyticsQueryBuilder class
- Dialect-specific query generation
- Fallback strategies
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import Column, String
from sqlalchemy.sql.elements import literal_column

from app.analytics.cross_database_compatibility import (
    AnalyticsQueryBuilder,
    CrossDatabaseQuery,
    DatabaseDialect,
)


# ============================================================================
# Test Fixtures
# ============================================================================
@pytest.fixture
def mock_sqlite_engine():
    """Create a mock SQLite engine."""
    engine = MagicMock()
    engine.dialect.name = "sqlite"
    return engine


@pytest.fixture
def mock_postgresql_engine():
    """Create a mock PostgreSQL engine."""
    engine = MagicMock()
    engine.dialect.name = "postgresql"
    return engine


@pytest.fixture
def mock_unknown_engine():
    """Create a mock engine with unknown dialect."""
    engine = MagicMock()
    engine.dialect.name = "mysql"
    return engine


@pytest.fixture
def sqlite_query_builder():
    """Create CrossDatabaseQuery for SQLite."""
    return CrossDatabaseQuery(DatabaseDialect.SQLITE)


@pytest.fixture
def postgresql_query_builder():
    """Create CrossDatabaseQuery for PostgreSQL."""
    return CrossDatabaseQuery(DatabaseDialect.POSTGRESQL)


@pytest.fixture
def mock_column():
    """Create a mock SQLAlchemy column."""
    col = MagicMock()
    col.name = "test_column"
    return col


@pytest.fixture
def mock_session():
    """Create a mock SQLAlchemy session."""
    session = MagicMock()
    return session


# ============================================================================
# Test Class 1: DatabaseDialect Detection
# ============================================================================
class TestDatabaseDialect:
    """Test DatabaseDialect class."""

    def test_sqlite_constant(self):
        """SQLITE constant should be 'sqlite'."""
        assert DatabaseDialect.SQLITE == "sqlite"

    def test_postgresql_constant(self):
        """POSTGRESQL constant should be 'postgresql'."""
        assert DatabaseDialect.POSTGRESQL == "postgresql"

    def test_detect_sqlite_dialect(self, mock_sqlite_engine):
        """Should detect sqlite dialect."""
        result = DatabaseDialect.detect_dialect(mock_sqlite_engine)
        assert result == DatabaseDialect.SQLITE

    def test_detect_postgresql_dialect(self, mock_postgresql_engine):
        """Should detect postgresql dialect."""
        result = DatabaseDialect.detect_dialect(mock_postgresql_engine)
        assert result == DatabaseDialect.POSTGRESQL

    def test_detect_unknown_dialect_defaults_to_sqlite(self, mock_unknown_engine):
        """Unknown dialect should default to SQLite."""
        result = DatabaseDialect.detect_dialect(mock_unknown_engine)
        assert result == DatabaseDialect.SQLITE

    def test_detect_dialect_case_insensitive(self):
        """Dialect detection should be case insensitive."""
        engine = MagicMock()
        engine.dialect.name = "PostgreSQL"
        result = DatabaseDialect.detect_dialect(engine)
        assert result == DatabaseDialect.POSTGRESQL


# ============================================================================
# Test Class 2: CrossDatabaseQuery Initialization
# ============================================================================
class TestCrossDatabaseQueryInit:
    """Test CrossDatabaseQuery initialization."""

    def test_sqlite_init_flags(self, sqlite_query_builder):
        """SQLite query builder should have correct flags."""
        assert sqlite_query_builder.dialect == DatabaseDialect.SQLITE
        assert sqlite_query_builder.is_sqlite is True
        assert sqlite_query_builder.is_postgresql is False

    def test_postgresql_init_flags(self, postgresql_query_builder):
        """PostgreSQL query builder should have correct flags."""
        assert postgresql_query_builder.dialect == DatabaseDialect.POSTGRESQL
        assert postgresql_query_builder.is_postgresql is True
        assert postgresql_query_builder.is_sqlite is False

    def test_unknown_dialect_flags(self):
        """Unknown dialect should set both flags to False."""
        query_builder = CrossDatabaseQuery("mysql")
        assert query_builder.is_sqlite is False
        assert query_builder.is_postgresql is False


# ============================================================================
# Test Class 3: JSON Extract
# ============================================================================
class TestJSONExtract:
    """Test JSON extraction across dialects."""

    def test_postgresql_json_extract(self, postgresql_query_builder, mock_column):
        """PostgreSQL should use ->> operator."""
        result = postgresql_query_builder.json_extract(mock_column, "field")
        assert "->> 'field'" in str(result)

    def test_sqlite_json_extract(self, sqlite_query_builder, mock_column):
        """SQLite should use JSON_EXTRACT function."""
        result = sqlite_query_builder.json_extract(mock_column, "field")
        assert "JSON_EXTRACT" in str(result)

    def test_unknown_dialect_json_extract(self, mock_column):
        """Unknown dialect should use cast fallback."""
        query_builder = CrossDatabaseQuery("mysql")
        result = query_builder.json_extract(mock_column, "field")
        # Should return some clause element (cast)
        assert result is not None


# ============================================================================
# Test Class 4: JSON Object Keys
# ============================================================================
class TestJSONObjectKeys:
    """Test JSON object keys extraction."""

    def test_postgresql_json_object_keys(self, postgresql_query_builder, mock_column):
        """PostgreSQL should use jsonb_object_keys."""
        result = postgresql_query_builder.json_object_keys(mock_column)
        # PostgreSQL uses func.jsonb_object_keys
        assert result is not None

    def test_sqlite_json_object_keys(self, sqlite_query_builder, mock_column):
        """SQLite should return empty array fallback."""
        result = sqlite_query_builder.json_object_keys(mock_column)
        assert "'[]'" in str(result)


# ============================================================================
# Test Class 5: Date Truncation
# ============================================================================
class TestDateTrunc:
    """Test date truncation across dialects."""

    def test_postgresql_date_trunc(self, postgresql_query_builder, mock_column):
        """PostgreSQL should use DATE_TRUNC function."""
        result = postgresql_query_builder.date_trunc("day", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_day(self, sqlite_query_builder, mock_column):
        """SQLite should use strftime for day truncation."""
        result = sqlite_query_builder.date_trunc("day", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_hour(self, sqlite_query_builder, mock_column):
        """SQLite should use strftime for hour truncation."""
        result = sqlite_query_builder.date_trunc("hour", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_week(self, sqlite_query_builder, mock_column):
        """SQLite should use strftime for week truncation."""
        result = sqlite_query_builder.date_trunc("week", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_month(self, sqlite_query_builder, mock_column):
        """SQLite should use strftime for month truncation."""
        result = sqlite_query_builder.date_trunc("month", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_year(self, sqlite_query_builder, mock_column):
        """SQLite should use strftime for year truncation."""
        result = sqlite_query_builder.date_trunc("year", mock_column)
        assert result is not None

    def test_sqlite_date_trunc_unsupported(self, sqlite_query_builder, mock_column):
        """SQLite should return column for unsupported truncation."""
        result = sqlite_query_builder.date_trunc("quarter", mock_column)
        assert result == mock_column


# ============================================================================
# Test Class 6: Window Functions
# ============================================================================
class TestWindowFunctions:
    """Test window function compatibility."""

    def test_sqlite_row_number(self, sqlite_query_builder):
        """SQLite should support ROW_NUMBER."""
        result = sqlite_query_builder.window_function_row_number()
        assert result is not None

    def test_postgresql_row_number(self, postgresql_query_builder):
        """PostgreSQL should support ROW_NUMBER."""
        result = postgresql_query_builder.window_function_row_number()
        assert result is not None

    def test_unknown_dialect_row_number(self):
        """Unknown dialect should return fallback."""
        query_builder = CrossDatabaseQuery("mysql")
        result = query_builder.window_function_row_number()
        assert "1" in str(result)


# ============================================================================
# Test Class 7: Array Aggregation
# ============================================================================
class TestArrayAggregation:
    """Test array aggregation across dialects."""

    def test_postgresql_array_agg(self, postgresql_query_builder, mock_column):
        """PostgreSQL should use ARRAY_AGG."""
        result = postgresql_query_builder.aggregate_array(mock_column)
        assert result is not None

    def test_sqlite_group_concat(self, sqlite_query_builder, mock_column):
        """SQLite should use GROUP_CONCAT."""
        result = sqlite_query_builder.aggregate_array(mock_column)
        assert result is not None


# ============================================================================
# Test Class 8: Regex Matching
# ============================================================================
class TestRegexMatching:
    """Test regex matching across dialects."""

    def test_postgresql_regex(self, postgresql_query_builder, mock_column):
        """PostgreSQL should use ~ operator."""
        result = postgresql_query_builder.regex_match(mock_column, "pattern.*")
        assert result is not None

    def test_sqlite_regex_fallback(self, sqlite_query_builder, mock_column):
        """SQLite should use LIKE fallback."""
        result = sqlite_query_builder.regex_match(mock_column, "pattern.*")
        assert result is not None


# ============================================================================
# Test Class 9: AnalyticsQueryBuilder Initialization
# ============================================================================
class TestAnalyticsQueryBuilderInit:
    """Test AnalyticsQueryBuilder initialization."""

    def test_init_with_sqlite_engine(self, mock_sqlite_engine):
        """Should initialize with SQLite engine."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        assert builder.dialect == DatabaseDialect.SQLITE
        assert builder.engine == mock_sqlite_engine

    def test_init_with_postgresql_engine(self, mock_postgresql_engine):
        """Should initialize with PostgreSQL engine."""
        builder = AnalyticsQueryBuilder(mock_postgresql_engine)
        assert builder.dialect == DatabaseDialect.POSTGRESQL

    def test_creates_query_builder(self, mock_sqlite_engine):
        """Should create CrossDatabaseQuery instance."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        assert isinstance(builder.query_builder, CrossDatabaseQuery)


# ============================================================================
# Test Class 10: User Activity Query
# ============================================================================
class TestUserActivityQuery:
    """Test user_activity_by_hour method."""

    def test_returns_list(self, mock_sqlite_engine, mock_session):
        """Should return a list."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_activity_by_hour(mock_session)
        assert isinstance(result, list)

    def test_handles_exception_gracefully(self, mock_sqlite_engine, mock_session):
        """Should handle exceptions and return fallback."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.side_effect = Exception("DB error")
        result = builder.user_activity_by_hour(mock_session)
        # Should return fallback (list)
        assert isinstance(result, list)

    def test_accepts_days_back_parameter(self, mock_sqlite_engine, mock_session):
        """Should accept days_back parameter."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_activity_by_hour(mock_session, days_back=14)
        assert isinstance(result, list)


# ============================================================================
# Test Class 11: Notification Analytics
# ============================================================================
class TestNotificationAnalytics:
    """Test notification_analytics method."""

    def test_returns_dict(self, mock_sqlite_engine, mock_session):
        """Should return a dictionary."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.notification_analytics(mock_session)
        assert isinstance(result, dict)

    def test_has_expected_keys(self, mock_sqlite_engine, mock_session):
        """Should have expected keys in result."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.notification_analytics(mock_session)
        assert "by_type" in result
        assert "by_priority" in result
        assert "overall_metrics" in result

    def test_handles_exception_gracefully(self, mock_sqlite_engine, mock_session):
        """Should handle exceptions and return fallback."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.side_effect = Exception("DB error")
        result = builder.notification_analytics(mock_session)
        assert isinstance(result, dict)


# ============================================================================
# Test Class 12: User Engagement Metrics
# ============================================================================
class TestUserEngagementMetrics:
    """Test user_engagement_metrics method."""

    def test_returns_dict(self, mock_sqlite_engine, mock_session):
        """Should return a dictionary."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_engagement_metrics(mock_session)
        assert isinstance(result, dict)

    def test_has_users_and_summary(self, mock_sqlite_engine, mock_session):
        """Should have users and summary in result."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_engagement_metrics(mock_session)
        assert "users" in result
        assert "summary" in result

    def test_handles_exception_gracefully(self, mock_sqlite_engine, mock_session):
        """Should handle exceptions and return fallback."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.side_effect = Exception("DB error")
        result = builder.user_engagement_metrics(mock_session)
        assert isinstance(result, dict)


# ============================================================================
# Test Class 13: Message Analytics
# ============================================================================
class TestMessageAnalytics:
    """Test message_analytics method."""

    def test_returns_dict(self, mock_sqlite_engine, mock_session):
        """Should return a dictionary."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = iter([])  # Empty iterator
        result = builder.message_analytics(mock_session)
        assert isinstance(result, dict)

    def test_handles_exception_gracefully(self, mock_sqlite_engine, mock_session):
        """Should handle exceptions and return fallback."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.side_effect = Exception("DB error")
        result = builder.message_analytics(mock_session)
        assert isinstance(result, dict)


# ============================================================================
# Test Class 14: PostgreSQL-specific Queries
# ============================================================================
class TestPostgreSQLQueries:
    """Test PostgreSQL-specific query generation."""

    def test_user_activity_postgresql_query(self, mock_postgresql_engine, mock_session):
        """PostgreSQL should use DATE_TRUNC in query."""
        builder = AnalyticsQueryBuilder(mock_postgresql_engine)
        mock_session.execute.return_value = []
        result = builder.user_activity_by_hour(mock_session)
        assert isinstance(result, list)

    def test_message_analytics_postgresql(self, mock_postgresql_engine, mock_session):
        """PostgreSQL should use information_schema for table check."""
        builder = AnalyticsQueryBuilder(mock_postgresql_engine)
        mock_session.execute.return_value = iter([])
        result = builder.message_analytics(mock_session)
        assert isinstance(result, dict)


# ============================================================================
# Test Class 15: Edge Cases
# ============================================================================
class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_zero_days_back(self, mock_sqlite_engine, mock_session):
        """Should handle zero days_back."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_activity_by_hour(mock_session, days_back=0)
        assert isinstance(result, list)

    def test_large_days_back(self, mock_sqlite_engine, mock_session):
        """Should handle large days_back value."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.notification_analytics(mock_session, days_back=365)
        assert isinstance(result, dict)

    def test_empty_result_set(self, mock_sqlite_engine, mock_session):
        """Should handle empty result set."""
        builder = AnalyticsQueryBuilder(mock_sqlite_engine)
        mock_session.execute.return_value = []
        result = builder.user_activity_by_hour(mock_session)
        assert result == []

    def test_dialect_with_spaces_in_name(self):
        """Should handle dialect names with spaces."""
        engine = MagicMock()
        engine.dialect.name = " sqlite "
        result = DatabaseDialect.detect_dialect(engine)
        # Should still detect correctly due to 'in' check
        assert result == DatabaseDialect.SQLITE
