"""fix_notification_preferences_schema

Revision ID: 81ad9a7e4d9c
Revises: j6_notifications_001
Create Date: 2025-10-06 22:57:33.977713

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "81ad9a7e4d9c"
down_revision: str | Sequence[str] | None = "j6_notifications_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Update notification_preferences table to match current model."""

    # Drop old specific columns
    op.drop_column("notification_preferences", "email_follows")
    op.drop_column("notification_preferences", "email_messages")
    op.drop_column("notification_preferences", "email_ai_responses")
    op.drop_column("notification_preferences", "email_system")
    op.drop_column("notification_preferences", "push_follows")
    op.drop_column("notification_preferences", "push_messages")
    op.drop_column("notification_preferences", "push_ai_responses")
    op.drop_column("notification_preferences", "push_system")

    # Add new columns to match model
    op.add_column(
        "notification_preferences",
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("type_preferences", sa.JSON(), nullable=False, server_default="{}"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("quiet_hours_start", sa.String(length=5), nullable=True),
    )
    op.add_column(
        "notification_preferences", sa.Column("quiet_hours_end", sa.String(length=5), nullable=True)
    )
    op.add_column(
        "notification_preferences",
        sa.Column("timezone", sa.String(length=50), nullable=False, server_default="UTC"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("daily_digest_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("weekly_digest_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("digest_time", sa.String(length=5), nullable=False, server_default="09:00"),
    )


def downgrade() -> None:
    """Revert notification_preferences table to previous schema."""

    # Drop new columns
    op.drop_column("notification_preferences", "digest_time")
    op.drop_column("notification_preferences", "weekly_digest_enabled")
    op.drop_column("notification_preferences", "daily_digest_enabled")
    op.drop_column("notification_preferences", "timezone")
    op.drop_column("notification_preferences", "quiet_hours_end")
    op.drop_column("notification_preferences", "quiet_hours_start")
    op.drop_column("notification_preferences", "type_preferences")
    op.drop_column("notification_preferences", "in_app_enabled")

    # Add back old columns
    op.add_column(
        "notification_preferences",
        sa.Column("email_follows", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("email_messages", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("email_ai_responses", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("email_system", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("push_follows", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("push_messages", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("push_ai_responses", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("push_system", sa.Boolean(), nullable=False, server_default="true"),
    )
