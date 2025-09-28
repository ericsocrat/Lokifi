"""
API endpoints for Fynix AI Chatbot (J5).

Handles AI thread creation, messaging, and provider management.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import json
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.db.models import User, AIThread, AIMessage
from app.schemas.ai_schemas import (
    AIThreadCreate,
    AIThreadResponse,
    AIMessageResponse,
    AIChatRequest,
    AIProviderStatusResponse,
    RateLimitResponse,
    AIThreadUpdate
)
from app.services.ai_service import ai_service, RateLimitError, SafetyFilterError
from app.services.ai_provider import StreamChunk, ProviderError
from app.services.conversation_export import conversation_exporter, conversation_importer, ExportOptions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/threads", response_model=AIThreadResponse)
async def create_thread(
    thread_data: AIThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new AI chat thread."""
    try:
        thread = await ai_service.create_thread(
            user_id=current_user.id,
            title=thread_data.title
        )
        return AIThreadResponse.from_orm(thread)
    except Exception as e:
        logger.error(f"Failed to create thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create thread"
        )


@router.get("/threads", response_model=List[AIThreadResponse])
async def get_threads(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's AI chat threads."""
    try:
        threads = await ai_service.get_user_threads(
            user_id=current_user.id,
            limit=min(limit, 100),  # Cap at 100
            offset=offset
        )
        return [AIThreadResponse.from_orm(thread) for thread in threads]
    except Exception as e:
        logger.error(f"Failed to get threads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve threads"
        )


@router.get("/threads/{thread_id}/messages", response_model=List[AIMessageResponse])
async def get_thread_messages(
    thread_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a specific thread."""
    try:
        messages = await ai_service.get_thread_messages(
            thread_id=thread_id,
            user_id=current_user.id,
            limit=min(limit, 100)  # Cap at 100
        )
        return [AIMessageResponse.from_orm(message) for message in messages]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )


@router.post("/threads/{thread_id}/messages")
async def send_message(
    thread_id: int,
    chat_request: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message and stream the AI response."""
    
    async def stream_response():
        try:
            async for chunk in ai_service.send_message(
                user_id=current_user.id,
                thread_id=thread_id,
                message=chat_request.message,
                provider_name=chat_request.provider,
                model=chat_request.model
            ):
                if isinstance(chunk, StreamChunk):
                    # Stream token chunk
                    yield f"data: {json.dumps({
                        'type': 'chunk',
                        'content': chunk.content,
                        'is_complete': chunk.is_complete
                    })}\n\n"
                elif isinstance(chunk, AIMessage):
                    # Final message
                    yield f"data: {json.dumps({
                        'type': 'complete',
                        'message': AIMessageResponse.from_orm(chunk).dict()
                    })}\n\n"
        except RateLimitError as e:
            yield f"data: {json.dumps({
                'type': 'error',
                'error': 'rate_limit',
                'message': str(e)
            })}\n\n"
        except SafetyFilterError as e:
            yield f"data: {json.dumps({
                'type': 'error',
                'error': 'safety_filter',
                'message': str(e)
            })}\n\n"
        except ProviderError as e:
            yield f"data: {json.dumps({
                'type': 'error',
                'error': 'provider_error',
                'message': str(e)
            })}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({
                'type': 'error',
                'error': 'internal_error',
                'message': 'An internal error occurred'
            })}\n\n"
    
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )


@router.put("/threads/{thread_id}", response_model=AIThreadResponse)
async def update_thread(
    thread_id: int,
    thread_update: AIThreadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update thread title or other properties."""
    try:
        thread = await ai_service.update_thread_title(
            user_id=current_user.id,
            thread_id=thread_id,
            title=thread_update.title
        )
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thread not found"
            )
        return AIThreadResponse.from_orm(thread)
    except Exception as e:
        logger.error(f"Failed to update thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update thread"
        )


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a thread and all its messages."""
    try:
        success = await ai_service.delete_thread(
            user_id=current_user.id,
            thread_id=thread_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thread not found"
            )
        return {"message": "Thread deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete thread"
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
            detail="Failed to retrieve provider status"
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
            detail="Failed to retrieve rate limit status"
        )


@router.get("/export/conversations")
async def export_conversations(
    format: str = "json",
    include_metadata: bool = True,
    compress: bool = False,
    thread_ids: Optional[str] = None,  # Comma-separated IDs
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
            thread_ids=thread_id_list
        )
        
        content = conversation_exporter.export_conversations(
            user_id=current_user.id,
            options=options,
            db=db
        )
        
        # Determine content type and filename
        content_type = {
            "json": "application/json",
            "csv": "text/csv", 
            "markdown": "text/markdown",
            "html": "text/html",
            "xml": "application/xml",
            "txt": "text/plain"
        }.get(format, "text/plain")
        
        if compress:
            content_type = "application/zip"
            filename = f"conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        else:
            filename = f"conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        return Response(
            content=content if isinstance(content, (bytes, bytearray)) else str(content).encode('utf-8'),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/import/conversations")
async def import_conversations(
    file: UploadFile = File(...),
    merge_strategy: str = "skip",  # skip, overwrite, merge
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import AI conversations from uploaded file."""
    
    try:
        # Validate file
        if not file.filename or not file.filename.endswith('.json'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON files are supported for import"
            )
        
        # Read file content
        content = await file.read()
        
        # Import conversations
        result = conversation_importer.import_conversations(
            user_id=current_user.id,
            content=content,
            format="json", 
            merge_strategy=merge_strategy,
            db=db
        )
        
        return {
            "success": result["success"],
            "imported_conversations": result["imported_conversations"],
            "imported_messages": result["imported_messages"],
            "errors": result.get("errors", []),
            "message": f"Successfully imported {result['imported_conversations']} conversations with {result['imported_messages']} messages"
        }
        
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve moderation status"
        )