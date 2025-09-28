# Phase J3 Follow Graph - Deprecation Notice

## Deprecated Endpoints

As part of our Phase J3 follow graph improvements, the following endpoints have been deprecated in favor of RESTful alternatives:

### Legacy Endpoints (Deprecated)
- `POST /api/follow/follow` - **Deprecated**: Use `POST /api/follow/{user_id}` instead
- `DELETE /api/follow/unfollow` - **Deprecated**: Use `DELETE /api/follow/{user_id}` instead

### Deprecation Timeline
- **Deprecated**: September 28, 2025
- **Sunset Date**: December 31, 2025
- **Removal**: January 2026

### Migration Guide

#### Before (Legacy)
```javascript
// Following a user
POST /api/follow/follow
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}

// Unfollowing a user  
DELETE /api/follow/unfollow
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### After (RESTful)
```javascript
// Following a user
POST /api/follow/123e4567-e89b-12d3-a456-426614174000

// Unfollowing a user
DELETE /api/follow/123e4567-e89b-12d3-a456-426614174000
```

### Benefits of New Endpoints
- RESTful design follows HTTP conventions
- Unified `FollowActionResponse` with comprehensive user status
- Idempotent operations (safe to call multiple times)
- Better error handling and status reporting
- Automatic notification creation on follow
- Detailed mutual follow information

### Response Format
The new endpoints return a unified response format:

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "is_following": true,
  "follows_you": false,
  "mutual_follow": false,
  "follower_count": 42,
  "following_count": 37,
  "current_user_following_count": 15,
  "action": "follow"
}
```

### Detection
Legacy endpoints now return deprecation headers:
- `Deprecation: true`
- `Sunset: Wed, 31 Dec 2025 23:59:59 GMT`
- `Link: </api/follow/{user_id}>; rel=successor-version`

Clients should update to use the new RESTful endpoints before the sunset date.