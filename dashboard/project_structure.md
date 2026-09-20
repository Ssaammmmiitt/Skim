# Skim Dashboard Project Structure

This document describes the structure of the Skim dashboard (Next.js 16 App Router application), detailing each page/route, its purpose, components used, and visual appearance.

## Overview

The Skim dashboard is a Next.js 16 application using the App Router structure. It provides:
- User authentication (Google OAuth + Email OTP)
- Admin approval workflow
- Digest browsing and archive
- Hybrid search functionality
- RAG-powered chat interface
- User settings and preferences
- Theme customization (light/dark/system)

## Route Structure

```
src/app/
├── page.tsx                 # Home page - Today's digest feed
├── layout.tsx               # Root layout with theme provider and AppShell
├── loading.tsx              # Global loading skeleton
├── error.tsx                # Error boundary
├── global-error.tsx         # Global error boundary
├── not-found.tsx            # 404 page
├── globals.css              # CSS variables for design tokens
├── auth/                    # Authentication routes
│   ├── callback/route.ts    # OAuth callback handler
│   ├── complete/route.ts    # Profile creation/sync
│   └── signout/route.ts     # Sign out handler
├── login/                   # Login page
│   └── page.tsx             # Google OAuth + Email OTP login
├── pending/                 # Pending approval page
│   └── page.tsx             # Waiting for admin approval
├── privacy/                 # Privacy policy page
│   └── page.tsx             # Privacy policy content
├── archive/                 # Digest archive
│   └── page.tsx             # Browse past digests by date
├── chat/                    # RAG chat interface
│   └── page.tsx             # Chat with AI over article corpus
├── search/                  # Search page
│   └── page.tsx             # Hybrid search results
├── settings/                # User preferences
│   └── page.tsx             # Email/theme preferences + live preview
├── admin/                   # Admin panel (superuser only)
│   ├── page.tsx             # User approval queue
│   └── stats/page.tsx       # Pipeline & article analytics
├── supabase-test/           # Supabase connection test
│   └── page.tsx             # Diagnostic page
└── api/                     # API routes
    ├── admin/
    │   ├── stats/route.ts   # Analytics data
    │   └── users/route.ts   # Approve/reject users
    ├── api/
    │   ├── chat/route.ts    # RAG Q&A endpoint
    │   ├── digests/
    │   │   ├── route.ts     # Digest articles by date
    │   │   └── dates/route.ts # Available digest dates
    │   ├── search/route.ts  # Hybrid/keyword search
    │   └── settings/
    │       ├── digest-preview/route.ts # Email HTML preview
    │       └── preferences/route.ts    # User preferences CRUD
```

## Detailed Page Descriptions

Below are detailed descriptions of each user-facing page in the application.

### 1. Home Page (`/`)

**File:** `src/app/page.tsx`

**Purpose:** Displays today's digest feed with articles curated by the AI agent.

**Components Used:**
- `PageContainer` - Provides consistent padding and max-width
- `DigestFeed` - Main component that renders the timeline of digest articles

**How it Works:**
1. On server-side render, fetches today's digest using `fetchDigest` utility
2. Passes the digest data to `DigestFeed` component
3. Shows digest header with date, subject, story count, and send time
4. Renders articles in a "StoryStream" timeline layout with:
   - Left column: Article publication timestamps (hidden on mobile)
   - Middle column: Vertical dashed timeline rail (hidden on mobile)
   - Right column: Digest cards for each article

**Appearance:**
- Clean, readable layout with cyan accent colors
- Timeline visualization showing article chronology
- Top 3 articles get a cyan left border accent ("featured" stories)
- Each digest card shows: rank, topic badge, source, time ago, title, key takeaway, insight/summary, importance score, and read more link
- Empty state with helpful message when no digest exists for today

### 2. Digest Feed Component

**File:** `src/components/digest/DigestFeed.tsx`

**Purpose:** Renders the timeline layout for digest articles.

**Key Features:**
- StoryStream timeline with vertical rail (desktop only)
- Timestamp column showing publication time
- Interactive digest cards with hover effects
- Empty state handling for days with no digest
- Responsive design that stacks vertically on mobile

**Props:**
- `digest`: DigestResponse object containing articles and metadata
- `isToday`: Boolean indicating if this is today's digest (affects empty state messaging)

### 3. Digest Card Component

**File:** `src/components/digest/DigestCard.tsx`

**Purpose:** Displays individual article information in the digest feed.

**Components Used:**
- `TopicBadge` - Color-coded topic label
- `Link` - For article title and read more link

**How it Works:**
- Shows article rank (1, 2, 3...) with top 3 getting featured styling
- Displays topic badge with color corresponding to article topic
- Shows source (Hacker News, TechCrunch, etc.)
- Displays time ago since publication
- Title as clickable link to original article
- Key takeaway (if available) in subdued typography
- Main content: Either AI-generated insight or article summary
- Footer with "Read more" link and importance score (★ X.X)

**Appearance:**
- Card-based design with hover lift effect
- Left border accent (3px cyan) for top-3 stories
- Clean typography hierarchy
- Responsive padding and spacing

### 4. Topic Badge Component

**File:** `src/components/digest/TopicBadge.tsx`

**Purpose:** Displays color-coded topic labels for articles.

**How it Works:**
- Uses topic-to-class mapping from `lib/topics.ts`
- Maps topics to specific background/text color classes
- Falls back to "Other" topic for null/unknown topics

**Topic Categories & Colors:**
- AI/ML: Blue background
- Web Dev: Green background  
- Cloud: Purple background
- Cybersecurity: Red background
- Startups: Orange background
- Programming: Yellow background
- Science: Teal background
- Other: Gray background

### 5. Archive Page (`/archive`)

**File:** `src/app/archive/page.tsx`

**Purpose:** Allows browsing past digests by date.

**Components Used:**
- `PageContainer` - Consistent page layout
- `ArchiveView` - Main archive view component
- URL search params for date selection (`?date=YYYY-MM-DD`)

**How it Works:**
1. Reads date from URL query parameters (defaults to today)
2. Fetches digest for selected date and list of available digest dates
3. Passes data to `ArchiveView` client component
4. Handles date navigation and digest loading

**Appearance:**
- Page header with archive description
- Date picker component for selecting dates
- Loading/error states
- Digest feed for selected date (same as home page)

### 6. Archive View Component

**File:** `src/components/archive/ArchiveView.tsx`

**Purpose:** Main view for browsing archive digests with date selection.

**Components Used:**
- `DatePicker` - Date selection UI
- `DigestFeed` - Digest article display
- `DigestFeedSkeleton` - Loading placeholder
- `PageHeader` - Page title and description
- `ErrorAlert` - Error display
- Archive store (Zustand) for state management

**How it Works:**
- Client component using React hooks
- Synchronizes with URL date parameter via Zustand store
- Fetches available digest dates on mount
- Shows loading skeleton while fetching data
- Displays error panel with retry option on failure
- Renders digest feed when data is available

**Appearance:**
- Clean form-like interface with date navigation buttons
- Input field for direct date entry
- Quick jump to "Today" button
- Visual indicator when selected date has available digest
- List of recent dates with available digests (limited to 14)

### 7. Date Picker Component

**File:** `src/components/archive/DatePicker.tsx`

**Purpose:** Provides date selection UI for navigating archive.

**How it Works:**
- Shows current date in ISO input field (YYYY-MM-DD)
- Previous/Next day buttons for incremental navigation
- "Today" button to jump to current date
- Visual feedback when date has/doesn't have digest
- List of recent dates with available digests for quick selection
- Input validation to prevent future dates

**Appearance:**
- Compact horizontal layout with buttons and input
- Visual highlighting of selected date in date list
- Disabled states for navigation boundaries
- Helpful text showing digest availability and count

### 8. Chat Page (`/chat`)

**File:** `src/app/chat/page.tsx`

**Purpose:** Provides RAG-powered chat interface for asking questions about the article corpus.

**Components Used:**
- `PageContainer` - With size="lg" and fill class for max width
- `ChatInterface` - Main chat component

**How it Works:**
- Simple page that renders chat interface in a constrained width container
- All chat logic handled in `ChatInterface` component

**Appearance:**
- Centered chat interface with max width of 4xl
- Clean separation from page edges with padding

### 9. Chat Interface Component

**File:** `src/components/chat/ChatInterface.tsx`

**Purpose:** Main interactive chat interface with message history, input, and suggested prompts.

**Components Used:**
- `PageHeader` - Chat title and description
- `ChatMessage` - Individual message bubbles
- `ChatLoadingBubble` - Thinking/processing indicator
- `ChatErrorPanel` - Error display with retry option
- Chat store (Zustand) for state management

**How it Works:**
- Client component using React hooks and Zustand store
- Fetches chat quota (remaining daily questions) on load
- Scrolls to bottom when new messages arrive
- Handles form submission for sending messages
- Supports Shift+Enter for newlines, Enter to send
- Shows suggested prompts when no message history
- Displays loading bubble during AI processing
- Shows error panel with provider details and retry option on failure
- Displays chat messages with avatar-like provider badges for AI responses

**Appearance:**
- Full-height flex column layout
- Header showing remaining daily questions (20/day limit)
- Message history area with proper spacing
- Loading indicator with 3-step process visualization:
  1. Embedding your question (MiniLM 384-dim)
  2. Searching the corpus (Hybrid vector + full-text + RRF)
  3. Generating answer (Gemini → fallback models → Groq)
- Input area with textarea and send button
- Suggested prompts as chips when chat is empty
- Message bubbles with different styling for user (cyan background) vs AI (card background)
- AI messages show provider/model badges and source citations

### 10. Chat Message Component

**File:** `src/components/chat/ChatMessage.tsx`

**Purpose:** Renders individual chat messages with proper styling and formatting.

**How it Works:**
- Different styling for user vs AI messages:
  - User: Cyan background with black text (right-aligned)
  - AI: Card background with foreground text (left-aligned)
- AI messages show provider/model badge above content
- Renders markdown-like formatting:
  - Bold text: `**text**` → `<strong>` element
  - Citations: `[1, 2, 3]` → cyan-colored text
- Renders source citations below message when available
- Proper whitespace handling for readability

**Appearance:**
- Distinct visual separation between user and AI messages
- User messages: Prominent cyan background
- AI messages: Card-style with subtle elevation
- Clean typography with proper line height and spacing
- Source citations in collapsible details panel

### 11. Source Citation Component

**File:** `src/components/chat/SourceCitation.tsx`

**Purpose:** Displays sources referenced in AI responses with similarity metrics and topic badges.

**Components Used:**
- `TopicBadge` - For source topic labeling

**How it Works:**
- Collapsible details/summary element
- Summary shows source count and retrieval method badge
- Detailed list shows each source with:
  - Number prefix
  - Clickable title linking to original article
  - Topic badge
  - Source label and publication date
  - Similarity bar visualization (when available)
- Retrieval method badges color-coded by type:
  - Hybrid: Purple
  - Vector/Semantic: Cyan
  - Full-text: Blue
  - Keyword: Amber

**Appearance:**
- Collapsible panel to save space
- Clean list formatting with proper indentation
- Visual similarity bars showing relevance percentage
- Interactive elements (clickable titles, topic badges)

### 12. Chat Loading Bubble Component

**File:** `src/components/chat/ChatLoadingBubble.tsx`

**Purpose:** Shows AI processing status with step-by-step visualization.

**How it Works:**
- Cycles through 3 processing steps every 2.4 seconds
- Shows current step label and detail
- Visual progress indicator showing completed steps
- Uses session key to reset when new request starts

**Steps:**
1. Embedding your question - MiniLM 384-dim (same as pipeline)
2. Searching the corpus - Hybrid vector + full-text + RRF
3. Generating answer - Gemini → fallback models → Groq

**Appearance:**
- Spinning avatar placeholder on left
- Current step label and detail text
- Progress bar showing completed steps as filled cyan pills
- Clean card-based container

### 13. Chat Error Panel Component

**File:** `src/components/chat/ChatErrorPanel.tsx`

**Purpose:** Displays structured error information with retry capability.

**How it Works:**
- Maps error codes to user-friendly labels
- Shows main error message
- Displays suggested wait time for rate limiting
- Lists providers tried when all fail
- Shows error details in development or for config/unknown errors
- Provides retry button when callback available

**Error Types:**
- quota_exhausted: Daily chat limit reached
- rate_limited: Too many requests recently
- all_providers_failed: All LLM providers unavailable
- config: Missing API configuration
- empty_response: AI returned empty answer
- unknown: Unclassified error

**Appearance:**
- Error-styled card with border and background
- Clear error code label and message
- Optional sections for retry info, provider details, and debug info
- Prominent retry button when applicable

### 14. Search Page (`/search`)

**File:** `src/app/search/page.tsx`

**Purpose:** Provides hybrid search interface for finding articles in the corpus.

**Components Used:**
- `PageContainer` - With size="lg" for width constraint
- `Suspense` - For lazy loading of search results
- `LoadingSpinner` - Placeholder while loading
- `SearchResults` - Main search interface component

**How it Works:**
- Simple wrapper that lazily loads search results
- Shows loading spinner while search component loads

**Appearance:**
- Constrained width container for optimal readability
- Loading state placeholder

### 15. Search Results Component

**File:** `src/components/search/SearchResults.tsx`

**Purpose:** Main search interface with search bar, results display, and filtering.

**Components Used:**
- `PageHeader` - Search title and description
- `SearchBar` - Search input with auto-focus
- `EmptyState` - For no query and no results states
- `ErrorAlert` - Error display with retry
- `LoadingSpinner` - Loading placeholder
- `SearchResultCard` - Individual result display
- Search store (Zustand) for state management
- `useSearchParams` - For reading query from URL

**How it Works:**
- Client component using React hooks and Zustand store
- Reads query parameter from URL (`?q=search+terms`)
- Fetches search results when query changes
- Shows different states:
  - No query: Empty state prompting to start searching
  - Query + loading: Loading spinner
  - Query + error: Error alert with retry
  - Query + results: Results stats and cards
- Supports hybrid (default) and keyword search modes
- Shows retrieval method and similarity percentage for results

**Appearance:**
- Search bar at top with optional auto-focus
- Clear separation between sections
- Results stats showing count, query, and retrieval mode
- Grid of search result cards with consistent styling
- Empty states with helpful guidance and actions
- Error states with retry capability

### 16. Search Result Card Component

**File:** `src/components/search/SearchResultCard.tsx`

**Purpose:** Displays individual search results with metadata.

**Components Used:**
- `TopicBadge` - For topic labeling
- `Link` - For article title and read more link

**How it Works:**
- Shows result rank number
- Displays topic badge with color coding
- Shows source label
- Displays retrieval method badge (when available)
- Shows similarity percentage (when available)
- Title as clickable link to original article
- Key takeaway (when available)
- Main content: Either insight or summary
- Footer with "Read article" link and importance score

**Appearance:**
- Card-based design with hover effect
- Clean metadata row with icons and text
- Prominent title as clickable link
- Proper typography hierarchy for different content types
- Action-oriented footer with clear calls to action

### 17. Settings Page (`/settings`)

**File:** `src/app/settings/page.tsx`

**Purpose:** Allows users to customize their digest email preferences and dashboard appearance.

**Components Used:**
- `PageContainer` - With size="lg" for width constraint
- `PageHeader` - Settings title and description
- `DigestPreferenceForm` - Main preferences form component
- Supabase client for fetching user preferences

**How it Works:**
- Fetches user preferences from database on load
- Passes preferences as initial values to preference form
- Handles form submission to save preferences

**Appearance:**
- Constrained width container for form readability
- Clean header with page title and description
- Form-based interface for preference customization

### 18. Digest Preference Form Component

**File:** `src/components/settings/DigestPreferenceForm.tsx`

**Purpose:** Comprehensive form for customizing email and dashboard preferences.

**Components Used:**
- Various form inputs (selects, range, checkboxes, buttons)
- `DashboardThemeSelector` - For dashboard appearance
- `EmailThemePreview` - For email theme selection
- `DigestFormatPreview` - For email format selection
- `DigestFormatPreview` - For email format selection
- `ErrorAlert` - Form submission errors
- Preferences store (Zustand) for state management
- Various UI components from `lib/tailwind-ui`

**How it Works:**
- Client component using React hooks and Zustand store
- Hydrates with initial preferences on mount
- Maintains draft preferences in store
- Preview URL updates dynamically based on theme/format selections
- Live iframe preview of digest email
- Topic filter selection via togglable buttons
- Form submission with save status feedback
- Validation through controlled components

**Sections:**
1. **Dashboard Appearance** - Light/dark/system theme selector
2. **Email Theme** - Cyan/classic/minimal theme selection with live preview
3. **Email Content Format** - Full/brief/headlines format selection with feature lists
4. **Live Email Preview** - Iframe showing email preview based on selections
5. **Max Stories** - Range input (3-12) for digest length
6. **Topic Filters** - Checkbox-style buttons for topic inclusion/exclusion
7. **Email Subscription** - Toggle for receiving daily digest emails

**Appearance:**
- Well-organized form with clear section headers
- Visual previews for theme and format selections
- Interactive controls with clear feedback
- Live preview updating in real-time
- Responsive layout adapting to screen sizes
- Status bar showing save state and confirmation messages

### 19. Email Theme Preview Component

**File:** `src/components/settings/EmailThemePreview.tsx`

**Purpose:** Shows preview of how email digest will look with selected theme and format.

**How it Works:**
- Uses theme metadata from `lib/digest-preferences.ts`
- Applies theme colors to preview container
- Shows sample story with all format elements based on selected format
- Displays theme traits as feature badges
- Highlights selected theme with border and ring

**Appearance:**
- Button-styled preview card
- Themed header with Skim branding
- Sample story with title, topic, and formatted content
- Traits list showing theme characteristics
- Clear visual indication of selected state

### 20. Digest Format Preview Component

**File:** `src/components/settings/DigestFormatPreview.tsx`

**Purpose:** Shows what content elements are included in each email format option.

**How it Works:**
- Uses format includes mapping from `lib/digest-preferences.ts`
- Shows format name and description
- Lists included elements with checkmarks
- Highlights selected format with background and border

**Appearance:**
- Button-styled preview card
- Clear format label and description
- Checklist of included content elements
- Visual indication of selected state

### 21. Dashboard Theme Selector Component

**File:** `src/components/theme/DashboardThemeSelector.tsx`

**Purpose:** Allows selection of dashboard appearance theme (light/dark/system).

**Components Used:**
- Theme store (Zustand) for live theme updates
- Dashboard theme mapping from `lib/dashboard-theme.ts`

**How it Works:**
- Shows three options: Light, Dark, System
- Each option displays theme visualization:
  - Light: Light blue-gray background
  - Dark: Near-black background
  - System: Gradient showing both themes
- Updates theme in real-time when live prop is true
- Otherwise calls onChange callback with selected theme
- Highlights selected theme with border and ring

**Appearance:**
- Grid layout with three theme options
- Each option shows:
  - Large theme visualization block
  - Theme label (bold text)
  - Theme description (smaller muted text)
- Clean card-based design with hover and selection effects

### 22. Admin Page (`/admin`)

**File:** `src/app/admin/page.tsx`

**Purpose:** Allows superusers to approve or reject pending user registrations.

**Components Used:**
- `PageContainer` - Standard page layout
- `PageHeader` - Admin panel title and description
- `AdminPanel` - Main admin interface component
- Supabase admin client for privileged operations
- Authentication checks for superuser validation

**How it Works:**
- Verifies user is authenticated superuser
- Fetches pending users from database
- Passes pending users to AdminPanel component
- Redirects non-admins to home page

**Appearance:**
- Standard page layout with header
- List of pending users with admin actions
- Only accessible to superusers (poudyal.sammit@gmail.com by default)

### 23. Admin Panel Component

**File:** `src/components/admin/AdminPanel.tsx`

**Purpose:** Interface for reviewing and acting on pending user registrations.

**Components Used:**
- `EmptyState` - For loading/no pending states
- `ErrorAlert` - For error display with retry
- `Toast` - For action confirmation messages
- HTTP requests to `/api/admin/users` endpoints

**How it Works:**
- Client component using React hooks and state
- Fetches pending users on mount and refresh
- Shows loading state while fetching
- Shows empty state when no pending registrations
- Lists pending users with:
  - Display name or email
  - Email address
  - Request timestamp
  - Approve/reject buttons
- Handles approve/reject actions via API calls
- Shows success/error toasts
- Refreshes list after actions
- Optionally refreshes page after actions

**Appearance:**
- Card-based layout for each pending user
- User info on left, actions on right
- Clean button styling (primary for approve, danger for reject)
- Loading overlays and disabled states during actions
- Responsive layout adjusting for screen sizes

### 24. Admin Statistics Page (`/admin/stats`)

**File:** `src/app/admin/stats/page.tsx`

**Purpose:** Shows pipeline and article analytics for superusers.

**Components Used:**
- `PageContainer` - Standard page layout
- `PageHeader` - Analytics title and description
- `StatsCharts` - Main analytics visualization component
- Authentication checks for superuser validation

**How it Works:**
- Verifies user is authenticated superuser
- Fetches analytics data from `/api/admin/stats` endpoint
- Passes data to StatsCharts component
- Redirects non-admins to home page

**Appearance:**
- Standard page layout with header
- Multiple charts showing various metrics
- Only accessible to superusers

### 25. Stats Charts Component

**File:** `src/components/admin/stats/StatsCharts.tsx`

**Purpose:** Visualizes pipeline and article analytics using charts.

**Components Used:**
- Recharts library (AreaChart, BarChart, PieChart, etc.)
- Various UI and layout components
- Error and empty states

**How it Works:**
- Client component using React hooks and state
- Fetches statistics data on mount
- Shows loading/error states as needed
- Renders multiple charts when data available:
  1. **Volume Chart** - Area chart showing articles ingested/embedded over last 14 days
  2. **Topic Distribution** - Pie chart showing article topic breakdown
  3. **Score Distribution** - Bar chart showing AI importance score distribution
  4. **Top Sources** - Vertical bar chart showing most frequent sources

**Appearance:**
- Professional dashboard-style charts
- Consistent color scheme using cyan palette
- Responsive containers that resize with screen
- Clear axis labels, legends, and tooltips
- Empty and error states with appropriate messaging

### 26. Login Page (`/login`)

**File:** `src/app/login/page.tsx`

**Purpose:** Handles user authentication via Google OAuth or email OTP.

**Components Used:**
- Various form inputs and buttons
- Supabase client for authentication operations
- React hooks for state management
- Router for navigation

**How it Works:**
- Client component with complex state machine
- Supports two modes: signin and signup
- Supports two methods: password and email OTP
- Supports three steps: input, verify-otp, verify-email-link
- Google OAuth flow with proper redirect handling
- Email OTP flow with verification
- Email link verification for signup
- Proper error handling and user feedback
- Automatic redirect to auth/complete on successful session

**Appearance:**
- Clean two-column layout
- Header with branding and mode description
- Mode tabs for switching between signin/signup
- Google OAuth button prominently displayed
- Email form fields that adapt to selected method
- Step-specific forms for OTP and email link verification
- Clear feedback messages for success and error conditions
- Responsive design working on mobile and desktop

### 27. Pending Page (`/pending`)

**File:** `src/app/pending/page.tsx`

**Purpose:** Informs users their account is awaiting admin approval.

**Components Used:**
- Supabase client for fetching user profile
- Various UI components for messaging and actions

**How it Works:**
- Fetches current user's profile from database
- Checks if status is pending, active, or rejected
- Shows appropriate message based on status:
  - Pending: Waiting for admin approval with next steps
  - Rejected: Access not approved with contact admin option
- Provides contact admin link with pre-filled email
- Provides sign out option

**Appearance:**
- Centered layout with vertical spacing
- Clear header and messaging
- Informational list for pending state explaining next steps
- Action buttons for contacting admin and signing out
- Clean, informative design focused on communication

### 28. Privacy Page (`/privacy`)

**File:** `src/app/privacy/page.tsx`

**Purpose:** Displays the privacy policy for the Skim service.

**Components Used:**
- Standard HTML-like JSX for policy content
- Links for navigation and external references

**How it Works:**
- Static page presenting privacy policy information
- Sections covering:
  - What data is collected
  - How data is used
  - Third-party services involved
  - Contact information for questions/deletion requests
- Link back to login page

**Appearance:**
- Standard content page layout
- Clear section headers and body text
- Proper typography for readability
- Links styled as cyan blue with hover underline
- Constrained width for optimal line length
- Generous padding for comfortable reading

### 29. Supabase Test Page (`/supabase-test`)

**File:** `src/app/supabase-test/page.tsx`

**Purpose:** Diagnostic page for testing Supabase connectivity.

**Components Used:**
- Supabase client for database operations
- React useEffect for running test on mount
- Console logging for results

**How it Works:**
- Client component that runs test on mount
- Queries articles table for count using Supabase client
- Logs result and any errors to browser console
- Simple UI indicating to check console

**Appearance:**
- Minimal page with heading and instruction
- Primarily intended for development/diagnostic use
- Not meant for end-user interaction

## Shared Layout Components

Several components are used across multiple pages for consistent appearance:

### AppShell (`src/components/layout/AppShell.tsx`)
- Provides overall page structure
- Includes navigation, theme toggles, and user menu
- Handles responsive layout behavior

### PageContainer (`src/components/layout/PageContainer.tsx`)
- Provides consistent padding and max-width constraints
- Accepts size and className props for variation

### PageHeader (`src/components/layout/PageHeader.tsx`)
- Provides consistent page titles, descriptions, and optional actions
- Used on most content pages

### ThemeToggle (`src/components/layout/ThemeToggle.tsx`)
- Allows switching dashboard theme from navbar/user menu
- Synchronizes with theme store

### Loading Skeleton Components
- Various `*Skeleton.tsx` components for placeholder loading states
- Used in digest feeds and other list views

## Design System

The dashboard follows a cohesive design system documented in `Design.md`:

**Color Palette:**
- Primary Cyan: `#06b6d4` (used for accents, links, interactive elements)
- Background: Dark canvas `#0f1419` (default) with light alternative
- Foreground: Text colors appropriate for background
- Muted: Subdued colors for secondary information
- Various semantic colors (success, warning, error)

**Typography:**
- Font: Inter (from Google Fonts)
- Clear hierarchy: headings, body, labels, captions
- Responsive sizing

**Spacing and Layout:**
- Consistent 4px-based spacing system
- Responsive breakpoints for mobile/tablet/desktop
- Card-based design with elevation and hover effects
- Clean, minimal aesthetic with purposeful use of color

**Interaction Patterns:**
- Hover lifts and color changes for interactive elements
- Clear focus states for accessibility
- Loading skeletons for perceived performance
- Toast notifications for transient feedback
- Modal-less design using inline expansion/collapsing

This structure provides a polished, professional user experience while maintaining the technical sophistication of the underlying RAG and agent systems.