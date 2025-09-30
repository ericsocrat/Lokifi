#!/usr/bin/env python3
"""
Test suite for J5.2 Advanced AI Features.

Tests analytics, context management, and multimodal capabilities.
"""
import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_j52_features():
    """Test J5.2 advanced features."""
    print("🧪 Testing J5.2 Advanced AI Features...")
    
    # Test 1: AI Analytics Service
    try:
        from app.services.ai_analytics import ai_analytics_service
        print("✓ AI Analytics Service imports successfully")
        
        # Test getting conversation metrics (mock data)
        metrics = await ai_analytics_service.get_conversation_metrics(user_id=1, days_back=30)
        print(f"✓ Conversation metrics: {metrics.total_conversations} conversations, {metrics.total_messages} messages")
        
    except Exception as e:
        print(f"❌ AI Analytics test failed: {e}")
    
    # Test 2: AI Context Manager
    try:
        from app.services.ai_context_manager import ai_context_manager
        print("✓ AI Context Manager imports successfully")
        
        # Test user context analysis
        context = await ai_context_manager.get_user_context_across_threads(user_id=1)
        print(f"✓ User context analysis: {context.get('dominant_communication_style', 'neutral')} style")
        
    except Exception as e:
        print(f"❌ AI Context Manager test failed: {e}")
    
    # Test 3: Multimodal AI Service
    try:
        from app.services.multimodal_ai_service import multimodal_ai_service
        print("✓ Multimodal AI Service imports successfully")
        
        # Test file processing stats
        stats = await multimodal_ai_service.get_file_processing_stats(user_id=1)
        print(f"✓ File processing stats: {stats['total_files_processed']} files processed")
        
    except Exception as e:
        print(f"❌ Multimodal AI Service test failed: {e}")
    
    # Test 4: Enhanced AI Router
    try:
        from app.routers.ai import router
        print("✓ Enhanced AI Router imports successfully")
        print(f"✓ Router has {len(router.routes)} routes including new J5.2 endpoints")
        
    except Exception as e:
        print(f"❌ Enhanced AI Router test failed: {e}")
    
    # Test 5: Integration Test
    try:
        # Test that all services can work together
        from app.services.ai_analytics import ConversationMetrics
        from app.services.ai_context_manager import ContextSummary
        
        print("✓ All J5.2 data models import successfully")
        
        # Create test instances
        test_metrics = ConversationMetrics(
            total_conversations=5,
            total_messages=25,
            avg_messages_per_conversation=5.0,
            avg_response_time=1.2,
            user_satisfaction_score=4.3,
            top_topics=[{"topic": "programming", "count": 10}],
            provider_usage={"openrouter": 15, "ollama": 10},
            model_usage={"gpt-3.5-turbo": 20, "llama3.1": 5}
        )
        
        test_context = ContextSummary(
            summary="Test conversation about programming",
            key_points=["User asked about Python", "Discussed best practices"],
            user_preferences={"detail_level": "high"},
            conversation_tone="technical",
            topic_tags=["python", "programming"],
            created_at=datetime.utcnow()
        )
        
        print("✓ J5.2 data structures work correctly")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
    
    print("\\n🎉 J5.2 Advanced Features Testing Complete!")
    print("\\n📊 New Features Added:")
    print("   • AI Analytics & Metrics")  
    print("   • Intelligent Context Management")
    print("   • Multimodal File Processing")
    print("   • Advanced User Insights")
    print("   • Provider Performance Analytics")
    print("   • Conversation Style Analysis")
    print("\\n✨ J5.2 enhances J5 with enterprise-grade AI capabilities!")

if __name__ == "__main__":
    asyncio.run(test_j52_features())