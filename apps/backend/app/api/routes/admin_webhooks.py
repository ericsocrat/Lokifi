"""Admin webhook management routes."""

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.webhook import Webhook, WebhookStatus
from app.models.webhook_delivery import WebhookDelivery
from app.schemas.webhook import (
    DeliveryListResponse,
    DeliveryStatusResponse,
    WebhookCreate,
    WebhookEventList,
    WebhookListResponse,
    WebhookResponse,
    WebhookSecretResponse,
    WebhookTestPayload,
    WebhookUpdate,
)

router = APIRouter(prefix="/admin/webhooks", tags=["admin-webhooks"])


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require admin user for webhook routes."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


@router.get("", response_model=WebhookListResponse)
async def list_webhooks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None),
) -> WebhookListResponse:
    """List all webhooks with pagination and filtering."""
    query = select(Webhook)

    # Filter by status if provided
    if status_filter and status_filter in [s.value for s in WebhookStatus]:
        query = query.where(Webhook.status == status_filter)

    # Get total count
    count_query = select(Webhook)
    if status_filter and status_filter in [s.value for s in WebhookStatus]:
        count_query = count_query.where(Webhook.status == status_filter)

    result = await db.execute(count_query)
    total = len(result.scalars().all())

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    webhooks = result.scalars().all()

    # Prepare response
    webhook_responses = []
    for webhook in webhooks:
        response = WebhookResponse.model_validate(webhook)
        response.redact_secret()
        webhook_responses.append(response)

    return WebhookListResponse(
        total=total, page=page, page_size=page_size, webhooks=webhook_responses
    )


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_data: WebhookCreate,
) -> WebhookResponse:
    """Create a new webhook."""
    # Generate secure secret
    secret = secrets.token_urlsafe(32)

    webhook = Webhook(
        name=webhook_data.name,
        url=str(webhook_data.url),
        description=webhook_data.description,
        events=",".join(webhook_data.events),
        secret=secret,
        active=webhook_data.active,
        max_retries=webhook_data.max_retries,
        retry_delay_seconds=webhook_data.retry_delay_seconds,
        status=WebhookStatus.ACTIVE if webhook_data.active else WebhookStatus.INACTIVE,
    )

    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    response = WebhookResponse.model_validate(webhook)
    response.redact_secret()
    return response


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
) -> WebhookResponse:
    """Get webhook details."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    response = WebhookResponse.model_validate(webhook)
    response.redact_secret()
    return response


@router.patch("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
    webhook_data: WebhookUpdate,
) -> WebhookResponse:
    """Update webhook configuration."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    # Update fields
    update_data = webhook_data.model_dump(exclude_unset=True)
    if "events" in update_data:
        update_data["events"] = ",".join(update_data["events"])
    if "active" in update_data:
        update_data["status"] = (
            WebhookStatus.ACTIVE if update_data["active"] else WebhookStatus.INACTIVE
        )

    for field, value in update_data.items():
        if field != "status":
            setattr(webhook, field, value)
        elif "active" in update_data:
            webhook.status = update_data["status"]

    await db.commit()
    await db.refresh(webhook)

    response = WebhookResponse.model_validate(webhook)
    response.redact_secret()
    return response


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
) -> None:
    """Delete a webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    await db.delete(webhook)
    await db.commit()


@router.get("/{webhook_id}/secret", response_model=WebhookSecretResponse)
async def get_webhook_secret(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
) -> WebhookSecretResponse:
    """Get webhook signing secret (full secret for display once)."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    return WebhookSecretResponse(secret=webhook.secret, webhook_id=webhook_id)


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookSecretResponse)
async def rotate_webhook_secret(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
) -> WebhookSecretResponse:
    """Rotate webhook signing secret."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    webhook.secret = secrets.token_urlsafe(32)
    await db.commit()

    return WebhookSecretResponse(secret=webhook.secret, webhook_id=webhook_id)


@router.get("/{webhook_id}/deliveries", response_model=DeliveryListResponse)
async def get_webhook_deliveries(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> DeliveryListResponse:
    """Get webhook delivery history."""
    # Verify webhook exists
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    # Get total deliveries
    count_query = select(WebhookDelivery).where(
        WebhookDelivery.webhook_id == webhook_id
    )
    result = await db.execute(count_query)
    total = len(result.scalars().all())

    # Get paginated deliveries
    query = (
        select(WebhookDelivery)
        .where(WebhookDelivery.webhook_id == webhook_id)
        .order_by(desc(WebhookDelivery.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    deliveries = result.scalars().all()

    delivery_responses = [
        DeliveryStatusResponse.model_validate(delivery) for delivery in deliveries
    ]

    return DeliveryListResponse(
        total=total, page=page, page_size=page_size, deliveries=delivery_responses
    )


@router.post("/{webhook_id}/test", status_code=status.HTTP_202_ACCEPTED)
async def test_webhook(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    webhook_id: str,
    test_payload: WebhookTestPayload,
) -> dict:
    """Test webhook delivery with a sample payload."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found"
        )

    # Validate event
    if test_payload.event not in webhook.parse_events():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event {test_payload.event} not subscribed by this webhook",
        )

    # Queue test delivery (in real implementation, this would be async)
    # For now, return acceptance
    return {
        "status": "queued",
        "message": "Test delivery queued",
        "webhook_id": webhook_id,
    }


@router.get("/available-events", response_model=WebhookEventList)
async def get_available_events(
    _: Annotated[User, Depends(require_admin)],
) -> WebhookEventList:
    """Get list of available webhook events."""
    return WebhookEventList()
