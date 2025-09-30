"""
Advanced AI Analytics Service for Fynix AI Chatbot (J5.2).

Provides comprehensive analytics and insights for AI conversations.
"""

import logging
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db.db import get_session
from app.db.models import AIMessage, AIThread

logger = logging.getLogger(__name__)


@dataclass
class ConversationMetrics:
    """Metrics for conversation analysis."""
    total_conversations: int
    total_messages: int
    avg_messages_per_conversation: float
    avg_response_time: float
    user_satisfaction_score: float
    top_topics: list[dict[str, Any]]
    provider_usage: dict[str, int]
    model_usage: dict[str, int]


@dataclass
class UserInsights:
    """User-specific AI usage insights."""
    user_id: int
    total_threads: int
    total_messages: int
    favorite_topics: list[str]
    preferred_providers: list[str]
    avg_session_length: float
    most_active_hours: list[int]
    satisfaction_trend: list[float]


class AIAnalyticsService:
    """Service for AI conversation analytics and insights."""
    
    def __init__(self):
        self.session_factory = get_session
        
    async def get_conversation_metrics(
        self, 
        user_id: int | None = None,
        days_back: int = 30
    ) -> ConversationMetrics:
        """Get comprehensive conversation metrics."""
        
        with self.session_factory() as db:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Base query
            base_query = db.query(AIThread).filter(AIThread.created_at >= start_date)
            if user_id:
                base_query = base_query.filter(AIThread.user_id == user_id)
            
            # Total conversations
            total_conversations = base_query.count()
            
            # Message metrics
            message_query = db.query(AIMessage).join(AIThread).filter(
                AIThread.created_at >= start_date
            )
            if user_id:
                message_query = message_query.filter(AIThread.user_id == user_id)
                
            total_messages = message_query.count()
            avg_messages_per_conversation = total_messages / max(total_conversations, 1)
            
            # Provider usage
            provider_usage = dict(
                db.query(AIMessage.provider, func.count(AIMessage.id))
                .join(AIThread)
                .filter(AIThread.created_at >= start_date)
                .filter(AIMessage.provider.isnot(None))
                .group_by(AIMessage.provider)
                .all()
            )
            
            # Model usage
            model_usage = dict(
                db.query(AIMessage.model, func.count(AIMessage.id))
                .join(AIThread)
                .filter(AIThread.created_at >= start_date)
                .filter(AIMessage.model.isnot(None))
                .group_by(AIMessage.model)
                .all()
            )
            
            # Calculate average response time (simplified)
            response_times = []
            threads = base_query.all()
            for thread in threads:
                messages = db.query(AIMessage).filter(
                    AIMessage.thread_id == thread.id
                ).order_by(AIMessage.created_at).all()
                
                for i in range(1, len(messages)):
                    if messages[i-1].role == "user" and messages[i].role == "assistant":
                        if messages[i].completed_at and messages[i-1].created_at:
                            response_time = (messages[i].completed_at - messages[i-1].created_at).total_seconds()
                            response_times.append(response_time)
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Extract topics (simplified keyword analysis)
            top_topics = await self._extract_conversation_topics(db, start_date, user_id)
            
            # Placeholder for user satisfaction (would need user feedback system)
            user_satisfaction_score = 4.2  # Mock score
            
            return ConversationMetrics(
                total_conversations=total_conversations,
                total_messages=total_messages,
                avg_messages_per_conversation=avg_messages_per_conversation,
                avg_response_time=avg_response_time,
                user_satisfaction_score=user_satisfaction_score,
                top_topics=top_topics,
                provider_usage=provider_usage,
                model_usage=model_usage
            )
    
    async def get_user_insights(self, user_id: int, days_back: int = 90) -> UserInsights:
        """Get detailed insights for a specific user."""
        
        with self.session_factory() as db:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Basic stats
            total_threads = db.query(AIThread).filter(
                AIThread.user_id == user_id,
                AIThread.created_at >= start_date
            ).count()
            
            total_messages = db.query(AIMessage).join(AIThread).filter(
                AIThread.user_id == user_id,
                AIThread.created_at >= start_date
            ).count()
            
            # Preferred providers
            preferred_providers = [
                row[0] for row in db.query(AIMessage.provider)
                .join(AIThread)
                .filter(
                    AIThread.user_id == user_id,
                    AIMessage.provider.isnot(None),
                    AIThread.created_at >= start_date
                )
                .group_by(AIMessage.provider)
                .order_by(desc(func.count(AIMessage.id)))
                .limit(3)
                .all()
            ]
            
            # Most active hours (analyze message timestamps)
            messages = db.query(AIMessage).join(AIThread).filter(
                AIThread.user_id == user_id,
                AIThread.created_at >= start_date
            ).all()
            
            hour_counts = Counter([msg.created_at.hour for msg in messages])
            most_active_hours = [hour for hour, _ in hour_counts.most_common(3)]
            
            # Calculate average session length
            avg_session_length = await self._calculate_avg_session_length(db, user_id, start_date)
            
            # Favorite topics (simplified)
            favorite_topics = await self._extract_user_topics(db, user_id, start_date)
            
            # Mock satisfaction trend
            satisfaction_trend = [4.1, 4.2, 4.3, 4.2, 4.4]
            
            return UserInsights(
                user_id=user_id,
                total_threads=total_threads,
                total_messages=total_messages,
                favorite_topics=favorite_topics,
                preferred_providers=preferred_providers,
                avg_session_length=avg_session_length,
                most_active_hours=most_active_hours,
                satisfaction_trend=satisfaction_trend
            )
    
    async def get_provider_performance(self, days_back: int = 30) -> dict[str, Any]:
        """Get performance metrics for each AI provider."""
        
        with self.session_factory() as db:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            providers_data = {}
            
            # Get all providers with usage
            providers = db.query(AIMessage.provider).filter(
                AIMessage.created_at >= start_date,
                AIMessage.provider.isnot(None)
            ).distinct().all()
            
            for (provider,) in providers:
                # Message count
                message_count = db.query(AIMessage).filter(
                    AIMessage.provider == provider,
                    AIMessage.created_at >= start_date
                ).count()
                
                # Error rate
                error_count = db.query(AIMessage).filter(
                    AIMessage.provider == provider,
                    AIMessage.created_at >= start_date,
                    AIMessage.error.isnot(None)
                ).count()
                
                error_rate = error_count / message_count if message_count > 0 else 0
                
                # Average response time
                completed_messages = db.query(AIMessage).filter(
                    AIMessage.provider == provider,
                    AIMessage.created_at >= start_date,
                    AIMessage.completed_at.isnot(None)
                ).all()
                
                response_times = [
                    (msg.completed_at - msg.created_at).total_seconds()
                    for msg in completed_messages
                    if msg.completed_at and msg.created_at
                ]
                
                avg_response_time = sum(response_times) / len(response_times) if response_times else 0
                
                providers_data[provider] = {
                    "message_count": message_count,
                    "error_rate": error_rate,
                    "avg_response_time": avg_response_time,
                    "success_rate": 1 - error_rate
                }
            
            return providers_data
    
    async def _extract_conversation_topics(
        self, 
        db: Session, 
        start_date: datetime, 
        user_id: int | None = None
    ) -> list[dict[str, Any]]:
        """Extract top conversation topics using keyword analysis."""
        
        # Get user messages for topic analysis
        query = db.query(AIMessage.content).join(AIThread).filter(
            AIThread.created_at >= start_date,
            AIMessage.role == "user"
        )
        if user_id:
            query = query.filter(AIThread.user_id == user_id)
            
        messages = query.all()
        
        # Simple keyword extraction (in production, use NLP libraries)
        keywords = []
        common_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must'}
        
        for (content,) in messages:
            words = content.lower().split()
            keywords.extend([
                word.strip('.,!?;:"()[]{}')
                for word in words
                if len(word) > 3 and word not in common_words
            ])
        
        # Count and return top topics
        topic_counts = Counter(keywords)
        top_topics = [
            {"topic": topic, "count": count}
            for topic, count in topic_counts.most_common(10)
        ]
        
        return top_topics
    
    async def _extract_user_topics(
        self, 
        db: Session, 
        user_id: int, 
        start_date: datetime
    ) -> list[str]:
        """Extract favorite topics for a specific user."""
        
        topics_data = await self._extract_conversation_topics(db, start_date, user_id)
        return [topic["topic"] for topic in topics_data[:5]]
    
    async def _calculate_avg_session_length(
        self, 
        db: Session, 
        user_id: int, 
        start_date: datetime
    ) -> float:
        """Calculate average session length for a user."""
        
        threads = db.query(AIThread).filter(
            AIThread.user_id == user_id,
            AIThread.created_at >= start_date
        ).all()
        
        session_lengths = []
        for thread in threads:
            messages = db.query(AIMessage).filter(
                AIMessage.thread_id == thread.id
            ).order_by(AIMessage.created_at).all()
            
            if len(messages) >= 2:
                session_length = (messages[-1].created_at - messages[0].created_at).total_seconds()
                session_lengths.append(session_length)
        
        return sum(session_lengths) / len(session_lengths) if session_lengths else 0


# Global service instance
ai_analytics_service = AIAnalyticsService()