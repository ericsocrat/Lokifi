"""
Notification Helper Functions
Extracted from setup_j6_integration for use in routers
"""

import os
import sys
from pathlib import Path
from typing import Any

# Add scripts directory to path to import setup_j6_integration
backend_dir = Path(__file__).parent.parent.parent
scripts_dir = backend_dir / "scripts"
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

# Now import
try:
    from setup_j6_integration import (
        process_mentions_in_content,
        trigger_ai_response_notification,
        trigger_dm_notification,
        trigger_follow_notification,
        trigger_mention_notification,
    )
except ImportError as e:
    # Fallback: Import from absolute path
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "setup_j6_integration", scripts_dir / "setup_j6_integration.py"
    )
    if spec and spec.loader:
        setup_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(setup_module)
        trigger_follow_notification = setup_module.trigger_follow_notification
        trigger_dm_notification = setup_module.trigger_dm_notification
        trigger_ai_response_notification = setup_module.trigger_ai_response_notification
        trigger_mention_notification = setup_module.trigger_mention_notification
        process_mentions_in_content = setup_module.process_mentions_in_content
    else:
        raise ImportError(
            f"Could not load setup_j6_integration from {scripts_dir}"
        ) from e

__all__ = [
    "trigger_follow_notification",
    "trigger_dm_notification",
    "trigger_ai_response_notification",
    "trigger_mention_notification",
    "process_mentions_in_content",
]
