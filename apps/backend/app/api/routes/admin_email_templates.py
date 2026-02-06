"""Email template management routes for admin panel."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplateListResponse,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/email-templates", tags=["admin-email-templates"])


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure user is admin.
    
    Raises:
        HTTPException: 403 Forbidden if user is not an admin
    """
    if not current_user.is_admin:
        logger.warning(
            "admin_unauthorized_access",
            extra={
                "user_id": current_user.id,
                "username": current_user.username,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this resource"
        )
    return current_user


@router.get("", response_model=EmailTemplateListResponse)
async def list_email_templates(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    category: str | None = Query(None),
    enabled: bool | None = Query(None),
    search: str | None = Query(None),
) -> EmailTemplateListResponse:
    """List all email templates with optional filtering.
    
    Query Parameters:
    - offset: Pagination offset (default: 0)
    - limit: Results per page (default: 50, max: 500)
    - category: Filter by category (e.g., 'password_reset')
    - enabled: Filter by enabled status (true/false)
    - search: Search in template name or subject
    """
    query = select(EmailTemplate)
    
    if category:
        query = query.where(EmailTemplate.category == category)
    
    if enabled is not None:
        query = query.where(EmailTemplate.enabled == enabled)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (EmailTemplate.name.ilike(search_term)) | 
            (EmailTemplate.subject.ilike(search_term))
        )
    
    # Get total count
    total_query = query.with_only_columns(func.count(EmailTemplate.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    # Get paginated results
    query = query.order_by(EmailTemplate.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()
    
    logger.info(
        "admin_list_email_templates",
        extra={
            "admin_id": admin.id,
            "total": total,
            "offset": offset,
            "limit": limit,
            "filtered": bool(category or enabled or search),
        }
    )
    
    return EmailTemplateListResponse(
        templates=[
            EmailTemplateResponse.from_orm(t) for t in templates
        ],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{template_id}", response_model=EmailTemplateResponse)
async def get_email_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EmailTemplateResponse:
    """Get a specific email template by ID."""
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        logger.warning(
            "admin_get_email_template_not_found",
            extra={
                "admin_id": admin.id,
                "template_id": template_id,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    return EmailTemplateResponse.from_orm(template)


@router.post("", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    data: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EmailTemplateResponse:
    """Create a new email template.
    
    Email templates support variable substitution using {{variable_name}} syntax.
    
    Example body:
    ```
    Hi {{user_name}},
    
    Click here to reset your password: {{reset_link}}
    This link expires in {{expiry_time}} hours.
    ```
    """
    # Check for duplicate template name
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.name == data.name)
    )
    if result.scalar_one_or_none():
        logger.warning(
            "admin_create_email_template_duplicate",
            extra={
                "admin_id": admin.id,
                "template_name": data.name,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email template with this name already exists"
        )
    
    template = EmailTemplate(
        name=data.name,
        category=data.category,
        subject=data.subject,
        body=data.body,
        html_body=data.html_body,
        variables=data.variables or [],
        enabled=data.enabled,
        created_by=admin.id,
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    logger.info(
        "admin_create_email_template",
        extra={
            "admin_id": admin.id,
            "template_id": template.id,
            "template_name": template.name,
        }
    )
    
    return EmailTemplateResponse.from_orm(template)


@router.patch("/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: int,
    data: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EmailTemplateResponse:
    """Update an email template.
    
    Only provided fields are updated; omitted fields remain unchanged.
    Version is automatically incremented.
    """
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        logger.warning(
            "admin_update_email_template_not_found",
            extra={
                "admin_id": admin.id,
                "template_id": template_id,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    # Check for duplicate name if updating it
    if data.name and data.name != template.name:
        result = await db.execute(
            select(EmailTemplate).where(EmailTemplate.name == data.name)
        )
        if result.scalar_one_or_none():
            logger.warning(
                "admin_update_email_template_duplicate",
                extra={
                    "admin_id": admin.id,
                    "template_id": template_id,
                    "new_name": data.name,
                }
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email template with this name already exists"
            )
        template.name = data.name
    
    # Update fields
    if data.category is not None:
        template.category = data.category
    if data.subject is not None:
        template.subject = data.subject
    if data.body is not None:
        template.body = data.body
    if data.html_body is not None:
        template.html_body = data.html_body
    if data.variables is not None:
        template.variables = data.variables
    if data.enabled is not None:
        template.enabled = data.enabled
    
    # Increment version
    template.version += 1
    
    await db.commit()
    await db.refresh(template)
    
    logger.info(
        "admin_update_email_template",
        extra={
            "admin_id": admin.id,
            "template_id": template.id,
            "new_version": template.version,
        }
    )
    
    return EmailTemplateResponse.from_orm(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    """Delete an email template.
    
    Note: This only soft-deletes the template (sets enabled=False).
    For hard deletion, manually remove from database.
    """
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        logger.warning(
            "admin_delete_email_template_not_found",
            extra={
                "admin_id": admin.id,
                "template_id": template_id,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    # Soft delete by disabling
    template.enabled = False
    await db.commit()
    
    logger.info(
        "admin_delete_email_template",
        extra={
            "admin_id": admin.id,
            "template_id": template.id,
            "template_name": template.name,
        }
    )
