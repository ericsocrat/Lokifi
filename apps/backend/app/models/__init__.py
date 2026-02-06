"""
Database models package.
"""

# Import all models to ensure they are registered with SQLAlchemy
from .ai_thread import AiMessage, AiThread, AiUsage
from .api_key import APIKey
from .audit_log import AdminAuditLog, AuditAction, AuditResourceType, AuditStatus
from .conversation import Conversation, ConversationParticipant, Message, MessageReceipt
from .email_template import EmailTemplate
from .follow import Follow
from .moderation import (
    AppealStatus,
    ContentType,
    FlaggedContent,
    FlagReason,
    FlagStatus,
    ModerationAction,
    ModerationAppeal,
    ModerationDecision,
)
from .notification_models import Notification, NotificationPreference
from .profile import Profile
from .reaction import MessageReaction, ReactionType
from .user import User

__all__ = [
    "APIKey",
    "AdminAuditLog",
    "AiMessage",
    "AiThread",
    "AiUsage",
    "AppealStatus",
    "AuditAction",
    "AuditResourceType",
    "AuditStatus",
    "ContentType",
    "Conversation",
    "ConversationParticipant",
    "EmailTemplate",
    "FlagReason",
    "FlagStatus",
    "FlaggedContent",
    "Follow",
    "Message",
    "MessageReaction",
    "MessageReceipt",
    "ModerationAction",
    "ModerationAppeal",
    "ModerationDecision",
    "Notification",
    "NotificationPreference",
    "Profile",
    "ReactionType",
    "User",
]
