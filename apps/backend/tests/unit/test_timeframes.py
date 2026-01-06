"""
Comprehensive tests for app/services/timeframes.py

Tests timeframe normalization and conversion utilities.
"""

import pytest


class TestCanonicalSet:
    """Tests for CANONICAL timeframe set"""

    def test_canonical_contains_expected_timeframes(self):
        """Should contain all expected canonical timeframes"""
        from app.services.timeframes import CANONICAL

        expected = {"1m", "5m", "15m", "1h", "4h", "1d"}
        assert expected == CANONICAL

    def test_canonical_is_set(self):
        """Should be a set for efficient lookup"""
        from app.services.timeframes import CANONICAL

        assert isinstance(CANONICAL, set)


class TestNormalize:
    """Tests for normalize function"""

    def test_normalize_1m_variants(self):
        """Should normalize 1-minute timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("1") == "1m"
        assert normalize("1min") == "1m"
        assert normalize("1m") == "1m"
        assert normalize("1M") == "1m"  # case insensitive
        assert normalize("1MIN") == "1m"

    def test_normalize_5m_variants(self):
        """Should normalize 5-minute timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("5") == "5m"
        assert normalize("5min") == "5m"
        assert normalize("5m") == "5m"
        assert normalize("5M") == "5m"

    def test_normalize_15m_variants(self):
        """Should normalize 15-minute timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("15") == "15m"
        assert normalize("15min") == "15m"
        assert normalize("15m") == "15m"

    def test_normalize_1h_variants(self):
        """Should normalize 1-hour timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("60") == "1h"
        assert normalize("1h") == "1h"
        assert normalize("1hr") == "1h"
        assert normalize("h1") == "1h"
        assert normalize("1H") == "1h"
        assert normalize("H1") == "1h"

    def test_normalize_4h_variants(self):
        """Should normalize 4-hour timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("240") == "4h"
        assert normalize("4h") == "4h"
        assert normalize("4hr") == "4h"
        assert normalize("h4") == "4h"
        assert normalize("4H") == "4h"

    def test_normalize_1d_variants(self):
        """Should normalize daily timeframe variants"""
        from app.services.timeframes import normalize

        assert normalize("1d") == "1d"
        assert normalize("d1") == "1d"
        assert normalize("day") == "1d"
        assert normalize("daily") == "1d"
        assert normalize("1D") == "1d"
        assert normalize("DAILY") == "1d"

    def test_normalize_handles_whitespace(self):
        """Should strip whitespace from input"""
        from app.services.timeframes import normalize

        assert normalize("  1m  ") == "1m"
        assert normalize("\t1h\n") == "1h"
        assert normalize(" 1 d ") == "1d"  # spaces removed

    def test_normalize_raises_for_unsupported(self):
        """Should raise ValueError for unsupported timeframes"""
        from app.services.timeframes import normalize

        with pytest.raises(ValueError) as exc_info:
            normalize("3m")
        assert "Unsupported timeframe" in str(exc_info.value)
        assert "3m" in str(exc_info.value)

    def test_normalize_raises_for_empty(self):
        """Should raise ValueError for empty string"""
        from app.services.timeframes import normalize

        with pytest.raises(ValueError):
            normalize("")

    def test_normalize_raises_for_invalid(self):
        """Should raise ValueError for completely invalid input"""
        from app.services.timeframes import normalize

        invalid_inputs = ["abc", "1w", "1week", "2h", "30m", "12h"]
        for invalid in invalid_inputs:
            with pytest.raises(ValueError):
                normalize(invalid)


class TestSeconds:
    """Tests for seconds function"""

    def test_seconds_1m(self):
        """Should return 60 seconds for 1-minute timeframe"""
        from app.services.timeframes import seconds

        assert seconds("1m") == 60
        assert seconds("1") == 60  # alias
        assert seconds("1min") == 60  # alias

    def test_seconds_5m(self):
        """Should return 300 seconds for 5-minute timeframe"""
        from app.services.timeframes import seconds

        assert seconds("5m") == 300
        assert seconds("5") == 300

    def test_seconds_15m(self):
        """Should return 900 seconds for 15-minute timeframe"""
        from app.services.timeframes import seconds

        assert seconds("15m") == 900
        assert seconds("15") == 900

    def test_seconds_1h(self):
        """Should return 3600 seconds for 1-hour timeframe"""
        from app.services.timeframes import seconds

        assert seconds("1h") == 3600
        assert seconds("60") == 3600
        assert seconds("1hr") == 3600

    def test_seconds_4h(self):
        """Should return 14400 seconds for 4-hour timeframe"""
        from app.services.timeframes import seconds

        assert seconds("4h") == 14400
        assert seconds("240") == 14400

    def test_seconds_1d(self):
        """Should return 86400 seconds for daily timeframe"""
        from app.services.timeframes import seconds

        assert seconds("1d") == 86400
        assert seconds("day") == 86400
        assert seconds("daily") == 86400

    def test_seconds_case_insensitive(self):
        """Should handle uppercase input"""
        from app.services.timeframes import seconds

        assert seconds("1M") == 60
        assert seconds("1H") == 3600
        assert seconds("1D") == 86400
        assert seconds("DAY") == 86400

    def test_seconds_with_whitespace(self):
        """Should handle input with whitespace"""
        from app.services.timeframes import seconds

        assert seconds("  1h  ") == 3600

    def test_seconds_raises_for_unsupported(self):
        """Should raise ValueError for unsupported timeframes"""
        from app.services.timeframes import seconds

        with pytest.raises(ValueError):
            seconds("2h")


class TestEdgeCases:
    """Edge case tests"""

    def test_normalize_preserves_canonical_values(self):
        """Canonical values should remain unchanged"""
        from app.services.timeframes import CANONICAL, normalize

        for tf in CANONICAL:
            assert normalize(tf) == tf

    def test_seconds_all_canonical_values(self):
        """All canonical timeframes should have defined seconds"""
        from app.services.timeframes import CANONICAL, seconds

        for tf in CANONICAL:
            result = seconds(tf)
            assert isinstance(result, int)
            assert result > 0

    def test_seconds_ordering(self):
        """Seconds should be in ascending order"""
        from app.services.timeframes import seconds

        assert seconds("1m") < seconds("5m")
        assert seconds("5m") < seconds("15m")
        assert seconds("15m") < seconds("1h")
        assert seconds("1h") < seconds("4h")
        assert seconds("4h") < seconds("1d")

    def test_normalize_unicode_input(self):
        """Should handle unicode input gracefully"""
        from app.services.timeframes import normalize

        # These should raise ValueError (unsupported)
        with pytest.raises(ValueError):
            normalize("1分钟")  # "1 minute" in Chinese
