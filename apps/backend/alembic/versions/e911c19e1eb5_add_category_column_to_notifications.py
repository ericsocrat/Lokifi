"""add_missing_columns_to_notifications

Adds all missing columns to notifications table to match the model.
Missing columns: category, clicked_at, dismissed_at, is_dismissed, is_archived,
email_sent, push_sent, in_app_sent, related_entity_type, related_entity_id, 
batch_id, parent_notification_id, payload

Revision ID: e911c19e1eb5
Revises: 81ad9a7e4d9c
Create Date: 2025-10-24 14:33:28.525431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e911c19e1eb5'
down_revision: Union[str, Sequence[str], None] = '81ad9a7e4d9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add all missing columns to notifications table to match model."""
    
    # First, alter type column from ENUM to VARCHAR(50)
    # This allows any notification type string, not just predefined ENUMs
    op.execute("ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50)")
    op.execute("ALTER TABLE notifications ALTER COLUMN priority TYPE VARCHAR(20)")
    
    # Drop the old ENUM types if they exist
    op.execute("DROP TYPE IF EXISTS notificationtype CASCADE")
    op.execute("DROP TYPE IF EXISTS notificationpriority CASCADE")
    
    # Add category column for grouping notifications
    op.add_column(
        "notifications",
        sa.Column("category", sa.String(length=50), nullable=True)
    )
    
    # Add interaction tracking columns
    op.add_column(
        "notifications",
        sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "notifications",
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add status flags
    op.add_column(
        "notifications",
        sa.Column("is_dismissed", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    op.add_column(
        "notifications",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    
    # Add delivery channel flags
    op.add_column(
        "notifications",
        sa.Column("email_sent", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    op.add_column(
        "notifications",
        sa.Column("push_sent", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    op.add_column(
        "notifications",
        sa.Column("in_app_sent", sa.Boolean(), nullable=False, server_default=sa.text("true"))
    )
    
    # Add entity reference columns
    op.add_column(
        "notifications",
        sa.Column("related_entity_type", sa.String(length=50), nullable=True)
    )
    op.add_column(
        "notifications",
        sa.Column("related_entity_id", sa.UUID(), nullable=True)
    )
    
    # Add grouping columns
    op.add_column(
        "notifications",
        sa.Column("batch_id", sa.UUID(), nullable=True)
    )
    op.add_column(
        "notifications",
        sa.Column("parent_notification_id", sa.UUID(), nullable=True)
    )
    
    # Add payload column (was extra_data in old schema)
    op.add_column(
        "notifications",
        sa.Column("payload", sa.JSON(), nullable=True)
    )
    
    # Add indexes for performance
    op.create_index("idx_notifications_category", "notifications", ["category"])
    op.create_index("idx_notifications_batch_id", "notifications", ["batch_id"])
    op.create_index("idx_notifications_related_entity", "notifications", ["related_entity_type", "related_entity_id"])
    
    # Add foreign key for parent_notification_id
    op.create_foreign_key(
        "fk_notifications_parent",
        "notifications",
        "notifications",
        ["parent_notification_id"],
        ["id"],
        ondelete="CASCADE"
    )


def downgrade() -> None:
    """Remove all added columns from notifications table."""
    
    # Drop foreign key
    op.drop_constraint("fk_notifications_parent", "notifications", type_="foreignkey")
    
    # Drop indexes
    op.drop_index("idx_notifications_related_entity", table_name="notifications")
    op.drop_index("idx_notifications_batch_id", table_name="notifications")
    op.drop_index("idx_notifications_category", table_name="notifications")
    
    # Drop all added columns
    op.drop_column("notifications", "payload")
    op.drop_column("notifications", "parent_notification_id")
    op.drop_column("notifications", "batch_id")
    op.drop_column("notifications", "related_entity_id")
    op.drop_column("notifications", "related_entity_type")
    op.drop_column("notifications", "in_app_sent")
    op.drop_column("notifications", "push_sent")
    op.drop_column("notifications", "email_sent")
    op.drop_column("notifications", "is_archived")
    op.drop_column("notifications", "is_dismissed")
    op.drop_column("notifications", "dismissed_at")
    op.drop_column("notifications", "clicked_at")
    op.drop_column("notifications", "category")
    
    # Restore ENUM types for type and priority columns
    op.execute("CREATE TYPE notificationtype AS ENUM ('FOLLOW', 'MESSAGE', 'AI_RESPONSE', 'SYSTEM')")
    op.execute("CREATE TYPE notificationpriority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT')")
    op.execute("ALTER TABLE notifications ALTER COLUMN type TYPE notificationtype USING type::notificationtype")
    op.execute("ALTER TABLE notifications ALTER COLUMN priority TYPE notificationpriority USING priority::notificationpriority")
    op.drop_column("notifications", "in_app_sent")
    op.drop_column("notifications", "push_sent")
    op.drop_column("notifications", "email_sent")
    op.drop_column("notifications", "is_archived")
    op.drop_column("notifications", "is_dismissed")
    op.drop_column("notifications", "dismissed_at")
    op.drop_column("notifications", "clicked_at")
    op.drop_column("notifications", "category")
