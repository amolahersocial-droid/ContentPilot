# Design Guidelines: Enterprise SEO Content SaaS Platform

## Design Approach

**Selected Approach:** Hybrid - Material Design System + Industry Leader Inspiration

Drawing from enterprise SaaS leaders: Linear (workflow efficiency), Ahrefs (data density), HubSpot (dashboard polish), and SEMrush (analytics sophistication). This platform demands professional credibility and visual mastery to compete at the enterprise level.

**Key Design Principles:**
- **Enterprise polish**: Pixel-perfect execution with sophisticated micro-interactions
- **Data transparency**: Advanced visualizations that reveal insights at a glance
- **Workflow mastery**: Multi-step processes feel effortless and guided
- **Professional trust**: Visual language that conveys reliability and expertise
- **Information density**: Show more without overwhelming

---

## Core Design Elements

### A. Color Palette

**Dark Mode Primary:**
- Background Base: 222 15% 6%
- Surface Elevated: 222 12% 10%
- Surface Accent: 222 10% 14%
- Border Subtle: 222 8% 18%
- Border Interactive: 222 15% 28%

**Brand & Accent Colors:**
- Primary Purple: 262 65% 58%
- Primary Hover: 262 65% 52%
- Secondary Blue: 210 85% 60% (analytics, charts)
- Success Green: 142 70% 48%
- Warning Amber: 38 92% 58%
- Error Red: 0 72% 58%
- Info Cyan: 190 85% 55% (backlink metrics)

**Text Hierarchy:**
- Primary: 222 10% 96%
- Secondary: 222 8% 72%
- Tertiary: 222 8% 52%
- Disabled: 222 8% 32%

**Chart Palette (Analytics):**
- Series 1: 262 65% 58% (purple)
- Series 2: 210 85% 60% (blue)
- Series 3: 142 70% 48% (green)
- Series 4: 38 92% 58% (amber)
- Series 5: 190 85% 55% (cyan)

### B. Typography

**Font Families:**
- UI/Body: 'Inter', system-ui, sans-serif
- Display: 'Inter', with tighter letter-spacing (-0.02em)
- Mono: 'JetBrains Mono', monospace

**Type Scale:**
- Hero Display: 48px/56px, weight 700, tracking -0.02em
- Dashboard Title: 32px/40px, weight 700
- Section Header: 24px/32px, weight 600
- Card Header: 18px/26px, weight 600
- Subheading: 16px/24px, weight 600
- Body Large: 16px/24px, weight 400
- Body: 14px/20px, weight 400
- Caption: 13px/18px, weight 500
- Label: 12px/16px, weight 600, uppercase, tracking 0.05em

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24, 32

**Grid Architecture:**
- Main Layout: Sidebar (280px fixed) + Content (flex-1 max-w-[1600px])
- Dashboard Grid: 12-column with 24px gaps
- Card Grids: 1/2/3 column responsive (grid-cols-1 md:grid-cols-2 xl:grid-cols-3)
- Analytics Panels: 8-column nested grids for complex layouts

### D. Component Library

**Navigation & Chrome:**
- **Sidebar:** Fixed, collapsible, icon labels, active state with purple gradient bar, nested dropdowns for site switching
- **Top Command Bar:** Global search (⌘K), breadcrumbs, notification center, plan badge, user menu
- **Sub-navigation:** Horizontal tabs with purple indicator, secondary actions right-aligned
- **Site Switcher:** Dropdown with search, site favicons, quick stats per site

**Advanced Data Display:**
- **Analytics Dashboard:** Multi-metric cards with sparklines, comparison periods, trend arrows, percentage changes in colored pills
- **Keyword Research Table:** Sortable columns (Keyword, Volume, Difficulty, CPC, SERP Features), expandable rows for SERP analysis, bulk action toolbar, export dropdown
- **Content Calendar:** Month/week/day views, drag-drop scheduling, color-coded by post status, hover previews
- **Backlink Campaign Manager:** Pipeline stages (Prospecting → Outreach → Negotiation → Live), kanban cards with domain authority, response rate metrics, email thread preview
- **SEO Score Gauge:** Circular progress (0-100), color gradient (red→amber→green), breakdown sections (Content, Technical, Backlinks, UX)
- **Competitor Analysis Grid:** Side-by-side metrics cards, diff indicators, ranking position charts

**Content Generation Workflow:**
- **Step Wizard:** Progress indicator (4 steps), persistent sidebar, next/back navigation, save draft at any step
- **AI Prompt Builder:** Multi-select keyword chips, tone selector (Professional/Casual/Technical), length slider, custom instructions textarea
- **Content Editor:** Rich text with formatting toolbar, live SEO score panel, readability metrics, AI enhancement suggestions, image insertion with DALL-E panel
- **Preview Panel:** Mobile/tablet/desktop toggle, live rendering, meta tag preview (Google SERP simulator)

**Forms & Inputs:**
- **Input Fields:** Dark surface backgrounds, purple focus rings (ring-2 ring-purple-500/50), floating labels, inline validation icons, helper text below
- **Advanced Selects:** Multi-select with chips, search filter, grouped options, keyboard navigation
- **Date Range Picker:** Calendar popup, preset ranges (Last 7/30/90 days, This month/quarter), custom range input
- **API Configuration:** Code editor with syntax highlighting, test connection button, credential vault dropdown

**Enterprise Dashboard Widgets:**
- **Revenue Dashboard:** MRR/ARR cards, revenue chart with plan breakdown, churn rate metrics, expansion revenue tracking
- **User Activity Feed:** Real-time stream, user avatars, action descriptions, timestamps, grouped by type
- **System Health Monitor:** Service status indicators (API, Queue, Database), response time graphs, error rate alerts
- **Content Performance Heatmap:** Calendar view with post volume, engagement metrics on hover, click to drill down

**Actions & Overlays:**
- **Primary Buttons:** Solid purple, h-10, rounded-lg, weight 600, hover lift (shadow-lg)
- **Ghost Buttons:** Transparent with hover fill, used for secondary actions
- **Icon Buttons:** 40px square, hover background, tooltips on all icons
- **Modal Dialogs:** Max-w-2xl, backdrop blur-md, slide-fade animation, sticky footer with actions
- **Slide Panels:** Right-edge, 640px width, for forms and detail views
- **Command Palette:** Searchable actions (⌘K), recent items, keyboard shortcuts
- **Toast System:** Top-right stack, auto-dismiss 5s, action buttons, progress bar for loading states

### E. Animations

**Purposeful Motion:**
- Page loads: Content fade-in stagger (100ms delay per section)
- Table rows: Slide-in on scroll (transform translate-y)
- Charts: Draw-in animation on mount (800ms ease-out)
- Hover cards: Subtle lift (translateY(-2px) + shadow, 200ms)
- Button clicks: Scale pulse (0.95 → 1, 150ms)
- Modals: Backdrop fade + content scale (300ms ease-out)
- Drag-drop: Smooth reorder with spring physics

**No ambient animations** - all motion tied to user interaction or data updates.

---

## Images

**Marketing Landing Page:**
- **Hero Section:** Full-width screenshot (1440x800px) showing main dashboard with keyword research table and analytics charts, subtle purple gradient overlay, 3D perspective tilt (8deg rotation)
- **Feature Showcases:** UI screenshots for each major feature (content editor, backlink outreach, analytics), Mac browser window frame, shadow-2xl depth
- **Social Proof:** Customer logos grid (grayscale, colored on hover), testimonial cards with headshots

**Application Empty States:**
- **No Sites Connected:** Illustration of connected nodes/sites, purple accent color, call-to-action button below
- **Empty Content Queue:** Document stack illustration with sparkles (AI theme)
- **No Backlinks:** Chain link illustration, outreach envelope graphic
- Use simple line art style, consistent visual language

**Dashboard Visualizations:**
- All charts use live data rendering (no static images)
- Screenshots only for onboarding tutorials and help documentation

---

## Data Visualization Standards

**Chart Types:**
- Line charts: Smooth curves for trends, dotted comparison periods
- Bar charts: Rounded corners, gradient fills, grouped for plan comparisons
- Donut charts: Center metric display, hover segment highlighting
- Heatmaps: Color scale with legend, cell tooltips
- Sparklines: Micro-charts in table cells, gradient fills

**Interaction Patterns:**
- Hover tooltips: Dark background, precise data point, timestamp
- Zoom controls: Date range brush selection
- Legend toggles: Click to show/hide series
- Export actions: Download CSV/PNG from chart toolbar

**Performance Metrics:**
- Traffic gauges: Radial progress with target line
- Ranking positions: Vertical timeline with position changes
- Conversion funnels: Stepped bar chart with drop-off rates

---

## Accessibility & Polish

- WCAG AA contrast ratios (all text 4.5:1 minimum)
- Keyboard shortcuts displayed in tooltips (⌘K, ⌘S, ESC, etc.)
- Focus indicators: 2px purple ring on all interactive elements
- Loading skeletons match final content layout
- Error states include recovery actions, not just error messages
- Success confirmations with undo option where applicable
- All icons paired with labels or tooltips
- Screen reader announcements for dynamic content updates

---

## Enterprise Differentiators

**Trust Signals:**
- Real-time sync indicators (last updated timestamps)
- Data source badges (Google Search Console verified, Ahrefs API)
- Compliance badges (SOC 2, GDPR) in footer
- Uptime status page link in header

**Professional Polish:**
- Consistent 8px border-radius on cards
- Uniform shadow elevations (shadow-sm/md/lg/xl)
- Smooth transitions on all state changes
- No layout shifts during loading
- Optimistic UI updates (immediate feedback, background sync)