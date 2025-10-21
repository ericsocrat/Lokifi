# 📚 LOKIFI API DOCUMENTATION

**Version:** 1.0.0
**Base URL:** `http://localhost:8000/api`
**Last Updated:** January 29, 2025

---

## 📖 Table of Contents

1. [Authentication](#authentication)
2. [User Profile](#user-profile)
3. [Portfolio Management](#portfolio-management)
4. [Market Data](#market-data)
5. [Price Alerts](#price-alerts)
6. [AI Assistant](#ai-assistant)
7. [Direct Messages](#direct-messages)
8. [Notifications](#notifications)
9. [Social Features](#social-features)
10. [Admin & Monitoring](#admin--monitoring)
11. [Security](#security)
12. [Health Checks](#health-checks)
13. [Error Handling](#error-handling)
14. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header or an HTTP-only cookie.

### Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "trader123",
  "full_name": "John Doe"
}
```json

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-01-29T12:00:00Z"
  },
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "bio": null,
    "avatar_url": null,
    "location": null
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```json

### Login

Authenticate with email and password.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```json

**Response:** `200 OK` (same structure as register)

**Cookies Set:**
- `access_token` (HTTP-only, 1 hour)
- `refresh_token` (HTTP-only, 30 days)

### Google OAuth

Authenticate with Google account.

**Endpoint:** `POST /api/auth/google`

**Request Body:**
```json
{
  "id_token": "google_id_token",
  "access_token": "google_access_token"
}
```json

**Response:** `200 OK` (same structure as register)

### Get Current User

Get authenticated user information.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123",
    "full_name": "John Doe"
  },
  "profile": {
    "id": "uuid",
    "bio": "Professional trader",
    "avatar_url": "https://...",
    "location": "New York"
  }
}
```json

### Check Auth Status

Check if user is authenticated.

**Endpoint:** `GET /api/auth/check`

**Response:** `200 OK`
```json
{
  "authenticated": true,
  "user_id": "uuid",
  "email": "user@example.com"
}
```json

### Logout

Clear authentication cookies.

**Endpoint:** `POST /api/auth/logout`

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out",
  "success": true
}
```json

---

## 👤 User Profile

### Get User Profile

Get a user's public profile.

**Endpoint:** `GET /api/profile/{username}`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "trader123",
  "full_name": "John Doe",
  "bio": "Professional trader",
  "avatar_url": "https://...",
  "location": "New York",
  "followers_count": 150,
  "following_count": 75,
  "posts_count": 42,
  "created_at": "2025-01-01T00:00:00Z"
}
```json

### Update Profile

Update authenticated user's profile.

**Endpoint:** `PUT /api/profile`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "bio": "Updated bio",
  "avatar_url": "https://...",
  "location": "San Francisco",
  "website": "https://..."
}
```json

**Response:** `200 OK`

### Upload Avatar

Upload profile avatar image.

**Endpoint:** `POST /api/profile/avatar`

**Headers:**
```yaml
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```yaml

**Request Body:** (multipart form)
```yaml
file: <image_file>
```yaml

**Response:** `200 OK`
```json
{
  "avatar_url": "https://.../avatar.jpg",
  "message": "Avatar uploaded successfully"
}
```json

---

## 💼 Portfolio Management

### List Positions

Get all portfolio positions for authenticated user.

**Endpoint:** `GET /api/portfolio`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `tags` (optional): Filter by tags (comma-separated)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "symbol": "AAPL",
    "quantity": 100,
    "cost_basis": 150.00,
    "current_price": 180.00,
    "market_value": 18000.00,
    "unrealized_pnl": 3000.00,
    "unrealized_pnl_pct": 20.00,
    "tags": ["tech", "long-term"],
    "notes": "Core holding",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-29T12:00:00Z"
  }
]
```json

### Add/Update Position

Add a new position or update existing one.

**Endpoint:** `POST /api/portfolio/position`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "symbol": "AAPL",
  "quantity": 100,
  "cost_basis": 150.00,
  "tags": ["tech", "long-term"],
  "notes": "Core holding"
}
```json

**Query Parameters:**
- `create_alerts` (optional, boolean): Create automatic price alerts

**Response:** `201 Created`

### Delete Position

Remove a portfolio position.

**Endpoint:** `DELETE /api/portfolio/{position_id}`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "deleted": true,
  "id": 1
}
```json

### Portfolio Summary

Get portfolio performance summary.

**Endpoint:** `GET /api/portfolio/summary`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "total_positions": 15,
  "total_market_value": 125000.00,
  "total_cost_basis": 100000.00,
  "total_unrealized_pnl": 25000.00,
  "total_unrealized_pnl_pct": 25.00,
  "top_gainers": [
    {
      "symbol": "NVDA",
      "pnl_pct": 150.00
    }
  ],
  "top_losers": [
    {
      "symbol": "XYZ",
      "pnl_pct": -10.00
    }
  ],
  "sector_allocation": {
    "Technology": 60.00,
    "Healthcare": 25.00,
    "Finance": 15.00
  }
}
```json

---

## 📊 Market Data

### Get OHLC Data

Get candlestick chart data for a symbol.

**Endpoint:** `GET /api/ohlc/{symbol}`

**Query Parameters:**
- `timeframe`: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w`
- `limit` (optional): Number of candles (default: 100, max: 1000)
- `start_time` (optional): Start timestamp (Unix)
- `end_time` (optional): End timestamp (Unix)

**Response:** `200 OK`
```json
{
  "symbol": "AAPL",
  "timeframe": "1h",
  "data": [
    {
      "timestamp": 1706529600,
      "open": 180.50,
      "high": 182.00,
      "low": 179.75,
      "close": 181.25,
      "volume": 1500000
    }
  ]
}
```json

### Get Real-time Price

Get current price for a symbol.

**Endpoint:** `GET /api/market/{symbol}/price`

**Response:** `200 OK`
```json
{
  "symbol": "AAPL",
  "price": 181.25,
  "change": 2.50,
  "change_percent": 1.40,
  "timestamp": "2025-01-29T12:00:00Z",
  "volume": 50000000
}
```json

### Get News

Get latest news for a symbol.

**Endpoint:** `GET /api/news`

**Query Parameters:**
- `symbol`: Stock symbol
- `limit` (optional): Number of articles (default: 20, max: 100)

**Response:** `200 OK`
```json
[
  {
    "id": "article-123",
    "title": "Apple Announces Q4 Earnings",
    "summary": "...",
    "source": "Reuters",
    "url": "https://...",
    "published_at": "2025-01-29T10:00:00Z",
    "sentiment": "positive",
    "relevance_score": 0.95
  }
]
```json

---

## 🔔 Price Alerts

### List Alerts

Get all price alerts for authenticated user.

**Endpoint:** `GET /api/alerts`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
[
  {
    "id": "alert-123",
    "symbol": "AAPL",
    "type": "price_threshold",
    "direction": "above",
    "target_price": 200.00,
    "current_price": 181.25,
    "is_active": true,
    "created_at": "2025-01-20T00:00:00Z",
    "triggered_at": null
  }
]
```json

### Create Alert

Create a new price alert.

**Endpoint:** `POST /api/alerts`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "symbol": "AAPL",
  "type": "price_threshold",
  "config": {
    "direction": "above",
    "target_price": 200.00
  },
  "cooldown_minutes": 60
}
```json

**Alert Types:**
- `price_threshold`: Trigger when price crosses a level
- `pct_change`: Trigger on percentage change
- `volume_spike`: Trigger on volume anomaly

**Response:** `201 Created`

### Delete Alert

Remove a price alert.

**Endpoint:** `DELETE /api/alerts/{alert_id}`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`

### Toggle Alert

Enable/disable an alert.

**Endpoint:** `POST /api/alerts/{alert_id}/toggle`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `active`: `true` or `false`

**Response:** `200 OK`

### Stream Alerts (SSE)

Real-time alert notifications via Server-Sent Events.

**Endpoint:** `GET /api/alerts/stream`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `mine` (optional, boolean): Only stream user's alerts

**Response:** `text/event-stream`
```json
data: {"alert_id": "123", "symbol": "AAPL", "triggered": true, "price": 200.50}

data: {"alert_id": "456", "symbol": "TSLA", "triggered": true, "price": 250.00}
```json

---

## 🤖 AI Assistant

### Create Thread

Start a new AI conversation thread.

**Endpoint:** `POST /api/ai/threads`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "title": "Portfolio Analysis",
  "provider": "openai"
}
```json

**Response:** `201 Created`
```json
{
  "id": "thread-123",
  "title": "Portfolio Analysis",
  "provider": "openai",
  "message_count": 0,
  "created_at": "2025-01-29T12:00:00Z"
}
```json

### List Threads

Get all AI conversation threads.

**Endpoint:** `GET /api/ai/threads`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
[
  {
    "id": "thread-123",
    "title": "Portfolio Analysis",
    "provider": "openai",
    "message_count": 15,
    "last_message_at": "2025-01-29T11:30:00Z",
    "created_at": "2025-01-29T10:00:00Z"
  }
]
```json

### Send Message

Send a message to AI assistant.

**Endpoint:** `POST /api/ai/threads/{thread_id}/messages`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "content": "Analyze my portfolio performance"
}
```json

**Response:** `200 OK` (streaming)
```json
{
  "id": "msg-456",
  "role": "assistant",
  "content": "Based on your portfolio...",
  "tokens_used": 150,
  "created_at": "2025-01-29T12:00:00Z"
}
```json

### Get Thread Messages

Get all messages in a thread.

**Endpoint:** `GET /api/ai/threads/{thread_id}/messages`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
[
  {
    "id": "msg-123",
    "role": "user",
    "content": "Analyze my portfolio",
    "created_at": "2025-01-29T11:30:00Z"
  },
  {
    "id": "msg-124",
    "role": "assistant",
    "content": "Your portfolio...",
    "created_at": "2025-01-29T11:30:15Z"
  }
]
```json

### Delete Thread

Delete an AI conversation thread.

**Endpoint:** `DELETE /api/ai/threads/{thread_id}`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`

### Get Provider Status

Check AI provider availability.

**Endpoint:** `GET /api/ai/providers`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "openai": {
    "available": true,
    "models": ["gpt-4", "gpt-3.5-turbo"],
    "rate_limit": {
      "requests_per_minute": 60,
      "tokens_per_minute": 90000
    }
  },
  "anthropic": {
    "available": true,
    "models": ["claude-3-opus", "claude-3-sonnet"]
  }
}
```json

---

## 💬 Direct Messages

### Send Message

Send a direct message to another user.

**Endpoint:** `POST /api/conversations/{recipient_id}/messages`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "content": "Hello! How are you?",
  "attachments": []
}
```json

**Response:** `201 Created`
```json
{
  "id": "msg-789",
  "conversation_id": "conv-123",
  "sender_id": "user-1",
  "recipient_id": "user-2",
  "content": "Hello! How are you?",
  "read": false,
  "created_at": "2025-01-29T12:00:00Z"
}
```json

### Get Conversations

Get all conversations for authenticated user.

**Endpoint:** `GET /api/conversations`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
[
  {
    "id": "conv-123",
    "participant": {
      "id": "user-2",
      "username": "trader456",
      "avatar_url": "https://..."
    },
    "last_message": {
      "content": "Hello!",
      "created_at": "2025-01-29T12:00:00Z"
    },
    "unread_count": 3,
    "updated_at": "2025-01-29T12:00:00Z"
  }
]
```json

### Get Conversation Messages

Get messages in a conversation.

**Endpoint:** `GET /api/conversations/{conversation_id}/messages`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Load messages before this timestamp

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "msg-789",
      "sender_id": "user-1",
      "content": "Hello!",
      "read": true,
      "created_at": "2025-01-29T12:00:00Z"
    }
  ],
  "has_more": false
}
```json

### Mark as Read

Mark messages as read.

**Endpoint:** `POST /api/conversations/{conversation_id}/read`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`

### WebSocket Connection

Real-time messaging via WebSocket.

**Endpoint:** `ws://localhost:8000/ws/chat`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Messages:**
```json
// Client → Server
{
  "type": "message",
  "recipient_id": "user-2",
  "content": "Hello!"
}

// Server → Client
{
  "type": "message",
  "id": "msg-789",
  "sender_id": "user-1",
  "content": "Hello!",
  "created_at": "2025-01-29T12:00:00Z"
}
```json

---

## 🔔 Notifications

### Get Notifications

Get notifications for authenticated user.

**Endpoint:** `GET /api/notifications`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `type` (optional): Filter by type
- `unread` (optional, boolean): Only unread
- `limit` (optional): Number of notifications (default: 50)

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "id": "notif-123",
      "type": "price_alert",
      "title": "Price Alert: AAPL",
      "message": "AAPL reached $200.00",
      "data": {
        "symbol": "AAPL",
        "price": 200.00
      },
      "read": false,
      "created_at": "2025-01-29T12:00:00Z"
    }
  ],
  "unread_count": 5,
  "total_count": 150
}
```json

**Notification Types:**
- `price_alert`: Price alert triggered
- `new_follower`: Someone followed you
- `new_message`: New direct message
- `mention`: Someone mentioned you
- `system`: System notification

### Mark as Read

Mark notifications as read.

**Endpoint:** `POST /api/notifications/read`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "notification_ids": ["notif-123", "notif-456"]
}
```json

**Response:** `200 OK`

### Mark All as Read

Mark all notifications as read.

**Endpoint:** `POST /api/notifications/read-all`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`

### Update Preferences

Update notification preferences.

**Endpoint:** `PUT /api/notifications/preferences`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "email_enabled": true,
  "push_enabled": true,
  "types": {
    "price_alert": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "new_follower": {
      "email": false,
      "push": true,
      "in_app": true
    }
  }
}
```json

**Response:** `200 OK`

---

## 👥 Social Features

### Follow User

Follow another user.

**Endpoint:** `POST /api/follow/{user_id}`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "following": true,
  "follower_count": 151
}
```json

### Unfollow User

Unfollow a user.

**Endpoint:** `DELETE /api/follow/{user_id}`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "following": false,
  "follower_count": 150
}
```json

### Get Followers

Get user's followers.

**Endpoint:** `GET /api/follow/{user_id}/followers`

**Query Parameters:**
- `limit` (optional): Number of followers (default: 50)
- `offset` (optional): Pagination offset

**Response:** `200 OK`
```json
{
  "followers": [
    {
      "id": "user-3",
      "username": "trader789",
      "avatar_url": "https://...",
      "following_back": true
    }
  ],
  "total": 150,
  "has_more": true
}
```json

### Get Following

Get users that a user is following.

**Endpoint:** `GET /api/follow/{user_id}/following`

**Query Parameters:**
- `limit` (optional): Number of users (default: 50)
- `offset` (optional): Pagination offset

**Response:** `200 OK`

### Get Follow Suggestions

Get suggested users to follow.

**Endpoint:** `GET /api/follow/suggestions`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Response:** `200 OK`
```json
{
  "suggestions": [
    {
      "id": "user-4",
      "username": "pro_trader",
      "avatar_url": "https://...",
      "mutual_followers": 5,
      "reason": "Popular in your network"
    }
  ]
}
```json

### Create Post

Create a social post.

**Endpoint:** `POST /api/social/posts`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Request Body:**
```json
{
  "content": "Just bought AAPL at $180!",
  "symbol": "AAPL",
  "tags": ["stocks", "tech"]
}
```json

**Response:** `201 Created`

### Get Feed

Get social feed (posts from followed users).

**Endpoint:** `GET /api/social/feed`

**Headers:**
```yaml
Authorization: Bearer <access_token>
```yaml

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `limit` (optional): Number of posts (default: 50)
- `after_id` (optional): Load posts after this ID

**Response:** `200 OK`
```json
{
  "posts": [
    {
      "id": "post-123",
      "author": {
        "id": "user-2",
        "username": "trader456",
        "avatar_url": "https://..."
      },
      "content": "Market looking bullish!",
      "symbol": "SPY",
      "likes_count": 42,
      "comments_count": 15,
      "liked_by_me": false,
      "created_at": "2025-01-29T12:00:00Z"
    }
  ],
  "has_more": true
}
```json

---

## 🛡️ Admin & Monitoring

### Get Messaging Stats

Get platform messaging statistics (admin only).

**Endpoint:** `GET /api/admin/messaging/stats`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Query Parameters:**
- `days_back` (optional): Days to look back (default: 30)

**Response:** `200 OK`
```json
{
  "total_messages": 125000,
  "active_conversations": 5000,
  "daily_average": 4166,
  "peak_hour": 14,
  "response_time_avg_seconds": 45.2
}
```json

### Get Performance Metrics

Get system performance metrics (admin only).

**Endpoint:** `GET /api/admin/messaging/performance`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Response:** `200 OK`
```json
{
  "cpu_usage": 45.2,
  "memory_usage": 2.5,
  "active_connections": 1500,
  "requests_per_second": 250,
  "avg_response_time_ms": 45
}
```json

### Get Active Connections

Get active WebSocket connections (admin only).

**Endpoint:** `GET /api/admin/messaging/connections`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Response:** `200 OK`
```json
{
  "total_connections": 1500,
  "connections_by_type": {
    "chat": 1200,
    "ai": 200,
    "alerts": 100
  }
}
```json

### Broadcast Message

Send broadcast message to all users (admin only).

**Endpoint:** `POST /api/admin/messaging/broadcast`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight at 2 AM EST",
  "type": "system"
}
```json

**Response:** `200 OK`

---

## 🔒 Security

### Get Security Status

Get current security monitoring status.

**Endpoint:** `GET /api/security/status`

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "blocked_ips": 15,
  "active_alerts": 0,
  "last_incident": "2025-01-28T10:00:00Z"
}
```json

### Get Security Dashboard

Get comprehensive security dashboard (admin only).

**Endpoint:** `GET /api/security/dashboard`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Response:** `200 OK`
```json
{
  "events_24h": 1500,
  "blocked_attempts": 25,
  "rate_limit_hits": 150,
  "suspicious_activities": [],
  "top_threats": [
    {
      "type": "brute_force",
      "count": 10,
      "source_ips": ["1.2.3.4"]
    }
  ]
}
```json

### Block IP Address

Manually block an IP address (admin only).

**Endpoint:** `POST /api/security/ip/{ip_address}/block`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Response:** `200 OK`

### Unblock IP Address

Unblock an IP address (admin only).

**Endpoint:** `DELETE /api/security/ip/{ip_address}/unblock`

**Headers:**
```yaml
Authorization: Bearer <admin_token>
```yaml

**Response:** `200 OK`

---

## 🏥 Health Checks

### Basic Health Check

Check if API is running.

**Endpoint:** `GET /api/health`

**Response:** `200 OK`
```json
{
  "ok": true
}
```json

### Liveness Probe

Check if application is alive (Kubernetes).

**Endpoint:** `GET /api/health/live`

**Response:** `200 OK`
```json
{
  "status": "alive",
  "timestamp": "2025-01-29T12:00:00Z"
}
```json

### Readiness Probe

Check if application is ready to serve requests (Kubernetes).

**Endpoint:** `GET /api/health/ready`

**Response:** `200 OK`
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-01-29T12:00:00Z"
}
```json

---

## ⚠️ Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2025-01-29T12:00:00Z"
}
```json

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service down |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | Access token expired |
| `AUTH_TOKEN_INVALID` | Invalid token format |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `DUPLICATE_RESOURCE` | Resource already exists |

---

## 🚦 Rate Limiting

### Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Public APIs | 100 requests | 1 minute |
| Authenticated APIs | 1000 requests | 1 minute |
| WebSocket connections | 10 connections | per user |
| File uploads | 10 uploads | 1 hour |

### Rate Limit Headers

Every response includes rate limit headers:

```bash
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706529600
```bash

### Rate Limit Exceeded Response

```json
{
  "detail": "Rate limit exceeded. Try again in 60 seconds.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```json

---

## 📝 Notes

### Timestamps

All timestamps are in ISO 8601 format (UTC):
```bash
2025-01-29T12:00:00Z
```bash

### Pagination

Paginated endpoints support these query parameters:
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip
- `after_id`: Load items after this ID (cursor pagination)

### Filtering

Many endpoints support filtering via query parameters:
- `symbol`: Filter by stock symbol
- `type`: Filter by type
- `start_date`, `end_date`: Date range filtering

### Sorting

Sort results with the `sort` query parameter:
- `created_at`: Sort by creation date
- `-created_at`: Sort by creation date (descending)

---

## 🔗 Additional Resources

- **OpenAPI Spec:** `http://localhost:8000/docs` (Swagger UI)
- **ReDoc:** `http://localhost:8000/redoc` (Alternative documentation)
- **Source Code:** See `backend/app/routers/` directory
- **Postman Collection:** Available in `/docs/postman/`

---

**Last Updated:** January 29, 2025
**API Version:** 1.0.0
**Contact:** support@lokifi.com
