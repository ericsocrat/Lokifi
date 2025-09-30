"""
Enhanced message moderation service for J4 Direct Messages.
"""

import uuid
import re
import logging
from typing import List, Dict, Optional
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from app.models.conversation import Message

logger = logging.getLogger(__name__)


class ModerationAction(str, Enum):
    """Moderation actions that can be taken."""
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    SHADOW_BAN = "shadow_ban"
    DELETE = "delete"


class ModerationResult(BaseModel):
    """Result of content moderation."""
    action: ModerationAction
    confidence: float = 0.0
    reasons: List[str] = []
    flagged_content: List[str] = []
    sanitized_content: Optional[str] = None


class MessageModerationService:
    """Service for moderating message content."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
        # Configurable word lists (in production, these would be in database/config)
        self.blocked_words = {
            "spam", "scam", "phishing", "fraud", "fake", "bot", "automated",
            "click here", "buy now", "limited time", "act now", "urgent",
            "congratulations", "you've won", "lottery", "inheritance"
        }
        
        self.suspicious_patterns = [
            r'\b(?:https?://)?(?:bit\.ly|tinyurl|t\.co|goo\.gl)/\S+',  # Shortened URLs
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card patterns
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
            r'\b[A-Z]{2,}\s*[A-Z]{2,}\s*[A-Z]{2,}',  # Excessive caps
            r'(.)\1{4,}',  # Character repetition (aaaaa)
        ]
        
        # Rate limiting for moderation flags per user
        self.user_warning_counts: Dict[uuid.UUID, int] = {}
    
    async def moderate_message(
        self, 
        content: str, 
        sender_id: uuid.UUID,
        conversation_id: uuid.UUID
    ) -> ModerationResult:
        """Moderate a message before allowing it to be sent."""
        
        reasons = []
        flagged_content = []
        confidence = 0.0
        action = ModerationAction.ALLOW
        sanitized_content = content
        
        # 1. Check for blocked words
        content_lower = content.lower()
        found_blocked = [word for word in self.blocked_words if word in content_lower]
        if found_blocked:
            reasons.append("Contains blocked words")
            flagged_content.extend(found_blocked)
            confidence += 0.3
        
        # 2. Check suspicious patterns
        for pattern in self.suspicious_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                reasons.append(f"Suspicious pattern detected: {pattern}")
                flagged_content.append(match.group())
                confidence += 0.2
        
        # 3. Check message length and repetition
        if len(content) > 2000:
            reasons.append("Message too long")
            confidence += 0.1
        
        # 4. Check for excessive repetition
        words = content.split()
        if len(words) > 10 and len(set(words)) < len(words) * 0.3:  # >70% repetition
            reasons.append("Excessive word repetition")
            confidence += 0.2
        
        # 5. Check user's recent moderation history
        user_warnings = self.user_warning_counts.get(sender_id, 0)
        if user_warnings > 3:
            reasons.append("User has multiple recent warnings")
            confidence += 0.3
        
        # 6. Determine action based on confidence
        if confidence >= 0.8:
            action = ModerationAction.BLOCK
        elif confidence >= 0.6:
            action = ModerationAction.DELETE
            self.user_warning_counts[sender_id] = user_warnings + 1
        elif confidence >= 0.5:
            action = ModerationAction.WARN
            self.user_warning_counts[sender_id] = user_warnings + 1
            # Sanitize content by removing flagged parts
            sanitized_content = self._sanitize_content(content, flagged_content)
        elif confidence >= 0.3:
            action = ModerationAction.SHADOW_BAN  # Allow but don't notify other users
        
        return ModerationResult(
            action=action,
            confidence=confidence,
            reasons=reasons,
            flagged_content=flagged_content,
            sanitized_content=sanitized_content
        )
    
    def _sanitize_content(self, content: str, flagged_items: List[str]) -> str:
        """Sanitize content by removing or replacing flagged items."""
        sanitized = content
        
        for item in flagged_items:
            if item in self.blocked_words:
                # Replace with asterisks
                sanitized = sanitized.replace(item, "*" * len(item))
            else:
                # Remove suspicious patterns
                sanitized = re.sub(re.escape(item), "[removed]", sanitized, flags=re.IGNORECASE)
        
        return sanitized.strip()
    
    async def report_message(
        self,
        message_id: uuid.UUID,
        reporter_id: uuid.UUID,
        reason: str
    ) -> bool:
        """Report a message for manual moderation review."""
        try:
            # In a real implementation, this would create a moderation report record
            logger.info(f"Message {message_id} reported by user {reporter_id}: {reason}")
            
            # Could automatically re-moderate the reported message
            message_stmt = select(Message).where(Message.id == message_id)
            result = await self.db.execute(message_stmt)
            message = result.scalar_one_or_none()
            
            if message:
                moderation_result = await self.moderate_message(
                    message.content,
                    message.sender_id,
                    message.conversation_id
                )
                
                if moderation_result.action == ModerationAction.DELETE:
                    # Soft delete the message
                    update_stmt = (
                        update(Message)
                        .where(Message.id == message_id)
                        .values(is_deleted=True, content="[message removed by moderation]")
                    )
                    await self.db.execute(update_stmt)
                    await self.db.commit()
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error reporting message {message_id}: {e}")
            return False
    
    async def get_moderation_stats(self, user_id: uuid.UUID) -> Dict[str, int]:
        """Get moderation statistics for a user."""
        # In a real implementation, this would query moderation history
        return {
            "warnings": self.user_warning_counts.get(user_id, 0),
            "blocks": 0,  # Would query from moderation log
            "reports_made": 0,  # Would query reports table
            "reports_received": 0  # Would query reports table
        }
    
    async def is_user_shadow_banned(self, user_id: uuid.UUID) -> bool:
        """Check if user is currently shadow banned."""
        # In a real implementation, this would check a user moderation status table
        return self.user_warning_counts.get(user_id, 0) > 5
    
    def add_blocked_words(self, words: List[str]) -> None:
        """Add words to the blocked list (admin function)."""
        self.blocked_words.update(word.lower() for word in words)
    
    def remove_blocked_words(self, words: List[str]) -> None:
        """Remove words from the blocked list (admin function)."""
        for word in words:
            self.blocked_words.discard(word.lower())
    
    def get_blocked_words(self) -> List[str]:
        """Get current blocked words list (admin function)."""
        return sorted(list(self.blocked_words))