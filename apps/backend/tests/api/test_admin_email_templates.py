"""Tests for email template management routes."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.routes.admin_email_templates import (
    create_email_template,
    delete_email_template,
    get_email_template,
    list_email_templates,
    update_email_template,
)
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate


class TestAdminEmailTemplates:
    """Admin email template route tests."""

    @pytest.fixture
    def mock_admin_user(self):
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = 1
        user.username = "admin_user"
        user.is_admin = True
        return user

    @pytest.fixture
    def test_email_template(self, mock_admin_user):
        """Create a test email template."""
        template = MagicMock(spec=EmailTemplate)
        template.id = 1
        template.name = "password_reset"
        template.category = "password_reset"
        template.subject = "Reset Your Password"
        template.body = "Hi {{user_name}}, click {{reset_link}} to reset your password."
        template.html_body = "<p>Hi {{user_name}}, <a href='{{reset_link}}'>reset password</a></p>"
        template.variables = ["user_name", "reset_link"]
        template.enabled = True
        template.version = 1
        template.created_by = mock_admin_user.id
        template.created_at = datetime.now(timezone.utc)
        template.updated_at = datetime.now(timezone.utc)
        template.creator = mock_admin_user
        return template

    @pytest.mark.asyncio
    async def test_list_email_templates_returns_entries(self, test_email_template, mock_admin_user):
        """Should return paginated email templates."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 1

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [test_email_template]

        db.execute.side_effect = [count_result, list_result]

        response = await list_email_templates(
            db=db,
            admin=mock_admin_user,
            offset=0,
            limit=50,
            category=None,
            enabled=None,
            search=None,
        )

        assert response.total == 1
        assert len(response.templates) == 1
        assert response.offset == 0
        assert response.limit == 50
        assert response.templates[0].name == "password_reset"

    @pytest.mark.asyncio
    async def test_list_email_templates_with_category_filter(
        self, test_email_template, mock_admin_user
    ):
        """Should return templates filtered by category."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 1

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [test_email_template]

        db.execute.side_effect = [count_result, list_result]

        response = await list_email_templates(
            db=db,
            admin=mock_admin_user,
            offset=0,
            limit=50,
            category="password_reset",
            enabled=None,
            search=None,
        )

        assert response.total == 1
        assert len(response.templates) == 1
        assert response.templates[0].category == "password_reset"

    @pytest.mark.asyncio
    async def test_get_email_template_returns_template(self, test_email_template, mock_admin_user):
        """Should return a specific template by ID."""
        db = AsyncMock()

        result = MagicMock()
        result.scalar_one_or_none.return_value = test_email_template
        db.execute.return_value = result

        response = await get_email_template(
            template_id=1,
            db=db,
            admin=mock_admin_user,
        )

        assert response.id == 1
        assert response.name == "password_reset"
        assert response.category == "password_reset"

    @pytest.mark.asyncio
    async def test_get_email_template_not_found(self, mock_admin_user):
        """Should raise 404 for non-existent template."""
        db = AsyncMock()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute.return_value = result

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await get_email_template(
                template_id=999,
                db=db,
                admin=mock_admin_user,
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_email_template_new_template(self, mock_admin_user):
        """Should create a new email template."""
        db = AsyncMock()

        # Check for duplicate name - returns None (OK to create)
        check_result = MagicMock()
        check_result.scalar_one_or_none.return_value = None
        db.execute.return_value = check_result

        # Mock add, commit, refresh
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        # Capture and setup the added template
        now = datetime.now(timezone.utc)

        def capture_add(obj):
            obj.id = 1
            obj.version = 1
            obj.created_at = now
            obj.updated_at = now
            obj.created_by = mock_admin_user.id
            obj.creator = mock_admin_user

        db.add.side_effect = capture_add

        create_data = EmailTemplateCreate(
            name="welcome_email",
            category="welcome",
            subject="Welcome to Lokifi!",
            body="Welcome {{user_name}}!",
            html_body="<p>Welcome {{user_name}}!</p>",
            variables=["user_name"],
            enabled=True,
        )

        response = await create_email_template(
            data=create_data,
            db=db,
            admin=mock_admin_user,
        )

        assert response.name == "welcome_email"
        assert response.category == "welcome"
        assert db.add.called
        assert db.commit.called
        assert db.refresh.called

    @pytest.mark.asyncio
    async def test_create_email_template_duplicate_name(self, mock_admin_user):
        """Should reject duplicate template names."""
        db = AsyncMock()

        # Existing template with same name
        existing = MagicMock(spec=EmailTemplate)
        existing.id = 1
        existing.name = "password_reset"

        check_result = MagicMock()
        check_result.scalar_one_or_none.return_value = existing
        db.execute.return_value = check_result

        create_data = EmailTemplateCreate(
            name="password_reset",  # Duplicate
            category="password_reset",
            subject="Reset Your Password",
            body="Click to reset",
            html_body="<p>Click to reset</p>",
            variables=[],
            enabled=True,
        )

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await create_email_template(
                data=create_data,
                db=db,
                admin=mock_admin_user,
            )
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_update_email_template_increments_version(
        self, test_email_template, mock_admin_user
    ):
        """Should update template and increment version."""
        db = AsyncMock()

        # Get existing template
        get_result = MagicMock()
        get_result.scalar_one_or_none.return_value = test_email_template
        db.execute.return_value = get_result

        # Mock refresh to simulate version increment
        def refresh_side_effect(obj):
            obj.version = 2

        db.refresh = AsyncMock(side_effect=refresh_side_effect)
        db.commit = AsyncMock()

        update_data = EmailTemplateUpdate(
            subject="Updated Subject",
        )

        response = await update_email_template(
            template_id=1,
            data=update_data,
            db=db,
            admin=mock_admin_user,
        )

        assert response.version == 2
        assert db.commit.called
        assert db.refresh.called

    @pytest.mark.asyncio
    async def test_delete_email_template_soft_delete(self, test_email_template, mock_admin_user):
        """Should soft delete template by setting enabled=False."""
        db = AsyncMock()

        # Get existing template
        get_result = MagicMock()
        get_result.scalar_one_or_none.return_value = test_email_template
        db.execute.return_value = get_result

        db.commit = AsyncMock()

        await delete_email_template(
            template_id=1,
            db=db,
            admin=mock_admin_user,
        )

        # Verify soft delete
        assert not test_email_template.enabled
        assert db.commit.called

    @pytest.mark.asyncio
    async def test_list_email_templates_with_search_filter(
        self, test_email_template, mock_admin_user
    ):
        """Should return templates filtered by search term."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 1

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [test_email_template]

        db.execute.side_effect = [count_result, list_result]

        response = await list_email_templates(
            db=db,
            admin=mock_admin_user,
            offset=0,
            limit=50,
            category=None,
            enabled=None,
            search="password",
        )

        assert response.total == 1
        assert response.templates[0].name == "password_reset"
