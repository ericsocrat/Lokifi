"""
Advanced Content Moderation Service for Lokifi AI Chatbot (J5.1).

Enhanced safety and moderation capabilities beyond basic filtering.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone, UTC
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ModerationLevel(str, Enum):
    """Content moderation severity levels."""

    SAFE = "safe"
    WARNING = "warning"
    BLOCKED = "blocked"
    FLAGGED = "flagged"


class ModerationCategory(str, Enum):
    """Categories of content that can be moderated."""

    HARMFUL = "harmful"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    ADULT_CONTENT = "adult_content"
    SPAM = "spam"
    PERSONAL_INFO = "personal_info"
    MISINFORMATION = "misinformation"


@dataclass
class ModerationResult:
    """Result of content moderation check."""

    level: ModerationLevel
    categories: list[ModerationCategory]
    confidence: float  # 0.0 - 1.0
    reason: str
    suggested_action: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class ContentModerator:
    """Advanced content moderation system."""

    def __init__(self):
        # Enhanced harmful patterns
        self.harmful_patterns = {
            ModerationCategory.HARMFUL: [
                r"\b(?:suicide|self.?harm|kill.?(?:myself|yourself))\b",
                r"\b(?:hurt|harm|damage).{0,20}\b(?:yourself|myself)\b",
                r"\b(?:end.?it.?all|not.?worth.?living)\b",
            ],
            ModerationCategory.HARASSMENT: [
                r"\b(?:stupid|idiot|moron|retard|dumb(?:ass)?)\b",
                r"\b(?:kill|die|death).{0,10}\b(?:you|yourself|u)\b",
                r"\b(?:hate|despise).{0,20}\byou\b",
            ],
            ModerationCategory.VIOLENCE: [
                r"\b(?:kill|murder|assassinate|eliminate).{0,20}\b(?:someone|people|person)\b",
                r"\b(?:weapon|gun|knife|bomb).{0,30}\b(?:make|create|build|get)\b",
                r"\b(?:violence|violent|attack|assault)\b",
            ],
            ModerationCategory.ADULT_CONTENT: [
                r"\b(?:sex|sexual|nude|naked|porn|xxx)\b",
                r"\b(?:adult|mature|explicit).{0,10}\b(?:content|material|image)\b",
            ],
            ModerationCategory.PERSONAL_INFO: [
                r"\b(?:ssn|social.?security)\b.{0,20}\d{3}.?\d{2}.?\d{4}",
                r"\b(?:credit.?card|cc)\b.{0,20}\d{4}.?\d{4}.?\d{4}.?\d{4}",
                r"\b\d{3}.\d{3}.\d{4}\b",  # Phone numbers
                r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
            ],
            ModerationCategory.SPAM: [
                r"\b(?:click|visit|buy|purchase).{0,20}\b(?:here|now|today)\b.{0,20}\b(?:http|www)\b",
                r"\b(?:free|win|prize|money|cash)\b.{0,30}\b(?:click|visit|call)\b",
                r"(.)\1{10,}",  # Repeated characters
            ],
        }

        # Compile patterns for performance
        self.compiled_patterns = {}
        for category, patterns in self.harmful_patterns.items():
            self.compiled_patterns[category] = [
                re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in patterns
            ]

        # User behavior tracking
        self.user_warnings = {}  # user_id -> warning count
        self.user_violations = {}  # user_id -> [(timestamp, category), ...]

    def moderate_content(
        self, content: str, user_id: int | None = None, context: str | None = None
    ) -> ModerationResult:
        """
        Perform comprehensive content moderation.

        Args:
            content: Text content to moderate
            user_id: Optional user ID for behavior tracking
            context: Optional context (e.g., "ai_chat", "profile")
        """

        if not content or not content.strip():
            return ModerationResult(
                level=ModerationLevel.SAFE, categories=[], confidence=1.0, reason="Empty content"
            )

        detected_categories = []
        highest_confidence = 0.0
        reasons = []

        # Check each category
        for category, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(content)
                if matches:
                    detected_categories.append(category)
                    confidence = min(1.0, len(matches) * 0.3)
                    highest_confidence = max(highest_confidence, confidence)
                    reasons.append(f"Detected {category.value}: {len(matches)} matches")

        # Additional checks
        toxicity_score = self._calculate_toxicity_score(content)
        if toxicity_score > 0.7:
            detected_categories.append(ModerationCategory.HARASSMENT)
            highest_confidence = max(highest_confidence, toxicity_score)
            reasons.append(f"High toxicity score: {toxicity_score:.2f}")

        # Determine moderation level
        level = self._determine_moderation_level(detected_categories, highest_confidence, user_id)

        # Update user tracking
        if user_id and detected_categories:
            self._update_user_tracking(user_id, detected_categories)

        return ModerationResult(
            level=level,
            categories=detected_categories,
            confidence=highest_confidence,
            reason="; ".join(reasons) if reasons else "Content passed all checks",
            suggested_action=self._get_suggested_action(level, detected_categories),
            metadata={
                "toxicity_score": toxicity_score,
                "word_count": len(content.split()),
                "context": context,
            },
        )

    def _calculate_toxicity_score(self, content: str) -> float:
        """Calculate basic toxicity score based on word patterns."""
        toxic_words = [
            "fuck",
            "shit",
            "damn",
            "bitch",
            "asshole",
            "bastard",
            "idiot",
            "stupid",
            "moron",
            "retard",
            "dumbass",
        ]

        words = content.lower().split()
        toxic_count = sum(1 for word in words if word in toxic_words)

        if len(words) == 0:
            return 0.0

        return min(1.0, toxic_count / len(words) * 5)  # Reduced scale

    def _determine_moderation_level(
        self, categories: list[ModerationCategory], confidence: float, user_id: int | None
    ) -> ModerationLevel:
        """Determine appropriate moderation level."""

        if not categories:
            return ModerationLevel.SAFE

        # High-risk categories get blocked immediately
        high_risk_categories = {
            ModerationCategory.HARMFUL,
            ModerationCategory.VIOLENCE,
            ModerationCategory.PERSONAL_INFO,
        }

        if any(cat in high_risk_categories for cat in categories):
            return ModerationLevel.BLOCKED

        # Consider user history
        if user_id and user_id in self.user_warnings:
            warning_count = self.user_warnings[user_id]
            if warning_count >= 3:
                return ModerationLevel.BLOCKED
            elif warning_count >= 1:
                return ModerationLevel.FLAGGED

        # Base on confidence
        if confidence >= 0.8:
            return ModerationLevel.BLOCKED
        elif confidence >= 0.5:
            return ModerationLevel.FLAGGED
        else:
            return ModerationLevel.WARNING

    def _get_suggested_action(
        self, level: ModerationLevel, categories: list[ModerationCategory]
    ) -> str | None:
        """Get suggested action for moderation result."""

        if level == ModerationLevel.BLOCKED:
            return "Block content and warn user"
        elif level == ModerationLevel.FLAGGED:
            return "Flag for human review"
        elif level == ModerationLevel.WARNING:
            return "Show warning to user"

        return None

    def _update_user_tracking(self, user_id: int, categories: list[ModerationCategory]):
        """Update user behavior tracking."""

        # Initialize if needed
        if user_id not in self.user_warnings:
            self.user_warnings[user_id] = 0
        if user_id not in self.user_violations:
            self.user_violations[user_id] = []

        # Add violation
        timestamp = datetime.now(UTC)
        for category in categories:
            self.user_violations[user_id].append((timestamp, category))

        # Increment warnings for serious violations
        serious_categories = {
            ModerationCategory.HARMFUL,
            ModerationCategory.HARASSMENT,
            ModerationCategory.VIOLENCE,
        }

        if any(cat in serious_categories for cat in categories):
            self.user_warnings[user_id] += 1

        # Clean old violations (older than 30 days)
        cutoff = timestamp - timedelta(days=30)
        self.user_violations[user_id] = [
            (ts, cat) for ts, cat in self.user_violations[user_id] if ts > cutoff
        ]

    def get_user_moderation_status(self, user_id: int) -> dict[str, Any]:
        """Get user's moderation status and history."""

        return {
            "warning_count": self.user_warnings.get(user_id, 0),
            "recent_violations": len(self.user_violations.get(user_id, [])),
            "violation_categories": list(
                set(cat.value for _, cat in self.user_violations.get(user_id, []))
            ),
            "risk_level": self._assess_user_risk(user_id),
        }

    def _assess_user_risk(self, user_id: int) -> str:
        """Assess user's overall risk level."""
        warnings = self.user_warnings.get(user_id, 0)
        violations = self.user_violations.get(user_id, [])

        if warnings >= 3 or len(violations) >= 10:
            return "high"
        elif warnings >= 1 or len(violations) >= 3:
            return "medium"
        else:
            return "low"

    def reset_user_warnings(self, user_id: int) -> bool:
        """Reset user warnings (admin action)."""
        if user_id in self.user_warnings:
            del self.user_warnings[user_id]
            return True
        return False

    def is_content_safe_for_ai(self, content: str) -> bool:
        """Quick check if content is safe for AI processing."""
        result = self.moderate_content(content)
        return result.level in [ModerationLevel.SAFE, ModerationLevel.WARNING]


# Global content moderator instance
content_moderator = ContentModerator()


def moderate_ai_input(content: str, user_id: int) -> ModerationResult:
    """Moderate AI chat input."""
    return content_moderator.moderate_content(content, user_id, "ai_chat")


def moderate_ai_output(content: str) -> ModerationResult:
    """Moderate AI-generated output."""
    # AI output typically gets lighter moderation
    result = content_moderator.moderate_content(content, None, "ai_output")

    # Only block AI output for severe violations
    if result.level == ModerationLevel.WARNING:
        result.level = ModerationLevel.SAFE

    return result
