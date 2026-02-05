"""J7 Admin Audit Logs - Create admin_audit_logs table

Revision ID: j7_admin_audit_001
Revises: phase_3a_001
Create Date: 2026-02-05 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "j7_admin_audit_001"
down_revision = "phase_3a_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create admin audit logs table."""
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("resource_type", sa.String(length=48), nullable=False),
        sa.Column("resource_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("audit_metadata", sa.JSON(), nullable=True),
        sa.Column("changes", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )

    op.create_index(
        "idx_admin_audit_logs_user_id",
        "admin_audit_logs",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "idx_admin_audit_logs_created_at",
        "admin_audit_logs",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "idx_admin_audit_logs_action",
        "admin_audit_logs",
        ["action"],
        unique=False,
    )
    op.create_index(
        "idx_admin_audit_logs_resource_type",
        "admin_audit_logs",
        ["resource_type"],
        unique=False,
    )
    op.create_index(
        "idx_admin_audit_logs_status",
        "admin_audit_logs",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Drop admin audit logs table."""
    op.drop_index("idx_admin_audit_logs_status", table_name="admin_audit_logs")
    op.drop_index("idx_admin_audit_logs_resource_type", table_name="admin_audit_logs")
    op.drop_index("idx_admin_audit_logs_action", table_name="admin_audit_logs")
    op.drop_index("idx_admin_audit_logs_created_at", table_name="admin_audit_logs")
    op.drop_index("idx_admin_audit_logs_user_id", table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")
