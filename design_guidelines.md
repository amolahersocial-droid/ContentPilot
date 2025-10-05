# Design Guidelines: SEO Content SaaS Platform

## Design Approach

**Selected Approach:** Design System with Modern SaaS Patterns

Drawing inspiration from productivity SaaS leaders like Linear, Notion, and Asana, combined with Material Design principles for data-heavy interfaces. This platform requires clean, efficient workflows for managing complex SEO content operations across multiple sites and dashboards.

**Key Design Principles:**
- **Clarity over decoration**: Information density without visual clutter
- **Workflow efficiency**: Minimize clicks, maximize productivity
- **Data hierarchy**: Clear visual distinction between primary and secondary information
- **Status transparency**: Always visible usage limits, publishing states, and system health
- **Professional credibility**: Enterprise-grade polish suitable for B2B SaaS

---

## Core Design Elements

### A. Color Palette

**Dark Mode Primary (Default):**
- Background Base: 220 15% 8% (deep slate)
- Surface Elevated: 220 12% 12% (card backgrounds)
- Surface Accent: 220 10% 16% (hover states)
- Border Subtle: 220 10% 20% (dividers)
- Border Interactive: 220 15% 30% (focus states)

**Brand Colors:**
- Primary: 260 60% 55% (vibrant purple - CTAs, active states)
- Primary Hover: 260 60% 50%
- Success: 142 70% 45% (published posts, successful operations)
- Warning: 38 90% 55% (pending reviews, approaching limits)
- Error: 0 70% 55% (failed validations, blocked actions)

**Text Colors:**
- Primary Text: 220 10% 95%
- Secondary Text: 220 8% 70%
- Muted Text: 220 8% 50%
- Placeholder: 220 8% 35%

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Text Primary: 220 12% 12%
- Borders: 220 10% 88%

### B. Typography

**Font Families:**
- Primary: 'Inter', -apple-system, system-ui, sans-serif (UI, body text)
- Monospace: 'Fira Code', 'Courier New', monospace (API keys, code snippets)

**Type Scale:**
- Display: 32px/40px, font-weight 700 (dashboard headers)
- Heading 1: 24px/32px, font-weight 600 (section titles)
- Heading 2: 20px/28px, font-weight 600 (card headers)
- Heading 3: 16px/24px, font-weight 600 (subsection titles)
- Body Large: 16px/24px, font-weight 400 (primary content)
- Body: 14px/20px, font-weight 400 (standard text)
- Caption: 12px/16px, font-weight 500 (labels, metadata)
- Small: 11px/16px, font-weight 500 (helper text)

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: gap-2, p-2 (table cells, compact lists)
- Standard spacing: gap-4, p-4 (cards, forms)
- Generous spacing: gap-8, p-8 (sections, dashboard panels)
- Section spacing: py-12, py-16, py-20 (major divisions)

**Grid System:**
- Dashboard: 12-column grid with 24px gutters
- Sidebar: Fixed 280px width (collapsible on mobile)
- Main content: flex-1 with max-w-7xl container
- Cards: Grid with responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

### D. Component Library

**Navigation & Structure:**
- **Sidebar Navigation:** Fixed left sidebar with icon + label, active state with purple accent bar, collapsible sections for multi-level menus
- **Top Bar:** Breadcrumbs, global search, notification bell, user avatar dropdown, current plan badge
- **Tabs:** Underline style with purple indicator, used for dashboard sections (Overview, Keywords, Content Queue, Sites)

**Data Display:**
- **Data Tables:** Zebra striping (subtle), sortable columns, row actions on hover, pagination controls, selectable rows with checkboxes
- **Stat Cards:** Large number display with label, trend indicator (↑/↓ with percentage), sparkline micro-charts, color-coded by status
- **Progress Bars:** Usage limits (thin 4px bars), multi-segment for plan tiers, color transitions at threshold points (70% yellow, 90% red)
- **Status Badges:** Pill-shaped with dot indicator, semantic colors (Draft/Warning, Published/Success, Failed/Error, Scheduled/Info)
- **Keyword Score Cards:** Large score circle (0-100), difficulty meter, search volume with abbreviations (10K, 1.5M)

**Forms & Inputs:**
- **Text Fields:** Dark backgrounds (220 10% 16%), purple focus rings, floating labels on focus, inline validation with icons
- **Select Dropdowns:** Custom styled with search, multi-select with chips, grouped options for site selection
- **Toggle Switches:** Purple active state, labels on both sides for clarity
- **Rich Text Editor:** Toolbar with formatting options, live preview, word count, readability score display
- **API Key Inputs:** Monospace font, show/hide toggle, copy button, validation status indicator

**Content Generation Interface:**
- **Keyword Selector:** Multi-select dropdown with search, selected keywords as removable chips, keyword score visible in dropdown
- **Content Preview Panel:** Side-by-side editor and preview, SEO score breakdown (readability, keyword density, meta tags), collapsible sections
- **Image Generator:** Thumbnail grid, regenerate button per image, alt text editor inline, DALL-E prompt preview

**Admin Dashboard Specific:**
- **User Management Table:** Expandable rows for site details, quick actions (suspend, upgrade plan), search and filter bar
- **Revenue Charts:** Line/bar charts with date range selector, plan breakdown pie chart, MRR/ARR display cards
- **System Health Panel:** Real-time job queue status, API rate limits with progress bars, error logs table with severity levels

**Actions & Feedback:**
- **Primary Buttons:** Solid purple (260 60% 55%), medium height (h-10), rounded (rounded-lg), font-weight 600
- **Secondary Buttons:** Outline style with purple border, transparent background
- **Danger Buttons:** Solid red for destructive actions (delete site, cancel subscription)
- **Toast Notifications:** Slide in from top-right, auto-dismiss, action button for undo/details, icon + message format
- **Loading States:** Skeleton screens for data tables, spinner for button actions, progress bar for long operations (content generation)

**Modals & Overlays:**
- **Modal Dialogs:** Centered with backdrop blur, rounded-xl corners, close icon top-right, footer with action buttons
- **Slideouts:** Right-side panel for forms (new site connection, keyword research), overlay backdrop, 480px width
- **Tooltips:** Dark background, white text, arrow pointer, appear on hover with 200ms delay

### E. Animations

**Minimal & Purposeful:**
- Page transitions: Fade in 150ms for content loading
- Button clicks: Scale 0.98 on active state (duration-100)
- Hover states: Smooth color transitions (transition-colors duration-200)
- Dropdown menus: Slide down with fade (translate-y-2 to translate-y-0, 200ms)
- Modal overlays: Backdrop fade + content scale (scale-95 to scale-100, 300ms)

**No continuous animations** - all motion is response to user interaction.

---

## Dashboard-Specific Layouts

### User Dashboard
**Hero Section:** Full-width stat banner with 4 cards (Sites Connected, Posts Published This Month, Keywords Tracked, Plan Usage), gradient background (subtle purple tint)

**Main Content:** Tab navigation (Overview | Keywords | Content Queue | Sites | Backlinks), each tab loads content in main area without page reload

**Keyword Management Page:** Search bar + filters at top, data table with columns (Keyword, Volume, Difficulty, Score, Actions), bulk actions toolbar, "Add Keyword" CTA button (purple, prominent)

**Content Queue:** Kanban-style columns (Draft | Scheduled | Published | Failed), drag-to-reorder cards, each card shows post title, target keyword, SEO score badge, thumbnail, scheduled time

### Admin Dashboard
**Global Overview:** Large KPI cards (Total Users, Active Subscriptions, MRR, Content Generated Today), revenue chart below, recent user activity feed on right sidebar

**User Management:** Searchable table with filters (Plan, Status, Registration Date), expandable rows showing user's connected sites, inline actions (Edit Plan, Suspend, Refund)

---

## Images

**Dashboard Illustrations:**
- Empty states: Friendly illustrations for "No sites connected yet", "No keywords tracked", "Content queue is empty" - use simple line art style in purple accent colors
- Onboarding: Step-by-step guide with screenshots/illustrations showing how to connect first site

**Marketing/Landing Page (if needed):**
- Hero: Large screenshot of dashboard showing keyword management interface, subtle drop shadow, tilted perspective (3D effect)
- Feature sections: Smaller UI screenshots demonstrating specific features (content generation, SEO scoring, publishing workflow)

**No decorative images in functional dashboards** - prioritize data clarity and workflow efficiency.

---

## Accessibility

- WCAG 2.1 AA compliant contrast ratios for all text/background combinations
- Keyboard navigation: Tab through all interactive elements, Enter to activate, Escape to close modals
- Screen reader: ARIA labels for icons, role attributes for custom components, live regions for toast notifications
- Focus indicators: 2px purple outline (ring-2 ring-purple-500) on all interactive elements
- Color is never the only indicator: Use icons + text for status (not just color-coded badges)