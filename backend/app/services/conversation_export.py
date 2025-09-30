"""
Conversation Export/Import System for Fynix AI Chatbot (J5.1).

Allows users to export/import their AI conversations in various formats.
"""

import csv
import json
import xml.etree.ElementTree as ET
import zipfile

# import markdown  # Optional - install with: pip install markdown
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO, StringIO
from typing import Any

from sqlalchemy.orm import Session

from app.db.db import get_session
from app.db.models import AIMessage, AIThread


@dataclass
class ExportOptions:
    """Options for conversation export."""
    format: str = "json"  # json, csv, markdown, html, xml
    include_metadata: bool = True
    include_system_messages: bool = False
    date_range: tuple | None = None  # (start_date, end_date)
    thread_ids: list[int] | None = None
    compress: bool = False


class ConversationExporter:
    """Export AI conversations to various formats."""
    
    def __init__(self):
        self.supported_formats = ["json", "csv", "markdown", "html", "xml", "txt"]
    
    def export_conversations(
        self, 
        user_id: int, 
        options: ExportOptions,
        db: Session | None = None
    ) -> str | bytes:
        """Export user's conversations based on options."""
        
        if db is None:
            with get_session() as session:
                return self._do_export(user_id, options, session)
        else:
            return self._do_export(user_id, options, db)
    
    def _do_export(self, user_id: int, options: ExportOptions, db: Session) -> str | bytes:
        """Internal export implementation."""
        
        # Get conversations data
        conversations = self._get_conversations_data(user_id, options, db)
        
        # Export in requested format
        if options.format == "json":
            content = self._export_json(conversations, options)
        elif options.format == "csv":
            content = self._export_csv(conversations, options)
        elif options.format == "markdown":
            content = self._export_markdown(conversations, options)
        elif options.format == "html":
            content = self._export_html(conversations, options)
        elif options.format == "xml":
            content = self._export_xml(conversations, options)
        elif options.format == "txt":
            content = self._export_txt(conversations, options)
        else:
            raise ValueError(f"Unsupported format: {options.format}")
        
        # Compress if requested
        if options.compress:
            return self._compress_content(content, f"conversations.{options.format}")
        
        return content
    
    def _get_conversations_data(self, user_id: int, options: ExportOptions, db: Session) -> list[dict[str, Any]]:
        """Fetch conversation data from database."""
        
        # Base query for threads
        threads_query = db.query(AIThread).filter(AIThread.user_id == user_id)
        
        # Apply filters
        if options.date_range:
            start_date, end_date = options.date_range
            threads_query = threads_query.filter(
                AIThread.created_at >= start_date,
                AIThread.created_at <= end_date
            )
        
        if options.thread_ids:
            threads_query = threads_query.filter(AIThread.id.in_(options.thread_ids))
        
        threads = threads_query.order_by(AIThread.created_at.desc()).all()
        
        conversations = []
        for thread in threads:
            # Get messages for thread
            messages_query = db.query(AIMessage).filter(AIMessage.thread_id == thread.id)
            
            if not options.include_system_messages:
                messages_query = messages_query.filter(AIMessage.role != "system")
            
            messages = messages_query.order_by(AIMessage.created_at).all()
            
            # Build conversation data
            conversation_data = {
                "thread_id": thread.id,
                "title": thread.title,
                "created_at": thread.created_at.isoformat(),
                "updated_at": thread.updated_at.isoformat(),
                "message_count": len(messages),
                "messages": []
            }
            
            if options.include_metadata:
                conversation_data["metadata"] = {
                    "is_archived": thread.is_archived,
                    "user_id": thread.user_id
                }
            
            for msg in messages:
                message_data = {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                }
                
                if options.include_metadata:
                    message_data["metadata"] = {
                        "model": msg.model,
                        "provider": msg.provider,
                        "token_count": msg.token_count,
                        "completed_at": msg.completed_at.isoformat() if msg.completed_at else None,
                        "error": msg.error,
                        "duration": msg.duration_seconds if hasattr(msg, 'duration_seconds') else None
                    }
                
                conversation_data["messages"].append(message_data)
            
            conversations.append(conversation_data)
        
        return conversations
    
    def _export_json(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as JSON."""
        export_data = {
            "exported_at": datetime.utcnow().isoformat(),
            "format": "json",
            "total_conversations": len(conversations),
            "conversations": conversations
        }
        
        return json.dumps(export_data, indent=2, ensure_ascii=False)
    
    def _export_csv(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as CSV."""
        output = StringIO()
        
        # CSV headers
        headers = ["thread_id", "thread_title", "message_id", "role", "content", "created_at"]
        if options.include_metadata:
            headers.extend(["model", "provider", "token_count", "error"])
        
        writer = csv.writer(output)
        writer.writerow(headers)
        
        # Write data
        for conv in conversations:
            for msg in conv["messages"]:
                row = [
                    conv["thread_id"],
                    conv["title"],
                    msg["id"],
                    msg["role"],
                    msg["content"].replace("\n", "\\n"),  # Escape newlines
                    msg["created_at"]
                ]
                
                if options.include_metadata and "metadata" in msg:
                    metadata = msg["metadata"]
                    row.extend([
                        metadata.get("model", ""),
                        metadata.get("provider", ""),
                        metadata.get("token_count", ""),
                        metadata.get("error", "")
                    ])
                
                writer.writerow(row)
        
        return output.getvalue()
    
    def _export_markdown(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as Markdown."""
        output = []
        output.append("# AI Conversations Export")
        output.append(f"\nExported at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        output.append(f"Total conversations: {len(conversations)}\n")
        
        for conv in conversations:
            output.append(f"## {conv['title']}")
            output.append(f"**Created:** {conv['created_at']}")
            output.append(f"**Messages:** {conv['message_count']}\n")
            
            for msg in conv["messages"]:
                role_emoji = "👤" if msg["role"] == "user" else "🤖"
                output.append(f"### {role_emoji} {msg['role'].title()}")
                
                if options.include_metadata and "metadata" in msg:
                    metadata = msg["metadata"]
                    if metadata.get("model"):
                        output.append(f"*Model: {metadata['model']}*")
                
                output.append(f"{msg['content']}\n")
                output.append(f"*{msg['created_at']}*\n")
        
        return "\n".join(output)
    
    def _export_html(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as HTML."""
        # Simple HTML conversion without markdown dependency
        output = []
        output.append("<!DOCTYPE html>")
        output.append("<html><head><meta charset='UTF-8'>")
        output.append("<title>AI Conversations Export</title>")
        output.append("<style>")
        output.append("body { font-family: Arial, sans-serif; margin: 40px; }")
        output.append("h1, h2, h3 { color: #333; }")
        output.append(".user { background: #e8f4ff; padding: 10px; border-radius: 5px; margin: 10px 0; }")
        output.append(".assistant { background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 10px 0; }")
        output.append(".metadata { font-size: 0.8em; color: #666; font-style: italic; }")
        output.append("</style></head><body>")
        
        output.append("<h1>AI Conversations Export</h1>")
        output.append(f"<p><strong>Exported at:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</p>")
        output.append(f"<p><strong>Total conversations:</strong> {len(conversations)}</p>")
        
        for conv in conversations:
            output.append(f"<h2>{conv['title']}</h2>")
            output.append(f"<p><strong>Created:</strong> {conv['created_at']}</p>")
            output.append(f"<p><strong>Messages:</strong> {conv['message_count']}</p>")
            
            for msg in conv["messages"]:
                role_class = msg["role"].lower()
                role_emoji = "👤" if msg["role"] == "user" else "🤖"
                
                output.append(f"<div class='{role_class}'>")
                output.append(f"<h3>{role_emoji} {msg['role'].title()}</h3>")
                
                if options.include_metadata and "metadata" in msg:
                    metadata = msg["metadata"]
                    if metadata.get("model"):
                        output.append(f"<p class='metadata'>Model: {metadata['model']}</p>")
                
                # Convert newlines to HTML breaks
                content = msg['content'].replace('\n', '<br>')
                output.append(f"<p>{content}</p>")
                output.append(f"<p class='metadata'>{msg['created_at']}</p>")
                output.append("</div>")
        
        output.append("</body></html>")
        return "\n".join(output)
    
    def _export_xml(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as XML."""
        root = ET.Element("conversations")
        root.set("exported_at", datetime.utcnow().isoformat())
        root.set("total", str(len(conversations)))
        
        for conv in conversations:
            conv_elem = ET.SubElement(root, "conversation")
            conv_elem.set("id", str(conv["thread_id"]))
            conv_elem.set("title", conv["title"])
            conv_elem.set("created_at", conv["created_at"])
            
            messages_elem = ET.SubElement(conv_elem, "messages")
            
            for msg in conv["messages"]:
                msg_elem = ET.SubElement(messages_elem, "message")
                msg_elem.set("id", str(msg["id"]))
                msg_elem.set("role", msg["role"])
                msg_elem.set("created_at", msg["created_at"])
                
                content_elem = ET.SubElement(msg_elem, "content")
                content_elem.text = msg["content"]
                
                if options.include_metadata and "metadata" in msg:
                    metadata_elem = ET.SubElement(msg_elem, "metadata")
                    metadata = msg["metadata"]
                    for key, value in metadata.items():
                        if value is not None:
                            meta_elem = ET.SubElement(metadata_elem, key)
                            meta_elem.text = str(value)
        
        return ET.tostring(root, encoding='unicode', method='xml')
    
    def _export_txt(self, conversations: list[dict[str, Any]], options: ExportOptions) -> str:
        """Export as plain text."""
        output = []
        output.append("AI CONVERSATIONS EXPORT")
        output.append("=" * 50)
        output.append(f"Exported at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        output.append(f"Total conversations: {len(conversations)}")
        output.append("")
        
        for i, conv in enumerate(conversations, 1):
            output.append(f"CONVERSATION {i}: {conv['title']}")
            output.append("-" * 50)
            output.append(f"Created: {conv['created_at']}")
            output.append(f"Messages: {conv['message_count']}")
            output.append("")
            
            for msg in conv["messages"]:
                output.append(f"[{msg['role'].upper()}] {msg['created_at']}")
                
                if options.include_metadata and "metadata" in msg:
                    metadata = msg["metadata"]
                    if metadata.get("model"):
                        output.append(f"Model: {metadata['model']}")
                
                output.append(msg["content"])
                output.append("")
        
        return "\n".join(output)
    
    def _compress_content(self, content: str | bytes, filename: str) -> bytes:
        """Compress content into ZIP file."""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            if isinstance(content, str):
                zip_file.writestr(filename, content.encode('utf-8'))
            else:
                zip_file.writestr(filename, content)
        
        return zip_buffer.getvalue()


class ConversationImporter:
    """Import AI conversations from various formats."""
    
    def __init__(self):
        self.supported_formats = ["json"]
    
    def import_conversations(
        self, 
        user_id: int, 
        content: str | bytes, 
        format: str = "json",
        merge_strategy: str = "skip",  # skip, overwrite, merge
        db: Session | None = None
    ) -> dict[str, Any]:
        """
        Import conversations for a user.
        
        Args:
            user_id: Target user ID
            content: Content to import
            format: Import format (json)
            merge_strategy: How to handle existing conversations
        """
        
        if format not in self.supported_formats:
            raise ValueError(f"Unsupported import format: {format}")
        
        if db is None:
            with get_session() as session:
                return self._do_import(user_id, content, format, merge_strategy, session)
        else:
            return self._do_import(user_id, content, format, merge_strategy, db)
    
    def _do_import(
        self, 
        user_id: int, 
        content: str | bytes, 
        format: str, 
        merge_strategy: str, 
        db: Session
    ) -> dict[str, Any]:
        """Internal import implementation."""
        
        if format == "json":
            return self._import_json(user_id, content, merge_strategy, db)
        
        raise ValueError(f"Import format {format} not implemented")
    
    def _import_json(self, user_id: int, content: str | bytes, merge_strategy: str, db: Session) -> dict[str, Any]:
        """Import from JSON format."""
        
        if isinstance(content, bytes):
            content = content.decode('utf-8')
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid JSON: {str(e)}",
                "imported_conversations": 0,
                "imported_messages": 0
            }
        
        if "conversations" not in data:
            return {
                "success": False,
                "error": "Missing 'conversations' field in JSON",
                "imported_conversations": 0,
                "imported_messages": 0
            }
        
        imported_conversations = 0
        imported_messages = 0
        errors = []
        
        for conv_data in data["conversations"]:
            try:
                # Check if conversation exists
                existing_thread = None
                if "thread_id" in conv_data:
                    existing_thread = db.query(AIThread).filter(
                        AIThread.id == conv_data["thread_id"],
                        AIThread.user_id == user_id
                    ).first()
                
                if existing_thread and merge_strategy == "skip":
                    continue
                
                # Create or update thread
                if existing_thread and merge_strategy == "overwrite":
                    thread = existing_thread
                    thread.title = conv_data["title"]
                    thread.updated_at = datetime.utcnow()
                    
                    # Delete existing messages
                    db.query(AIMessage).filter(AIMessage.thread_id == thread.id).delete()
                else:
                    # Create new thread
                    thread = AIThread(
                        user_id=user_id,
                        title=conv_data["title"],
                        created_at=datetime.fromisoformat(conv_data["created_at"]) if "created_at" in conv_data else datetime.utcnow(),
                        updated_at=datetime.fromisoformat(conv_data["updated_at"]) if "updated_at" in conv_data else datetime.utcnow()
                    )
                    db.add(thread)
                    db.flush()  # Get thread ID
                
                # Import messages
                for msg_data in conv_data.get("messages", []):
                    message = AIMessage(
                        thread_id=thread.id,
                        role=msg_data["role"],
                        content=msg_data["content"],
                        created_at=datetime.fromisoformat(msg_data["created_at"]) if "created_at" in msg_data else datetime.utcnow()
                    )
                    
                    # Add metadata if available
                    if "metadata" in msg_data:
                        metadata = msg_data["metadata"]
                        message.model = metadata.get("model")
                        message.provider = metadata.get("provider")
                        message.token_count = metadata.get("token_count")
                        message.error = metadata.get("error")
                        if metadata.get("completed_at"):
                            message.completed_at = datetime.fromisoformat(metadata["completed_at"])
                    
                    db.add(message)
                    imported_messages += 1
                
                imported_conversations += 1
                
            except Exception as e:
                errors.append(f"Error importing conversation '{conv_data.get('title', 'Unknown')}': {str(e)}")
                continue
        
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Database error: {str(e)}",
                "imported_conversations": 0,
                "imported_messages": 0
            }
        
        return {
            "success": True,
            "imported_conversations": imported_conversations,
            "imported_messages": imported_messages,
            "errors": errors
        }


# Global instances
conversation_exporter = ConversationExporter()
conversation_importer = ConversationImporter()