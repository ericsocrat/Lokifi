"""
API endpoints for Lokifi AI Chatbot (J5).
J6.1 Enhanced with notification integration.

Handles AI thread creation, messaging, and provider management.
"""

import base64
import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models import AIMessage, User
from app.schemas.ai_schemas import (
    AIChatRequest,
    AIMessageResponse,
    AIProviderStatusResponse,
    AIThreadCreate,
    AIThreadResponse,
    AIThreadUpdate,
    RateLimitResponse,
)
from app.services.ai_analytics import ai_analytics_service
from app.services.ai_context_manager import ai_context_manager
from app.services.ai_provider import ProviderError, StreamChunk
from app.services.ai_service import RateLimitError, SafetyFilterError, ai_service
from app.services.conversation_export import (
    ExportOptions,
    conversation_exporter,
    conversation_importer,
)
from app.services.multimodal_ai_service import (
    FileProcessingError,
    UnsupportedFileTypeError,
    multimodal_ai_service,
)

# Notification Integration
from scripts.notification_integration_helpers import trigger_ai_response_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/threads", response_model=AIThreadResponse)
async def create_thread(
    thread_data: AIThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI chat thread."""
    try:
        thread = await ai_service.create_thread(user_id=current_user.id, title=thread_data.title)
        return AIThreadResponse.model_validate(thread)
    except Exception as e:
        logger.error(f"Failed to create thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create thread",
        )


@router.get("/threads", response_model=list[AIThreadResponse])
async def get_threads(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's AI chat threads."""
    try:
        threads = await ai_service.get_user_threads(
            user_id=current_user.id, limit=min(limit, 100), offset=offset  # Cap at 100
        )
        return [AIThreadResponse.model_validate(thread) for thread in threads]
    except Exception as e:
        logger.error(f"Failed to get threads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve threads",
        )


@router.get("/threads/{thread_id}/messages", response_model=list[AIMessageResponse])
async def get_thread_messages(
    thread_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages for a specific thread."""
    try:
        messages = await ai_service.get_thread_messages(
            thread_id=thread_id,
            user_id=current_user.id,
            limit=min(limit, 100),  # Cap at 100
        )
        return [AIMessageResponse.model_validate(message) for message in messages]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages",
        )


@router.post("/threads/{thread_id}/messages")
async def send_message(
    thread_id: int,
    chat_request: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and stream the AI response."""

    async def stream_response():
        start_time = datetime.now()

        try:
            async for chunk in ai_service.send_message(
                user_id=current_user.id,
                thread_id=thread_id,
                message=chat_request.message,
                provider_name=chat_request.provider,
                model=chat_request.model,
            ):
                if isinstance(chunk, StreamChunk):
                    # Stream token chunk
                    chunk_data = {
                        "type": "chunk",
                        "content": chunk.content,
                        "is_complete": chunk.is_complete,
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                elif isinstance(chunk, AIMessage):
                    # Final message
                    complete_data = {
                        "type": "complete",
                        "message": AIMessageResponse.model_validate(chunk).model_dump(),
                    }
                    yield f"data: {json.dumps(complete_data)}\n\n"

                    # J6.1 Notification Integration: Trigger AI response notification
                    try:
                        processing_time = (datetime.now() - start_time).total_seconds() * 1000

                        await trigger_ai_response_notification(
                            user_data={
                                "id": str(current_user.id),
                                "username": current_user.handle,
                                "display_name": current_user.handle,
                                "avatar_url": current_user.avatar_url,
                            },
                            ai_response_data={
                                "provider": chat_request.provider or "default",
                                "message_id": str(chunk.id),
                                "thread_id": str(thread_id),
                                "content": (
                                    chunk.content[:100] + "..."
                                    if len(chunk.content) > 100
                                    else chunk.content
                                ),
                                "processing_time_ms": processing_time,
                            },
                        )
                    except Exception as e:
                        # Don't fail the AI response if notification fails
                        logger.warning(f"AI response notification failed: {e}")

        except RateLimitError as e:
            error_data = {"type": "error", "error": "rate_limit", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
        except SafetyFilterError as e:
            error_data = {"type": "error", "error": "safety_filter", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
        except ProviderError as e:
            error_data = {"type": "error", "error": "provider_error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            error_data = {
                "type": "error",
                "error": "internal_error",
                "message": "An internal error occurred",
            }
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@router.put("/threads/{thread_id}", response_model=AIThreadResponse)
async def update_thread(
    thread_id: int,
    thread_update: AIThreadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update thread title or other properties."""
    try:
        thread = await ai_service.update_thread_title(
            user_id=current_user.id, thread_id=thread_id, title=thread_update.title
        )
        if not thread:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
        return AIThreadResponse.model_validate(thread)
    except Exception as e:
        logger.error(f"Failed to update thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update thread",
        )


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a thread and all its messages."""
    try:
        success = await ai_service.delete_thread(user_id=current_user.id, thread_id=thread_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
        return {"message": "Thread deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete thread",
        )


@router.get("/providers", response_model=AIProviderStatusResponse)
async def get_provider_status(current_user: User = Depends(get_current_user)):
    """Get status of all AI providers."""
    try:
        status_data = await ai_service.get_provider_status()
        return AIProviderStatusResponse(providers=status_data)
    except Exception as e:
        logger.error(f"Failed to get provider status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve provider status",
        )


@router.get("/rate-limit", response_model=RateLimitResponse)
async def get_rate_limit_status(current_user: User = Depends(get_current_user)):
    """Get user's current rate limit status."""
    try:
        status_data = ai_service.get_rate_limit_status(current_user.id)
        return RateLimitResponse(**status_data)
    except Exception as e:
        logger.error(f"Failed to get rate limit status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rate limit status",
        )


@router.get("/export/conversations")
async def export_conversations(
    format: str = "json",
    include_metadata: bool = True,
    compress: bool = False,
    thread_ids: str | None = None,  # Comma-separated IDs
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export user's AI conversations in various formats."""

    try:
        # Parse thread IDs if provided
        thread_id_list = None
        if thread_ids:
            thread_id_list = [int(id.strip()) for id in thread_ids.split(",") if id.strip()]

        options = ExportOptions(
            format=format,
            include_metadata=include_metadata,
            compress=compress,
            thread_ids=thread_id_list,
        )

        content = conversation_exporter.export_conversations(
            user_id=current_user.id, options=options, db=db
        )

        # Determine content type and filename
        content_type = {
            "json": "application/json",
            "csv": "text/csv",
            "markdown": "text/markdown",
            "html": "text/html",
            "xml": "application/xml",
            "txt": "text/plain",
        }.get(format, "text/plain")

        if compress:
            content_type = "application/zip"
            filename = f"conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        else:
            filename = f"conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"

        return Response(
            content=(
                content if isinstance(content, (bytes, bytearray)) else str(content).encode("utf-8")
            ),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {e!s}",
        )


@router.post("/import/conversations")
async def import_conversations(
    file: UploadFile = File(...),
    merge_strategy: str = "skip",  # skip, overwrite, merge
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import AI conversations from uploaded file."""

    try:
        # Validate file
        if not file.filename or not file.filename.endswith(".json"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON files are supported for import",
            )

        # Read file content
        content = await file.read()

        # Import conversations
        result = conversation_importer.import_conversations(
            user_id=current_user.id,
            content=content,
            format="json",
            merge_strategy=merge_strategy,
            db=db,
        )

        return {
            "success": result["success"],
            "imported_conversations": result["imported_conversations"],
            "imported_messages": result["imported_messages"],
            "errors": result.get("errors", []),
            "message": f"Successfully imported {result['imported_conversations']} conversations with {result['imported_messages']} messages",
        }

    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {e!s}",
        )


@router.get("/moderation/status")
async def get_user_moderation_status(current_user: User = Depends(get_current_user)):
    """Get user's content moderation status."""
    try:
        from app.services.content_moderation import content_moderator

        status_data = content_moderator.get_user_moderation_status(current_user.id)
        return status_data

    except Exception as e:
        logger.error(f"Failed to get moderation status: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ===== J5.2 ADVANCED FEATURES =====


@router.get("/analytics/conversation-metrics")
async def get_conversation_metrics(
    days_back: int = 30, current_user: User = Depends(get_current_user)
):
    """Get AI conversation analytics and metrics."""
    try:
        metrics = await ai_analytics_service.get_conversation_metrics(
            user_id=current_user.id, days_back=days_back
        )

        return {
            "metrics": {
                "total_conversations": metrics.total_conversations,
                "total_messages": metrics.total_messages,
                "avg_messages_per_conversation": metrics.avg_messages_per_conversation,
                "avg_response_time": metrics.avg_response_time,
                "user_satisfaction_score": metrics.user_satisfaction_score,
                "top_topics": metrics.top_topics,
                "provider_usage": metrics.provider_usage,
                "model_usage": metrics.model_usage,
            },
            "period_days": days_back,
        }

    except Exception as e:
        logger.error(f"Failed to get conversation metrics: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/analytics/user-insights")
async def get_user_insights(days_back: int = 90, current_user: User = Depends(get_current_user)):
    """Get detailed user AI usage insights."""
    try:
        insights = await ai_analytics_service.get_user_insights(
            user_id=current_user.id, days_back=days_back
        )

        return {
            "insights": {
                "total_threads": insights.total_threads,
                "total_messages": insights.total_messages,
                "favorite_topics": insights.favorite_topics,
                "preferred_providers": insights.preferred_providers,
                "avg_session_length": insights.avg_session_length,
                "most_active_hours": insights.most_active_hours,
                "satisfaction_trend": insights.satisfaction_trend,
            },
            "period_days": days_back,
        }

    except Exception as e:
        logger.error(f"Failed to get user insights: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/analytics/provider-performance")
async def get_provider_performance(
    days_back: int = 30,
    current_user: User = Depends(get_current_user),  # Could be admin-only
):
    """Get AI provider performance metrics."""
    try:
        performance_data = await ai_analytics_service.get_provider_performance(days_back)

        return {"performance": performance_data, "period_days": days_back}

    except Exception as e:
        logger.error(f"Failed to get provider performance: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/context/user-profile")
async def get_user_ai_profile(current_user: User = Depends(get_current_user)):
    """Get user's AI interaction profile and preferences."""
    try:
        context_data = await ai_context_manager.get_user_context_across_threads(
            user_id=current_user.id
        )

        return {"profile": context_data, "generated_at": datetime.now(UTC).isoformat()}

    except Exception as e:
        logger.error(f"Failed to get user AI profile: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/threads/{thread_id}/file-upload")
async def upload_file_to_thread(
    thread_id: int,
    file: UploadFile = File(...),
    prompt: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and analyze a file within an AI conversation thread."""
    try:
        # Process the uploaded file
        file_result = await multimodal_ai_service.process_file_upload(
            file=file, user_id=current_user.id, thread_id=thread_id
        )

        # If prompt provided, analyze the file with AI
        if prompt:
            analysis_prompt = prompt or "Please analyze this file and tell me about it."

            # Store user message with file reference
            user_message = AIMessage(
                thread_id=thread_id,
                role="user",
                content=f"[File uploaded: {file.filename}] {analysis_prompt}",
                created_at=datetime.now(UTC),
            )

            db.add(user_message)
            db.commit()

            # Determine file type and analyze accordingly
            file_data = file_result["processed_content"]

            if file_data["type"] == "image":
                # Analyze image
                image_bytes = base64.b64decode(file_data["content"])

                async def stream_image_analysis():
                    async for chunk in multimodal_ai_service.analyze_image_with_ai(
                        image_data=image_bytes,
                        user_prompt=analysis_prompt,
                        user_id=current_user.id,
                        thread_id=thread_id,
                    ):
                        if isinstance(chunk, StreamChunk):
                            chunk_data = {
                                "type": "chunk",
                                "content": chunk.content,
                                "is_complete": chunk.is_complete,
                            }
                            yield f"data: {json.dumps(chunk_data)}\\n\\n"
                        else:
                            chunk_data = {
                                "type": "chunk",
                                "content": str(chunk),
                                "is_complete": False,
                            }
                            yield f"data: {json.dumps(chunk_data)}\\n\\n"

                return StreamingResponse(
                    stream_image_analysis(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )

            elif file_data["type"] == "document":
                # Analyze document
                async def stream_document_analysis():
                    async for chunk in multimodal_ai_service.analyze_document_with_ai(
                        document_text=file_data["content"],
                        user_prompt=analysis_prompt,
                        filename=file.filename or "document.txt",
                        user_id=current_user.id,
                        thread_id=thread_id,
                    ):
                        if isinstance(chunk, StreamChunk):
                            chunk_data = {
                                "type": "chunk",
                                "content": chunk.content,
                                "is_complete": chunk.is_complete,
                            }
                            yield f"data: {json.dumps(chunk_data)}\\n\\n"
                        else:
                            chunk_data = {
                                "type": "chunk",
                                "content": str(chunk),
                                "is_complete": False,
                            }
                            yield f"data: {json.dumps(chunk_data)}\\n\\n"

                return StreamingResponse(
                    stream_document_analysis(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )

        return {
            "success": True,
            "file_processed": file_result["file_metadata"],
            "content_summary": file_result["processed_content"]["text_content"],
            "message": f"File '{file.filename}' uploaded and processed successfully",
        }

    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileProcessingError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
