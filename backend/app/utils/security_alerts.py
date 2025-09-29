"""
External Security Monitoring and Alerting System
Comprehensive monitoring with multiple alert channels
"""

import asyncio
import smtplib
import json
import requests
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Callable
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass
from enum import Enum
import os

from app.utils.security_logger import SecurityEvent, SecurityEventType, SecuritySeverity
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class AlertChannel(Enum):
    """Available alert channels"""
    EMAIL = "email"
    WEBHOOK = "webhook"  
    SLACK = "slack"
    DISCORD = "discord"
    LOG = "log"
    SMS = "sms"  # For future implementation

class AlertPriority(Enum):
    """Alert priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AlertConfiguration:
    """Configuration for alert channels"""
    enabled: bool = True
    channels: Optional[List[AlertChannel]] = None
    priority_threshold: AlertPriority = AlertPriority.MEDIUM
    rate_limit_minutes: int = 5  # Minimum time between similar alerts
    
    def __post_init__(self):
        if self.channels is None:
            self.channels = [AlertChannel.LOG, AlertChannel.EMAIL]

@dataclass
class Alert:
    """Security alert data structure"""
    title: str
    message: str
    severity: SecuritySeverity
    priority: AlertPriority
    event_type: SecurityEventType
    source_ip: Optional[str] = None
    affected_user: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)

class SecurityAlertManager:
    """Manages security alerts and notifications"""
    
    def __init__(self):
        self.config = AlertConfiguration()
        self.alert_history = []
        self.rate_limit_cache = {}
        
        # Load configuration from environment
        self._load_configuration()
        
        # Initialize alert channels
        self.alert_handlers = {
            AlertChannel.EMAIL: self._send_email_alert,
            AlertChannel.WEBHOOK: self._send_webhook_alert,
            AlertChannel.SLACK: self._send_slack_alert,
            AlertChannel.DISCORD: self._send_discord_alert,
            AlertChannel.LOG: self._log_alert,
        }
    
    def _load_configuration(self):
        """Load alerting configuration from environment variables"""
        # Email configuration
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "security@fynix.app")
        self.to_emails = os.getenv("SECURITY_ALERT_EMAILS", "admin@fynix.app").split(",")
        
        # Webhook configuration
        self.webhook_url = os.getenv("SECURITY_WEBHOOK_URL", "")
        self.webhook_secret = os.getenv("SECURITY_WEBHOOK_SECRET", "")
        
        # Slack configuration
        self.slack_webhook = os.getenv("SLACK_SECURITY_WEBHOOK", "")
        self.slack_channel = os.getenv("SLACK_SECURITY_CHANNEL", "#security-alerts")
        
        # Discord configuration
        self.discord_webhook = os.getenv("DISCORD_SECURITY_WEBHOOK", "")
        
        # Priority threshold from environment
        threshold = os.getenv("SECURITY_ALERT_THRESHOLD", "MEDIUM").upper()
        try:
            self.config.priority_threshold = AlertPriority[threshold]
        except KeyError:
            self.config.priority_threshold = AlertPriority.MEDIUM
    
    async def send_security_alert(self, alert: Alert) -> bool:
        """Send security alert through configured channels"""
        
        # Check if alert meets priority threshold
        if not self._should_send_alert(alert):
            return False
        
        # Check rate limiting
        if self._is_rate_limited(alert):
            logger.debug(f"Alert rate limited: {alert.title}")
            return False
        
        # Send through all configured channels
        success_count = 0
        channels = self.config.channels or []
        for channel in channels:
            try:
                handler = self.alert_handlers.get(channel)
                if handler:
                    await handler(alert)
                    success_count += 1
                    logger.info(f"Alert sent via {channel.value}: {alert.title}")
            except Exception as e:
                logger.error(f"Failed to send alert via {channel.value}: {e}")
        
        # Store in alert history
        self.alert_history.append(alert)
        self._update_rate_limit_cache(alert)
        
        # Keep only recent alerts (last 24 hours)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        self.alert_history = [
            a for a in self.alert_history if a.timestamp > cutoff_time
        ]
        
        return success_count > 0
    
    def _should_send_alert(self, alert: Alert) -> bool:
        """Check if alert should be sent based on priority"""
        priority_levels = {
            AlertPriority.LOW: 0,
            AlertPriority.MEDIUM: 1,
            AlertPriority.HIGH: 2,
            AlertPriority.CRITICAL: 3
        }
        
        return priority_levels[alert.priority] >= priority_levels[self.config.priority_threshold]
    
    def _is_rate_limited(self, alert: Alert) -> bool:
        """Check if similar alert was sent recently"""
        cache_key = f"{alert.event_type.value}_{alert.source_ip or 'unknown'}"
        last_sent = self.rate_limit_cache.get(cache_key)
        
        if last_sent:
            time_diff = datetime.now(timezone.utc) - last_sent
            return time_diff.total_seconds() < (self.config.rate_limit_minutes * 60)
        
        return False
    
    def _update_rate_limit_cache(self, alert: Alert):
        """Update rate limit cache"""
        cache_key = f"{alert.event_type.value}_{alert.source_ip or 'unknown'}"
        self.rate_limit_cache[cache_key] = datetime.now(timezone.utc)
        
        # Clean old entries
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=self.config.rate_limit_minutes * 2)
        self.rate_limit_cache = {
            k: v for k, v in self.rate_limit_cache.items() if v > cutoff_time
        }
    
    async def _send_email_alert(self, alert: Alert):
        """Send alert via email"""
        if not self.smtp_username or not self.smtp_password:
            logger.warning("Email credentials not configured")
            return
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = ", ".join(self.to_emails)
        msg['Subject'] = f"🚨 Fynix Security Alert: {alert.title}"
        
        # Email body
        body = self._format_email_body(alert)
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            raise
    
    def _format_email_body(self, alert: Alert) -> str:
        """Format email body with HTML styling"""
        severity_colors = {
            SecuritySeverity.LOW: "#28a745",
            SecuritySeverity.MEDIUM: "#ffc107", 
            SecuritySeverity.HIGH: "#fd7e14",
            SecuritySeverity.CRITICAL: "#dc3545"
        }
        
        color = severity_colors.get(alert.severity, "#6c757d")
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
            <div style="border-left: 4px solid {color}; padding-left: 20px;">
                <h2 style="color: {color};">🚨 Security Alert</h2>
                <h3>{alert.title}</h3>
                
                <table style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Severity:</td>
                        <td style="padding: 8px; color: {color};">{alert.severity.value.upper()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Priority:</td>
                        <td style="padding: 8px;">{alert.priority.value.upper()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Event Type:</td>
                        <td style="padding: 8px;">{alert.event_type.value}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Timestamp:</td>
                        <td style="padding: 8px;">{alert.timestamp.isoformat() if alert.timestamp else 'N/A'}</td>
                    </tr>
        """
        
        if alert.source_ip:
            body += f"""
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Source IP:</td>
                        <td style="padding: 8px;">{alert.source_ip}</td>
                    </tr>
            """
        
        if alert.affected_user:
            body += f"""
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Affected User:</td>
                        <td style="padding: 8px;">{alert.affected_user}</td>
                    </tr>
            """
        
        body += f"""
                </table>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <h4>Message:</h4>
                    <p>{alert.message}</p>
                </div>
        """
        
        if alert.additional_data:
            body += f"""
                <div style="margin-top: 20px;">
                    <h4>Additional Data:</h4>
                    <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto;">
{json.dumps(alert.additional_data, indent=2)}
                    </pre>
                </div>
            """
        
        body += """
                <div style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    <p>This is an automated security alert from the Fynix monitoring system.</p>
                    <p>Please investigate this event and take appropriate action if necessary.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return body
    
    async def _send_webhook_alert(self, alert: Alert):
        """Send alert via generic webhook"""
        if not self.webhook_url:
            return
        
        payload = {
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity.value,
            "priority": alert.priority.value,
            "event_type": alert.event_type.value,
            "source_ip": alert.source_ip,
            "affected_user": alert.affected_user,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
            "additional_data": alert.additional_data,
            "source": "fynix-security-monitor"
        }
        
        headers = {"Content-Type": "application/json"}
        if self.webhook_secret:
            headers["Authorization"] = f"Bearer {self.webhook_secret}"
        
        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
            raise
    
    async def _send_slack_alert(self, alert: Alert):
        """Send alert via Slack webhook"""
        if not self.slack_webhook:
            return
        
        severity_emojis = {
            SecuritySeverity.LOW: "ℹ️",
            SecuritySeverity.MEDIUM: "⚠️",
            SecuritySeverity.HIGH: "🔥",
            SecuritySeverity.CRITICAL: "🚨"
        }
        
        emoji = severity_emojis.get(alert.severity, "⚠️")
        
        payload = {
            "channel": self.slack_channel,
            "username": "Fynix Security Monitor",
            "icon_emoji": ":shield:",
            "attachments": [{
                "color": "danger" if alert.severity in [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL] else "warning",
                "title": f"{emoji} {alert.title}",
                "text": alert.message,
                "fields": [
                    {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                    {"title": "Event Type", "value": alert.event_type.value, "short": True},
                    {"title": "Timestamp", "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if alert.timestamp else 'N/A', "short": True}
                ],
                "ts": int(alert.timestamp.timestamp()) if alert.timestamp else int(datetime.now(timezone.utc).timestamp())
            }]
        }
        
        if alert.source_ip:
            payload["attachments"][0]["fields"].append({
                "title": "Source IP", "value": alert.source_ip, "short": True
            })
        
        try:
            response = requests.post(self.slack_webhook, json=payload, timeout=10)
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            raise
    
    async def _send_discord_alert(self, alert: Alert):
        """Send alert via Discord webhook"""
        if not self.discord_webhook:
            return
        
        severity_colors = {
            SecuritySeverity.LOW: 0x28a745,
            SecuritySeverity.MEDIUM: 0xffc107,
            SecuritySeverity.HIGH: 0xfd7e14,
            SecuritySeverity.CRITICAL: 0xdc3545
        }
        
        embed = {
            "title": f"🚨 Security Alert: {alert.title}",
            "description": alert.message,
            "color": severity_colors.get(alert.severity, 0x6c757d),
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else datetime.now(timezone.utc).isoformat(),
            "fields": [
                {"name": "Severity", "value": alert.severity.value.upper(), "inline": True},
                {"name": "Priority", "value": alert.priority.value.upper(), "inline": True},
                {"name": "Event Type", "value": alert.event_type.value, "inline": True}
            ],
            "footer": {"text": "Fynix Security Monitor"}
        }
        
        if alert.source_ip:
            embed["fields"].append({"name": "Source IP", "value": alert.source_ip, "inline": True})
        
        if alert.affected_user:
            embed["fields"].append({"name": "Affected User", "value": alert.affected_user, "inline": True})
        
        payload = {"embeds": [embed]}
        
        try:
            response = requests.post(self.discord_webhook, json=payload, timeout=10)
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {e}")
            raise
    
    async def _log_alert(self, alert: Alert):
        """Log alert to security log file"""
        logger.critical(
            f"SECURITY ALERT: {alert.title} | "
            f"Severity: {alert.severity.value} | "
            f"Source: {alert.source_ip or 'unknown'} | "
            f"Message: {alert.message}"
        )
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get statistics about recent alerts"""
        recent_alerts = [
            a for a in self.alert_history 
            if a.timestamp > datetime.now(timezone.utc) - timedelta(hours=24)
        ]
        
        severity_counts = {}
        event_type_counts = {}
        
        for alert in recent_alerts:
            severity_counts[alert.severity.value] = severity_counts.get(alert.severity.value, 0) + 1
            event_type_counts[alert.event_type.value] = event_type_counts.get(alert.event_type.value, 0) + 1
        
        return {
            "total_alerts_24h": len(recent_alerts),
            "severity_breakdown": severity_counts,
            "event_type_breakdown": event_type_counts,
            "last_alert": recent_alerts[-1].timestamp.isoformat() if recent_alerts and recent_alerts[-1].timestamp else None,
            "configured_channels": [c.value for c in (self.config.channels or [])],
            "priority_threshold": self.config.priority_threshold.value
        }

# Global alert manager instance
security_alert_manager = SecurityAlertManager()

# Convenience functions for creating alerts
async def send_critical_alert(title: str, message: str, event_type: SecurityEventType, 
                             source_ip: Optional[str] = None, additional_data: Optional[Dict[str, Any]] = None):
    """Send a critical security alert"""
    alert = Alert(
        title=title,
        message=message,
        severity=SecuritySeverity.CRITICAL,
        priority=AlertPriority.CRITICAL,
        event_type=event_type,
        source_ip=source_ip,
        additional_data=additional_data
    )
    return await security_alert_manager.send_security_alert(alert)

async def send_high_alert(title: str, message: str, event_type: SecurityEventType,
                         source_ip: Optional[str] = None, additional_data: Optional[Dict[str, Any]] = None):
    """Send a high priority security alert"""
    alert = Alert(
        title=title,
        message=message,
        severity=SecuritySeverity.HIGH,
        priority=AlertPriority.HIGH,
        event_type=event_type,
        source_ip=source_ip,
        additional_data=additional_data
    )
    return await security_alert_manager.send_security_alert(alert)

async def send_medium_alert(title: str, message: str, event_type: SecurityEventType,
                           source_ip: Optional[str] = None, additional_data: Optional[Dict[str, Any]] = None):
    """Send a medium priority security alert"""
    alert = Alert(
        title=title,
        message=message,
        severity=SecuritySeverity.MEDIUM,
        priority=AlertPriority.MEDIUM,
        event_type=event_type,
        source_ip=source_ip,
        additional_data=additional_data
    )
    return await security_alert_manager.send_security_alert(alert)

# Export main components
__all__ = [
    'Alert',
    'AlertChannel',
    'AlertPriority',
    'AlertConfiguration',
    'SecurityAlertManager',
    'security_alert_manager',
    'send_critical_alert',
    'send_high_alert',
    'send_medium_alert'
]