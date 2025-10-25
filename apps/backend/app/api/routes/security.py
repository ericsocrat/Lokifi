"""
Security Dashboard API Routes
Endpoints for monitoring security events and system health
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import get_settings
from app.core.security import get_current_user
from app.utils.security_alerts import security_alert_manager
from app.utils.security_logger import SecurityEventType, security_monitor
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

router = APIRouter()
security = HTTPBearer()
settings = get_settings()


@router.get("/security/status")
async def get_security_status():
    """Get current security monitoring status (public endpoint for health checks)"""
    summary = security_monitor.get_security_summary()

    # Return sanitized version for public consumption
    return {
        "status": "monitoring",
        "timestamp": summary["timestamp"],
        "monitored_entities": summary.get("monitored_ips", 0),
        "active_monitoring": True,
    }


@router.get("/security/dashboard")
async def get_security_dashboard(current_user: dict[str, Any] = Depends(get_current_user)):
    """Get comprehensive security dashboard (requires authentication)"""

    # Only allow admin users to access detailed security info
    # TODO: Add proper role checking when user roles are implemented

    summary = security_monitor.get_security_summary()

    return {
        "security_summary": summary,
        "suspicious_ips": list(security_monitor.suspicious_ips),
        "recent_events": {
            "failed_attempts": summary.get("recent_failed_attempts", 0),
            "rate_violations": summary.get("recent_rate_violations", 0),
        },
        "monitoring_status": {
            "active": True,
            "last_updated": summary["timestamp"],
            "thresholds": {
                "max_failed_attempts": security_monitor.max_failed_attempts,
                "suspicious_threshold": security_monitor.suspicious_threshold,
                "rate_limit_threshold": security_monitor.rate_limit_threshold,
            },
        },
    }


@router.post("/security/ip/{ip_address}/block")
async def block_ip_address(
    ip_address: str, current_user: dict[str, Any] = Depends(get_current_user)
):
    """Manually block an IP address (admin only)"""

    # TODO: Add proper admin role checking

    # Add IP to suspicious list
    security_monitor.suspicious_ips.add(ip_address)

    # Log the manual blocking action
    from app.utils.security_logger import log_unauthorized_access

    await log_unauthorized_access(
        client_ip=ip_address,
        endpoint="/security/manual-block",
        user_id=str(current_user.get("sub", "unknown")),
    )

    return {
        "message": f"IP address {ip_address} has been blocked",
        "blocked_ip": ip_address,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.delete("/security/ip/{ip_address}/unblock")
async def unblock_ip_address(
    ip_address: str, current_user: dict[str, Any] = Depends(get_current_user)
):
    """Manually unblock an IP address (admin only)"""

    # TODO: Add proper admin role checking

    # Remove IP from suspicious list
    security_monitor.suspicious_ips.discard(ip_address)

    # Clear failed attempts for this IP
    if ip_address in security_monitor.failed_attempts:
        del security_monitor.failed_attempts[ip_address]

    # Clear rate limit violations for this IP
    if ip_address in security_monitor.rate_limit_violations:
        del security_monitor.rate_limit_violations[ip_address]

    return {
        "message": f"IP address {ip_address} has been unblocked",
        "unblocked_ip": ip_address,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/security/events/summary")
async def get_security_events_summary(
    hours: int = 24, current_user: dict[str, Any] = Depends(get_current_user)
):
    """Get summary of security events in the last N hours"""

    # For now, return the current summary
    # In a full implementation, this would query the security event log
    summary = security_monitor.get_security_summary()

    return {
        "timeframe_hours": hours,
        "summary": summary,
        "recommendations": _get_security_recommendations(summary),
    }


def _get_security_recommendations(summary: dict[str, Any]) -> list[str]:
    """Generate security recommendations based on current status"""
    recommendations = []

    suspicious_count = summary.get("suspicious_ips", 0)
    failed_attempts = summary.get("recent_failed_attempts", 0)
    rate_violations = summary.get("recent_rate_violations", 0)

    if suspicious_count > 5:
        recommendations.append(
            "High number of suspicious IPs detected. Consider implementing IP reputation checking."
        )

    if failed_attempts > 20:
        recommendations.append(
            "High number of authentication failures. Consider implementing CAPTCHA or account lockouts."
        )

    if rate_violations > 50:
        recommendations.append(
            "High rate limit violations. Consider adjusting rate limits or implementing progressive delays."
        )

    if not recommendations:
        recommendations.append("Security status is normal. Continue monitoring.")

    return recommendations


@router.get("/security/health")
async def security_health_check():
    """Security-focused health check endpoint"""

    try:
        # Check if security monitoring is working
        summary = security_monitor.get_security_summary()

        # Check if log files are writable
        from app.utils.security_logger import security_log_file

        log_accessible = security_log_file.parent.exists()

        health_status = {
            "security_monitoring": "healthy",
            "log_system": "healthy" if log_accessible else "degraded",
            "suspicious_activity": (
                "normal" if summary.get("suspicious_ips", 0) < 10 else "elevated"
            ),
            "timestamp": datetime.now(UTC).isoformat(),
        }

        overall_status = "healthy"
        if not log_accessible:
            overall_status = "degraded"
        elif summary.get("suspicious_ips", 0) > 20:
            overall_status = "at-risk"

        return {"status": overall_status, "details": health_status, "monitoring_active": True}

    except Exception:
        return {
            "status": "error",
            "error": "Security monitoring system error",
            "monitoring_active": False,
            "timestamp": datetime.now(UTC).isoformat(),
        }


# Additional security configuration endpoint
@router.get("/security/config")
async def get_security_config(current_user: dict[str, Any] = Depends(get_current_user)):
    """Get current security configuration (admin only)"""

    from app.core.security_config import security_config

    # Return non-sensitive configuration information
    return {
        "rate_limits": security_config.RATE_LIMITS,
        "cors_origins": security_config.get_cors_origins(),
        "max_request_size": security_config.MAX_REQUEST_SIZE,
        "password_requirements": {
            "min_length": security_config.MIN_PASSWORD_LENGTH,
            "max_length": security_config.MAX_PASSWORD_LENGTH,
            "require_uppercase": security_config.PASSWORD_REQUIRE_UPPERCASE,
            "require_lowercase": security_config.PASSWORD_REQUIRE_LOWERCASE,
            "require_digits": security_config.PASSWORD_REQUIRE_DIGITS,
            "require_special": security_config.PASSWORD_REQUIRE_SPECIAL,
            "min_criteria": security_config.PASSWORD_MIN_CRITERIA,
        },
        "environment": "production" if security_config.is_production() else "development",
    }


@router.get("/security/alerts/config")
async def get_alert_configuration(current_user: dict[str, Any] = Depends(get_current_user)):
    """Get current alert configuration (admin only)"""

    stats = security_alert_manager.get_alert_statistics()

    return {
        "alert_statistics": stats,
        "configuration": {
            "enabled": security_alert_manager.config.enabled,
            "priority_threshold": security_alert_manager.config.priority_threshold.value,
            "rate_limit_minutes": security_alert_manager.config.rate_limit_minutes,
            "channels": [c.value for c in (security_alert_manager.config.channels or [])],
        },
        "channel_status": {
            "email_configured": bool(security_alert_manager.smtp_username),
            "webhook_configured": bool(security_alert_manager.webhook_url),
            "slack_configured": bool(security_alert_manager.slack_webhook),
            "discord_configured": bool(security_alert_manager.discord_webhook),
        },
    }


@router.post("/security/alerts/test")
async def send_test_alert(current_user: dict[str, Any] = Depends(get_current_user)):
    """Send a test security alert (admin only)"""

    from app.utils.security_alerts import send_medium_alert

    try:
        success = await send_medium_alert(
            title="Test Security Alert",
            message="This is a test alert from the Lokifi security monitoring system.",
            event_type=SecurityEventType.CONFIGURATION_CHANGE,
            source_ip="127.0.0.1",
            additional_data={"test": True, "user": str(current_user.get("sub", "unknown"))},
        )

        return {
            "success": success,
            "message": "Test alert sent successfully" if success else "Failed to send test alert",
            "timestamp": datetime.now(UTC).isoformat(),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to send test alert",
            "timestamp": datetime.now(UTC).isoformat(),
        }


@router.get("/security/alerts/history")
async def get_alert_history(
    hours: int = 24,
    severity: str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Get recent alert history (admin only)"""

    cutoff_time = datetime.now(UTC) - timedelta(hours=hours)
    recent_alerts = [
        {
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity.value,
            "priority": alert.priority.value,
            "event_type": alert.event_type.value,
            "source_ip": alert.source_ip,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        }
        for alert in security_alert_manager.alert_history
        if alert.timestamp
        and alert.timestamp > cutoff_time
        and (not severity or alert.severity.value == severity.lower())
    ]

    return {
        "alerts": recent_alerts,
        "total": len(recent_alerts),
        "timeframe_hours": hours,
        "severity_filter": severity,
        "timestamp": datetime.now(UTC).isoformat(),
    }
