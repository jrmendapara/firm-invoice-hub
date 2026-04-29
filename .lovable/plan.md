## UI Audit & Improvement Plan

After reading every page (Dashboard, Invoices, Customers, Items, SalesRegister, InvoiceCreate, InvoiceView, Companies, Users, Auth) and the design primitives (Button, Card, Input, Sidebar, AppLayout, `index.css`, `tailwind.config.ts`), here is what's working and what to improve.

### What's working
- Clean dark sidebar with company switcher and clear active state.
- Consistent page header pattern (title + actions on right).
- Indian formatting helpers (INR, dates, words) already in place.
- Auth screen has a nice gradient/glass treatment.

### What feels off (root causes)
1. **Flat, "spreadsheet-y" feel** — `--radius: 0rem`, `Card` and `Input` use `rounded-none`, `Button` uses `rounded-none` with a dark zinc default. Everything looks like a 1990s data-entry app, which clashes with the modern gradient sidebar and Auth page.
2. **Low-contrast surfaces** — background `0 0% 94%`, card `0 0% 92%`, border `0 0% 55%`. Cards barely separate from the page; the layout's `bg-zinc-200` topbar adds another near-identical gray.
3. **No visual hierarchy on Dashboard** — 4 stat cards all look identical; no color, no trend, no icon emphasis. Recent invoices is a plain list.
4. **Tables are dense and monochrome** — no zebra striping, no row hover accent, no sticky header, status pills use raw Tailwind colors (`bg-green-100`) that ignore the design tokens.
5. **Page headers are inconsistent** — Dashboard uses `text-2xl font-display`, Invoices/Items use the same but with different spacing. No breadcrumbs, no subtitle pattern.
6. **Mobile gaps** — Tables force `min-w-[860–980px]` horizontal scroll with no card fallback (only Invoices has a separate `InvoiceMobileView`). Action buttons in headers wrap awkwardly on small screens.
7. **Forms in dialogs** — All inputs are square with hairline borders on a near-white card; labels/inputs lack breathing room; primary CTAs are full-width dark slabs.
8. **Empty states** — Mostly a single muted line ("No invoices yet"). No illustration, no CTA inside the empty state card.
9. **Auth page** — Looks great on desktop but the left brand panel hides on mobile, leaving a plain card on a dark gradient. Card itself still has square corners and inputs.
10. **Topbar** — `bg-zinc-200` strip with only a sidebar trigger feels empty; no page title, no quick actions, no user avatar on mobile.

---

## Proposed Changes

### 1. Design tokens (`src/index.css`, `tailwind.config.ts`)
- Set `--radius: 0.625rem` so cards/inputs/buttons get a soft, modern radius (keep the option to override per-component).
- Lighten background to `0 0% 98%`, raise card to pure `0 0% 100%`, soften border to `220 13% 88%`. This produces real card elevation without changing the dark sidebar.
- Add semantic status tokens: `--status-final`, `--status-draft`, `--status-cancelled` (paired bg + fg), so pills stop using raw `bg-green-100` strings.
- Add a subtle elevation utility (`shadow-sm` default for cards) and a `--ring` accent that matches the sidebar blue (`220 65% 55%`) for focus states across the app.

### 2. Primitives
- **Button**: switch default radius from `rounded-none` to `rounded-md`, default variant to the brand blue (matches sidebar active state) instead of zinc-800; outline variant uses white bg + neutral border. Add a soft `shadow-sm` on default/destructive.
- **Card**: remove `rounded-none`, use `rounded-xl border-border/70 bg-card shadow-sm`.
- **Input**: switch to `rounded-md`, use `bg-background` (not hardcoded white), increase height to `h-10` for better touch targets.
- **Badge/Status pill**: introduce a small `<StatusBadge status="final|draft|cancelled" />` component used by Dashboard, Invoices, SalesRegister so styling lives in one place.

### 3. AppLayout / Topbar
- Replace the bare `bg-zinc-200` strip with a real header: sidebar trigger + current page title (derived from route) + a right-aligned slot for company name (mobile) and user menu.
- Make the topbar `bg-card border-b` with `h-14`, sticky, blurred (`backdrop-blur`).
- Increase content padding consistency: `p-4 md:p-6 lg:p-8 max-w-7xl mx-auto`.

### 4. Dashboard
- Give each stat card a tinted icon chip (blue / emerald / violet / amber) and a small "delta" line ("This month").
- Recent Invoices: turn into a compact table with the new StatusBadge and a "View all" link to `/invoices`.
- Add a "Quick actions" row: New Invoice, Add Customer, Add Item, Open Sales Register.
- Improve the "no company selected" empty state with an illustration block and a primary CTA linking to `/companies`.

### 5. Tables (Invoices, Customers, Items, SalesRegister)
- Add zebra striping (`even:bg-muted/30`), sticky header (`sticky top-0 bg-card`), and stronger row hover (`hover:bg-accent/60`).
- Right-align all numeric columns (already partially done) and use a tabular-nums utility so amounts line up.
- Replace inline color pills with the new StatusBadge.
- Add a results count + active filter chips above SalesRegister.
- Pagination or virtualized scroll is out of scope — just polish.

### 6. Mobile responsiveness
- For Customers, Items, SalesRegister: when `useIsMobile()` is true, render a stacked Card list (label + value pairs) instead of horizontal-scroll tables (mirror the existing `InvoiceMobileView` pattern).
- Page-header action buttons: collapse "Import Excel + New" into a single dropdown menu on mobile so the header doesn't wrap.
- Increase tap targets (`h-10` minimum) on icon buttons.

### 7. Forms / Dialogs
- Standardize spacing: `space-y-5` between field groups, `space-y-1.5` between label and input.
- Make dialog headers have a small subtitle line.
- For the customer dialog, group fields under "Identity", "Address", "Contact" subheadings (the form is long and currently flat).
- Sticky footer inside `DialogContent` for the primary save button so it's always visible while scrolling.

### 8. Auth page
- Soft-rounded inputs/buttons, add a "Show password" toggle, add inline validation for email format and password length.
- On mobile, replace the hidden brand panel with a compact brand strip above the card (logo + product name + 1-line tagline) so the screen feels intentional rather than empty.

### 9. Empty states
- Add a tiny `<EmptyState icon title description action />` component used by tables and Dashboard. Removes the lonely "No invoices found" line.

### 10. Print / Invoice view
- Out of scope for this pass beyond ensuring the new tokens don't break the print layout (`InvoicePrintView` already uses inline styles).

---

### Technical details
- New shared components: `src/components/ui/status-badge.tsx`, `src/components/common/EmptyState.tsx`, `src/components/common/PageHeader.tsx`.
- Token changes only in `src/index.css`; no Tailwind config change needed beyond ensuring `radius` cascades.
- Touch ~10 files: `index.css`, `button.tsx`, `card.tsx`, `input.tsx`, `AppLayout.tsx`, `Dashboard.tsx`, `Invoices.tsx`, `Customers.tsx`, `Items.tsx`, `SalesRegister.tsx`, `Auth.tsx`. Logic untouched — visual/markup only.
- Existing TS build errors in `AuthContext.tsx`, `Invoices.tsx`, `Items.tsx` (status/item_type are typed as string unions) are pre-existing and unrelated to the UI work; I'll fix them in passing where I touch those files.

### Out of scope (ask if you want them)
- New charts on Dashboard (revenue over time, top customers).
- Dark-mode toggle for the main app (sidebar is already dark; only `.dark` token block exists).
- A redesigned print template.

### Suggested order of implementation
1. Tokens + Button/Card/Input primitives + StatusBadge.
2. AppLayout topbar + PageHeader component.
3. Dashboard refresh.
4. Tables polish + mobile card fallbacks.
5. Auth page mobile + form polish.
