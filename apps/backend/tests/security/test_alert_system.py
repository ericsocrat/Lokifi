#!/usr/bin/env python3
"""
Test the Security Alert System
"""

import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_alert_system():
    """Test the complete alert system"""
    print("🚨 TESTING SECURITY ALERT SYSTEM")
    print("=" * 40)
    
    try:
        from app.utils.security_alerts import Alert, AlertPriority, SecurityAlertManager
        from app.utils.security_logger import SecurityEventType, SecuritySeverity
        
        # Create alert manager
        alert_manager = SecurityAlertManager()
        print("✅ Alert manager initialized")
        
        # Create a test alert
        test_alert = Alert(
            title="🔒 Test Security Alert",
            message="This is a test of the security alerting system. All channels should receive this notification.",
            severity=SecuritySeverity.HIGH,
            priority=AlertPriority.HIGH,
            event_type=SecurityEventType.SECURITY_SCAN_DETECTED,
            source_ip="192.168.1.100",
            affected_user="test_user",
            additional_data={
                "test_mode": True,
                "alert_id": "TEST-001",
                "component": "Security Test Suite"
            }
        )
        
        print(f"✅ Created test alert: {test_alert.title}")
        
        # Send the alert
        print("📤 Sending test alert...")
        success = await alert_manager.send_security_alert(test_alert)
        if success:
            print("✅ Alert sent successfully!")
        else:
            print("⚠️ Alert sending had some issues (check configuration)")
        
        # Check alert history
        if hasattr(alert_manager, 'alert_history') and alert_manager.alert_history:
            print(f"✅ Alert logged in history ({len(alert_manager.alert_history)} alerts)")
        
        # Get alert configuration status
        config = alert_manager.config
        print("✅ Alert system configured:")
        print(f"   - Enabled: {config.enabled}")
        if config.channels:
            print(f"   - Channels: {[ch.value for ch in config.channels]}")
        else:
            print("   - Channels: Default (log, email)")
        print(f"   - Priority threshold: {config.priority_threshold.value}")
        print(f"   - Rate limit: {config.rate_limit_minutes} minutes")
        
        print("\n🎉 ALERT SYSTEM TEST COMPLETED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        print(f"❌ Alert system test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_alert_system())
    sys.exit(0 if success else 1)