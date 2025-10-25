# API Reference & Documentation

**Generated:** 2025-10-14 09:38:09
**Format:** markdown
**Endpoints:** 208

---

## � See also: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## �📋 API Endpoints

### DELETE Requests

- **DELETE** `/alerts/{alert_id}`
  - Source: `alerts.py`
- **DELETE** `/pattern/{pattern}`
  - Source: `cache.py`
- **DELETE** `/portfolio/{position_id}`
  - Source: `portfolio.py`
- **DELETE** `/security/ip/{ip_address}/unblock`
  - Source: `security.py`
- **DELETE** `/social/follow/{handle}`
  - Source: `social.py`
- **DELETE** `/admin/messaging/moderation/blocked-words`
  - Source: `admin_messaging.py`
- **DELETE** `/threads/{thread_id}`
  - Source: `ai.py`
- **DELETE** `/unfollow`
  - Source: `follow.py`
- **DELETE** `/{user_id}`
  - Source: `follow.py`
- **DELETE** `/bulk/unfollow`
  - Source: `follow.py`
- **DELETE** `/cleanup`
  - Source: `notifications.py`
- **DELETE** `/enhanced/account`
  - Source: `profile_enhanced.py`
- **DELETE** `/me`
  - Source: `profile.py`

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


- **GET** `/api/health`
  - Source: `enhanced_startup.py`
- **GET** `/api/health/ready`
  - Source: `enhanced_startup.py`
- **GET** `/api/health/live`
  - Source: `enhanced_startup.py`
- **GET** `/`
  - Source: `main.py`
- **GET** `/analytics/dashboard`
  - Source: `j6_2_endpoints.py`
- **GET** `/analytics/metrics/{user_id}`
  - Source: `j6_2_endpoints.py`
- **GET** `/analytics/performance`
  - Source: `j6_2_endpoints.py`
- **GET** `/analytics/trends`
  - Source: `j6_2_endpoints.py`
- **GET** `/analytics/health-score`
  - Source: `j6_2_endpoints.py`
- **GET** `/batches/pending`
  - Source: `j6_2_endpoints.py`
- **GET** `/ab-tests`
  - Source: `j6_2_endpoints.py`
- **GET** `/preferences/{user_id}`
  - Source: `j6_2_endpoints.py`
- **GET** `/templates`
  - Source: `j6_2_endpoints.py`
- **GET** `/channels`
  - Source: `j6_2_endpoints.py`
- **GET** `/system-status`
  - Source: `j6_2_endpoints.py`
- **GET** `/stock/{symbol}`
  - Source: `routes.py`
- **GET** `/crypto/{symbol}`
  - Source: `routes.py`
- **GET** `/status`
  - Source: `routes.py`
- **GET** `/stats`
  - Source: `routes.py`
- **GET** `/alerts`
  - Source: `alerts.py`
- **GET** `/alerts/stream`
  - Source: `alerts.py`
- **GET** `/auth/me`
  - Source: `auth.py`
- **GET** `/stats`
  - Source: `cache.py`
- **GET** `/health`
  - Source: `cache.py`
- **GET** `/comprehensive`
  - Source: `health_check.py`
- **GET** `/metrics`
  - Source: `health_check.py`
- **GET** `/component/{component_name}`
  - Source: `health_check.py`
- **GET** `/health`
  - Source: `market.py`
- **GET** `/ohlc`
  - Source: `market.py`
- **GET** `/health`
  - Source: `monitoring.py`
- **GET** `/health/{service}`
  - Source: `monitoring.py`
- **GET** `/metrics`
  - Source: `monitoring.py`
- **GET** `/websocket/analytics`
  - Source: `monitoring.py`
- **GET** `/websocket/connections`
  - Source: `monitoring.py`
- **GET** `/cache/metrics`
  - Source: `monitoring.py`
- **GET** `/alerts`
  - Source: `monitoring.py`
- **GET** `/dashboard`
  - Source: `monitoring.py`
- **GET** `/performance/insights`
  - Source: `monitoring.py`
- **GET** `/status`
  - Source: `monitoring.py`
- **GET** `/load-test/websocket`
  - Source: `monitoring.py`
- **GET** `/portfolio`
  - Source: `portfolio.py`
- **GET** `/portfolio/summary`
  - Source: `portfolio.py`
- **GET** `/security/status`
  - Source: `security.py`
- **GET** `/security/dashboard`
  - Source: `security.py`
- **GET** `/security/events/summary`
  - Source: `security.py`
- **GET** `/security/health`
  - Source: `security.py`
- **GET** `/security/config`
  - Source: `security.py`
- **GET** `/security/alerts/config`
  - Source: `security.py`
- **GET** `/security/alerts/history`
  - Source: `security.py`
- **GET** `/social/users/{handle}`
  - Source: `social.py`
- **GET** `/social/posts`
  - Source: `social.py`
- **GET** `/social/feed`
  - Source: `social.py`
- **GET** `/admin/messaging/stats`
  - Source: `admin_messaging.py`
- **GET** `/admin/messaging/performance`
  - Source: `admin_messaging.py`
- **GET** `/admin/messaging/moderation`
  - Source: `admin_messaging.py`
- **GET** `/admin/messaging/connections`
  - Source: `admin_messaging.py`
- **GET** `/admin/messaging/health`
  - Source: `admin_messaging.py`
- **GET** `/ai/ws/status`
  - Source: `ai_websocket.py`
- **GET** `/threads`
  - Source: `ai.py`
- **GET** `/threads/{thread_id}/messages`
  - Source: `ai.py`
- **GET** `/providers`
  - Source: `ai.py`
- **GET** `/rate-limit`
  - Source: `ai.py`
- **GET** `/export/conversations`
  - Source: `ai.py`
- **GET** `/moderation/status`
  - Source: `ai.py`
- **GET** `/analytics/conversation-metrics`
  - Source: `ai.py`
- **GET** `/analytics/user-insights`
  - Source: `ai.py`
- **GET** `/analytics/provider-performance`
  - Source: `ai.py`
- **GET** `/context/user-profile`
  - Source: `ai.py`
- **GET** `/`
  - Source: `alerts.py`
- **GET** `/me`
  - Source: `auth.py`
- **GET** `/check`
  - Source: `auth.py`
- **GET** `/stream`
  - Source: `chat.py`
- **GET** `/conversations`
  - Source: `conversations.py`
- **GET** `/conversations/{conversation_id}`
  - Source: `conversations.py`
- **GET** `/conversations/health`
  - Source: `conversations.py`
- **GET** `/conversations/search`
  - Source: `conversations.py`
- **GET** `/conversations/analytics/user`
  - Source: `conversations.py`
- **GET** `/conversations/{conversation_id}/analytics`
  - Source: `conversations.py`
- **GET** `/conversations/trending`
  - Source: `conversations.py`
- **GET** `/top`
  - Source: `crypto.py`
- **GET** `/market/overview`
  - Source: `crypto.py`
- **GET** `/coin/{coin_id}`
  - Source: `crypto.py`
- **GET** `/price`
  - Source: `crypto.py`
- **GET** `/trending`
  - Source: `crypto.py`
- **GET** `/categories`
  - Source: `crypto.py`
- **GET** `/ohlc/{coin_id}`
  - Source: `crypto.py`
- **GET** `/search`
  - Source: `crypto.py`
- **GET** `/exchanges`
  - Source: `crypto.py`
- **GET** `/nft/list`
  - Source: `crypto.py`
- **GET** `/health`
  - Source: `crypto.py`
- **GET** `/status/{user_id}`
  - Source: `follow.py`
- **GET** `/{user_id}/followers`
  - Source: `follow.py`
- **GET** `/{user_id}/following`
  - Source: `follow.py`
- **GET** `/me/followers`
  - Source: `follow.py`
- **GET** `/me/following`
  - Source: `follow.py`
- **GET** `/mutual/{user_id}`
  - Source: `follow.py`
- **GET** `/suggestions`
  - Source: `follow.py`
- **GET** `/stats/me`
  - Source: `follow.py`
- **GET** `/activity/me`
  - Source: `follow.py`
- **GET** `/stats/{user_id}`
  - Source: `follow.py`
- **GET** `/health`
  - Source: `health.py`
- **GET** `/symbols/search`
  - Source: `market_data.py`
- **GET** `/symbols/{symbol}`
  - Source: `market_data.py`
- **GET** `/symbols`
  - Source: `market_data.py`
- **GET** `/ohlc/{symbol}`
  - Source: `market_data.py`
- **GET** `/market/overview`
  - Source: `market_data.py`
- **GET** `/symbols/popular`
  - Source: `market_data.py`
- **GET** `/symbols/{symbol}/similar`
  - Source: `market_data.py`
- **GET** `/stream/{symbol}`
  - Source: `market_data.py`
- **GET** `/ohlc`
  - Source: `mock_ohlc.py`
- **GET** `/`
  - Source: `news.py`
- **GET** `/`
  - Source: `notifications.py`
- **GET** `/unread-count`
  - Source: `notifications.py`
- **GET** `/stats`
  - Source: `notifications.py`
- **GET** `/preferences`
  - Source: `notifications.py`
- **GET** `/types`
  - Source: `notifications.py`
- **GET** `/`
  - Source: `ohlc.py`
- **GET** `/enhanced/avatar/{user_id}`
  - Source: `profile_enhanced.py`
- **GET** `/enhanced/export`
  - Source: `profile_enhanced.py`
- **GET** `/enhanced/stats`
  - Source: `profile_enhanced.py`
- **GET** `/enhanced/activity`
  - Source: `profile_enhanced.py`
- **GET** `/me`
  - Source: `profile.py`
- **GET** `/{profile_id}`
  - Source: `profile.py`
- **GET** `/username/{username}`
  - Source: `profile.py`
- **GET** `/settings/user`
  - Source: `profile.py`
- **GET** `/settings/notifications`
  - Source: `profile.py`
- **GET** `/health`
  - Source: `smart_prices.py`
- **GET** `/all`
  - Source: `smart_prices.py`
- **GET** `/{symbol}`
  - Source: `smart_prices.py`
- **GET** `/admin/performance`
  - Source: `smart_prices.py`
- **GET** `/{symbol}/history`
  - Source: `smart_prices.py`
- **GET** `/{symbol}/ohlcv`
  - Source: `smart_prices.py`
- **GET** `/crypto/top`
  - Source: `smart_prices.py`
- **GET** `/crypto/search`
  - Source: `smart_prices.py`
- **GET** `/crypto/mapping`
  - Source: `smart_prices.py`
- **GET** `/feed`
  - Source: `social.py`
- **GET** `/ws/health`
  - Source: `websocket.py`
- **GET** `/ws/notifications/stats`
  - Source: `websocket.py`

### PATCH Requests

- **PATCH** `/conversations/{conversation_id}/read`
  - Source: `conversations.py`

### POST Requests

- **POST** `/rich`
  - Source: `j6_2_endpoints.py`
- **POST** `/batched`
  - Source: `j6_2_endpoints.py`
- **POST** `/schedule`
  - Source: `j6_2_endpoints.py`
- **POST** `/batches/{batch_id}/deliver`
  - Source: `j6_2_endpoints.py`
- **POST** `/ab-tests`
  - Source: `j6_2_endpoints.py`
- **POST** `/batch`
  - Source: `routes.py`
- **POST** `/alerts`
  - Source: `alerts.py`
- **POST** `/alerts/{alert_id}/toggle`
  - Source: `alerts.py`
- **POST** `/auth/register`
  - Source: `auth.py`
- **POST** `/auth/login`
  - Source: `auth.py`
- **POST** `/clear`
  - Source: `cache.py`
- **POST** `/warm`
  - Source: `cache.py`
- **POST** `/chat`
  - Source: `chat.py`
- **POST** `/cache/invalidate`
  - Source: `monitoring.py`
- **POST** `/monitoring/start`
  - Source: `monitoring.py`
- **POST** `/monitoring/stop`
  - Source: `monitoring.py`
- **POST** `/portfolio/position`
  - Source: `portfolio.py`
- **POST** `/portfolio/import_text`
  - Source: `portfolio.py`
- **POST** `/security/ip/{ip_address}/block`
  - Source: `security.py`
- **POST** `/security/alerts/test`
  - Source: `security.py`
- **POST** `/social/users`
  - Source: `social.py`
- **POST** `/social/follow/{handle}`
  - Source: `social.py`
- **POST** `/social/posts`
  - Source: `social.py`
- **POST** `/admin/messaging/moderation/blocked-words`
  - Source: `admin_messaging.py`
- **POST** `/admin/messaging/broadcast`
  - Source: `admin_messaging.py`
- **POST** `/threads`
  - Source: `ai.py`
- **POST** `/threads/{thread_id}/messages`
  - Source: `ai.py`
- **POST** `/import/conversations`
  - Source: `ai.py`
- **POST** `/threads/{thread_id}/file-upload`
  - Source: `ai.py`
- **POST** `/`
  - Source: `alerts.py`
- **POST** `/register`
  - Source: `auth.py`
- **POST** `/login`
  - Source: `auth.py`
- **POST** `/google`
  - Source: `auth.py`
- **POST** `/logout`
  - Source: `auth.py`
- **POST** `/conversations/dm/{other_user_id}`
  - Source: `conversations.py`
- **POST** `/follow`
  - Source: `follow.py`
- **POST** `/{user_id}`
  - Source: `follow.py`
- **POST** `/bulk/follow`
  - Source: `follow.py`
- **POST** `/mark-read`
  - Source: `notifications.py`
- **POST** `/{notification_id}/read`
  - Source: `notifications.py`
- **POST** `/{notification_id}/dismiss`
  - Source: `notifications.py`
- **POST** `/{notification_id}/click`
  - Source: `notifications.py`
- **POST** `/test`
  - Source: `notifications.py`
- **POST** `/`
  - Source: `portfolio.py`
- **POST** `/{pid}/holdings`
  - Source: `portfolio.py`
- **POST** `/enhanced/avatar`
  - Source: `profile_enhanced.py`
- **POST** `/enhanced/validate`
  - Source: `profile_enhanced.py`
- **POST** `/batch`
  - Source: `smart_prices.py`
- **POST** `/admin/reset-stats`
  - Source: `smart_prices.py`
- **POST** `/posts`
  - Source: `social.py`

### PUT Requests

- **PUT** `/preferences/{user_id}`
  - Source: `j6_2_endpoints.py`
- **PUT** `/threads/{thread_id}`
  - Source: `ai.py`
- **PUT** `/preferences`
  - Source: `notifications.py`
- **PUT** `/me`
  - Source: `profile.py`
- **PUT** `/settings/user`
  - Source: `profile.py`
- **PUT** `/settings/notifications`
  - Source: `profile.py`

---

## 🔐 Authentication

Most endpoints require authentication. Include your access token in the request headers:

```
Authorization: Bearer <your_access_token>
```

---

## 📝 Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-10-14T09:30:00Z"
}
```

---

## 🚦 Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

**Generated by Lokifi Documentation System**
*Auto-generated from backend source code* 🌐✨
