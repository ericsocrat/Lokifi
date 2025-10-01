"""
Security Event Logger and Alerting System
Comprehensive security monitoring and incident response
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import Any

# Configure security logger
security_logger = logging.getLogger("lokifi.security")
security_logger.setLevel(logging.INFO)

# Create security log file handler
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
security_log_file = log_dir / "security_events.log"

# File handler for security events
file_handler = logging.FileHandler(security_log_file)
file_handler.setLevel(logging.INFO)

# JSON formatter for structured logging
class SecurityJSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "event_type": getattr(record, 'event_type', 'unknown'),
            "message": record.getMessage(),
            "logger": record.name,
        }
        
        # Add extra fields if present
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 
                          'pathname', 'filename', 'module', 'lineno', 
                          'funcName', 'created', 'msecs', 'relativeCreated', 
                          'thread', 'threadName', 'processName', 'process']:
                log_entry[key] = value
        
        return json.dumps(log_entry)

file_handler.setFormatter(SecurityJSONFormatter())
security_logger.addHandler(file_handler)

class SecurityEventType(Enum):
    """Types of security events"""
    AUTHENTICATION_FAILURE = "auth_failure"
    AUTHENTICATION_SUCCESS = "auth_success"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_REQUEST = "suspicious_request"
    INPUT_VALIDATION_FAILURE = "input_validation_failure"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SECURITY_SCAN_DETECTED = "security_scan_detected"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"
    CONFIGURATION_CHANGE = "config_change"
    SYSTEM_COMPROMISE = "system_compromise"

class SecuritySeverity(Enum):
    """Security event severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_type: SecurityEventType
    severity: SecuritySeverity
    message: str
    client_ip: str | None = None
    user_id: str | None = None
    user_agent: str | None = None
    endpoint: str | None = None
    request_method: str | None = None
    additional_data: dict[str, Any] | None = None
    timestamp: datetime | None = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(UTC)

class SecurityMonitor:
    """Security monitoring and alerting system"""
    
    def __init__(self):
        self.failed_attempts = {}  # Track failed attempts by IP
        self.suspicious_ips = set()  # IPs marked as suspicious
        self.rate_limit_violations = {}  # Track rate limit violations
        
        # Thresholds for automatic blocking
        self.max_failed_attempts = 5
        self.suspicious_threshold = 10
        self.rate_limit_threshold = 100
        
        # Time windows (in seconds)
        self.failed_attempt_window = 900  # 15 minutes
        self.rate_limit_window = 3600  # 1 hour
    
    async def log_security_event(self, event: SecurityEvent):
        """Log a security event with appropriate severity"""
        
        # Create log record
        extra_data = {
            'event_type': event.event_type.value,
            'severity': event.severity.value,
            'client_ip': event.client_ip,
            'user_id': event.user_id,
            'user_agent': event.user_agent,
            'endpoint': event.endpoint,
            'request_method': event.request_method,
            'timestamp': event.timestamp.isoformat() if event.timestamp else None,
        }
        
        if event.additional_data:
            extra_data.update(event.additional_data)
        
        # Log with appropriate level based on severity
        if event.severity == SecuritySeverity.CRITICAL:
            security_logger.critical(event.message, extra=extra_data)
        elif event.severity == SecuritySeverity.HIGH:
            security_logger.error(event.message, extra=extra_data)
        elif event.severity == SecuritySeverity.MEDIUM:
            security_logger.warning(event.message, extra=extra_data)
        else:
            security_logger.info(event.message, extra=extra_data)
        
        # Process event for automatic responses
        self._process_security_event(event)
        
        # Send alerts for high-severity events
        await self._send_alert_if_needed(event)
    
    def _process_security_event(self, event: SecurityEvent):
        """Process security event for automatic responses"""
        
        if not event.client_ip:
            return
        
        current_time = time.time()
        
        # Track failed authentication attempts
        if event.event_type == SecurityEventType.AUTHENTICATION_FAILURE:
            self._track_failed_attempt(event.client_ip, current_time)
        
        # Track rate limit violations
        elif event.event_type == SecurityEventType.RATE_LIMIT_EXCEEDED:
            self._track_rate_limit_violation(event.client_ip, current_time)
        
        # Mark suspicious activities
        elif event.event_type in [
            SecurityEventType.SUSPICIOUS_REQUEST,
            SecurityEventType.SECURITY_SCAN_DETECTED,
            SecurityEventType.INPUT_VALIDATION_FAILURE
        ]:
            self._mark_suspicious_activity(event.client_ip, current_time)
    
    def _track_failed_attempt(self, client_ip: str, current_time: float):
        """Track failed authentication attempts"""
        if client_ip not in self.failed_attempts:
            self.failed_attempts[client_ip] = []
        
        # Add current attempt
        self.failed_attempts[client_ip].append(current_time)
        
        # Clean old attempts
        cutoff_time = current_time - self.failed_attempt_window
        self.failed_attempts[client_ip] = [
            t for t in self.failed_attempts[client_ip] if t > cutoff_time
        ]
        
        # Check if threshold exceeded
        if len(self.failed_attempts[client_ip]) >= self.max_failed_attempts:
            self.suspicious_ips.add(client_ip)
            # Schedule async alert sending
            asyncio.create_task(self.log_security_event(SecurityEvent(
                event_type=SecurityEventType.BRUTE_FORCE_ATTEMPT,
                severity=SecuritySeverity.HIGH,
                message=f"Brute force attempt detected from {client_ip}",
                client_ip=client_ip,
                additional_data={"failed_attempts": len(self.failed_attempts[client_ip])}
            )))
    
    def _track_rate_limit_violation(self, client_ip: str, current_time: float):
        """Track rate limit violations"""
        if client_ip not in self.rate_limit_violations:
            self.rate_limit_violations[client_ip] = []
        
        # Add current violation
        self.rate_limit_violations[client_ip].append(current_time)
        
        # Clean old violations
        cutoff_time = current_time - self.rate_limit_window
        self.rate_limit_violations[client_ip] = [
            t for t in self.rate_limit_violations[client_ip] if t > cutoff_time
        ]
        
        # Check if threshold exceeded
        if len(self.rate_limit_violations[client_ip]) >= self.rate_limit_threshold:
            self.suspicious_ips.add(client_ip)
            # Schedule async alert sending
            asyncio.create_task(self.log_security_event(SecurityEvent(
                event_type=SecurityEventType.DATA_BREACH_ATTEMPT,
                severity=SecuritySeverity.CRITICAL,
                message=f"Potential data breach attempt from {client_ip}",
                client_ip=client_ip,
                additional_data={"rate_violations": len(self.rate_limit_violations[client_ip])}
            )))
    
    def _mark_suspicious_activity(self, client_ip: str, current_time: float):
        """Mark IP as suspicious based on activity"""
        # For now, just add to suspicious list
        # In production, this could trigger more sophisticated analysis
        self.suspicious_ips.add(client_ip)
    
    def is_ip_suspicious(self, client_ip: str) -> bool:
        """Check if an IP is marked as suspicious"""
        return client_ip in self.suspicious_ips
    
    async def _send_alert_if_needed(self, event: SecurityEvent):
        """Send external alerts for high-severity events"""
        try:
            # Only send alerts for high and critical severity events
            if event.severity in [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL]:
                # Import here to avoid circular imports
                from app.utils.security_alerts import Alert, AlertPriority, security_alert_manager
                
                # Map severity to alert priority
                priority_map = {
                    SecuritySeverity.HIGH: AlertPriority.HIGH,
                    SecuritySeverity.CRITICAL: AlertPriority.CRITICAL
                }
                
                alert = Alert(
                    title=f"Security Event: {event.event_type.value}",
                    message=event.message,
                    severity=event.severity,
                    priority=priority_map[event.severity],
                    event_type=event.event_type,
                    source_ip=event.client_ip,
                    affected_user=event.user_id,
                    additional_data=event.additional_data
                )
                
                await security_alert_manager.send_security_alert(alert)
        except Exception as e:
            security_logger.error(f"Failed to send security alert: {e}")
    
    def get_security_summary(self) -> dict[str, Any]:
        """Get summary of current security status"""
        current_time = time.time()
        
        # Count recent events
        recent_failed_attempts = sum(
            len([t for t in attempts if t > current_time - self.failed_attempt_window])
            for attempts in self.failed_attempts.values()
        )
        
        recent_rate_violations = sum(
            len([t for t in violations if t > current_time - self.rate_limit_window])
            for violations in self.rate_limit_violations.values()
        )
        
        return {
            "suspicious_ips": len(self.suspicious_ips),
            "recent_failed_attempts": recent_failed_attempts,
            "recent_rate_violations": recent_rate_violations,
            "monitored_ips": len(self.failed_attempts),
            "timestamp": datetime.now(UTC).isoformat()
        }

# Global security monitor instance
security_monitor = SecurityMonitor()

# Convenience functions for common security events
async def log_auth_failure(client_ip: str, user_id: str | None = None, endpoint: str | None = None):
    """Log authentication failure"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.AUTHENTICATION_FAILURE,
        severity=SecuritySeverity.MEDIUM,
        message=f"Authentication failure from {client_ip}",
        client_ip=client_ip,
        user_id=user_id,
        endpoint=endpoint
    ))

async def log_auth_success(client_ip: str, user_id: str, endpoint: str | None = None):
    """Log successful authentication"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.AUTHENTICATION_SUCCESS,
        severity=SecuritySeverity.LOW,
        message=f"Successful authentication for user {user_id}",
        client_ip=client_ip,
        user_id=user_id,
        endpoint=endpoint
    ))

async def log_rate_limit_exceeded(client_ip: str, endpoint: str | None = None, limit_type: str | None = None):
    """Log rate limit exceeded"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity=SecuritySeverity.MEDIUM,
        message=f"Rate limit exceeded from {client_ip}",
        client_ip=client_ip,
        endpoint=endpoint,
        additional_data={"limit_type": limit_type}
    ))

async def log_suspicious_request(client_ip: str, endpoint: str, pattern: str, user_agent: str | None = None):
    """Log suspicious request pattern"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.SUSPICIOUS_REQUEST,
        severity=SecuritySeverity.HIGH,
        message=f"Suspicious request pattern detected: {pattern}",
        client_ip=client_ip,
        endpoint=endpoint,
        user_agent=user_agent,
        additional_data={"detected_pattern": pattern}
    ))

async def log_input_validation_failure(client_ip: str, field: str, value_type: str, endpoint: str | None = None):
    """Log input validation failure"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.INPUT_VALIDATION_FAILURE,
        severity=SecuritySeverity.MEDIUM,
        message=f"Input validation failure for field '{field}' (type: {value_type})",
        client_ip=client_ip,
        endpoint=endpoint,
        additional_data={"field": field, "value_type": value_type}
    ))

async def log_unauthorized_access(client_ip: str, endpoint: str, user_id: str | None = None):
    """Log unauthorized access attempt"""
    await security_monitor.log_security_event(SecurityEvent(
        event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
        severity=SecuritySeverity.HIGH,
        message=f"Unauthorized access attempt to {endpoint}",
        client_ip=client_ip,
        user_id=user_id,
        endpoint=endpoint
    ))

# Export main components
__all__ = [
    'SecurityEvent',
    'SecurityEventType', 
    'SecuritySeverity',
    'SecurityMonitor',
    'security_monitor',
    'log_auth_failure',
    'log_auth_success',
    'log_rate_limit_exceeded',
    'log_suspicious_request',
    'log_input_validation_failure',
    'log_unauthorized_access'
]