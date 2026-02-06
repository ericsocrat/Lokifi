"""Tests for API key management routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from app.api.routes.admin_api_keys import (
    create_api_key,
    delete_api_key,
    get_api_key,
    hash_api_key,
    list_api_keys,
    update_api_key,
    validate_api_key,
)
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.api_key import APIKeyCreate, APIKeyUpdate, APIKeyValidateRequest


class TestAdminAPIKeys:
    """Test suite for admin API key management routes."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def test_api_key(self) -> APIKey:
        """Create a test API key mock."""
        api_key = MagicMock(spec=APIKey)
        api_key.id = uuid4()
        api_key.key_hash = hash_api_key("lk_test12345678901234567890")
        api_key.key_prefix = "lk_test12345"
        api_key.name = "Test API Key"
        api_key.description = "Test description"
        api_key.scopes = ["read:users", "write:content"]
        api_key.rate_limit = 60
        api_key.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        api_key.last_used_at = None
        api_key.is_active = True
        api_key.created_by = 1
        api_key.created_at = datetime.now(timezone.utc)
        api_key.updated_at = datetime.now(timezone.utc)
        api_key.creator = None
        return api_key

    async def test_list_api_keys_returns_entries(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test that list_api_keys returns entries with pagination."""
        db = AsyncMock()

        # Mock count query
        count_result = MagicMock()
        count_result.scalar.return_value = 1

        # Mock list query
        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [test_api_key]

        # Setup side_effect for multiple execute calls
        db.execute.side_effect = [count_result, list_result]

        result = await list_api_keys(
            current_user=mock_admin_user,
            db=db,
            offset=0,
            limit=50,
            search=None,
            is_active=None,
            created_by=None,
        )

        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].name == "Test API Key"
        assert result.offset == 0
        assert result.limit == 50

    async def test_list_api_keys_with_filters(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test list_api_keys with search and active filters."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalar.return_value = 1

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [test_api_key]

        db.execute.side_effect = [count_result, list_result]

        result = await list_api_keys(
            current_user=mock_admin_user,
            db=db,
            offset=0,
            limit=50,
            search="Test",
            is_active=True,
            created_by=1,
        )

        assert result.total == 1
        assert len(result.items) == 1

    async def test_get_api_key_returns_key(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test that get_api_key returns a single key."""
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = result

        api_key = await get_api_key(
            key_id=test_api_key.id,
            current_user=mock_admin_user,
            db=db,
        )

        assert api_key.name == "Test API Key"
        assert api_key.is_active is True

    async def test_get_api_key_not_found(self, mock_admin_user: User) -> None:
        """Test that get_api_key raises 404 when key not found."""
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute.return_value = result

        with pytest.raises(Exception) as exc:
            await get_api_key(
                key_id=uuid4(),
                current_user=mock_admin_user,
                db=db,
            )
        assert "not found" in str(exc.value).lower()

    async def test_create_api_key_new_key(self, mock_admin_user: User) -> None:
        """Test creating a new API key returns plain key once."""
        db = AsyncMock()

        # Mock duplicate check (no existing key)
        check_result = MagicMock()
        check_result.scalar_one_or_none.return_value = None
        db.execute.return_value = check_result

        # Mock refresh to set database-generated fields
        async def mock_refresh(api_key: APIKey) -> None:
            api_key.id = uuid4()
            api_key.created_at = datetime.now(timezone.utc)
            api_key.updated_at = datetime.now(timezone.utc)
            api_key.last_used_at = None

        db.refresh.side_effect = mock_refresh

        data = APIKeyCreate(
            name="New API Key",
            description="Test key",
            scopes=["read:users"],
            rate_limit=100,
            expires_at=None,
            is_active=True,
        )

        result = await create_api_key(
            data=data,
            current_user=mock_admin_user,
            db=db,
        )

        assert "plain_key" in result
        assert result["plain_key"].startswith("lk_")
        assert result["name"] == "New API Key"
        assert result["rate_limit"] == 100
        assert db.commit.called
        assert db.refresh.called

    async def test_create_api_key_duplicate_name(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test that creating a key with duplicate name returns 409."""
        db = AsyncMock()

        # Mock duplicate check (existing key found)
        check_result = MagicMock()
        check_result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = check_result

        data = APIKeyCreate(
            name="Test API Key",  # Duplicate name
            description="Test",
            scopes=[],
            rate_limit=60,
            expires_at=None,
            is_active=True,
        )

        with pytest.raises(Exception) as exc:
            await create_api_key(
                data=data,
                current_user=mock_admin_user,
                db=db,
            )
        assert "already exists" in str(exc.value).lower()

    async def test_update_api_key_updates_fields(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test updating an API key modifies fields correctly."""
        db = AsyncMock()

        # Mock get existing key
        get_result = MagicMock()
        get_result.scalar_one_or_none.return_value = test_api_key

        # Mock duplicate name check (no conflict)
        check_result = MagicMock()
        check_result.scalar_one_or_none.return_value = None

        # Setup side_effect for multiple execute calls (get, then check)
        db.execute.side_effect = [get_result, check_result]

        data = APIKeyUpdate(
            name="Updated API Key",
            rate_limit=120,
            is_active=False,
        )

        result = await update_api_key(
            key_id=test_api_key.id,
            data=data,
            current_user=mock_admin_user,
            db=db,
        )

        assert result.name == "Updated API Key"
        assert result.rate_limit == 120
        assert result.is_active is False
        assert db.commit.called

    async def test_delete_api_key_soft_delete(
        self, mock_admin_user: User, test_api_key: APIKey
    ) -> None:
        """Test that deleting an API key sets is_active to False."""
        db = AsyncMock()

        # Mock get existing key
        get_result = MagicMock()
        get_result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = get_result

        await delete_api_key(
            key_id=test_api_key.id,
            current_user=mock_admin_user,
            db=db,
        )

        # Verify soft delete
        assert not test_api_key.is_active
        assert db.commit.called

    async def test_validate_api_key_valid(self, test_api_key: APIKey) -> None:
        """Test that validate_api_key returns valid result for valid key."""
        db = AsyncMock()

        # Mock key lookup
        result = MagicMock()
        result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = result

        data = APIKeyValidateRequest(api_key="lk_test12345678901234567890")

        response = await validate_api_key(data=data, db=db)

        assert response.valid is True
        assert response.key_id == test_api_key.id
        assert response.scopes == test_api_key.scopes
        assert response.rate_limit == test_api_key.rate_limit
        assert response.error is None
        assert db.commit.called  # last_used_at updated

    async def test_validate_api_key_invalid(self) -> None:
        """Test that validate_api_key returns invalid for nonexistent key."""
        db = AsyncMock()

        # Mock key lookup (not found)
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute.return_value = result

        data = APIKeyValidateRequest(api_key="lk_invalid123")

        response = await validate_api_key(data=data, db=db)

        assert response.valid is False
        assert response.error == "Invalid API key"

    async def test_validate_api_key_inactive(self, test_api_key: APIKey) -> None:
        """Test that validate_api_key returns invalid for inactive key."""
        test_api_key.is_active = False

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = result

        data = APIKeyValidateRequest(api_key="lk_test12345678901234567890")

        response = await validate_api_key(data=data, db=db)

        assert response.valid is False
        assert response.error == "API key is inactive"

    async def test_validate_api_key_expired(self, test_api_key: APIKey) -> None:
        """Test that validate_api_key returns invalid for expired key."""
        test_api_key.expires_at = datetime.now(timezone.utc) - timedelta(days=1)

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = test_api_key
        db.execute.return_value = result

        data = APIKeyValidateRequest(api_key="lk_test12345678901234567890")

        response = await validate_api_key(data=data, db=db)

        assert response.valid is False
        assert response.error == "API key has expired"
