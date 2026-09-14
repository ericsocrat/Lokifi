# Legacy route inventory

Baseline e4b1a833. Status is conservative: source presence is not runtime verification. API declarations include unregistered modules; consult the audit's wiring map.

| App | Route | State | Decision | Source |
|---|---|---|---|---|
| frontend | `/admin/api-keys` | untested | retire | `apps\frontend\app\admin\api-keys\page.tsx` |
| frontend | `/admin/audit-logs` | untested | retire | `apps\frontend\app\admin\audit-logs\page.tsx` |
| frontend | `/admin/email-templates` | untested | retire | `apps\frontend\app\admin\email-templates\page.tsx` |
| frontend | `/admin` | untested | retire | `apps\frontend\app\admin\page.tsx` |
| frontend | `/admin/webhooks` | untested | retire | `apps\frontend\app\admin\webhooks\page.tsx` |
| frontend | `/ai-research` | simulated | retire | `apps\frontend\app\ai-research\page.tsx` |
| frontend | `/alerts` | untested | retire | `apps\frontend\app\alerts\page.tsx` |
| frontend | `/asset/[symbol]` | untested | rebuild | `apps\frontend\app\asset\[symbol]\page.tsx` |
| frontend | `/chart/[symbol]` | untested | retire | `apps\frontend\app\chart\[symbol]\page.tsx` |
| frontend | `/chart` | untested | retire | `apps\frontend\app\chart\page.tsx` |
| frontend | `/chat` | untested | retire | `apps\frontend\app\chat\page.tsx` |
| frontend | `/dashboard/add-assets` | untested | rebuild | `apps\frontend\app\dashboard\add-assets\page.tsx` |
| frontend | `/dashboard/analytics` | untested | rebuild | `apps\frontend\app\dashboard\analytics\page.tsx` |
| frontend | `/dashboard/assets` | simulated | rebuild | `apps\frontend\app\dashboard\assets\page.tsx` |
| frontend | `/dashboard` | untested | rebuild | `apps\frontend\app\dashboard\page.tsx` |
| frontend | `/dashboard/settings` | untested | rebuild | `apps\frontend\app\dashboard\settings\page.tsx` |
| frontend | `/debts` | simulated | retire | `apps\frontend\app\debts\page.tsx` |
| frontend | `/dev/drawing` | untested | retire | `apps\frontend\app\dev\drawing\page.tsx` |
| frontend | `/dev/flags` | untested | retire | `apps\frontend\app\dev\flags\page.tsx` |
| frontend | `/goals` | simulated | retire | `apps\frontend\app\goals\page.tsx` |
| frontend | `/login` | untested | rebuild | `apps\frontend\app\login\page.tsx` |
| frontend | `/markets/crypto` | untested | retire | `apps\frontend\app\markets\crypto\page.tsx` |
| frontend | `/markets/forex` | untested | retire | `apps\frontend\app\markets\forex\page.tsx` |
| frontend | `/markets/indices` | untested | retire | `apps\frontend\app\markets\indices\page.tsx` |
| frontend | `/markets` | untested | retire | `apps\frontend\app\markets\page.tsx` |
| frontend | `/markets/stocks` | untested | retire | `apps\frontend\app\markets\stocks\page.tsx` |
| frontend | `/notifications` | untested | retire | `apps\frontend\app\notifications\page.tsx` |
| frontend | `/notifications/preferences` | untested | retire | `apps\frontend\app\notifications\preferences\page.tsx` |
| frontend | `/` | untested | retire | `apps\frontend\app\page.tsx` |
| frontend | `/portfolio` | simulated | rebuild | `apps\frontend\app\portfolio\page.tsx` |
| frontend | `/profile/edit` | untested | retire | `apps\frontend\app\profile\edit\page.tsx` |
| frontend | `/profile` | untested | retire | `apps\frontend\app\profile\page.tsx` |
| frontend | `/profile/settings` | untested | rebuild | `apps\frontend\app\profile\settings\page.tsx` |
| frontend | `/recap` | untested | retire | `apps\frontend\app\recap\page.tsx` |
| frontend | `/settings` | untested | rebuild | `apps\frontend\app\settings\page.tsx` |
| frontend | `/test` | untested | retire | `apps\frontend\app\test\page.tsx` |
| admin | `/(auth)/login` | untested | retire | `apps\admin\app\(auth)\login\page.tsx` |
| admin | `/dashboard/moderation/[id]` | untested | retire | `apps\admin\app\dashboard\moderation\[id]\page.tsx` |
| admin | `/dashboard/moderation` | untested | retire | `apps\admin\app\dashboard\moderation\page.tsx` |
| admin | `/dashboard` | untested | retire | `apps\admin\app\dashboard\page.tsx` |
| admin | `/dashboard/users/[id]` | untested | retire | `apps\admin\app\dashboard\users\[id]\page.tsx` |
| admin | `/dashboard/users` | untested | retire | `apps\admin\app\dashboard\users\page.tsx` |
| admin | `/` | untested | retire | `apps\admin\app\page.tsx` |

## API declarations

| Method | Local path | Source | Handler |
|---|---|---|---|
| GET | `/analytics/dashboard` | `apps\backend\app\api\j6_2_endpoints.py:102` | `get_notification_dashboard` |
| GET | `/analytics/metrics/{user_id}` | `apps\backend\app\api\j6_2_endpoints.py:116` | `get_user_metrics` |
| GET | `/analytics/performance` | `apps\backend\app\api\j6_2_endpoints.py:133` | `get_performance_metrics` |
| GET | `/analytics/trends` | `apps\backend\app\api\j6_2_endpoints.py:144` | `get_notification_trends` |
| GET | `/analytics/health-score` | `apps\backend\app\api\j6_2_endpoints.py:158` | `get_system_health_score` |
| POST | `/rich` | `apps\backend\app\api\j6_2_endpoints.py:172` | `send_rich_notification_endpoint` |
| POST | `/batched` | `apps\backend\app\api\j6_2_endpoints.py:208` | `send_batched_notification_endpoint` |
| POST | `/schedule` | `apps\backend\app\api\j6_2_endpoints.py:239` | `schedule_notification_endpoint` |
| GET | `/batches/pending` | `apps\backend\app\api\j6_2_endpoints.py:278` | `get_pending_batches` |
| POST | `/batches/{batch_id}/deliver` | `apps\backend\app\api\j6_2_endpoints.py:289` | `force_deliver_batch` |
| POST | `/ab-tests` | `apps\backend\app\api\j6_2_endpoints.py:319` | `configure_ab_test` |
| GET | `/ab-tests` | `apps\backend\app\api\j6_2_endpoints.py:342` | `get_ab_tests` |
| GET | `/preferences/{user_id}` | `apps\backend\app\api\j6_2_endpoints.py:360` | `get_user_notification_preferences` |
| PUT | `/preferences/{user_id}` | `apps\backend\app\api\j6_2_endpoints.py:377` | `update_user_notification_preferences` |
| GET | `/templates` | `apps\backend\app\api\j6_2_endpoints.py:414` | `get_notification_templates` |
| GET | `/channels` | `apps\backend\app\api\j6_2_endpoints.py:432` | `get_delivery_channels` |
| GET | `/system-status` | `apps\backend\app\api\j6_2_endpoints.py:450` | `get_system_status` |
| GET | `/stock/{symbol}` | `apps\backend\app\api\market\routes.py:39` | `get_stock_price_endpoint` |
| GET | `/crypto/{symbol}` | `apps\backend\app\api\market\routes.py:57` | `get_crypto_price_endpoint` |
| POST | `/batch` | `apps\backend\app\api\market\routes.py:74` | `batch_fetch_prices_endpoint` |
| GET | `/status` | `apps\backend\app\api\market\routes.py:94` | `get_api_status` |
| GET | `/stats` | `apps\backend\app\api\market\routes.py:106` | `get_api_stats_endpoint` |
| GET | `/users/growth` | `apps\backend\app\api\routes\admin_analytics.py:122` | `get_user_growth_metrics` |
| GET | `/users/activity` | `apps\backend\app\api\routes\admin_analytics.py:232` | `get_user_activity_metrics` |
| GET | `/users/demographics` | `apps\backend\app\api\routes\admin_analytics.py:315` | `get_user_demographics` |
| GET | `/content` | `apps\backend\app\api\routes\admin_analytics.py:405` | `get_content_metrics` |
| GET | `/moderation` | `apps\backend\app\api\routes\admin_analytics.py:463` | `get_moderation_metrics` |
| GET | `/social` | `apps\backend\app\api\routes\admin_analytics.py:563` | `get_social_metrics` |
| GET | `/ai` | `apps\backend\app\api\routes\admin_analytics.py:649` | `get_ai_metrics` |
| GET | `/overview` | `apps\backend\app\api\routes\admin_analytics.py:727` | `get_dashboard_overview` |
| GET | `/timeseries/user-growth` | `apps\backend\app\api\routes\admin_analytics.py:774` | `get_user_growth_timeseries` |
| GET | `/admin/api-keys` | `apps\backend\app\api\routes\admin_api_keys.py:60` | `list_api_keys` |
| GET | `/admin/api-keys/{key_id}` | `apps\backend\app\api\routes\admin_api_keys.py:133` | `get_api_key` |
| POST | `/admin/api-keys` | `apps\backend\app\api\routes\admin_api_keys.py:173` | `create_api_key` |
| PATCH | `/admin/api-keys/{key_id}` | `apps\backend\app\api\routes\admin_api_keys.py:246` | `update_api_key` |
| DELETE | `/admin/api-keys/{key_id}` | `apps\backend\app\api\routes\admin_api_keys.py:309` | `delete_api_key` |
| POST | `/admin/api-keys/validate` | `apps\backend\app\api\routes\admin_api_keys.py:349` | `validate_api_key` |
| GET | `` | `apps\backend\app\api\routes\admin_audit_logs.py:84` | `list_audit_logs` |
| POST | `` | `apps\backend\app\api\routes\admin_audit_logs.py:140` | `create_audit_log` |
| GET | `/summary` | `apps\backend\app\api\routes\admin_audit_logs.py:189` | `audit_log_summary` |
| GET | `` | `apps\backend\app\api\routes\admin_email_templates.py:59` | `list_email_templates` |
| GET | `/{template_id}` | `apps\backend\app\api\routes\admin_email_templates.py:122` | `get_email_template` |
| POST | `` | `apps\backend\app\api\routes\admin_email_templates.py:151` | `create_email_template` |
| PATCH | `/{template_id}` | `apps\backend\app\api\routes\admin_email_templates.py:213` | `update_email_template` |
| DELETE | `/{template_id}` | `apps\backend\app\api\routes\admin_email_templates.py:294` | `delete_email_template` |
| POST | `/flags` | `apps\backend\app\api\routes\admin_moderation.py:56` | `create_flag` |
| GET | `/flags` | `apps\backend\app\api\routes\admin_moderation.py:127` | `list_flags` |
| GET | `/flags/{flag_id}` | `apps\backend\app\api\routes\admin_moderation.py:183` | `get_flag` |
| PUT | `/flags/{flag_id}` | `apps\backend\app\api\routes\admin_moderation.py:200` | `update_flag` |
| POST | `/flags/{flag_id}/decision` | `apps\backend\app\api\routes\admin_moderation.py:238` | `create_moderation_decision` |
| GET | `/decisions` | `apps\backend\app\api\routes\admin_moderation.py:303` | `list_decisions` |
| POST | `/decisions/{decision_id}/appeal` | `apps\backend\app\api\routes\admin_moderation.py:348` | `create_appeal` |
| GET | `/appeals` | `apps\backend\app\api\routes\admin_moderation.py:421` | `list_appeals` |
| PUT | `/appeals/{appeal_id}` | `apps\backend\app\api\routes\admin_moderation.py:457` | `review_appeal` |
| GET | `/statistics` | `apps\backend\app\api\routes\admin_moderation.py:491` | `get_moderation_statistics` |
| GET | `/statistics/by-content-type` | `apps\backend\app\api\routes\admin_moderation.py:603` | `get_content_type_statistics` |
| GET | `/statistics/by-reason` | `apps\backend\app\api\routes\admin_moderation.py:634` | `get_reason_statistics` |
| GET | `/flags/{flag_id}/history` | `apps\backend\app\api\routes\admin_moderation.py:667` | `get_flag_history` |
| GET | `` | `apps\backend\app\api\routes\admin_settings.py:70` | `get_system_settings` |
| PATCH | `` | `apps\backend\app\api\routes\admin_settings.py:90` | `update_system_settings` |
| POST | `/validate` | `apps\backend\app\api\routes\admin_settings.py:168` | `validate_settings` |
| POST | `/maintenance-mode/{enabled}` | `apps\backend\app\api\routes\admin_settings.py:228` | `toggle_maintenance_mode` |
| POST | `/feature-flags/{flag_name}/{enabled}` | `apps\backend\app\api\routes\admin_settings.py:301` | `toggle_feature_flag` |
| GET | `/health` | `apps\backend\app\api\routes\admin_settings.py:357` | `health_check` |
| GET | `/feature-flags` | `apps\backend\app\api\routes\admin_settings.py:387` | `get_feature_flags` |
| POST | `/reset-to-defaults` | `apps\backend\app\api\routes\admin_settings.py:411` | `reset_to_defaults` |
| GET | `` | `apps\backend\app\api\routes\admin_users.py:128` | `list_users` |
| POST | `` | `apps\backend\app\api\routes\admin_users.py:210` | `create_user` |
| GET | `/{user_id}` | `apps\backend\app\api\routes\admin_users.py:305` | `get_user` |
| PUT | `/{user_id}` | `apps\backend\app\api\routes\admin_users.py:348` | `update_user` |
| DELETE | `/{user_id}` | `apps\backend\app\api\routes\admin_users.py:442` | `delete_user` |
| POST | `/{user_id}/suspend` | `apps\backend\app\api\routes\admin_users.py:500` | `suspend_user` |
| POST | `/{user_id}/verify` | `apps\backend\app\api\routes\admin_users.py:563` | `verify_user` |
| GET | `` | `apps\backend\app\api\routes\admin_webhooks.py:42` | `list_webhooks` |
| POST | `` | `apps\backend\app\api\routes\admin_webhooks.py:82` | `create_webhook` |
| GET | `/{webhook_id}` | `apps\backend\app\api\routes\admin_webhooks.py:113` | `get_webhook` |
| PATCH | `/{webhook_id}` | `apps\backend\app\api\routes\admin_webhooks.py:133` | `update_webhook` |
| DELETE | `/{webhook_id}` | `apps\backend\app\api\routes\admin_webhooks.py:172` | `delete_webhook` |
| GET | `/{webhook_id}/secret` | `apps\backend\app\api\routes\admin_webhooks.py:191` | `get_webhook_secret` |
| POST | `/{webhook_id}/rotate-secret` | `apps\backend\app\api\routes\admin_webhooks.py:209` | `rotate_webhook_secret` |
| GET | `/{webhook_id}/deliveries` | `apps\backend\app\api\routes\admin_webhooks.py:230` | `get_webhook_deliveries` |
| POST | `/{webhook_id}/test` | `apps\backend\app\api\routes\admin_webhooks.py:273` | `test_webhook` |
| GET | `/available-events` | `apps\backend\app\api\routes\admin_webhooks.py:305` | `get_available_events` |
| GET | `/alerts` | `apps\backend\app\api\routes\alerts.py:46` | `list_alerts` |
| POST | `/alerts` | `apps\backend\app\api\routes\alerts.py:53` | `create_alert` |
| DELETE | `/alerts/{alert_id}` | `apps\backend\app\api\routes\alerts.py:89` | `delete_alert` |
| POST | `/alerts/{alert_id}/toggle` | `apps\backend\app\api\routes\alerts.py:108` | `toggle_alert` |
| GET | `/alerts/stream` | `apps\backend\app\api\routes\alerts.py:129` | `stream_alerts` |
| POST | `/auth/register` | `apps\backend\app\api\routes\auth.py:78` | `register` |
| POST | `/auth/login` | `apps\backend\app\api\routes\auth.py:110` | `login` |
| GET | `/auth/me` | `apps\backend\app\api\routes\auth.py:124` | `me` |
| GET | `/stats` | `apps\backend\app\api\routes\cache.py:27` | `cache_statistics` |
| POST | `/clear` | `apps\backend\app\api\routes\cache.py:41` | `clear_cache` |
| POST | `/warm` | `apps\backend\app\api\routes\cache.py:59` | `warm_cache_endpoint` |
| DELETE | `/pattern/{pattern}` | `apps\backend\app\api\routes\cache.py:71` | `clear_cache_pattern` |
| GET | `/health` | `apps\backend\app\api\routes\cache.py:87` | `cache_health_check` |
| POST | `/chat` | `apps\backend\app\api\routes\chat.py:102` | `chat` |
| GET | `/comprehensive` | `apps\backend\app\api\routes\health_check.py:30` | `comprehensive_health_check` |
| GET | `/metrics` | `apps\backend\app\api\routes\health_check.py:112` | `get_performance_metrics` |
| GET | `/component/{component_name}` | `apps\backend\app\api\routes\health_check.py:118` | `check_component_health` |
| GET | `/health` | `apps\backend\app\api\routes\market.py:16` | `health` |
| GET | `/ohlc` | `apps\backend\app\api\routes\market.py:21` | `get_ohlc` |
| GET | `/health` | `apps\backend\app\api\routes\monitoring.py:25` | `get_system_health` |
| GET | `/health/{service}` | `apps\backend\app\api\routes\monitoring.py:43` | `get_service_health` |
| GET | `/metrics` | `apps\backend\app\api\routes\monitoring.py:63` | `get_system_metrics` |
| GET | `/websocket/analytics` | `apps\backend\app\api\routes\monitoring.py:83` | `get_websocket_analytics` |
| GET | `/websocket/connections` | `apps\backend\app\api\routes\monitoring.py:96` | `get_active_connections` |
| GET | `/cache/metrics` | `apps\backend\app\api\routes\monitoring.py:138` | `get_cache_metrics` |
| POST | `/cache/invalidate` | `apps\backend\app\api\routes\monitoring.py:193` | `invalidate_cache` |
| GET | `/alerts` | `apps\backend\app\api\routes\monitoring.py:227` | `get_alerts` |
| GET | `/dashboard` | `apps\backend\app\api\routes\monitoring.py:267` | `get_monitoring_dashboard` |
| GET | `/performance/insights` | `apps\backend\app\api\routes\monitoring.py:280` | `get_performance_insights` |
| POST | `/monitoring/start` | `apps\backend\app\api\routes\monitoring.py:293` | `start_monitoring` |
| POST | `/monitoring/stop` | `apps\backend\app\api\routes\monitoring.py:310` | `stop_monitoring` |
| GET | `/status` | `apps\backend\app\api\routes\monitoring.py:327` | `get_monitoring_status` |
| GET | `/load-test/websocket` | `apps\backend\app\api\routes\monitoring.py:352` | `websocket_load_test` |
| GET | `/portfolio` | `apps\backend\app\api\routes\portfolio.py:244` | `list_positions` |
| POST | `/portfolio/position` | `apps\backend\app\api\routes\portfolio.py:274` | `add_or_update_position` |
| DELETE | `/portfolio/{position_id}` | `apps\backend\app\api\routes\portfolio.py:303` | `delete_position` |
| POST | `/portfolio/import_text` | `apps\backend\app\api\routes\portfolio.py:328` | `import_text` |
| GET | `/portfolio/summary` | `apps\backend\app\api\routes\portfolio.py:375` | `portfolio_summary` |
| GET | `/portfolio/analytics` | `apps\backend\app\api\routes\portfolio.py:522` | `portfolio_analytics` |
| GET | `/security/status` | `apps\backend\app\api\routes\security.py:21` | `get_security_status` |
| GET | `/security/dashboard` | `apps\backend\app\api\routes\security.py:35` | `get_security_dashboard` |
| POST | `/security/ip/{ip_address}/block` | `apps\backend\app\api\routes\security.py:65` | `block_ip_address` |
| DELETE | `/security/ip/{ip_address}/unblock` | `apps\backend\app\api\routes\security.py:92` | `unblock_ip_address` |
| GET | `/security/events/summary` | `apps\backend\app\api\routes\security.py:118` | `get_security_events_summary` |
| GET | `/security/health` | `apps\backend\app\api\routes\security.py:164` | `security_health_check` |
| GET | `/security/config` | `apps\backend\app\api\routes\security.py:208` | `get_security_config` |
| GET | `/security/alerts/config` | `apps\backend\app\api\routes\security.py:234` | `get_alert_configuration` |
| POST | `/security/alerts/test` | `apps\backend\app\api\routes\security.py:261` | `send_test_alert` |
| GET | `/security/alerts/history` | `apps\backend\app\api\routes\security.py:298` | `get_alert_history` |
| POST | `/social/users` | `apps\backend\app\api\routes\social.py:87` | `create_user` |
| GET | `/social/users/{handle}` | `apps\backend\app\api\routes\social.py:134` | `get_user` |
| POST | `/social/follow/{handle}` | `apps\backend\app\api\routes\social.py:217` | `follow` |
| DELETE | `/social/follow/{handle}` | `apps\backend\app\api\routes\social.py:283` | `unfollow` |
| POST | `/social/posts` | `apps\backend\app\api\routes\social.py:346` | `create_post` |
| GET | `/social/posts` | `apps\backend\app\api\routes\social.py:440` | `list_posts` |
| GET | `/social/feed` | `apps\backend\app\api\routes\social.py:525` | `feed` |
| GET | `/version` | `apps\backend\app\api\routes\versioning.py:20` | `get_version` |
| GET | `/schema` | `apps\backend\app\api\routes\versioning.py:34` | `get_schema` |
| GET | `/compatibility` | `apps\backend\app\api\routes\versioning.py:66` | `compatibility_info` |
| GET | `/api/health` | `apps\backend\app\enhanced_startup.py:347` | `health_check` |
| GET | `/api/health/ready` | `apps\backend\app\enhanced_startup.py:352` | `readiness_check` |
| GET | `/api/health/live` | `apps\backend\app\enhanced_startup.py:364` | `liveness_check` |
| GET | `/` | `apps\backend\app\main.py:322` | `read_root` |
| GET | `/admin/messaging/stats` | `apps\backend\app\routers\admin_messaging.py:33` | `get_platform_messaging_stats` |
| GET | `/admin/messaging/performance` | `apps\backend\app\routers\admin_messaging.py:58` | `get_performance_metrics` |
| GET | `/admin/messaging/moderation` | `apps\backend\app\routers\admin_messaging.py:100` | `get_moderation_stats` |
| POST | `/admin/messaging/moderation/blocked-words` | `apps\backend\app\routers\admin_messaging.py:128` | `add_blocked_words` |
| DELETE | `/admin/messaging/moderation/blocked-words` | `apps\backend\app\routers\admin_messaging.py:159` | `remove_blocked_words` |
| GET | `/admin/messaging/connections` | `apps\backend\app\routers\admin_messaging.py:190` | `get_active_connections` |
| POST | `/admin/messaging/broadcast` | `apps\backend\app\routers\admin_messaging.py:213` | `admin_broadcast_message` |
| GET | `/admin/messaging/health` | `apps\backend\app\routers\admin_messaging.py:252` | `comprehensive_health_check` |
| POST | `/threads` | `apps\backend\app\routers\ai.py:52` | `create_thread` |
| GET | `/threads` | `apps\backend\app\routers\ai.py:72` | `get_threads` |
| GET | `/threads/{thread_id}/messages` | `apps\backend\app\routers\ai.py:95` | `get_thread_messages` |
| POST | `/threads/{thread_id}/messages` | `apps\backend\app\routers\ai.py:120` | `send_message` |
| PUT | `/threads/{thread_id}` | `apps\backend\app\routers\ai.py:215` | `update_thread` |
| DELETE | `/threads/{thread_id}` | `apps\backend\app\routers\ai.py:240` | `delete_thread` |
| GET | `/providers` | `apps\backend\app\routers\ai.py:264` | `get_provider_status` |
| GET | `/rate-limit` | `apps\backend\app\routers\ai.py:278` | `get_rate_limit_status` |
| GET | `/export/conversations` | `apps\backend\app\routers\ai.py:292` | `export_conversations` |
| POST | `/import/conversations` | `apps\backend\app\routers\ai.py:358` | `import_conversations` |
| GET | `/moderation/status` | `apps\backend\app\routers\ai.py:403` | `get_user_moderation_status` |
| GET | `/analytics/conversation-metrics` | `apps\backend\app\routers\ai.py:422` | `get_conversation_metrics` |
| GET | `/analytics/user-insights` | `apps\backend\app\routers\ai.py:453` | `get_user_insights` |
| GET | `/analytics/provider-performance` | `apps\backend\app\routers\ai.py:483` | `get_provider_performance` |
| GET | `/context/user-profile` | `apps\backend\app\routers\ai.py:503` | `get_user_ai_profile` |
| POST | `/threads/{thread_id}/file-upload` | `apps\backend\app\routers\ai.py:523` | `upload_file_to_thread` |
| WEBSOCKET | `/ai/ws` | `apps\backend\app\routers\ai_websocket.py:88` | `websocket_ai_chat` |
| GET | `/ai/ws/status` | `apps\backend\app\routers\ai_websocket.py:282` | `websocket_status` |
| POST | `/` | `apps\backend\app\routers\alerts.py:9` | `create` |
| GET | `/` | `apps\backend\app\routers\alerts.py:20` | `index` |
| POST | `/register` | `apps\backend\app\routers\auth.py:33` | `register` |
| POST | `/login` | `apps\backend\app\routers\auth.py:90` | `login` |
| POST | `/google` | `apps\backend\app\routers\auth.py:147` | `google_oauth` |
| POST | `/logout` | `apps\backend\app\routers\auth.py:274` | `logout` |
| GET | `/me` | `apps\backend\app\routers\auth.py:288` | `get_current_user_info` |
| GET | `/check` | `apps\backend\app\routers\auth.py:305` | `check_auth_status` |
| GET | `/stream` | `apps\backend\app\routers\chat.py:10` | `chat_stream` |
| POST | `/conversations/dm/{other_user_id}` | `apps\backend\app\routers\conversations.py:50` | `create_or_get_dm_conversation` |
| GET | `/conversations` | `apps\backend\app\routers\conversations.py:70` | `get_user_conversations` |
| GET | `/conversations/{conversation_id}` | `apps\backend\app\routers\conversations.py:91` | `get_conversation` |
| GET | `/conversations/{conversation_id}/messages` | `apps\backend\app\routers\conversations.py:125` | `get_conversation_messages` |
| POST | `/conversations/{conversation_id}/messages` | `apps\backend\app\routers\conversations.py:149` | `send_message` |
| PATCH | `/conversations/{conversation_id}/read` | `apps\backend\app\routers\conversations.py:320` | `mark_messages_read` |
| DELETE | `/conversations/{conversation_id}/messages/{message_id}` | `apps\backend\app\routers\conversations.py:373` | `delete_message` |
| GET | `/conversations/health` | `apps\backend\app\routers\conversations.py:424` | `conversation_health` |
| GET | `/conversations/search` | `apps\backend\app\routers\conversations.py:433` | `search_messages` |
| POST | `/conversations/{conversation_id}/messages/{message_id}/report` | `apps\backend\app\routers\conversations.py:465` | `report_message` |
| GET | `/conversations/analytics/user` | `apps\backend\app\routers\conversations.py:496` | `get_user_analytics` |
| GET | `/conversations/{conversation_id}/analytics` | `apps\backend\app\routers\conversations.py:530` | `get_conversation_analytics` |
| GET | `/conversations/trending` | `apps\backend\app\routers\conversations.py:570` | `get_trending_conversations` |
| GET | `/top` | `apps\backend\app\routers\crypto.py:67` | `get_top_cryptocurrencies` |
| GET | `/market/overview` | `apps\backend\app\routers\crypto.py:95` | `get_market_overview` |
| GET | `/coin/{coin_id}` | `apps\backend\app\routers\crypto.py:136` | `get_coin_details` |
| GET | `/price` | `apps\backend\app\routers\crypto.py:174` | `get_simple_price` |
| GET | `/trending` | `apps\backend\app\routers\crypto.py:203` | `get_trending_coins` |
| GET | `/categories` | `apps\backend\app\routers\crypto.py:215` | `get_categories` |
| GET | `/ohlc/{coin_id}` | `apps\backend\app\routers\crypto.py:227` | `get_ohlc_data` |
| GET | `/search` | `apps\backend\app\routers\crypto.py:266` | `search_coins` |
| GET | `/exchanges` | `apps\backend\app\routers\crypto.py:281` | `get_exchanges` |
| GET | `/nft/list` | `apps\backend\app\routers\crypto.py:298` | `get_nft_list` |
| GET | `/health` | `apps\backend\app\routers\crypto.py:316` | `crypto_api_health` |
| POST | `/follow` | `apps\backend\app\routers\follow.py:39` | `legacy_follow_user` |
| POST | `/{user_id}` | `apps\backend\app\routers\follow.py:55` | `follow_user` |
| DELETE | `/unfollow` | `apps\backend\app\routers\follow.py:135` | `legacy_unfollow_user` |
| DELETE | `/{user_id}` | `apps\backend\app\routers\follow.py:152` | `unfollow_user` |
| GET | `/status/{user_id}` | `apps\backend\app\routers\follow.py:169` | `get_follow_status` |
| GET | `/{user_id}/followers` | `apps\backend\app\routers\follow.py:192` | `get_user_followers` |
| GET | `/{user_id}/following` | `apps\backend\app\routers\follow.py:209` | `get_user_following` |
| GET | `/me/followers` | `apps\backend\app\routers\follow.py:226` | `get_my_followers` |
| GET | `/me/following` | `apps\backend\app\routers\follow.py:244` | `get_my_following` |
| GET | `/mutual/{user_id}` | `apps\backend\app\routers\follow.py:262` | `get_mutual_follows` |
| GET | `/suggestions` | `apps\backend\app\routers\follow.py:278` | `get_follow_suggestions` |
| GET | `/stats/me` | `apps\backend\app\routers\follow.py:295` | `get_my_follow_stats` |
| GET | `/activity/me` | `apps\backend\app\routers\follow.py:307` | `get_my_follow_activity` |
| POST | `/bulk/follow` | `apps\backend\app\routers\follow.py:318` | `bulk_follow_users` |
| DELETE | `/bulk/unfollow` | `apps\backend\app\routers\follow.py:353` | `bulk_unfollow_users` |
| GET | `/stats/{user_id}` | `apps\backend\app\routers\follow.py:388` | `get_user_follow_stats` |
| GET | `/health` | `apps\backend\app\routers\health.py:7` | `health` |
| GET | `/symbols/search` | `apps\backend\app\routers\market_data.py:49` | `search_symbols` |
| GET | `/symbols/{symbol}` | `apps\backend\app\routers\market_data.py:73` | `get_symbol_info` |
| GET | `/symbols` | `apps\backend\app\routers\market_data.py:90` | `list_symbols` |
| GET | `/ohlc/{symbol}` | `apps\backend\app\routers\market_data.py:112` | `get_ohlc_data` |
| GET | `/market/overview` | `apps\backend\app\routers\market_data.py:168` | `get_market_overview` |
| GET | `/symbols/popular` | `apps\backend\app\routers\market_data.py:194` | `get_popular_symbols` |
| GET | `/symbols/{symbol}/similar` | `apps\backend\app\routers\market_data.py:235` | `get_similar_symbols` |
| GET | `/stream/{symbol}` | `apps\backend\app\routers\market_data.py:269` | `stream_symbol_data` |
| GET | `/ohlc` | `apps\backend\app\routers\mock_ohlc.py:10` | `mock_ohlc` |
| GET | `/` | `apps\backend\app\routers\news.py:9` | `news` |
| GET | `/` | `apps\backend\app\routers\notifications.py:134` | `get_notifications` |
| GET | `/unread-count` | `apps\backend\app\routers\notifications.py:192` | `get_unread_count` |
| GET | `/stats` | `apps\backend\app\routers\notifications.py:213` | `get_notification_stats` |
| POST | `/mark-read` | `apps\backend\app\routers\notifications.py:244` | `mark_notifications_as_read` |
| POST | `/{notification_id}/read` | `apps\backend\app\routers\notifications.py:293` | `mark_notification_as_read` |
| POST | `/{notification_id}/dismiss` | `apps\backend\app\routers\notifications.py:325` | `dismiss_notification` |
| POST | `/{notification_id}/click` | `apps\backend\app\routers\notifications.py:355` | `click_notification` |
| GET | `/preferences` | `apps\backend\app\routers\notifications.py:387` | `get_notification_preferences` |
| PUT | `/preferences` | `apps\backend\app\routers\notifications.py:420` | `update_notification_preferences` |
| POST | `/test` | `apps\backend\app\routers\notifications.py:448` | `create_test_notification` |
| DELETE | `/cleanup` | `apps\backend\app\routers\notifications.py:490` | `cleanup_expired_notifications` |
| GET | `/types` | `apps\backend\app\routers\notifications.py:511` | `get_notification_types` |
| GET | `/` | `apps\backend\app\routers\ohlc.py:73` | `ohlc` |
| POST | `/` | `apps\backend\app\routers\portfolio.py:9` | `create_portfolio` |
| POST | `/{pid}/holdings` | `apps\backend\app\routers\portfolio.py:14` | `add_holding` |
| GET | `/me` | `apps\backend\app\routers\profile.py:30` | `get_my_profile` |
| PUT | `/me` | `apps\backend\app\routers\profile.py:46` | `update_my_profile` |
| GET | `/{profile_id}` | `apps\backend\app\routers\profile.py:57` | `get_profile` |
| GET | `/username/{username}` | `apps\backend\app\routers\profile.py:69` | `get_profile_by_username` |
| GET | `` | `apps\backend\app\routers\profile.py:90` | `search_profiles` |
| GET | `/settings/user` | `apps\backend\app\routers\profile.py:108` | `get_user_settings` |
| PUT | `/settings/user` | `apps\backend\app\routers\profile.py:114` | `update_user_settings` |
| GET | `/settings/notifications` | `apps\backend\app\routers\profile.py:126` | `get_notification_preferences` |
| PUT | `/settings/notifications` | `apps\backend\app\routers\profile.py:135` | `update_notification_preferences` |
| DELETE | `/me` | `apps\backend\app\routers\profile.py:148` | `delete_account` |
| POST | `/enhanced/avatar` | `apps\backend\app\routers\profile_enhanced.py:107` | `upload_avatar` |
| GET | `/enhanced/avatar/{user_id}` | `apps\backend\app\routers\profile_enhanced.py:148` | `get_avatar` |
| POST | `/enhanced/validate` | `apps\backend\app\routers\profile_enhanced.py:181` | `validate_profile_data` |
| DELETE | `/enhanced/account` | `apps\backend\app\routers\profile_enhanced.py:213` | `delete_account` |
| GET | `/enhanced/export` | `apps\backend\app\routers\profile_enhanced.py:233` | `export_user_data` |
| GET | `/enhanced/stats` | `apps\backend\app\routers\profile_enhanced.py:251` | `get_profile_stats` |
| GET | `/enhanced/activity` | `apps\backend\app\routers\profile_enhanced.py:269` | `get_activity_summary` |
| GET | `/health` | `apps\backend\app\routers\smart_prices.py:77` | `health_check` |
| GET | `/all` | `apps\backend\app\routers\smart_prices.py:89` | `get_all_assets` |
| GET | `/{symbol}` | `apps\backend\app\routers\smart_prices.py:219` | `get_price` |
| POST | `/batch` | `apps\backend\app\routers\smart_prices.py:254` | `get_batch_prices` |
| GET | `/admin/performance` | `apps\backend\app\routers\smart_prices.py:299` | `get_performance_stats` |
| POST | `/admin/reset-stats` | `apps\backend\app\routers\smart_prices.py:324` | `reset_performance_stats` |
| GET | `/{symbol}/history` | `apps\backend\app\routers\smart_prices.py:357` | `get_price_history` |
| GET | `/{symbol}/ohlcv` | `apps\backend\app\routers\smart_prices.py:406` | `get_ohlcv_data` |
| GET | `/crypto/top` | `apps\backend\app\routers\smart_prices.py:481` | `get_top_cryptocurrencies` |
| GET | `/crypto/search` | `apps\backend\app\routers\smart_prices.py:519` | `search_cryptocurrencies` |
| GET | `/crypto/mapping` | `apps\backend\app\routers\smart_prices.py:549` | `get_crypto_symbol_mapping` |
| POST | `/posts` | `apps\backend\app\routers\social.py:9` | `create_post` |
| GET | `/feed` | `apps\backend\app\routers\social.py:19` | `feed` |
| WEBSOCKET | `/ws` | `apps\backend\app\routers\websocket.py:29` | `websocket_endpoint` |
| GET | `/ws/health` | `apps\backend\app\routers\websocket.py:166` | `websocket_health` |
| WEBSOCKET | `/ws/notifications` | `apps\backend\app\routers\websocket.py:178` | `notification_websocket_endpoint` |
| GET | `/ws/notifications/stats` | `apps\backend\app\routers\websocket.py:259` | `notification_websocket_stats` |
| WEBSOCKET | `/prices` | `apps\backend\app\routers\websocket_prices.py:243` | `websocket_price_endpoint` |
| GET | `/j53/status` | `apps\backend\app\services\j53_scheduler.py:19` | `get_scheduler_status` |
