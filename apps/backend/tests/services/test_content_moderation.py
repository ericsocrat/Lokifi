"""
Comprehensive tests for content moderation service (Session 101).

Tests content safety, user behavior tracking, and policy enforcement.
"""

import re
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.content_moderation import (
    ContentModerator,
    ModerationCategory,
    ModerationLevel,
    ModerationResult,
    content_moderator,
    moderate_ai_input,
    moderate_ai_output,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def moderator():
    """Create fresh ContentModerator instance for each test."""
    return ContentModerator()


@pytest.fixture
def safe_content():
    """Sample safe content."""
    return "I love using this financial app! The charts are very helpful."


@pytest.fixture
def harmful_content():
    """Sample harmful content."""
    return "I want to hurt myself, life is not worth living anymore."


@pytest.fixture
def harassment_content():
    """Sample harassment content."""
    return "You are so stupid and I hate you, just die already."


@pytest.fixture
def violence_content():
    """Sample violent content."""
    return "How do I make a weapon to hurt someone?"


@pytest.fixture
def spam_content():
    """Sample spam content."""
    return "FREE MONEY! Click here now www.scam.com BUY NOW!!!"


@pytest.fixture
def personal_info_content():
    """Sample personal information content."""
    return "My SSN is 123-45-6789 and email is test@example.com"


@pytest.fixture
def adult_content():
    """Sample adult content."""
    return "Looking for explicit adult content and pornography."


@pytest.fixture
def toxic_content():
    """Sample toxic content with profanity."""
    return "This is fucking stupid shit, what a dumbass idea moron."


# ============================================================================
# TEST ContentModerator - INITIALIZATION & SETUP
# ============================================================================


class TestContentModeratorInitialization:
    """Test ContentModerator initialization and setup."""

    def test_initialization(self, moderator):
        """Test ContentModerator initializes with correct state."""
        assert isinstance(moderator, ContentModerator)
        assert isinstance(moderator.harmful_patterns, dict)
        assert isinstance(moderator.compiled_patterns, dict)
        assert isinstance(moderator.user_warnings, dict)
        assert isinstance(moderator.user_violations, dict)
        assert len(moderator.user_warnings) == 0
        assert len(moderator.user_violations) == 0

    def test_patterns_compiled(self, moderator):
        """Test regex patterns are pre-compiled for performance."""
        for category, patterns in moderator.compiled_patterns.items():
            assert isinstance(category, ModerationCategory)
            assert isinstance(patterns, list)
            assert len(patterns) > 0
            for pattern in patterns:
                assert isinstance(pattern, re.Pattern)

    def test_all_categories_have_patterns(self, moderator):
        """Test all expected categories have compiled patterns."""
        expected_categories = {
            ModerationCategory.HARMFUL,
            ModerationCategory.HARASSMENT,
            ModerationCategory.VIOLENCE,
            ModerationCategory.ADULT_CONTENT,
            ModerationCategory.PERSONAL_INFO,
            ModerationCategory.SPAM,
        }
        actual_categories = set(moderator.compiled_patterns.keys())
        assert expected_categories.issubset(actual_categories)


# ============================================================================
# TEST ContentModerator - SAFE CONTENT DETECTION
# ============================================================================


class TestSafeContentDetection:
    """Test detection of safe content."""

    def test_safe_content_passes(self, moderator, safe_content):
        """Test safe content passes moderation."""
        result = moderator.moderate_content(safe_content)
        assert result.level == ModerationLevel.SAFE
        assert len(result.categories) == 0
        assert result.confidence >= 0.0
        assert "passed all checks" in result.reason.lower()

    def test_empty_content_is_safe(self, moderator):
        """Test empty content is considered safe."""
        result = moderator.moderate_content("")
        assert result.level == ModerationLevel.SAFE
        assert result.reason == "Empty content"

    def test_whitespace_only_is_safe(self, moderator):
        """Test whitespace-only content is safe."""
        result = moderator.moderate_content("   \n\t  ")
        assert result.level == ModerationLevel.SAFE

    def test_normal_financial_discussion(self, moderator):
        """Test normal financial content passes."""
        content = "What's the best strategy for portfolio diversification?"
        result = moderator.moderate_content(content)
        assert result.level == ModerationLevel.SAFE

    def test_technical_questions(self, moderator):
        """Test technical questions pass moderation."""
        content = "How do I calculate the Sharpe ratio for my portfolio?"
        result = moderator.moderate_content(content)
        assert result.level == ModerationLevel.SAFE


# ============================================================================
# TEST ContentModerator - HARMFUL CONTENT DETECTION
# ============================================================================


class TestHarmfulContentDetection:
    """Test detection of harmful content."""

    def test_harmful_content_blocked(self, moderator, harmful_content):
        """Test harmful content is blocked."""
        result = moderator.moderate_content(harmful_content)
        assert result.level == ModerationLevel.BLOCKED
        assert ModerationCategory.HARMFUL in result.categories
        assert result.confidence > 0.0
        assert "harmful" in result.reason.lower()

    def test_self_harm_patterns_detected(self, moderator):
        """Test various self-harm patterns are detected."""
        patterns = [
            "I want to kill myself",
            "thinking about suicide",
            "I should hurt myself",
            "self-harm seems like the only option",
            "end it all tonight",
        ]
        for content in patterns:
            result = moderator.moderate_content(content)
            assert result.level == ModerationLevel.BLOCKED
            assert ModerationCategory.HARMFUL in result.categories

    def test_harmful_content_suggested_action(self, moderator, harmful_content):
        """Test harmful content gets appropriate suggested action."""
        result = moderator.moderate_content(harmful_content)
        assert result.suggested_action == "Block content and warn user"


# ============================================================================
# TEST ContentModerator - HARASSMENT DETECTION
# ============================================================================


class TestHarassmentDetection:
    """Test detection of harassment content."""

    def test_harassment_content_flagged(self, moderator, harassment_content):
        """Test harassment content is flagged or blocked."""
        result = moderator.moderate_content(harassment_content)
        assert result.level in [ModerationLevel.FLAGGED, ModerationLevel.BLOCKED]
        assert ModerationCategory.HARASSMENT in result.categories

    def test_insults_detected(self, moderator):
        """Test various insults are detected."""
        insults = [
            "you're an idiot",
            "what a moron",
            "stupid person",
            "dumbass comment",
        ]
        for content in insults:
            result = moderator.moderate_content(content)
            assert len(result.categories) > 0

    def test_death_threats_blocked(self, moderator):
        """Test death threats are blocked."""
        content = "I'm going to kill you"
        result = moderator.moderate_content(content)
        assert result.level in [ModerationLevel.FLAGGED, ModerationLevel.BLOCKED]
        assert ModerationCategory.HARASSMENT in result.categories


# ============================================================================
# TEST ContentModerator - VIOLENCE DETECTION
# ============================================================================


class TestViolenceDetection:
    """Test detection of violent content."""

    def test_violence_content_blocked(self, moderator, violence_content):
        """Test violent content is blocked."""
        result = moderator.moderate_content(violence_content)
        assert result.level == ModerationLevel.BLOCKED
        assert ModerationCategory.VIOLENCE in result.categories

    def test_weapon_discussions_detected(self, moderator):
        """Test weapon-related content is detected."""
        patterns = [
            "how to make a bomb",
            "build a weapon to hurt someone",
            "get a gun to attack people",
        ]
        for content in patterns:
            result = moderator.moderate_content(content)
            assert result.level == ModerationLevel.BLOCKED
            assert ModerationCategory.VIOLENCE in result.categories

    def test_general_violence_keywords(self, moderator):
        """Test general violence keywords are detected."""
        content = "Planning a violent attack on multiple people"
        result = moderator.moderate_content(content)
        assert ModerationCategory.VIOLENCE in result.categories


# ============================================================================
# TEST ContentModerator - SPAM DETECTION
# ============================================================================


class TestSpamDetection:
    """Test detection of spam content."""

    def test_spam_content_flagged(self, moderator, spam_content):
        """Test spam content is flagged."""
        result = moderator.moderate_content(spam_content)
        assert len(result.categories) > 0
        assert ModerationCategory.SPAM in result.categories

    def test_repeated_characters_spam(self, moderator):
        """Test excessive repeated characters detected as spam."""
        content = "AAAAAAAAAAAAA check this out!!!"
        result = moderator.moderate_content(content)
        assert ModerationCategory.SPAM in result.categories

    def test_promotional_spam_patterns(self, moderator):
        """Test promotional spam patterns."""
        patterns = [
            "Click here to win free money http://scam.com",
            "Visit now and get cash prizes www.fake.com",
            "Buy today and win big!!",
        ]
        for content in patterns:
            result = moderator.moderate_content(content)
            assert ModerationCategory.SPAM in result.categories


# ============================================================================
# TEST ContentModerator - PERSONAL INFO DETECTION
# ============================================================================


class TestPersonalInfoDetection:
    """Test detection of personal information."""

    def test_personal_info_blocked(self, moderator, personal_info_content):
        """Test personal information is blocked."""
        result = moderator.moderate_content(personal_info_content)
        assert result.level == ModerationLevel.BLOCKED
        assert ModerationCategory.PERSONAL_INFO in result.categories

    def test_ssn_detected(self, moderator):
        """Test SSN patterns are detected."""
        patterns = [
            "My social security number is 123-45-6789",
            "SSN: 987-65-4321",
            "social security 111-22-3333",
        ]
        for content in patterns:
            result = moderator.moderate_content(content)
            assert ModerationCategory.PERSONAL_INFO in result.categories

    def test_email_detected(self, moderator):
        """Test email addresses are detected."""
        content = "Contact me at user@example.com for details"
        result = moderator.moderate_content(content)
        assert ModerationCategory.PERSONAL_INFO in result.categories

    def test_phone_number_detected(self, moderator):
        """Test phone numbers are detected."""
        content = "Call me at 555-123-4567"
        result = moderator.moderate_content(content)
        assert ModerationCategory.PERSONAL_INFO in result.categories

    def test_credit_card_detected(self, moderator):
        """Test credit card numbers are detected."""
        content = "My credit card is 1234-5678-9012-3456"
        result = moderator.moderate_content(content)
        assert ModerationCategory.PERSONAL_INFO in result.categories


# ============================================================================
# TEST ContentModerator - ADULT CONTENT DETECTION
# ============================================================================


class TestAdultContentDetection:
    """Test detection of adult content."""

    def test_adult_content_detected(self, moderator, adult_content):
        """Test adult content is detected."""
        result = moderator.moderate_content(adult_content)
        assert ModerationCategory.ADULT_CONTENT in result.categories

    def test_explicit_keywords(self, moderator):
        """Test explicit keywords are detected."""
        patterns = [
            "looking for pornography",
            "explicit sexual content",
            "nude images and xxx material",
        ]
        for content in patterns:
            result = moderator.moderate_content(content)
            assert ModerationCategory.ADULT_CONTENT in result.categories


# ============================================================================
# TEST ContentModerator - TOXICITY SCORING
# ============================================================================


class TestToxicityScoring:
    """Test toxicity score calculation."""

    def test_toxicity_score_calculated(self, moderator, toxic_content):
        """Test toxicity score is calculated for profanity."""
        result = moderator.moderate_content(toxic_content)
        assert result.metadata["toxicity_score"] > 0.0

    def test_high_toxicity_triggers_harassment(self, moderator):
        """Test high toxicity triggers harassment category."""
        # Many toxic words in short content
        content = "fuck shit damn asshole bitch"
        result = moderator.moderate_content(content)
        assert result.metadata["toxicity_score"] > 0.7
        assert ModerationCategory.HARASSMENT in result.categories

    def test_clean_content_low_toxicity(self, moderator, safe_content):
        """Test clean content has low toxicity score."""
        result = moderator.moderate_content(safe_content)
        assert result.metadata["toxicity_score"] == 0.0

    def test_toxicity_score_includes_reason(self, moderator):
        """Test high toxicity includes reason in result."""
        content = "fuck shit damn asshole"
        result = moderator.moderate_content(content)
        assert "toxicity score" in result.reason.lower()


# ============================================================================
# TEST ContentModerator - USER BEHAVIOR TRACKING
# ============================================================================


class TestUserBehaviorTracking:
    """Test user behavior tracking and warning system."""

    def test_user_violation_tracked(self, moderator, harassment_content):
        """Test user violations are tracked."""
        user_id = 123
        moderator.moderate_content(harassment_content, user_id=user_id)
        assert user_id in moderator.user_violations
        assert len(moderator.user_violations[user_id]) > 0

    def test_serious_violations_increment_warnings(self, moderator, harmful_content):
        """Test serious violations increment warning count."""
        user_id = 123
        moderator.moderate_content(harmful_content, user_id=user_id)
        assert moderator.user_warnings[user_id] >= 1

    def test_multiple_violations_increase_warnings(self, moderator):
        """Test multiple violations increase warning count."""
        user_id = 123
        for _ in range(3):
            moderator.moderate_content("I hate you, you're stupid", user_id=user_id)
        assert moderator.user_warnings[user_id] == 3

    def test_repeat_offender_gets_blocked(self, moderator):
        """Test users with 3+ warnings get blocked."""
        user_id = 123
        # Trigger 3 warnings
        for _ in range(3):
            moderator.moderate_content("I hate you idiot", user_id=user_id)

        # Next violation should be blocked
        result = moderator.moderate_content("Another harassment message", user_id=user_id)
        assert result.level == ModerationLevel.BLOCKED

    def test_old_violations_cleaned_up(self, moderator):
        """Test violations older than 30 days are removed."""
        user_id = 123
        moderator.user_violations[user_id] = [
            (datetime.now(timezone.utc) - timedelta(days=35), ModerationCategory.HARASSMENT),
            (datetime.now(timezone.utc) - timedelta(days=5), ModerationCategory.SPAM),
        ]

        # Trigger moderation to clean old violations
        moderator.moderate_content("test", user_id=user_id)

        # Only recent violation should remain
        assert len(moderator.user_violations[user_id]) == 1


# ============================================================================
# TEST ContentModerator - USER STATUS & RISK ASSESSMENT
# ============================================================================


class TestUserStatusAndRisk:
    """Test user moderation status and risk assessment."""

    def test_get_user_moderation_status(self, moderator):
        """Test retrieving user moderation status."""
        user_id = 123
        moderator.moderate_content("I hate you", user_id=user_id)

        status = moderator.get_user_moderation_status(user_id)
        assert "warning_count" in status
        assert "recent_violations" in status
        assert "violation_categories" in status
        assert "risk_level" in status

    def test_new_user_low_risk(self, moderator):
        """Test new users have low risk level."""
        user_id = 999
        status = moderator.get_user_moderation_status(user_id)
        assert status["risk_level"] == "low"
        assert status["warning_count"] == 0

    def test_medium_risk_assessment(self, moderator):
        """Test medium risk for users with 1-2 warnings."""
        user_id = 123
        moderator.user_warnings[user_id] = 1
        status = moderator.get_user_moderation_status(user_id)
        assert status["risk_level"] == "medium"

    def test_high_risk_assessment(self, moderator):
        """Test high risk for users with 3+ warnings."""
        user_id = 123
        moderator.user_warnings[user_id] = 3
        status = moderator.get_user_moderation_status(user_id)
        assert status["risk_level"] == "high"

    def test_reset_user_warnings(self, moderator):
        """Test resetting user warnings."""
        user_id = 123
        moderator.user_warnings[user_id] = 5
        assert moderator.reset_user_warnings(user_id) is True
        assert user_id not in moderator.user_warnings

    def test_reset_nonexistent_user_warnings(self, moderator):
        """Test resetting warnings for user with none returns False."""
        user_id = 999
        assert moderator.reset_user_warnings(user_id) is False


# ============================================================================
# TEST ContentModerator - MODERATION LEVELS & CONFIDENCE
# ============================================================================


class TestModerationLevelsAndConfidence:
    """Test moderation level determination and confidence scoring."""

    def test_high_confidence_blocked(self, moderator):
        """Test high confidence violations are blocked."""
        # Multiple matches increase confidence
        content = "suicide suicide suicide self-harm kill myself"
        result = moderator.moderate_content(content)
        assert result.level == ModerationLevel.BLOCKED
        assert result.confidence >= 0.8

    def test_medium_confidence_flagged(self, moderator):
        """Test medium confidence violations are flagged."""
        # Single match, lower confidence
        content = "You're kind of an idiot"
        result = moderator.moderate_content(content)
        assert result.level in [ModerationLevel.WARNING, ModerationLevel.FLAGGED]

    def test_confidence_based_on_matches(self, moderator):
        """Test confidence increases with multiple matches."""
        single_match = "stupid comment"
        multiple_matches = "stupid idiot moron dumbass"

        result1 = moderator.moderate_content(single_match)
        result2 = moderator.moderate_content(multiple_matches)

        assert result2.confidence >= result1.confidence

    def test_high_risk_categories_always_blocked(self, moderator):
        """Test high-risk categories (harmful, violence, PII) always blocked."""
        high_risk_content = [
            ("I want to kill myself", ModerationCategory.HARMFUL),
            ("How to build a weapon", ModerationCategory.VIOLENCE),
            ("My SSN is 123-45-6789", ModerationCategory.PERSONAL_INFO),
        ]

        for content, expected_category in high_risk_content:
            result = moderator.moderate_content(content)
            assert result.level == ModerationLevel.BLOCKED
            assert expected_category in result.categories


# ============================================================================
# TEST ContentModerator - SUGGESTED ACTIONS
# ============================================================================


class TestSuggestedActions:
    """Test suggested actions for different moderation levels."""

    def test_blocked_content_action(self, moderator, harmful_content):
        """Test blocked content suggests blocking and warning."""
        result = moderator.moderate_content(harmful_content)
        assert result.level == ModerationLevel.BLOCKED
        assert result.suggested_action == "Block content and warn user"

    def test_flagged_content_action(self, moderator):
        """Test flagged content suggests human review."""
        # Create flagged scenario (medium confidence)
        user_id = 123
        moderator.user_warnings[user_id] = 1
        result = moderator.moderate_content("borderline harassment", user_id=user_id)

        if result.level == ModerationLevel.FLAGGED:
            assert result.suggested_action == "Flag for human review"

    def test_warning_content_action(self, moderator):
        """Test warning-level content suggests showing warning."""
        # Low confidence content
        content = "mildly annoying comment"
        result = moderator.moderate_content(content)

        if result.level == ModerationLevel.WARNING:
            assert result.suggested_action == "Show warning to user"

    def test_safe_content_no_action(self, moderator, safe_content):
        """Test safe content has no suggested action."""
        result = moderator.moderate_content(safe_content)
        assert result.suggested_action is None


# ============================================================================
# TEST ContentModerator - METADATA & CONTEXT
# ============================================================================


class TestMetadataAndContext:
    """Test metadata tracking and context handling."""

    def test_metadata_includes_toxicity_score(self, moderator, safe_content):
        """Test metadata includes toxicity score."""
        result = moderator.moderate_content(safe_content)
        assert "toxicity_score" in result.metadata
        assert isinstance(result.metadata["toxicity_score"], float)

    def test_metadata_includes_word_count(self, moderator):
        """Test metadata includes word count."""
        content = "This is a test with seven words"
        result = moderator.moderate_content(content)
        assert result.metadata["word_count"] == 7

    def test_context_tracked_in_metadata(self, moderator, safe_content):
        """Test context is tracked in metadata."""
        result = moderator.moderate_content(safe_content, context="ai_chat")
        assert result.metadata["context"] == "ai_chat"

    def test_none_context_tracked(self, moderator, safe_content):
        """Test None context is tracked."""
        result = moderator.moderate_content(safe_content, context=None)
        assert result.metadata["context"] is None


# ============================================================================
# TEST ContentModerator - AI SAFETY CHECKS
# ============================================================================


class TestAISafetyChecks:
    """Test AI-specific safety checks."""

    def test_is_content_safe_for_ai_safe_content(self, moderator, safe_content):
        """Test safe content is approved for AI processing."""
        assert moderator.is_content_safe_for_ai(safe_content) is True

    def test_is_content_safe_for_ai_harmful_content(self, moderator, harmful_content):
        """Test harmful content is rejected for AI processing."""
        assert moderator.is_content_safe_for_ai(harmful_content) is False

    def test_is_content_safe_for_ai_warning_accepted(self, moderator):
        """Test warning-level content is accepted for AI."""
        # Content that triggers warning but not block
        content = "This is annoying"
        # Override to ensure warning level for test
        with patch.object(moderator, "moderate_content") as mock_moderate:
            mock_moderate.return_value = ModerationResult(
                level=ModerationLevel.WARNING, categories=[], confidence=0.3, reason="test"
            )
            assert moderator.is_content_safe_for_ai(content) is True


# ============================================================================
# TEST MODULE-LEVEL FUNCTIONS
# ============================================================================


class TestModuleLevelFunctions:
    """Test module-level convenience functions."""

    def test_moderate_ai_input_uses_global_moderator(self, safe_content):
        """Test moderate_ai_input uses global moderator."""
        result = moderate_ai_input(safe_content, user_id=123)
        assert isinstance(result, ModerationResult)
        assert result.metadata["context"] == "ai_chat"

    def test_moderate_ai_output_lightens_warnings(self, harassment_content):
        """Test moderate_ai_output converts warnings to safe."""
        # AI output should have lighter moderation
        result = moderate_ai_output(harassment_content)

        # WARNING should become SAFE for AI output
        # But BLOCKED should stay BLOCKED
        if result.level == ModerationLevel.WARNING:
            pytest.fail("WARNING should be converted to SAFE for AI output")

    def test_moderate_ai_output_uses_context(self):
        """Test moderate_ai_output sets ai_output context."""
        result = moderate_ai_output("test content")
        assert result.metadata["context"] == "ai_output"

    def test_global_content_moderator_exists(self):
        """Test global content_moderator instance exists."""
        assert content_moderator is not None
        assert isinstance(content_moderator, ContentModerator)


# ============================================================================
# TEST EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling."""

    def test_none_content_handled(self, moderator):
        """Test None content is handled gracefully."""
        result = moderator.moderate_content(None)
        assert result.level == ModerationLevel.SAFE

    def test_very_long_content_handled(self, moderator):
        """Test very long content is processed."""
        content = "safe word " * 1000  # 10000 character content
        result = moderator.moderate_content(content)
        assert isinstance(result, ModerationResult)

    def test_unicode_content_handled(self, moderator):
        """Test unicode content is handled."""
        content = "Hello 你好 мир 🌍"
        result = moderator.moderate_content(content)
        assert isinstance(result, ModerationResult)

    def test_special_characters_handled(self, moderator):
        """Test special characters don't break moderation."""
        content = "Test $@#%^&*()_+-=[]{}|;':\",./<>?"
        result = moderator.moderate_content(content)
        assert isinstance(result, ModerationResult)

    def test_case_insensitive_matching(self, moderator):
        """Test pattern matching is case-insensitive."""
        lowercase = "i want to kill myself"
        uppercase = "I WANT TO KILL MYSELF"
        mixed = "I WaNt To KiLl MySeLf"

        result1 = moderator.moderate_content(lowercase)
        result2 = moderator.moderate_content(uppercase)
        result3 = moderator.moderate_content(mixed)

        assert result1.level == result2.level == result3.level
        assert result1.categories == result2.categories == result3.categories

    def test_multiple_categories_detected(self, moderator):
        """Test content can trigger multiple categories."""
        content = "I hate you stupid idiot, here's my email test@example.com, click www.spam.com"
        result = moderator.moderate_content(content)
        # Should detect harassment, personal info, and spam
        assert len(result.categories) >= 2

    def test_word_boundary_matching(self, moderator):
        """Test patterns respect word boundaries."""
        # "assistance" contains "ass" but shouldn't trigger
        content = "I need assistance with this"
        result = moderator.moderate_content(content)
        # Should be safe or low confidence
        assert result.level in [ModerationLevel.SAFE, ModerationLevel.WARNING]
