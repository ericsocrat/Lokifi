# J6 Notification Integration Hooks
"""
Integration hooks to connect J6 notifications with existing systems.
These hooks integrate notification events into the existing codebase.
"""

import logging
from typing import Any

from app.services.notification_emitter import notification_emitter

logger = logging.getLogger(__name__)

class NotificationIntegration:
    """Integration layer for connecting notifications to existing systems"""
    
    @staticmethod
    def setup_follow_integration():
        """Setup integration with the follow system"""
        # This would be called when the follow service is initialized
        # to hook into follow events
        logger.info("Setting up follow system integration for notifications")
    
    @staticmethod
    async def on_user_followed(follower_user_data: dict[str, Any], followed_user_data: dict[str, Any]):
        """
        Hook called when a user follows another user
        
        Args:
            follower_user_data: Data about the user doing the following
            followed_user_data: Data about the user being followed
        """
        try:
            # Create mock user objects (in real integration, these would be actual User objects)
            class MockUser:
                def __init__(self, data: dict[str, Any]):
                    self.id = data.get('id')
                    self.username = data.get('username')
                    self.display_name = data.get('display_name')
                    self.avatar_url = data.get('avatar_url')
            
            follower = MockUser(follower_user_data)
            followed = MockUser(followed_user_data)
            
            # Emit follow notification
            await notification_emitter.emit_follow_notification(follower, followed)
            
            logger.info(f"Follow notification integration: {follower.username} -> {followed.username}")
            
        except Exception as e:
            logger.error(f"Failed to process follow notification integration: {e}")
    
    @staticmethod
    async def on_dm_message_sent(
        sender_data: dict[str, Any], 
        recipient_data: dict[str, Any],
        message_data: dict[str, Any]
    ):
        """
        Hook called when a direct message is sent
        
        Args:
            sender_data: Data about the message sender
            recipient_data: Data about the message recipient  
            message_data: Data about the message
        """
        try:
            # Create mock user objects
            class MockUser:
                def __init__(self, data: dict[str, Any]):
                    self.id = data.get('id')
                    self.username = data.get('username')
                    self.display_name = data.get('display_name')
                    self.avatar_url = data.get('avatar_url')
            
            sender = MockUser(sender_data)
            recipient = MockUser(recipient_data)
            
            # Emit DM notification
            await notification_emitter.emit_dm_message_received_notification(
                sender_user=sender,
                recipient_user=recipient,
                message_id=message_data.get('id', ''),
                message_content=message_data.get('content', ''),
                thread_id=message_data.get('thread_id', '')
            )
            
            logger.info(f"DM notification integration: {sender.username} -> {recipient.username}")
            
        except Exception as e:
            logger.error(f"Failed to process DM notification integration: {e}")
    
    @staticmethod
    async def on_ai_response_completed(
        user_data: dict[str, Any],
        ai_response_data: dict[str, Any]
    ):
        """
        Hook called when AI finishes responding to a user
        
        Args:
            user_data: Data about the user who sent the AI request
            ai_response_data: Data about the AI response
        """
        try:
            # Create mock user object
            class MockUser:
                def __init__(self, data: dict[str, Any]):
                    self.id = data.get('id')
                    self.username = data.get('username')
                    self.display_name = data.get('display_name')
                    self.avatar_url = data.get('avatar_url')
            
            user = MockUser(user_data)
            
            # Emit AI response notification
            await notification_emitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider=ai_response_data.get('provider', 'unknown'),
                message_id=ai_response_data.get('message_id', ''),
                thread_id=ai_response_data.get('thread_id', ''),
                ai_response=ai_response_data.get('content', ''),
                processing_time_ms=ai_response_data.get('processing_time_ms', 0)
            )
            
            logger.info(f"AI response notification integration for {user.username}")
            
        except Exception as e:
            logger.error(f"Failed to process AI response notification integration: {e}")

# Integration helper functions for direct use in existing code

async def notify_user_followed(follower_id: str, follower_username: str, followed_id: str, followed_username: str):
    """
    Simple function to trigger follow notification
    Can be called directly from existing follow logic
    """
    await NotificationIntegration.on_user_followed(
        follower_user_data={
            'id': follower_id,
            'username': follower_username,
            'display_name': follower_username,
            'avatar_url': None
        },
        followed_user_data={
            'id': followed_id,
            'username': followed_username,
            'display_name': followed_username,
            'avatar_url': None
        }
    )

async def notify_dm_received(
    sender_id: str, 
    sender_username: str,
    recipient_id: str,
    recipient_username: str, 
    message_id: str,
    message_content: str,
    thread_id: str
):
    """
    Simple function to trigger DM notification
    Can be called directly from existing DM logic
    """
    await NotificationIntegration.on_dm_message_sent(
        sender_data={
            'id': sender_id,
            'username': sender_username,
            'display_name': sender_username,
            'avatar_url': None
        },
        recipient_data={
            'id': recipient_id,
            'username': recipient_username,
            'display_name': recipient_username,
            'avatar_url': None
        },
        message_data={
            'id': message_id,
            'content': message_content,
            'thread_id': thread_id
        }
    )

async def notify_ai_response_ready(
    user_id: str,
    username: str,
    ai_provider: str,
    message_id: str,
    thread_id: str,
    response_content: str,
    processing_time_ms: float = 0
):
    """
    Simple function to trigger AI response notification
    Can be called directly from existing AI logic
    """
    await NotificationIntegration.on_ai_response_completed(
        user_data={
            'id': user_id,
            'username': username,
            'display_name': username,
            'avatar_url': None
        },
        ai_response_data={
            'provider': ai_provider,
            'message_id': message_id,
            'thread_id': thread_id,
            'content': response_content,
            'processing_time_ms': processing_time_ms
        }
    )

# Global integration instance
notification_integration = NotificationIntegration()