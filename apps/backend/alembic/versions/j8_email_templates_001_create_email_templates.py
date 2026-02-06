"""J8 Email Templates - Create email_templates table

Revision ID: j8_email_templates_001
Revises: j7_admin_audit_001
Create Date: 2026-02-06 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "j8_email_templates_001"
down_revision = "j7_admin_audit_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create email templates table."""
    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "name",
            sa.String(255),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column(
            "category",
            sa.String(50),
            nullable=False,
            index=True,
            comment="Template category: password_reset, email_verification, notification, welcome, etc.",
        ),
        sa.Column(
            "subject",
            sa.String(500),
            nullable=False,
        ),
        sa.Column(
            "body",
            sa.Text(),
            nullable=False,
            comment="Plain text body with variable placeholders",
        ),
        sa.Column(
            "html_body",
            sa.Text(),
            nullable=True,
            comment="HTML body for rich email formatting",
        ),
        sa.Column(
            "variables",
            sa.JSON(),
            nullable=True,
            server_default=sa.text("'[]'"),
            comment="List of variable names used in template: ['user_name', 'reset_link', 'expiry_time']",
        ),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            default=True,
            index=True,
        ),
        sa.Column(
            "version",
            sa.Integer(),
            nullable=False,
            default=1,
        ),
        sa.Column(
            "created_by",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            index=True,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    # Create additional indexes for performance
    op.create_index(
        "ix_email_template_category_enabled",
        "email_templates",
        ["category", "enabled"],
    )
    op.create_index(
        "ix_email_template_created_at",
        "email_templates",
        ["created_at"],
    )


def downgrade() -> None:
    """Drop email templates table."""
    # Drop indexes first
    op.drop_index("ix_email_template_created_at", table_name="email_templates")
    op.drop_index("ix_email_template_category_enabled", table_name="email_templates")

    # Drop table
    op.drop_table("email_templates")
