"""
Tests for app.core.optimized_imports

Tests the LazyImporter class for optional dependency management.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.core.optimized_imports import LazyImporter, lazy_importer

# ============================================================================
# LAZY IMPORTER TESTS
# ============================================================================


class TestLazyImporter:
    """Tests for LazyImporter class"""

    def test_init_creates_empty_cache(self):
        """Test that LazyImporter initializes with empty cache"""
        importer = LazyImporter()
        assert importer._cache == {}
        assert isinstance(importer._cache, dict)

    def test_import_optional_success(self):
        """Test successful import of existing module"""
        importer = LazyImporter()

        # Import a standard library module
        result = importer.import_optional("json")

        assert result is not None
        assert "json" in importer._cache
        assert importer._cache["json"] == result

    def test_import_optional_caches_result(self):
        """Test that successful imports are cached"""
        importer = LazyImporter()

        # First import
        first_result = importer.import_optional("json")

        # Second import should return cached result
        second_result = importer.import_optional("json")

        assert first_result is second_result
        assert id(first_result) == id(second_result)

    def test_import_optional_nonexistent_module(self):
        """Test import of non-existent module"""
        importer = LazyImporter()

        # Try to import a module that doesn't exist
        result = importer.import_optional("nonexistent_module_12345")

        assert result is None
        assert "nonexistent_module_12345" in importer._cache
        assert importer._cache["nonexistent_module_12345"] is None

    def test_import_optional_caches_failures(self):
        """Test that failed imports are cached"""
        importer = LazyImporter()

        # First failed import
        first_result = importer.import_optional("nonexistent_module_abc")
        assert first_result is None

        # Second call should return cached None without attempting import again
        with patch("app.core.optimized_imports.importlib.import_module") as mock_import:
            second_result = importer.import_optional("nonexistent_module_abc")

            # import_module should NOT be called (cache hit)
            mock_import.assert_not_called()
            assert second_result is None

    def test_import_optional_with_package_parameter(self):
        """Test import with package parameter"""
        importer = LazyImporter()

        # Import with package parameter (e.g., relative imports)
        with patch("app.core.optimized_imports.importlib.import_module") as mock_import:
            mock_module = MagicMock()
            mock_import.return_value = mock_module

            result = importer.import_optional("submodule", package="mypackage")

            mock_import.assert_called_once_with("submodule", "mypackage")
            assert result == mock_module

    def test_ensure_available_success(self):
        """Test ensure_available with available module"""
        importer = LazyImporter()

        # Should not raise exception for existing module
        result = importer.ensure_available("json")
        assert result is not None

    def test_ensure_available_raises_import_error(self):
        """Test ensure_available raises ImportError for missing module"""
        importer = LazyImporter()

        # Should raise ImportError with installation hint
        with pytest.raises(ImportError) as exc_info:
            importer.ensure_available("nonexistent_module_xyz")

        error_message = str(exc_info.value)
        assert "nonexistent_module_xyz" in error_message
        assert "pip install" in error_message

    def test_ensure_available_custom_install_name(self):
        """Test ensure_available with custom install name"""
        importer = LazyImporter()

        # Test with custom install name
        with pytest.raises(ImportError) as exc_info:
            importer.ensure_available("cv2", install_name="opencv-python")

        error_message = str(exc_info.value)
        assert "cv2" in error_message
        assert "opencv-python" in error_message

    def test_import_optional_logs_warning_on_failure(self, caplog):
        """Test that import failures are logged"""
        importer = LazyImporter()

        with caplog.at_level("WARNING"):
            result = importer.import_optional("fake_module_logging_test")

        assert result is None
        # Check that a warning was logged
        assert len(caplog.records) > 0
        assert any("Optional import failed" in record.message for record in caplog.records)


# ============================================================================
# GLOBAL INSTANCE TESTS
# ============================================================================


class TestGlobalLazyImporter:
    """Tests for global lazy_importer instance"""

    def test_global_instance_exists(self):
        """Test that global lazy_importer is available"""
        assert lazy_importer is not None
        assert isinstance(lazy_importer, LazyImporter)

    def test_global_instance_is_singleton(self):
        """Test that multiple imports get same instance"""
        # Import again
        from app.core.optimized_imports import lazy_importer as second_import

        assert lazy_importer is second_import
        assert id(lazy_importer) == id(second_import)

    def test_global_instance_cache_persists(self):
        """Test that global instance cache persists across calls"""
        # Import something using global instance
        lazy_importer.import_optional("os")

        # Cache should contain the import
        assert "os" in lazy_importer._cache


# ============================================================================
# EDGE CASES
# ============================================================================


class TestLazyImporterEdgeCases:
    """Edge case tests for LazyImporter"""

    def test_import_empty_string(self):
        """Test importing empty string module name"""
        importer = LazyImporter()

        # importlib.import_module raises ValueError for empty string
        with pytest.raises(ValueError):
            importer.import_optional("")

    def test_import_none_module_name(self):
        """Test importing with None as module name"""
        importer = LazyImporter()

        # importlib.import_module raises AttributeError for None
        with pytest.raises(AttributeError):
            importer.import_optional(None)  # type: ignore

    def test_concurrent_imports_same_module(self):
        """Test that concurrent imports don't cause issues"""
        importer = LazyImporter()

        # Simulate concurrent imports (though Python GIL makes true concurrency unlikely)
        results = [importer.import_optional("json") for _ in range(10)]

        # All results should be the same cached instance
        assert all(r is results[0] for r in results)
