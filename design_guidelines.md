# OMR Sheet Tracker - Design Guidelines

## Design Approach
**System**: Material Design principles adapted for educational productivity
**References**: Google Classroom dashboard layouts, Notion's clean forms, Linear's data tables
**Rationale**: Information-dense educational tool requiring clear hierarchy, efficient data entry, and scannable activity displays

## Typography System
**Font Family**: Inter or Roboto via Google Fonts
- Page Titles: 2xl/3xl, semibold
- Section Headers (Physics/Chemistry/Biology): xl, semibold
- Question Numbers: base, medium
- Status Labels: sm, medium
- Body Text: base, regular
- Helper Text: sm, regular
- User Names in Activity Feed: base, semibold
- Timestamps: xs/sm, regular

## Spacing System
Use Tailwind units: **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6 or p-8
- Section gaps: gap-8 or gap-12
- Form field spacing: space-y-4
- Card margins: m-4 or m-6
- Button padding: px-6 py-3

## Layout Structure

### Authentication Pages
Full-viewport centered card (max-w-md) with Replit Auth integration
- Logo/app name at top
- Welcome message
- Sign-in buttons stacked vertically with generous spacing (space-y-4)
- Footer with app description

### Main Dashboard Layout
**Two-column responsive grid** (grid-cols-1 lg:grid-cols-3)
- Left sidebar (lg:col-span-1): User profile card, quick stats, navigation
- Main content (lg:col-span-2): OMR sheet form or activity feed

### OMR Sheet Form
Single-column layout (max-w-4xl mx-auto) with:
- Name input field (prominent, full-width)
- Three subject sections in sequence (not tabs)
- Each section: header with subject name + icon placeholder, 8-question grid below
- Question grid: 2 columns on mobile (grid-cols-2), 4 columns on desktop (grid-cols-4)
- Submit button: full-width on mobile, max-w-xs centered on desktop

### Activity Feed
Card-based list layout (space-y-4):
- Each submission card: horizontal layout with user avatar, name, subject completion bars, timestamp
- Filter controls at top: dropdown for subject filter, date range picker
- Pagination at bottom

## Component Specifications

### Question Status Toggle
Compact card component for each question:
- Question number (circle badge or simple text)
- Two-state toggle: "Done" / "Not Done" (checkbox or toggle switch)
- Conditional reveal: If "Done" selected, show secondary toggle "Practiced" / "Not Practiced"
- Visual states: unchecked (subtle border), checked (filled)
- Size: min-h-24, adequate touch target (min 44x44px)

### Subject Section Cards
Bordered container with:
- Header: subject name + icon from Heroicons (AcademicCap, Beaker, variants)
- Grid of 8 question components
- Section summary: "X/8 Done, Y Practiced" at bottom
- Spacing: p-6, gap-4 between questions

### Progress Indicators
Horizontal bar charts showing completion:
- Total questions done (24 max)
- Per-subject breakdown (8 max each)
- Practice rate percentage
- Simple filled bars with labels, not complex charts

### User Profile Card
Compact card (sidebar) with:
- Avatar placeholder (circular, 64x64)
- User name (large, semibold)
- Total submissions count
- Average completion rate
- "View All Activity" link

### Activity Feed Item
Horizontal card layout:
- Left: avatar (40x40)
- Center: user name, "completed OMR sheet", timestamp stacked
- Right: three mini progress bars (P/C/B) with numbers
- Clickable to expand/view details

### Data Tables (Optional History View)
Standard table with:
- Headers: Date, Physics, Chemistry, Biology, Total, Practice Rate
- Rows: sortable, alternating subtle background
- Responsive: stack to cards on mobile

### Navigation
Top app bar (fixed or sticky):
- App logo/name (left)
- Primary nav links: Dashboard, New Sheet, Activity, Profile
- User menu (right): avatar + dropdown
- Mobile: hamburger menu

## Interaction Patterns
- **Instant feedback**: Toggle states change immediately without page reload
- **Auto-save drafts**: Optional background save every 30 seconds
- **Submission confirmation**: Modal or toast notification after submit
- **Loading states**: Skeleton screens for activity feed, spinners for actions
- **Empty states**: Friendly illustrations/icons with "Create your first sheet" CTA

## Accessibility
- All toggles keyboard accessible (tab navigation, space/enter to toggle)
- Clear focus indicators (ring-2 ring-offset-2)
- Labels for all form inputs
- ARIA labels for icon-only buttons
- Color not sole indicator (use icons + text for Done/Practiced states)

## Responsive Breakpoints
- Mobile: Single column, stacked sections, larger touch targets
- Tablet (md:): Two-column question grids, sidebar remains stacked
- Desktop (lg:): Three-column dashboard, four-column question grids

## Visual Hierarchy
1. Primary: OMR sheet form (largest visual weight)
2. Secondary: Activity feed and stats
3. Tertiary: Navigation and user profile
4. Use size, weight, spacing—not colors—to establish hierarchy

**Icons**: Use Heroicons via CDN for consistency
**Forms**: Standard input fields with clear labels above, helper text below
**Buttons**: Primary (filled), Secondary (outlined), sizes: sm, base, lg
**Cards**: Subtle borders, rounded corners (rounded-lg), shadow on hover for interactive cards