"""
Multi-modal AI Service for Fynix AI Chatbot (J5.2).

Handles file uploads, image processing, and document analysis.
"""

import logging
import uuid
import aiofiles
import base64
import io
import mimetypes
from typing import List, Dict, Any, Optional, AsyncGenerator, Union
from pathlib import Path
import hashlib
import json
from datetime import datetime

from fastapi import UploadFile

try:
    try:
    from PIL import Image
except ImportError:
    Image = None
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

from sqlalchemy.orm import Session

from app.db.db import get_session
from app.db.models import AIThread, AIMessage
from app.services.ai_provider import AIMessage as AIProviderMessage, MessageRole, StreamOptions
from app.services.ai_provider_manager import ai_provider_manager
from app.services.ai_service import StreamChunk
from app.core.config import settings

logger = logging.getLogger(__name__)


class FileProcessingError(Exception):
    """Raised when file processing fails."""
    pass


class UnsupportedFileTypeError(Exception):
    """Raised when file type is not supported."""
    pass


class MultiModalAIService:
    """Service for handling multi-modal AI interactions."""
    
    def __init__(self):
        self.session_factory = get_session
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.supported_image_types = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        self.supported_document_types = {'.pdf', '.docx', '.txt', '.md'}
        self.max_image_size = (1024, 1024)  # Max image dimensions
        
    async def process_file_upload(
        self, 
        file: UploadFile, 
        user_id: int, 
        thread_id: int
    ) -> Dict[str, Any]:
        """Process uploaded file and extract content."""
        
        # Validate file
        await self._validate_file(file)
        
        # Read file content
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Get file info
        file_extension = Path(file.filename or 'unknown').suffix.lower()
        mime_type = mimetypes.guess_type(file.filename or 'unknown')[0]
        
        # Process based on file type
        if file_extension in self.supported_image_types:
            processed_data = await self._process_image(content, file.filename or 'unknown')
        elif file_extension in self.supported_document_types:
            processed_data = await self._process_document(content, file.filename or 'unknown', file_extension)
        else:
            raise UnsupportedFileTypeError(f"File type {file_extension} is not supported")
        
        # Store file metadata
        file_metadata = {
            "filename": file.filename,
            "file_hash": file_hash,
            "file_size": len(content),
            "mime_type": mime_type,
            "processed_at": str(datetime.utcnow()),
            "processing_type": processed_data["type"]
        }
        
        return {
            "file_metadata": file_metadata,
            "processed_content": processed_data,
            "success": True
        }
    
    async def analyze_image_with_ai(
        self, 
        image_data: bytes, 
        user_prompt: str,
        user_id: int,
        thread_id: int
    ) -> AsyncGenerator[Union[StreamChunk, str], None]:
        """Analyze image using AI with user prompt."""
        
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Get AI provider that supports vision
            provider = await ai_provider_manager.get_primary_provider()
            if not provider:
                yield "No AI provider available for image analysis"
                return
            
            # Create multimodal prompt
            analysis_prompt = f"""
            Please analyze this image and respond to the user's request: "{user_prompt}"
            
            Provide detailed observations about:
            1. What you see in the image
            2. Relevant details related to the user's question
            3. Any insights or analysis requested
            
            Be specific and helpful in your response.
            """
            
            # For providers that support vision (like GPT-4V), include image
            messages = [AIProviderMessage(
                role=MessageRole.USER,
                content=analysis_prompt,
                metadata={"image_base64": image_base64}
            )]
            
            # Stream response from AI
            async for chunk in provider.stream_chat(messages):
                if chunk.content:
                    yield StreamChunk(
                        id=str(uuid.uuid4()),
                        content=chunk.content,
                        is_complete=chunk.is_complete
                    )
                    
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            yield f"Sorry, I encountered an error analyzing the image: {str(e)}"
    
    async def analyze_document_with_ai(
        self, 
        document_text: str, 
        user_prompt: str,
        filename: str,
        user_id: int,
        thread_id: int
    ) -> AsyncGenerator[Union[StreamChunk, str], None]:
        """Analyze document content using AI."""
        
        try:
            provider = await ai_provider_manager.get_primary_provider()
            if not provider:
                yield "No AI provider available for document analysis"
                return
            
            # Create document analysis prompt
            analysis_prompt = f"""
            I've uploaded a document "{filename}" with the following content:
            
            ---BEGIN DOCUMENT---
            {document_text[:4000]}  # Limit to avoid token limits
            ---END DOCUMENT---
            
            User request: "{user_prompt}"
            
            Please analyze the document and provide a helpful response based on the user's request.
            """
            
            messages = [AIProviderMessage(
                role=MessageRole.USER,
                content=analysis_prompt
            )]
            
            # Stream response from AI
            async for chunk in provider.stream_chat(messages):
                if chunk.content:
                    yield StreamChunk(
                        id=str(uuid.uuid4()),
                        content=chunk.content,
                        is_complete=chunk.is_complete
                    )
                    
        except Exception as e:
            logger.error(f"Document analysis failed: {e}")
            yield f"Sorry, I encountered an error analyzing the document: {str(e)}"
    
    async def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_file_size:
            raise FileProcessingError(f"File too large. Maximum size is {self.max_file_size / 1024 / 1024}MB")
        
        # Check file extension
        if not file.filename:
            raise FileProcessingError("Filename is required")
            
        file_extension = Path(file.filename or 'unknown').suffix.lower()
        supported_types = self.supported_image_types | self.supported_document_types
        
        if file_extension not in supported_types:
            raise UnsupportedFileTypeError(
                f"File type {file_extension} not supported. "
                f"Supported types: {', '.join(supported_types)}"
            )
    
    async def _process_image(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Process image file."""
        
        if not PIL_AVAILABLE:
            raise FileProcessingError("Image processing not available. Install Pillow: pip install Pillow")
        
        try:
            # Open and process image
            if Image is None:
                raise ImportError('PIL not available')
            image = Image.open(io.BytesIO(content))
            
            # Get image info
            width, height = image.size
            format = image.format
            mode = image.mode
            
            # Resize if too large
            if width > self.max_image_size[0] or height > self.max_image_size[1]:
                if Image is not None:
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
                
                # Convert back to bytes
                output_buffer = io.BytesIO()
                image.save(output_buffer, format=format or 'JPEG')
                content = output_buffer.getvalue()
            
            # Extract basic metadata
            metadata = {
                "original_width": width,
                "original_height": height,
                "format": format,
                "mode": mode,
                "size_bytes": len(content)
            }
            
            return {
                "type": "image",
                "content": base64.b64encode(content).decode('utf-8'),
                "metadata": metadata,
                "text_content": f"Image: {filename} ({width}x{height}, {format})"
            }
            
        except Exception as e:
            raise FileProcessingError(f"Failed to process image: {str(e)}")
    
    async def _process_document(self, content: bytes, filename: str, extension: str) -> Dict[str, Any]:
        """Process document file."""
        
        try:
            text_content = ""
            
            if extension == '.pdf':
                text_content = await self._extract_pdf_text(content)
            elif extension == '.docx':
                text_content = await self._extract_docx_text(content)
            elif extension in ['.txt', '.md']:
                text_content = content.decode('utf-8', errors='ignore')
            
            # Basic text analysis
            word_count = len(text_content.split())
            char_count = len(text_content)
            line_count = len(text_content.splitlines())
            
            return {
                "type": "document",
                "content": text_content,
                "metadata": {
                    "word_count": word_count,
                    "char_count": char_count,
                    "line_count": line_count,
                    "extension": extension
                },
                "text_content": text_content[:1000] + "..." if len(text_content) > 1000 else text_content
            }
            
        except Exception as e:
            raise FileProcessingError(f"Failed to process document: {str(e)}")
    
    async def _extract_pdf_text(self, content: bytes) -> str:
        """Extract text from PDF."""
        
        try:
            # Simple PDF text extraction fallback
            # In production, use pypdf2 or pdfplumber
            return "PDF content extraction not available - install PyPDF2 for full support"
            
        except Exception as e:
            raise FileProcessingError(f"Failed to extract PDF text: {str(e)}")
    
    async def _extract_docx_text(self, content: bytes) -> str:
        """Extract text from DOCX."""
        
        try:
            # Simple DOCX text extraction fallback  
            # In production, use python-docx
            return "DOCX content extraction not available - install python-docx for full support"
            
        except Exception as e:
            raise FileProcessingError(f"Failed to extract DOCX text: {str(e)}")
    
    async def get_file_processing_stats(self, user_id: int, days_back: int = 30) -> Dict[str, Any]:
        """Get file processing statistics for a user."""
        
        # This would typically query a file_uploads table
        # For now, return mock data
        return {
            "total_files_processed": 12,
            "images_processed": 8,
            "documents_processed": 4,
            "total_size_processed_mb": 45.2,
            "most_common_types": ["jpg", "pdf", "png"],
            "processing_success_rate": 0.95
        }


# Global service instance
multimodal_ai_service = MultiModalAIService()