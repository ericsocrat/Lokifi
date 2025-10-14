# Test Documentation - ALL

**Generated:** 2025-10-14 09:38:09  
**Type:** all  
**Files:** 34  
**Tests:** 444

---

## 📊 Summary

This document provides an overview of all tests in the project.

- **Total Test Files:** 34
- **Total Test Cases:** 444
- **Average Tests per File:** 13.06

---

## 📋 Test Catalog

### 🧪 auth.contract.test.ts

**Path:** `apps\frontend\tests\api\contracts\auth.contract.test.ts`  
**Test Count:** 5
**Test Suites:**
- Authentication API Contract
- POST /api/auth/login
- GET /api/health

**Tests:**
- ✓ returns valid JWT token on successful login
- ✓ returns 422 validation error for missing credentials
- ✓ returns 401 for invalid credentials
- ✓ returns health check status
- ✓ responds within 200ms


### 🧪 ohlc.contract.test.ts

**Path:** `apps\frontend\tests\api\contracts\ohlc.contract.test.ts`  
**Test Count:** 7
**Test Suites:**
- OHLC API Contract
- GET /api/ohlc/:symbol/:timeframe
- Performance

**Tests:**
- ✓ returns valid OHLC data structure
- ✓ validates symbol parameter
- ✓ validates timeframe parameter
- ✓ respects limit parameter
- ✓ returns data in correct time order
- ✓ responds within 500ms for small dataset
- ✓ handles concurrent requests


### 🧪 websocket.contract.test.ts

**Path:** `apps\frontend\tests\api\contracts\websocket.contract.test.ts`  
**Test Count:** 3
**Test Suites:**
- WebSocket API Contract
- Connection
- Error Handling

**Tests:**
- ✓ establishes WebSocket connection
- ✓ receives real-time price updates
- ✓ rejects malformed messages


### 🧪 ChartPanel.test.tsx

**Path:** `apps\frontend\tests\components\ChartPanel.test.tsx`  
**Test Count:** 2
**Test Suites:**
- ChartPanel

**Tests:**
- ✓ renders without crashing
- ✓ creates a chart with correct initial options


### 🧪 DrawingLayer.test.tsx

**Path:** `apps\frontend\tests\components\DrawingLayer.test.tsx`  
**Test Count:** 23
**Test Suites:**
- DrawingLayer Component
- Rendering
- Drawing Interaction
- Selection Handling
- Snap Functionality
- Tool Modes
- Drawing Deletion
- Layer Visibility
- Performance
- Context Menu
- Keyboard Shortcuts

**Tests:**
- ✓ should render without crashing
- ✓ should render canvas with correct dimensions
- ✓ should render all drawings from store
- ✓ should handle mouse down to start drawing
- ✓ should handle mouse move during drawing
- ✓ should handle mouse up to finish drawing
- ✓ should handle selection of drawings
- ✓ should clear selection on background click
- ✓ should apply grid snap when enabled
- ✓ should apply price level snap when enabled
- ✓ should handle trendline tool
- ✓ should handle rectangle tool
- ✓ should handle text tool
- ✓ should delete selected drawings on delete key
- ✓ should delete selected drawings on backspace key
- ✓ should respect layer visibility settings
- ✓ should respect layer opacity settings
- ✓ should handle many drawings efficiently
- ✓ should use requestAnimationFrame for smooth rendering
- ✓ should show context menu on right click
- ✓ should close context menu on outside click
- ✓ should handle Escape key to cancel drawing
- ✓ should handle Ctrl+A to select all


### 🧪 EnhancedChart.test.tsx

**Path:** `apps\frontend\tests\components\EnhancedChart.test.tsx`  
**Test Count:** 8
**Test Suites:**
- EnhancedChart
- Chart Data Processing
- Chart Interactions

**Tests:**
- ✓ renders chart container
- ✓ displays symbol and timeframe info
- ✓ shows loading state
- ✓ displays error state
- ✓ handles chart resize
- ✓ converts OHLC data to chart format correctly
- ✓ handles drawing mode activation
- ✓ displays drawing state correctly


### 🧪 IndicatorModal.test.tsx

**Path:** `apps\frontend\tests\components\IndicatorModal.test.tsx`  
**Test Count:** 13
**Test Suites:**
- IndicatorModal

**Tests:**
- ✓ should not render when closed
- ✓ should render when open
- ✓ should display all indicator categories
- ✓ should display indicators with correct information
- ✓ should filter indicators by search term
- ✓ should filter indicators by category
- ✓ should show active indicators as disabled
- ✓ should add overlay indicator to price pane
- ✓ should create new pane for separate indicators
- ✓ should not allow adding already active indicators
- ✓ should close modal when X button is clicked
- ✓ should close modal when overlay is clicked
- ✓ should not close modal when modal content is clicked


### 🧪 PriceChart.test.tsx

**Path:** `apps\frontend\tests\components\PriceChart.test.tsx`  
**Test Count:** 25
**Test Suites:**
- PriceChart Component
- Rendering
- Data Loading
- Indicators
- Theme Support
- Responsiveness
- Symbol Changes
- Cleanup
- Performance
- Crosshair
- Volume Display

**Tests:**
- ✓ should render without crashing
- ✓ should create a chart instance on mount
- ✓ should add candlestick series to chart
- ✓ should fetch and display candle data
- ✓ should handle loading state
- ✓ should handle error state
- ✓ should display Bollinger Bands when enabled
- ✓ should display VWAP when enabled
- ✓ should display VWMA when enabled
- ✓ should display Standard Deviation Channels when enabled
- ✓ should apply dark theme
- ✓ should apply light theme
- ✓ should update theme dynamically
- ✓ should resize chart on window resize
- ✓ should handle container resize
- ✓ should update chart when symbol changes
- ✓ should update chart when timeframe changes
- ✓ should cleanup chart on unmount
- ✓ should unsubscribe from store updates on unmount
- ✓ should handle large datasets efficiently
- ✓ should throttle indicator updates
- ✓ should handle crosshair move events
- ✓ should display price and time on crosshair
- ✓ should display volume histogram
- ✓ should color volume bars based on price direction


### 🧪 features-g2-g4.test.tsx

**Path:** `apps\frontend\tests\integration\features-g2-g4.test.tsx`  
**Test Count:** 20
**Test Suites:**
- Watchlist Store (G2)
- Watchlist Management
- Alert Management
- Screener Functionality
- Bulk Operations
- Templates Store (G4)
- Template Management
- Template Search and Filtering
- Import/Export Functionality
- Feature Flag Integration

**Tests:**
- ✓ should create a new watchlist
- ✓ should add symbols to watchlist
- ✓ should prevent duplicate symbols
- ✓ should remove symbols from watchlist
- ✓ should add alerts to watchlist items
- ✓ should toggle alert activation
- ✓ should add and remove screener filters
- ✓ should update screener query parameters
- ✓ should import symbols into new watchlist
- ✓ should export watchlist symbols
- ✓ should create a template with configuration
- ✓ should duplicate existing template
- ✓ should apply template to chart
- ✓ should filter templates by search query
- ✓ should filter templates by tags
- ✓ should update sort options
- ✓ should export template data
- ✓ should import template data
- ✓ should respect feature flags for watchlist operations
- ✓ should respect feature flags for template operations


### 🧪 lw-mapping.test.ts

**Path:** `apps\frontend\tests\lib\lw-mapping.test.ts`  
**Test Count:** 21
**Test Suites:**
- wireLightweightChartsMappings
- basic functionality
- coordinate conversion - yToPrice
- coordinate conversion - priceToY
- coordinate conversion - xToTime
- coordinate conversion - timeToX
- visible range updates

**Tests:**
- ✓ returns early if chart is null
- ✓ returns early if series is null
- ✓ returns early if both chart and series are null
- ✓ calls setMappers with coordinate conversion functions
- ✓ converts Y coordinate to price successfully
- ✓ returns null when coordinateToPrice returns non-number
- ✓ handles missing coordinateToPrice method
- ✓ converts price to Y coordinate successfully
- ✓ returns null when priceToCoordinate returns non-number
- ✓ converts X coordinate to time successfully
- ✓ returns null when coordinateToTime is unavailable
- ✓ converts time to X coordinate successfully
- ✓ handles string time input
- ✓ returns null when timeToCoordinate is unavailable
- ✓ calls setVisibleBarCoords with coordinate array
- ✓ calls setVisiblePriceLevels with price levels
- ✓ subscribes to visible time range changes
- ✓ subscribes to visible logical range changes
- ✓ handles missing getVisibleRange gracefully
- ✓ handles errors in feedVisible gracefully
- ✓ uses default height when chartElement.clientHeight is unavailable


### 🧪 portfolio.test.ts

**Path:** `apps\frontend\tests\lib\portfolio.test.ts`  
**Test Count:** 18
**Test Suites:**
- Portfolio API
- listPortfolio
- addPosition
- deletePosition
- importCsvText
- getPortfolioSummary

**Tests:**
- ✓ fetches portfolio positions successfully
- ✓ handles empty portfolio
- ✓ handles API errors
- ✓ adds a new position successfully
- ✓ adds position with tags
- ✓ adds position with create_alerts flag
- ✓ handles validation errors
- ✓ deletes a position successfully
- ✓ handles deletion errors
- ✓ handles network errors during deletion
- ✓ imports CSV text successfully
- ✓ imports CSV with create_alerts flag
- ✓ handles malformed CSV
- ✓ handles empty CSV
- ✓ fetches portfolio summary successfully
- ✓ handles portfolio with no positions
- ✓ handles portfolio with null prices
- ✓ handles API errors


### 🧪 auth-security.test.ts

**Path:** `apps\frontend\tests\security\auth-security.test.ts`  
**Test Count:** 17
**Test Suites:**
- Security: Authentication
- SQL Injection Protection
- XSS Protection
- Rate Limiting
- Token Security
- Password Security
- Input Validation
- CORS Security

**Tests:**
- ✓ rejects SQL injection in username
- ✓ rejects SQL injection in password
- ✓ rejects union-based SQL injection
- ✓ sanitizes script tags in input
- ✓ sanitizes event handlers in input
- ✓ sanitizes javascript: protocol
- ✓ enforces rate limiting on login attempts
- ✓ enforces rate limiting on API endpoints
- ✓ rejects invalid JWT tokens
- ✓ rejects expired tokens
- ✓ rejects malformed authorization headers
- ✓ requires authentication for protected endpoints
- ✓ rejects weak passwords
- ✓ enforces password complexity requirements
- ✓ validates email format
- ✓ limits request payload size
- ✓ includes CORS headers


### 🧪 auth.security.test.ts

**Path:** `apps\frontend\tests\security\auth.security.test.ts`  
**Test Count:** 12
**Test Suites:**
- Security: Authentication
- Brute Force Protection
- User Enumeration Prevention
- Password Security
- Token Management
- Session Security

**Tests:**
- ✓ should rate limit login attempts
- ✓ should lock account after multiple failed attempts
- ✓ should not reveal if user exists in error messages
- ✓ should have consistent response times for valid/invalid users
- ✓ should enforce minimum password length
- ✓ should require password complexity (uppercase, lowercase, numbers, symbols)
- ✓ should reject common/weak passwords
- ✓ should invalidate tokens after logout
- ✓ should expire tokens after configured timeout
- ✓ should not allow token reuse after refresh
- ✓ should regenerate session ID after login
- ✓ should clear sensitive data on logout


### 🧪 csrf.security.test.ts

**Path:** `apps\frontend\tests\security\csrf.security.test.ts`  
**Test Count:** 8
**Test Suites:**
- Security: CSRF Protection
- Token Validation
- Cookie Security
- Request Validation

**Tests:**
- ✓ should require CSRF token for state-changing requests
- ✓ should reject invalid CSRF tokens
- ✓ should regenerate CSRF token after use
- ✓ should set SameSite=Strict on session cookies
- ✓ should set HttpOnly flag on authentication cookies
- ✓ should set Secure flag in production
- ✓ should validate Origin header
- ✓ should validate Referer header for sensitive operations


### 🧪 input-validation.test.ts

**Path:** `apps\frontend\tests\security\input-validation.test.ts`  
**Test Count:** 10
**Test Suites:**
- Security: Input Validation
- Path Traversal Protection
- Command Injection Protection
- LDAP Injection Protection
- XML Injection Protection
- NoSQL Injection Protection
- HTTP Header Injection
- Integer Overflow Protection
- Unicode Normalization
- File Upload Validation
- Content Security Policy
- Security Headers

**Tests:**
- ✓ rejects path traversal in file operations
- ✓ rejects shell metacharacters
- ✓ rejects LDAP injection patterns
- ✓ rejects XML external entity (XXE) attacks
- ✓ rejects MongoDB injection operators
- ✓ rejects CRLF injection in redirects
- ✓ validates numeric boundaries
- ✓ handles unicode homoglyphs
- ✓ includes CSP headers
- ✓ includes security headers


### 🧪 validation.security.test.ts

**Path:** `apps\frontend\tests\security\validation.security.test.ts`  
**Test Count:** 12
**Test Suites:**
- Security: Input Validation
- SQL Injection Prevention
- Command Injection Prevention
- Path Traversal Prevention
- File Upload Validation
- Data Type Validation

**Tests:**
- ✓ should use parameterized queries
- ✓ should reject SQL keywords in user input
- ✓ should sanitize shell command arguments
- ✓ should avoid eval() and similar functions
- ✓ should reject path traversal sequences (../, ../../)
- ✓ should validate file paths are within allowed directories
- ✓ should validate file types by content (not just extension)
- ✓ should enforce file size limits
- ✓ should scan uploaded files for malware
- ✓ should validate numeric inputs are within expected range
- ✓ should validate email format
- ✓ should validate URL format and protocol


### 🧪 xss.security.test.ts

**Path:** `apps\frontend\tests\security\xss.security.test.ts`  
**Test Count:** 9
**Test Suites:**
- Security: XSS Prevention
- Input Sanitization
- Output Encoding
- DOM Manipulation
- Content Security Policy

**Tests:**
- ✓ should sanitize HTML tags from user input
- ✓ should remove script tags from input
- ✓ should handle encoded malicious input
- ✓ should escape HTML entities in displayed content
- ✓ should safely handle user-generated URLs
- ✓ should prevent innerHTML injection attacks
- ✓ should use safe DOM methods (textContent, createElement)
- ✓ should have strict CSP headers
- ✓ should block inline scripts


### 🧪 drawings.test.ts

**Path:** `apps\frontend\tests\types\drawings.test.ts`  
**Test Count:** 17
**Test Suites:**
- Drawing Type Definitions
- Point type
- DrawingStyle type
- TrendlineDrawing type
- ArrowDrawing type
- RectDrawing type
- TextDrawing type
- FibDrawing type
- GroupDrawing type
- Drawing union type
- Type discrimination

**Tests:**
- ✓ should accept valid point objects
- ✓ should accept valid style objects
- ✓ should accept partial style objects
- ✓ should accept dash style variations
- ✓ should accept valid trendline drawings
- ✓ should accept optional properties
- ✓ should accept valid arrow drawings
- ✓ should accept valid rectangle drawings
- ✓ should accept valid text drawings
- ✓ should accept optional fontSize
- ✓ should accept valid fibonacci drawings
- ✓ should accept custom levels
- ✓ should accept valid group drawings
- ✓ should accept multiple children of different types
- ✓ should accept any valid drawing type
- ✓ should allow type narrowing based on kind
- ✓ should allow type narrowing for groups


### 🧪 lightweight-charts.test.ts

**Path:** `apps\frontend\tests\types\lightweight-charts.test.ts`  
**Test Count:** 20
**Test Suites:**
- Lightweight Charts Type Definitions
- Time type
- TimeRange type
- CandlestickData type
- LineData type
- HistogramData type
- SeriesMarker type
- SeriesOptions type
- ChartOptions type
- Complex chart configurations
- Array types

**Tests:**
- ✓ should accept number timestamps
- ✓ should accept string dates
- ✓ should accept timestamp objects
- ✓ should accept valid time ranges
- ✓ should accept valid candlestick data
- ✓ should validate OHLC relationships
- ✓ should accept valid line data
- ✓ should accept valid histogram data
- ✓ should accept optional color
- ✓ should accept valid markers
- ✓ should accept different positions
- ✓ should accept valid series options
- ✓ should accept price format options
- ✓ should accept valid chart options
- ✓ should accept grid options
- ✓ should accept crosshair options
- ✓ should accept time scale options
- ✓ should handle complete chart setup
- ✓ should handle arrays of candlestick data
- ✓ should handle arrays of markers


### 🧪 multiChart.test.tsx

**Path:** `apps\frontend\tests\unit\multiChart.test.tsx`  
**Test Count:** 6
**Test Suites:**
- Multi-Chart Store

**Tests:**
- ✓ should initialize with default state
- ✓ should change layout and create appropriate number of charts
- ✓ should enable symbol linking and sync symbols
- ✓ should enable timeframe linking and sync timeframes
- ✓ should handle cursor linking with events
- ✓ should not perform actions when multiChart flag is disabled


### 🧪 chart-reliability.test.tsx

**Path:** `apps\frontend\tests\unit\charts\chart-reliability.test.tsx`  
**Test Count:** 8
**Test Suites:**
- ChartErrorBoundary
- ChartLoadingState
- Chart timestamp normalization

**Tests:**
- ✓ renders children when no error
- ✓ renders error UI when error occurs
- ✓ calls onRetry when retry button is clicked
- ✓ renders default loading message
- ✓ renders custom symbol and timeframe
- ✓ renders custom message
- ✓ normalizes millisecond timestamps to seconds
- ✓ ensures monotonic time ordering


### 🧪 chartUtils.test.ts

**Path:** `apps\frontend\tests\unit\charts\chartUtils.test.ts`  
**Test Count:** 3
**Test Suites:**
- chartUtils

**Tests:**
- ✓ angleDeg simple
- ✓ tfToSeconds
- ✓ barsFromTimes


### 🧪 indicators.test.ts

**Path:** `apps\frontend\tests\unit\charts\indicators.test.ts`  
**Test Count:** 6
**Test Suites:**
- indicators

**Tests:**
- ✓ sma works
- ✓ ema seeds and runs
- ✓ bollinger outputs bands after window
- ✓ vwma matches simple average when volume equal
- ✓ vwap increases with price when anchored
- ✓ stdDevChannels returns center/upper/lower after window


### 🧪 lw-mapping.test.ts

**Path:** `apps\frontend\tests\unit\charts\lw-mapping.test.ts`  
**Test Count:** 21
**Test Suites:**
- wireLightweightChartsMappings
- basic functionality
- coordinate conversion - yToPrice
- coordinate conversion - priceToY
- coordinate conversion - xToTime
- coordinate conversion - timeToX
- visible range updates

**Tests:**
- ✓ returns early if chart is null
- ✓ returns early if series is null
- ✓ returns early if both chart and series are null
- ✓ calls setMappers with coordinate conversion functions
- ✓ converts Y coordinate to price successfully
- ✓ returns null when coordinateToPrice returns non-number
- ✓ handles missing coordinateToPrice method
- ✓ converts price to Y coordinate successfully
- ✓ returns null when priceToCoordinate returns non-number
- ✓ converts X coordinate to time successfully
- ✓ returns null when coordinateToTime is unavailable
- ✓ converts time to X coordinate successfully
- ✓ handles string time input
- ✓ returns null when timeToCoordinate is unavailable
- ✓ calls setVisibleBarCoords with coordinate array
- ✓ calls setVisiblePriceLevels with price levels
- ✓ subscribes to visible time range changes
- ✓ subscribes to visible logical range changes
- ✓ handles missing getVisibleRange gracefully
- ✓ handles errors in feedVisible gracefully
- ✓ uses default height when chartElement.clientHeight is unavailable


### 🧪 drawingStore.test.ts

**Path:** `apps\frontend\tests\unit\stores\drawingStore.test.ts`  
**Test Count:** 14
**Test Suites:**
- DrawingStore

**Tests:**
- ✓ should initialize with default state
- ✓ should set active tool
- ✓ should start drawing
- ✓ should add points to current drawing
- ✓ should finish drawing and create object
- ✓ should cancel drawing
- ✓ should add object directly
- ✓ should select and deselect objects
- ✓ should delete objects
- ✓ should duplicate objects
- ✓ should move objects
- ✓ should filter objects by pane
- ✓ should toggle object properties
- ✓ should toggle drawing settings


### 🧪 multiChartStore.test.tsx

**Path:** `apps\frontend\tests\unit\stores\multiChartStore.test.tsx`  
**Test Count:** 6
**Test Suites:**
- Multi-Chart Store

**Tests:**
- ✓ should initialize with default state
- ✓ should change layout and create appropriate number of charts
- ✓ should enable symbol linking and sync symbols
- ✓ should enable timeframe linking and sync timeframes
- ✓ should handle cursor linking with events
- ✓ should not perform actions when multiChart flag is disabled


### 🧪 paneStore.test.ts

**Path:** `apps\frontend\tests\unit\stores\paneStore.test.ts`  
**Test Count:** 9
**Test Suites:**
- PaneStore

**Tests:**
- ✓ should initialize with default price pane
- ✓ should add indicator pane
- ✓ should add indicator to existing pane
- ✓ should remove indicator from pane
- ✓ should move indicator between panes
- ✓ should toggle pane visibility
- ✓ should update pane height
- ✓ should remove pane
- ✓ should reorder panes


### 🧪 measure.test.ts

**Path:** `apps\frontend\tests\unit\utils\measure.test.ts`  
**Test Count:** 28
**Test Suites:**
- Measurement Utilities
- fmtNum
- fmtPct
- clamp

**Tests:**
- ✓ formats numbers >= 100 with no decimals
- ✓ formats numbers < 100 with default 2 decimals
- ✓ formats negative numbers >= 100 with no decimals
- ✓ formats negative numbers < 100 with decimals
- ✓ respects custom decimal places for numbers < 100
- ✓ returns em-dash for Infinity
- ✓ returns em-dash for NaN
- ✓ handles zero
- ✓ handles very small numbers
- ✓ handles edge case around 100
- ✓ formats positive percentages with + sign
- ✓ formats negative percentages with - sign
- ✓ formats zero with + sign
- ✓ respects custom decimal places
- ✓ returns em-dash for Infinity
- ✓ returns em-dash for NaN
- ✓ handles very small percentages
- ✓ handles large percentages
- ✓ handles edge cases around zero
- ✓ clamps value to minimum
- ✓ clamps value to maximum
- ✓ returns value when within range
- ✓ handles negative ranges
- ✓ handles value equal to minimum
- ✓ handles value equal to maximum
- ✓ handles zero in range
- ✓ handles floating point values
- ✓ handles same min and max


### 🧪 notify.test.ts

**Path:** `apps\frontend\tests\unit\utils\notify.test.ts`  
**Test Count:** 15
**Test Suites:**
- Notification Module
- ensureNotificationPermission
- notify

**Tests:**
- ✓ returns 
- ✓ returns current permission when not 
- ✓ returns 
- ✓ requests permission when permission is 
- ✓ does nothing when Notification API is not available
- ✓ creates notification with title only
- ✓ creates notification with title and body
- ✓ does not create notification when permission is denied
- ✓ plays sound when sound is 
- ✓ does not play sound when sound is 
- ✓ does not play sound by default
- ✓ handles audio play errors gracefully
- ✓ handles notification creation errors gracefully
- ✓ handles permission request errors gracefully
- ✓ sets correct audio volume for ping sound


### 🧪 pdf.test.ts

**Path:** `apps\frontend\tests\unit\utils\pdf.test.ts`  
**Test Count:** 10
**Test Suites:**
- PDF Export
- exportReportPDF

**Tests:**
- ✓ returns early when no canvases found
- ✓ completes export process successfully
- ✓ creates download link with correct attributes
- ✓ accepts custom title parameter
- ✓ uses default title when none provided
- ✓ handles canvas drawing operations
- ✓ converts canvas to data URL format
- ✓ fetches image data for PDF embedding
- ✓ creates blob URL for download
- ✓ falls back to document.body when main not found


### 🧪 perf.test.ts

**Path:** `apps\frontend\tests\unit\utils\perf.test.ts`  
**Test Count:** 11
**Test Suites:**
- Performance Utilities
- rafThrottle
- microBatch
- debounce
- Type safety

**Tests:**
- ✓ should throttle function calls to animation frames
- ✓ should preserve function context
- ✓ should handle multiple arguments
- ✓ should batch multiple calls into one microtask
- ✓ should preserve function context
- ✓ should handle complex arguments
- ✓ should debounce function calls
- ✓ should reset timer on subsequent calls
- ✓ should preserve function context
- ✓ should handle different delay times
- ✓ should maintain type safety for function signatures


### 🧪 persist.test.ts

**Path:** `apps\frontend\tests\unit\utils\persist.test.ts`  
**Test Count:** 18
**Test Suites:**
- Persist Module
- saveCurrent
- loadCurrent
- saveVersion
- listVersions
- integration scenarios

**Tests:**
- ✓ saves drawings and selection to localStorage
- ✓ converts Set to Array for selection
- ✓ handles empty drawings and selection
- ✓ loads current snapshot from localStorage
- ✓ returns null when no data exists
- ✓ returns null when JSON parsing fails
- ✓ handles localStorage getItem throwing error
- ✓ saves a new version to version history
- ✓ appends to existing versions
- ✓ limits version history to MAX_VERSIONS (20)
- ✓ handles localStorage errors by falling back to saveCurrent
- ✓ handles JSON parsing errors when loading versions
- ✓ returns array of saved versions
- ✓ returns empty array when no versions exist
- ✓ returns empty array when JSON parsing fails
- ✓ handles localStorage getItem throwing error
- ✓ full workflow: save version, load current, list versions
- ✓ maintains version history across multiple saves


### 🧪 portfolio.test.ts

**Path:** `apps\frontend\tests\unit\utils\portfolio.test.ts`  
**Test Count:** 18
**Test Suites:**
- Portfolio API
- listPortfolio
- addPosition
- deletePosition
- importCsvText
- getPortfolioSummary

**Tests:**
- ✓ fetches portfolio positions successfully
- ✓ handles empty portfolio
- ✓ handles API errors
- ✓ adds a new position successfully
- ✓ adds position with tags
- ✓ adds position with create_alerts flag
- ✓ handles validation errors
- ✓ deletes a position successfully
- ✓ handles deletion errors
- ✓ handles network errors during deletion
- ✓ imports CSV text successfully
- ✓ imports CSV with create_alerts flag
- ✓ handles malformed CSV
- ✓ handles empty CSV
- ✓ fetches portfolio summary successfully
- ✓ handles portfolio with no positions
- ✓ handles portfolio with null prices
- ✓ handles API errors


### 🧪 webVitals.test.ts

**Path:** `apps\frontend\tests\unit\utils\webVitals.test.ts`  
**Test Count:** 21
**Test Suites:**
- WebVitalsMonitor
- Initialization
- Metric Collection
- Rating System
- Snapshot
- Subscription
- Clear
- API Reporting
- Sampling

**Tests:**
- ✓ should initialize with default config
- ✓ should initialize with custom config
- ✓ should not initialize if enableReporting is false
- ✓ should collect CLS metric
- ✓ should collect FCP metric
- ✓ should collect INP metric
- ✓ should collect LCP metric
- ✓ should collect TTFB metric
- ✓ should rate CLS as good when <= 0.1
- ✓ should provide performance score
- ✓ should calculate correct performance score for all good metrics
- ✓ should create snapshot of all metrics
- ✓ should include all metric data in snapshot
- ✓ should allow subscribing to metrics
- ✓ should call subscriber for each metric
- ✓ should allow unsubscribing
- ✓ should clear all reports
- ✓ should attempt to report to API when configured
- ✓ should handle API errors gracefully
- ✓ should respect sample rate of 0
- ✓ should always collect with sample rate of 1


---

## 🚀 Quick Commands

```bash
# Run all tests
npm run test

# Run specific test type
npm run test tests/all

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

**Generated by Lokifi Documentation System**  
*Keeping your docs fresh and accurate* 📚✨

