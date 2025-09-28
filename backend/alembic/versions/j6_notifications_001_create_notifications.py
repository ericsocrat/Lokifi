"""J6 Enterprise Notifications - Create notifications tables

Revision ID: j6_notifications_001
Revises: j53_enhanced_complete
Create Date: 2025-09-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'j6_notifications_001'
down_revision = 'j53_enhanced_complete'  # Replace with actual previous revision
branch_labels = None
depends_on = None

def upgrade():
    """Create notifications and notification_preferences tables"""
    
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, default='normal'),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('payload', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_read', sa.Boolean, nullable=False, default=False),
        sa.Column('is_delivered', sa.Boolean, nullable=False, default=False),
        sa.Column('is_dismissed', sa.Boolean, nullable=False, default=False),
        sa.Column('is_archived', sa.Boolean, nullable=False, default=False),
        sa.Column('email_sent', sa.Boolean, nullable=False, default=False),
        sa.Column('push_sent', sa.Boolean, nullable=False, default=False),
        sa.Column('in_app_sent', sa.Boolean, nullable=False, default=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('related_entity_type', sa.String(50), nullable=True),
        sa.Column('related_entity_id', sa.String(36), nullable=True),
        sa.Column('batch_id', sa.String(36), nullable=True),
        sa.Column('parent_notification_id', sa.String(36), sa.ForeignKey('notifications.id'), nullable=True),
    )
    
    # Create notification_preferences table
    op.create_table('notification_preferences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('email_enabled', sa.Boolean, nullable=False, default=True),
        sa.Column('push_enabled', sa.Boolean, nullable=False, default=True),
        sa.Column('in_app_enabled', sa.Boolean, nullable=False, default=True),
        sa.Column('type_preferences', sa.JSON, nullable=False, default={}),
        sa.Column('quiet_hours_start', sa.String(5), nullable=True),
        sa.Column('quiet_hours_end', sa.String(5), nullable=True),
        sa.Column('timezone', sa.String(50), nullable=False, default='UTC'),
        sa.Column('daily_digest_enabled', sa.Boolean, nullable=False, default=False),
        sa.Column('weekly_digest_enabled', sa.Boolean, nullable=False, default=False),
        sa.Column('digest_time', sa.String(5), nullable=False, default='09:00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    
    # Create indexes for performance
    op.create_index('idx_notifications_user_unread', 'notifications', ['user_id', 'is_read'])
    op.create_index('idx_notifications_user_type', 'notifications', ['user_id', 'type'])
    op.create_index('idx_notifications_type', 'notifications', ['type'])
    op.create_index('idx_notifications_category', 'notifications', ['category'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('idx_notifications_expires_at', 'notifications', ['expires_at'])
    op.create_index('idx_notifications_batch_id', 'notifications', ['batch_id'])
    op.create_index('idx_notifications_related_entity', 'notifications', ['related_entity_type', 'related_entity_id'])
    op.create_index('idx_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('idx_notifications_priority', 'notifications', ['priority'])

def downgrade():
    """Drop notifications tables and indexes"""
    
    # Drop indexes
    op.drop_index('idx_notifications_priority', table_name='notifications')
    op.drop_index('idx_notifications_is_read', table_name='notifications')
    op.drop_index('idx_notifications_related_entity', table_name='notifications')
    op.drop_index('idx_notifications_batch_id', table_name='notifications')
    op.drop_index('idx_notifications_expires_at', table_name='notifications')
    op.drop_index('idx_notifications_created_at', table_name='notifications')
    op.drop_index('idx_notifications_category', table_name='notifications')
    op.drop_index('idx_notifications_type', table_name='notifications')
    op.drop_index('idx_notifications_user_type', table_name='notifications')
    op.drop_index('idx_notifications_user_unread', table_name='notifications')
    
    # Drop tables
    op.drop_table('notification_preferences')
    op.drop_table('notifications')