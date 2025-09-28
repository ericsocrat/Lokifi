# Changelog

All notable changes to Fynix will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase J3 (Follow Graph Enhancements)

#### RESTful Follow Endpoints
- **NEW**: `POST /api/follow/{user_id}` and `DELETE /api/follow/{user_id}` 
- **Unified Response**: `FollowActionResponse` with comprehensive status
- **Idempotent**: Safe to call multiple times (action: follow/unfollow/noop)
- **Notifications**: Automatic FOLLOW notifications on new follows

#### Enhanced Suggestions
- **Improved Pagination**: Real `has_next` calculation with sentinel fetching
- **Better Ranking**: Mutual follows prioritized, fallback to popular users
- **Deterministic Ordering**: Consistent results across pages

#### Deprecations
- **DEPRECATED**: `POST /api/follow/follow` (sunset: Dec 31, 2025)
- **DEPRECATED**: `DELETE /api/follow/unfollow` (sunset: Dec 31, 2025)
- **Headers**: Deprecation, Sunset, and Link headers added to legacy endpoints

#### Technical Improvements
- **Timezone-aware**: All datetime operations use `timezone.utc` 
- **Test Coverage**: Added notification tests and action/noop scenarios
- **Database**: NullPool in test mode prevents connection reuse issues

### Added - Part G (Enhancements - Feature Flagged)

#### G1. Multi-Chart Layouts + Linking
- **Layouts**: 1×1, 1×2 (vertical), 2×2 grid layouts
- **Linking**: Toggle linking per dimension (symbol, timeframe, cursor)
- **Persistence**: User preferences saved with schema versioning
- **Flag**: `NEXT_PUBLIC_FLAG_MULTI_CHART` (OFF by default)

#### G2. Watchlist + Basic Screener  
- **Watchlist**: Add/remove/reorder symbols with drag support
- **Screener**: Filters for price %, volume, RSI, MA cross, ATR
- **Cache**: Shared symbol directory with result caching
- **Flag**: `NEXT_PUBLIC_FLAG_WATCHLIST`, `NEXT_PUBLIC_FLAG_SCREENER`

#### G3. Corporate Actions & Sessions
- **OHLC Toggle**: Adjusted vs raw prices (splits/dividends)
- **Sessions**: Regular vs extended hours with holiday awareness
- **Flag**: `NEXT_PUBLIC_FLAG_CORP_ACTIONS`

#### G4. Templates & Image Export
- **Templates**: Save/load chart layouts, studies, styles
- **Export**: PNG/SVG export with optional watermarks
- **Sharing**: Generate read-only shareable links
- **Flag**: `NEXT_PUBLIC_FLAG_TEMPLATES`, `NEXT_PUBLIC_FLAG_IMG_EXPORT`

#### G5. Alerts v2
- **Conditions**: Price cross/zone, indicator thresholds (RSI < 30)
- **Notifications**: In-app notification center with snooze
- **Email**: Preference plumbing (no external provider required)
- **Flag**: `NEXT_PUBLIC_FLAG_ALERTS_V2`

#### G6. Strategy Backtester (Lite)
- **Built-ins**: EMA cross (fast/slow), RSI threshold strategies
- **Metrics**: Equity curve, drawdown, win rate, trades table
- **Export**: CSV export of results
- **Worker**: Runs in Web Worker with viewport-limited data
- **Flag**: `NEXT_PUBLIC_FLAG_BACKTESTER`

#### G7. Provider Reliability Extras
- **Rate Limiting**: Per-key quotas with exponential backoff + jitter
- **Protection**: Single-flight caching (stampede protection)
- **Quality**: Gap/duplicate checks on OHLC data
- **Telemetry**: Structured error codes and telemetry
- **Flag**: `NEXT_PUBLIC_FLAG_PROVIDER_RELIABILITY`

#### G8. Social Primitives
- **Profiles**: User avatars, bio, follow system
- **Discussions**: Symbol threads with post/reply
- **Moderation**: Report/block functionality, rate limits
- **Privacy**: No PII beyond profile fields
- **Flag**: `NEXT_PUBLIC_FLAG_SOCIAL`

#### G9. Paper Trading + Portfolio
- **Orders**: Virtual market/limit/stop order ticket
- **Portfolio**: Positions, P&L, fees tracking
- **Tools**: Position sizing (risk % or ATR-based)
- **Import**: CSV import for holdings
- **Flag**: `NEXT_PUBLIC_FLAG_PAPER_TRADING`

#### G10. Observability Upgrades
- **Tracing**: OpenTelemetry spans for /api/symbols, /api/ohlc, WebSocket
- **Correlation**: IDs in logs for request tracing
- **Visual**: Regression snapshots for themes/symbols
- **Flag**: `NEXT_PUBLIC_FLAG_OTEL`, `NEXT_PUBLIC_FLAG_VISUAL_REGRESSION`

#### G11. Mobile/A11y & Onboarding
- **Responsive**: Touch-friendly toolbars and hit areas
- **Accessibility**: Reduced-motion, keyboard nav for menus/modals
- **Tour**: First-run product tour with dismissal
- **Docs**: OpenAPI documentation page
- **Fixtures**: Sample datasets (BTCUSDT 1h, AAPL 1D)
- **Flag**: `NEXT_PUBLIC_FLAG_FIRST_RUN_TOUR`

### Added - Part H (Seamless Upgrades Foundation)

#### H1. Feature Flags & Remote Config
- **Typed System**: Server and client-side typed flag service
- **Sources**: Environment variables + optional Redis override
- **Debug**: Dev-only page to view/toggle flags (`/dev/flags`)
- **Default**: All G-flags OFF by default

#### H2. Versioned Schemas & Migrations
- **Schema Versioning**: All client state carries `{ schemaVersion }`
- **Migrations**: Utilities for `migrateState(vN) -> vN+1`
- **Orchestrator**: `migrateAll()` for bulk migrations
- **Safety**: "Reset state" button in settings

#### H3. API Contracts & Typed Clients
- **Generation**: Frontend types from FastAPI OpenAPI
- **Validation**: Zod (frontend) + Pydantic (backend)
- **CI**: Fails on OpenAPI changes without type regeneration
- **Contracts**: Shape/type/range validation for /api/symbols, /api/ohlc

#### H4. Provider Abstraction & Resilience
- **Interface**: Common DataProvider (getSymbols, getOHLC, getLogo)
- **Error Codes**: Standardized with retries/backoff
- **Caching**: ETag/If-None-Match support, tiered TTLs
- **Protection**: Single-flight caching, circuit breakers

#### H5. Indicator & Drawing Plugin SDK
- **Registries**: `registerStudy(def)` and `registerTool(def)`
- **Auto-UI**: Input schemas generate settings UIs
- **Extensibility**: Add studies/tools via module + registry import
- **Built-ins**: SMA, EMA, RSI calculations; trendline, rectangle, circle tools

#### H6. Workerization & Performance Budgets
- **Web Workers**: Pool for study computations with abort support
- **Canvas**: OffscreenCanvas overlay when available
- **Budget**: Initial chart TTI < 2s with telemetry
- **Async**: AbortController on symbol/timeframe changes

#### H7. Testing, Fixtures & Visual Stability
- **Selectors**: E2E via `data-testid`
- **VCR**: Cassettes for provider responses (record once, replay in CI)
- **Visual**: Regression baseline behind flag
- **Coverage**: Unit/integration/e2e/visual test suites

#### H8. DX & Release Hygiene
- **Commits**: Conventional Commits with commitlint
- **Hooks**: Pre-commit typecheck/lint/tests
- **Release**: Semantic-release for version bumps + CHANGELOG
- **Governance**: CODEOWNERS, Renovate/Dependabot enabled
- **Preview**: Environments for PRs with seeded fixtures

#### H9. Security, Privacy, Compliance Basics
- **Headers**: Strict CORS, CSP, Referrer-Policy, X-CTO
- **Auth**: JWT rotation/refresh, session TTL
- **Privacy**: PII scrubbing, structured logs with correlation IDs
- **Containers**: Non-root, minimal base, SBOM in CI

#### H10. Theming, i18n, A11y Tokens
- **Tokens**: Central design tokens for light/dark themes
- **High Contrast**: Accessibility option
- **i18n**: Scaffold (en initially) with loader
- **Themes**: Switch with token-driven components

#### H11. Data Export/Import (User Trust)
- **Export/Import**: JSON for layouts, drawings, indicators, watchlists, alerts, portfolio
- **Versioning**: Export format with migrations on import
- **Safety**: Version mismatch warnings

## [Previous Versions]

### Parts A-F (Completed)
- Core chart functionality
- Technical indicators
- Drawing tools
- Basic API endpoints
- WebSocket real-time data
- Redis caching
- Docker containerization