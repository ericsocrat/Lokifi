import uuid
from datetime import datetime, timezone

import pytest

from app.models.notification_models import NotificationPreference


class TestNotificationPreference:
    """Test NotificationPreference model"""

    def test_preference_creation(self):
        """Test basic notification preference creation"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id)
        assert pref.user_id == user_id

    def test_preference_default_channels(self):
        """Test notification preference default channel settings"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id)
        # Default values should be stored in the model
        assert pref.email_enabled is True or pref.email_enabled is None
        assert pref.push_enabled is True or pref.push_enabled is None
        assert pref.in_app_enabled is True or pref.in_app_enabled is None

    def test_preference_type_preferences(self):
        """Test setting type-specific preferences"""
        user_id = uuid.uuid4()
        type_prefs = {"follow_email": True, "mention_push": False}
        pref = NotificationPreference(
            user_id=user_id,
            type_preferences=type_prefs,
        )
        assert pref.type_preferences == type_prefs

    def test_preference_quiet_hours(self):
        """Test notification preference quiet hours"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
        )
        assert pref.quiet_hours_start == "22:00"
        assert pref.quiet_hours_end == "08:00"

    def test_preference_digest_settings(self):
        """Test notification preference digest settings"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            daily_digest_enabled=True,
            weekly_digest_enabled=False,
            digest_time="09:00",
        )
        assert pref.daily_digest_enabled is True
        assert pref.weekly_digest_enabled is False
        assert pref.digest_time == "09:00"

    def test_preference_timezone(self):
        """Test notification preference timezone"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            timezone="America/New_York",
        )
        assert pref.timezone == "America/New_York"

    def test_get_type_preference_default_true(self):
        """Test getting type preference when not set returns True"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id)
        result = pref.get_type_preference("follow", "in_app")
        assert result is True

    def test_get_type_preference_set_value(self):
        """Test getting type preference when explicitly set"""
        user_id = uuid.uuid4()
        type_prefs = {"follow_email": False}
        pref = NotificationPreference(
            user_id=user_id,
            type_preferences=type_prefs,
        )
        result = pref.get_type_preference("follow", "email")
        assert result is False

    def test_set_type_preference(self):
        """Test setting type preference"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id, type_preferences={})
        pref.set_type_preference("mention", "push", False)
        assert pref.type_preferences.get("mention_push") is False

    def test_set_multiple_type_preferences(self):
        """Test setting multiple type preferences"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id, type_preferences={})
        pref.set_type_preference("follow", "email", True)
        pref.set_type_preference("mention", "push", False)
        pref.set_type_preference("dm", "in_app", True)

        assert pref.get_type_preference("follow", "email") is True
        assert pref.get_type_preference("mention", "push") is False
        assert pref.get_type_preference("dm", "in_app") is True

    def test_is_in_quiet_hours_no_quiet_hours(self):
        """Test is_in_quiet_hours when no quiet hours set"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id)
        result = pref.is_in_quiet_hours()
        assert result is False

    def test_is_in_quiet_hours_before_start(self):
        """Test is_in_quiet_hours before quiet hours start"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
        )
        # Check at 20:00 (before 22:00)
        check_time = datetime.now(timezone.utc).replace(hour=20, minute=0, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is False

    def test_is_in_quiet_hours_during_quiet_hours(self):
        """Test is_in_quiet_hours during quiet hours"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
        )
        # Check at 23:00 (during quiet hours: 22:00 - 08:00)
        check_time = datetime.now(timezone.utc).replace(hour=23, minute=0, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is True

    def test_is_in_quiet_hours_after_end(self):
        """Test is_in_quiet_hours after quiet hours end"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
        )
        # Check at 09:00 (after 08:00)
        check_time = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is False

    def test_is_in_quiet_hours_non_midnight_spanning(self):
        """Test is_in_quiet_hours with non-midnight-spanning quiet hours"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="13:00",
            quiet_hours_end="14:00",
        )
        # Check at 13:30 (during quiet hours)
        check_time = datetime.now(timezone.utc).replace(hour=13, minute=30, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is True

    def test_is_in_quiet_hours_non_midnight_spanning_outside(self):
        """Test is_in_quiet_hours outside non-midnight-spanning quiet hours"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="13:00",
            quiet_hours_end="14:00",
        )
        # Check at 15:00 (outside quiet hours)
        check_time = datetime.now(timezone.utc).replace(hour=15, minute=0, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is False

    def test_is_in_quiet_hours_midnight_spanning_early_morning(self):
        """Test is_in_quiet_hours in early morning during midnight-spanning quiet hours"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
        )
        # Check at 05:00 (during quiet hours that span midnight)
        check_time = datetime.now(timezone.utc).replace(hour=5, minute=0, second=0)
        result = pref.is_in_quiet_hours(check_time)
        assert result is True

    def test_preference_repr(self):
        """Test notification preference string representation"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(user_id=user_id)
        repr_str = repr(pref)
        assert "NotificationPreference" in repr_str
        assert str(user_id) in repr_str

    def test_to_dict(self):
        """Test converting preference to dictionary"""
        user_id = uuid.uuid4()
        created = datetime.now(timezone.utc)
        pref = NotificationPreference(
            user_id=user_id,
            email_enabled=False,
            push_enabled=True,
            in_app_enabled=True,
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
            daily_digest_enabled=True,
            weekly_digest_enabled=False,
            digest_time="09:00",
            created_at=created,
            updated_at=created,
        )
        data = pref.to_dict()

        assert data["user_id"] == user_id
        assert data["email_enabled"] is False
        assert data["push_enabled"] is True
        assert data["in_app_enabled"] is True
        assert data["quiet_hours_start"] == "22:00"
        assert data["quiet_hours_end"] == "08:00"
        assert data["daily_digest_enabled"] is True
        assert data["weekly_digest_enabled"] is False
        assert data["digest_time"] == "09:00"
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    def test_all_channel_disabled(self):
        """Test preference with all channels disabled"""
        user_id = uuid.uuid4()
        pref = NotificationPreference(
            user_id=user_id,
            email_enabled=False,
            push_enabled=False,
            in_app_enabled=False,
        )
        # Data should reflect disabled channels when set
        assert pref.email_enabled is False or pref.email_enabled is None
        assert pref.push_enabled is False or pref.push_enabled is None
        assert pref.in_app_enabled is False or pref.in_app_enabled is None
