"""
Optimized import management for Phase K components
"""

import importlib
import logging
from typing import Any

logger = logging.getLogger(__name__)

class LazyImporter:
    """Lazy import manager for optional dependencies"""
    
    def __init__(self):
        self._cache: dict[str, Any] = {}
    
    def import_optional(self, module_name: str, package: str | None = None):
        """Import module with fallback handling"""
        
        if module_name in self._cache:
            return self._cache[module_name]
        
        try:
            module = importlib.import_module(module_name, package)
            self._cache[module_name] = module
            return module
        except ImportError as e:
            logger.warning(f"Optional import failed: {module_name} - {e}")
            self._cache[module_name] = None
            return None
    
    def ensure_available(self, module_name: str, install_name: str | None = None):
        """Ensure module is available or provide installation hint"""
        
        module = self.import_optional(module_name)
        if module is None:
            pkg_name = install_name or module_name
            raise ImportError(
                f"Required package '{module_name}' not available. "
                f"Install with: pip install {pkg_name}"
            )
        return module

# Global lazy importer instance
lazy_importer = LazyImporter()
