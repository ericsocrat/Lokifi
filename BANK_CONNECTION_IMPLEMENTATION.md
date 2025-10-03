# Bank & Brokerage Connection Flow - Implementation

## Overview

Implemented the complete multi-step bank connection flow using SaltEdge (and other aggregators) for connecting financial institutions. This includes search, selection, disclaimers, and external OAuth connection.

## User Journey

```
1. Asset Selection → Click "Connect Banks & Brokerages"
2. Search Page → Enter location (e.g., "cyprus")
3. Results Dropdown → Select bank (e.g., "Revolut")
4. Disclaimer Modal → "Heads Up" about connectivity
5. Click "I Understand" → Opens SaltEdge OAuth
6. Connection Modal → "Keep an eye on connection tab"
7. Click "OK, Got It" → Returns to dashboard
```

## File Created

```
frontend/app/dashboard/add-assets/banks/page.tsx
```

## Features Implemented

### 1. Search Interface

**Layout:**
- Centered card with max-width
- "Banks & Brokerages" header
- Search input with icon
- Real-time filtering

**Search Functionality:**
```typescript
const handleSearchChange = (value: string) => {
  setSearchQuery(value);
  setShowResults(value.length > 0);
};
```

**Sample Banks Data:**
- Bank of Cyprus
- PayPal
- Curve
- Revolut ⭐ (example in images)
- Juni
- Argentex

Each bank shows:
- Logo placeholder (initials)
- Bank name
- Location + Provider ("Cyprus • Salt Edge")

### 2. Search Results Dropdown

**Design:**
- Appears below search as user types
- Hover effect on each result
- Bank logo (2-letter initials in black circle)
- Bank name (bold)
- Location & provider (gray text)

**Interaction:**
```typescript
onClick={() => handleBankSelect(bank)}
```

### 3. "Heads Up" Disclaimer Modal

**Triggered:** When user selects a bank

**Content:**
- Hot air balloon icon (top-right)
- "Heads Up" heading
- Multi-paragraph explanation:
  - Uses established aggregators (Mastercard, MX, Plaid, Yodlee, Akahu, Lean Insights, Aigo, Volt)
  - "it's absolutely safe" (linked)
  - **"100% connectivity isn't guaranteed"** (bold)
  - Some accounts may never connect
  - Manual tracking alternative
  - Report issues to hello@kubera.com
  - Disclaimer about stability expectations

**Action Button:**
- "I Understand" (black button, full width)

**Key Points:**
1. Multiple aggregator support
2. Safety assurance with link
3. Connectivity disclaimer
4. Support email provided
5. Sets expectations

### 4. SaltEdge OAuth Connection

**Implementation:**
```typescript
const handleUnderstand = () => {
  setModal({ ...modal, type: "connecting" });

  setTimeout(() => {
    window.open(
      "https://www.saltedge.com/connect/...",
      "_blank",
      "width=800,height=600"
    );
  }, 500);
};
```

**Flow:**
1. User clicks "I Understand"
2. Shows "connecting" modal
3. Opens SaltEdge OAuth in popup (800x600)
4. User completes authentication in popup
5. Popup closes after success
6. Returns to Kubera

**SaltEdge URL Pattern:**
```
https://www.saltedge.com/connect/{connection_token}/kyc_simplified
```

### 5. "Keep an Eye" Connection Modal

**Triggered:** Immediately after opening SaltEdge

**Content:**
- "OPEN" sign icon (top-right)
- "Please keep an eye on the connection tab." heading
- Explanation:
  - Connection can take several minutes
  - May require additional details
  - Watch connection tab for issues
  - Can add more assets in meantime

**Action Button:**
- "OK, Got It" (black button, full width)

**Purpose:**
- Informs user connection is in progress
- Sets time expectations
- Encourages multitasking
- Manages user attention

## Technical Implementation

### State Management

```typescript
interface BankConnectionModal {
  show: boolean;
  type: "disclaimer" | "connecting" | null;
  selectedBank: BankOption | null;
}

const [modal, setModal] = useState<BankConnectionModal>({
  show: false,
  type: null,
  selectedBank: null,
});
```

### Modal Types

**Disclaimer Modal (`type: "disclaimer"`):**
- Shows connectivity warnings
- "I Understand" button
- Hot air balloon icon

**Connecting Modal (`type: "connecting"`):**
- Shows after OAuth popup opens
- "OK, Got It" button
- OPEN sign icon

### Bank Data Structure

```typescript
interface BankOption {
  id: string;
  name: string;
  location: string;
  logo?: string;
}
```

### Search & Filter Logic

```typescript
const filteredBanks = searchQuery
  ? allBanks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : [];
```

## Design Specifications

### Colors

```css
Background: #F9FAFB (gray-50)
Card: #FFFFFF (white)
Search Border: #D1D5DB (gray-300)
Search Focus: #3B82F6 (blue-500) ring
Hover: #F9FAFB (gray-50)
Button: #000000 (black)
Button Hover: #1F2937 (gray-800)
```

### Typography

```css
Page Title: 24px (2xl), bold
Bank Names: 16px (base), semibold
Location: 14px (sm), regular
Modal Heading: 24px (2xl), bold
Body Text: 16px (base), regular
Links: 16px (base), blue-600, underlined
```

### Spacing

```css
Card Padding: 2rem (32px)
Search Input: 0.75rem padding (12px)
Modal Padding: 2rem (32px)
Button Padding: 0.75rem 1.5rem (12px 24px)
```

### Icons

**Hot Air Balloon:**
- Simple SVG illustration
- Black fill
- Positioned top-right
- 80x80px size

**OPEN Sign:**
- Rectangle with text
- Black border and text
- Hanging rod below
- 96x96px size

## Integration Points

### SaltEdge OAuth

**Connection Token:**
- Generated by backend (not implemented yet)
- Unique per connection attempt
- Expires after use or timeout

**OAuth Flow:**
1. Backend generates connection token
2. Frontend opens SaltEdge with token
3. User authenticates with bank
4. SaltEdge redirects back with success/failure
5. Backend receives webhook from SaltEdge
6. Frontend polls for connection status

### Future Backend Integration

**Endpoints Needed:**

1. **Generate Connection Token:**
```
POST /api/connections/token
Body: { provider: "saltedge", bank_id: "revolut" }
Response: { token: "abc123...", url: "https://..." }
```

2. **Check Connection Status:**
```
GET /api/connections/status/{token}
Response: { status: "pending|connected|failed", details: {...} }
```

3. **List Connected Accounts:**
```
GET /api/connections
Response: [{ id, bank, accounts: [...], status }]
```

### Supported Aggregators

**Mentioned in Disclaimer:**
- Mastercard
- MX
- Plaid
- Yodlee
- Akahu
- Lean Insights
- Aigo
- Volt

**Primary in Demo:**
- Salt Edge (shown in bank locations)

## User Experience Details

### Search Behavior

**Auto-complete:**
- Shows results as user types
- Minimum 1 character to show results
- Filters by bank name OR location
- Case-insensitive matching

**Empty States:**
- No results: "No banks found. Try a different search term."
- Initial: "Start typing to search for banks and brokerages"

### Modal Behavior

**Disclaimer Modal:**
- Blocks background interaction
- Semi-transparent backdrop
- X button to close (returns to search)
- ESC key to close (can add)

**Connecting Modal:**
- Shows immediately after OAuth popup
- Can close while connection proceeds
- Closing returns to dashboard
- User can check connection tab anytime

### Error Handling

**Connection Failures:**
- User completes OAuth but connection fails
- Backend webhook indicates error
- Show error message in connection tab
- Allow retry or manual entry

**Timeout:**
- Connection takes too long
- Show timeout message
- Offer retry option

## Testing Scenarios

### Happy Path
1. Navigate to /dashboard/add-assets
2. Click "Connect Banks & Brokerages"
3. Type "cyprus" in search
4. Click "Revolut"
5. Read disclaimer modal
6. Click "I Understand"
7. See SaltEdge popup open
8. See "Keep an eye" modal
9. Click "OK, Got It"
10. Return to dashboard

### Alternative Flows
- Close disclaimer without connecting
- Close connecting modal early
- Search different locations
- Select different banks
- No search results handling

## Future Enhancements

### Short-term:
1. **Real Bank API Integration**
   - Connect to actual aggregator APIs
   - Generate real connection tokens
   - Handle OAuth callbacks

2. **Connection Status Tab**
   - New page to monitor connections
   - Show progress indicators
   - Display errors/warnings
   - Retry failed connections

3. **More Banks**
   - Expand bank database
   - Add bank logos
   - Support multiple countries
   - Filter by region

### Long-term:
1. **Multi-Aggregator Support**
   - Try Plaid first, fall back to SaltEdge
   - Let user choose aggregator
   - Show which banks work with which

2. **Connection Management**
   - View all connected accounts
   - Disconnect/reconnect
   - Refresh account data
   - View sync history

3. **Enhanced Search**
   - Popular banks section
   - Recently added
   - Trending/recommended
   - By account type (checking, savings, investment)

## Security Considerations

### OAuth Best Practices:
- Connection tokens expire after 15 minutes
- One-time use tokens
- Secure token generation (UUID + signature)
- HTTPS only

### Data Protection:
- Never store bank credentials
- Only store account metadata
- Encrypt connection tokens
- Rate limit token generation

### User Privacy:
- Clear disclosure of aggregator use
- Link to privacy policy
- Explain data usage
- Option to disconnect anytime

## Routes

```
/dashboard/add-assets                Main asset selection
/dashboard/add-assets/banks         Bank connection flow ⭐ NEW
/dashboard/add-assets/stocks        Stock tickers
/dashboard/add-assets/crypto-tickers  Crypto tickers
```

## Code Examples

### Opening OAuth Popup

```typescript
window.open(
  "https://www.saltedge.com/connect/TOKEN/kyc_simplified",
  "_blank",
  "width=800,height=600"
);
```

### Modal State Management

```typescript
// Show disclaimer
setModal({
  show: true,
  type: "disclaimer",
  selectedBank: bank,
});

// Show connecting
setModal({
  ...modal,
  type: "connecting",
});

// Close
setModal({
  show: false,
  type: null,
  selectedBank: null,
});
```

## Status

✅ **COMPLETED:**
- Search interface with filtering
- Bank selection dropdown
- Disclaimer modal with full content
- SaltEdge OAuth popup integration
- Connecting/progress modal
- Navigation flow
- Modal state management
- Responsive design

⏳ **PENDING:**
- Backend token generation
- Real OAuth callback handling
- Connection status polling
- Error states
- Connection management tab
- Actual bank logos
- Larger bank database

---

**Created:** October 3, 2025
**Status:** Frontend Complete - Backend Integration Needed
**Route:** http://localhost:3000/dashboard/add-assets/banks
