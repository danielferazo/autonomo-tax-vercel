# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Autonomo Tax Prep
**Generated:** 2026-04-09
**Category:** Spanish Government Tax Forms (Agencia Tributaria)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Background | `#F5F0E8` | `--color-bg` | Beige paper background (like official forms) |
| Surface | `#FFFFFF` | `--color-surface` | Cards, inputs |
| Header Dark | `#1A1A2E` | `--color-header` | Casilla headers (dark navy like tax forms) |
| Header Light | `#F0E6D3` | `--color-header-light` | Alternating row headers |
| Primary | `#2D3748` | `--color-primary` | Primary text |
| Secondary | `#4A5568` | `--color-secondary` | Secondary text |
| Muted | `#718096` | `--color-muted` | Helper text |
| CTA | `#22C55E` | `--color-cta` | Submit buttons, positive actions |
| Amount Owed | `#DC2626` | `--color-debt` | Red for amounts owed (Modelo 303/130) |
| Amount Credit | `#16A34A` | `--color-credit` | Green for refunds/credits |
| USD Blue | `#2563EB` | `--color-usd` | USD-related values, FX rates |
| Warning Yellow | `#F59E0B` | `--color-warning` | Missing Date Paid warnings |
| Info Purple | `#7C3AED` | `--color-info` | Invoices in different quarters |
| Border | `#D4C5B0` | `--color-border` | Beige-tinted borders |
| Border Dark | `#A89F91` | `--color-border-dark` | Darker borders for headers |

### Typography

- **Heading Font:** IBM Plex Sans
- **Body Font:** IBM Plex Sans
- **Monospace (Numbers):** IBM Plex Mono (for casilla values, currency amounts)
- **Mood:** Professional, financial, trustworthy, government official
- **Google Fonts:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |

---

## Component Specs

### Casilla (Tax Form Box)

The core component mimicking Agencia Tributaria forms.

```css
.casilla {
  background: var(--color-surface);
  border: 1px solid var(--color-border-dark);
}

.casilla-header {
  background: var(--color-header);
  color: white;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-sm) var(--space-md);
}

.casilla-number {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 700;
  font-size: 0.875rem;
}

.casilla-value {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 1.125rem;
  text-align: right;
  padding: var(--space-sm) var(--space-md);
}

.casilla-value.negative {
  color: var(--color-debt);
}

.casilla-value.positive {
  color: var(--color-credit);
}
```

### Buttons

```css
/* Primary Button - Green CTA */
.btn-primary {
  background: var(--color-cta);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-family: 'IBM Plex Sans', sans-serif;
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-border);
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Danger Button */
.btn-danger {
  background: var(--color-debt);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
}
```

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### Inputs

```css
.input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  font-family: 'IBM Plex Sans', sans-serif;
  background: white;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 55, 72, 0.1);
}

/* Monospace input for numbers/currency */
.input-mono {
  font-family: 'IBM Plex Mono', monospace;
  text-align: right;
}

/* USD indicator */
.input-usd {
  border-color: var(--color-usd);
  background: #EFF6FF;
}
```

### Select (Dropdown)

```css
.select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  font-family: 'IBM Plex Sans', sans-serif;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234A5568'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}
```

### Tables (Tax Form Style)

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'IBM Plex Sans', sans-serif;
}

.table-header {
  background: var(--color-header);
  color: white;
}

.table-header th {
  padding: var(--space-sm) var(--space-md);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
}

.table-row:nth-child(even) {
  background: var(--color-header-light);
}

.table-row:hover {
  background: #E8E0D0;
}

.table-cell {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.table-cell.mono {
  font-family: 'IBM Plex Mono', monospace;
  text-align: right;
}
```

### Banner / Alert

```css
.banner {
  padding: var(--space-md) var(--space-lg);
  border-radius: 6px;
  font-family: 'IBM Plex Sans', sans-serif;
}

.banner-warning {
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  color: #92400E;
}

.banner-info {
  background: #EDE9FE;
  border: 1px solid #7C3AED;
  color: #5B21B6;
}

.banner-success {
  background: #D1FAE5;
  border: 1px solid #16A34A;
  color: #065F46;
}

.banner-error {
  background: #FEE2E2;
  border: 1px solid #DC2626;
  color: #991B1B;
}
```

### Quarter/Year Selector

```css
.quarter-selector {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.quarter-badge {
  background: var(--color-header);
  color: white;
  padding: var(--space-xs) var(--space-md);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 150ms ease;
}

.quarter-badge.active {
  background: var(--color-cta);
}

.year-selector {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
}
```

---

## Style Guidelines

**Style:** Paper Form Aesthetic (Agencia Tributaria inspired)

- **Background:** Beige (#F5F0E8) like official Spanish tax forms
- **Headers:** Dark navy (#1A1A2E) mimicking paper form section headers
- **Numbers:** IBM Plex Mono for all currency amounts and casilla values
- **Color Coding:**
  - Red (#DC2626) = amounts owed
  - Green (#16A34A) = refunds/credits
  - Blue (#2563EB) = USD-related values
  - Yellow (#F59E0B) = warnings
  - Purple (#7C3AED) = informational

### Page Structure

1. **Header Bar:** Logo/title, NIF display, quarter/year selectors, user menu
2. **Main Content:** Tabbed navigation (Invoices, Expenses, Modelo 303, Modelo 130, Summary)
3. **Forms:** Card-based with beige backgrounds
4. **Casillas:** Grid layout mimicking official tax forms

---

## Anti-Patterns (Do NOT Use)

- ❌ Dark mode (paper forms are light)
- ❌ Non-monospace numbers for currency values
- ❌ emojis as icons — Use SVG icons (Heroicons, Lucide)
- ❌ Missing `cursor-pointer` on clickable elements
- ❌ Layout-shifting hovers
- ❌ Low contrast text
- ❌ Instant state changes (always 150-300ms transitions)
- ❌ `console.log` statements in production

### Additional Forbidden

- ❌ System fonts instead of IBM Plex Sans
- ❌ Random icon sizes (use 20px or 24px standard)
- ❌ Colors as sole indicator (always combine with text/icons)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] IBM Plex Mono used for all currency/number displays
- [ ] Red/Green colors only for debt/credit amounts
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] No `console.log` statements in production code
