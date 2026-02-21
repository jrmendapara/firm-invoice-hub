

# Implementation Plan: Super Admin Promotion, Sales Register, PDF Invoice, User Management

This plan covers 4 major features plus the super admin promotion, broken into clear steps.

---

## 1. Promote First User to Super Admin

Since no users have signed up yet, we will:
- Add a database trigger that automatically promotes the **very first user** who signs up to `super_admin` role (instead of the default `user` role)
- This is a one-time migration -- after the first user signs up, all subsequent users get the default `user` role
- Alternative: After you sign up, we run a SQL update to promote your account

**Approach**: Modify the `handle_new_user` function to check if any users exist. If this is the first user, assign `super_admin` instead of `user`.

---

## 2. Sales Register Report Page with Excel Export

**New page**: `src/pages/SalesRegister.tsx`

Features:
- Company selection (auto-uses selected company from context)
- Date range filter (from/to date pickers)
- Customer filter dropdown
- Status filter (All / Active / Cancelled / Draft)
- GST type filter (All / B2B / B2C)

**Report table columns**:
Date, Invoice No, Customer Name, GSTIN, State, Taxable Value, CGST, SGST, IGST, Total Tax, Invoice Total, Status

**Summary row** at the bottom with column totals

**Excel export** using the `xlsx` library (SheetJS):
- Install `xlsx` package
- Export filtered data as .xlsx with formatted headers, column widths, and summary totals
- Filename format: `Sales_Register_{CompanyName}_{FromDate}_to_{ToDate}.xlsx`

**Routing**: Add `/sales-register` route and sidebar nav link

---

## 3. PDF Invoice Generation

**Approach**: Use browser's built-in `window.print()` with a dedicated print-optimized invoice view, avoiding heavy PDF library dependencies.

**New components**:
- `src/components/invoice/InvoicePrintView.tsx` -- A4-formatted GST tax invoice layout
- `src/pages/InvoiceView.tsx` -- Invoice detail page with Print/Download button

**PDF layout includes**:
- Company logo (from `company-logos` storage bucket), name, GSTIN, address
- "TAX INVOICE" header
- Invoice number, date, place of supply
- Customer details: name, GSTIN, billing/shipping address
- Line items table: S.No, Description, HSN/SAC, Qty, Unit, Rate, Discount, Taxable Value, CGST, SGST, IGST, Total
- Rate-wise tax summary table
- Total in figures and words (Indian numbering)
- Bank details for payment
- Declaration text ("We declare that this invoice shows the actual price...")
- Authorized signatory block with company signatory name
- Print CSS for A4 page formatting

**Routing**: Add `/invoices/:id` route; clicking an invoice row navigates to this view

---

## 4. User Management Admin Page

**Full rebuild of** `src/pages/UsersManagement.tsx`

Features:
- **User list table**: Shows all users (from profiles table), their roles, assigned companies, and status
- **Create user**: Admin creates a new user by entering email and password (uses Supabase admin invite or signup flow via edge function)
- **Assign company access**: Multi-select companies for each user with granular permissions:
  - Can create invoice
  - Can edit invoice
  - Can cancel invoice
  - Can export
  - Can view reports
- **Role management**: Set user role (user / admin / super_admin -- super_admin only for super admins)
- **Activate/deactivate** users
- **Reset password** capability

**Edge function**: `supabase/functions/manage-users/index.ts`
- Create new users server-side using the service role key
- Reset passwords
- This is needed because client-side cannot create users on behalf of others

**Database**: An admin RLS policy for profiles INSERT is needed so admins can create profiles for new users.

---

## 5. Route & Navigation Updates

- Add "Sales Register" to sidebar nav (under Main section)
- Add `/sales-register` and `/invoices/:id` routes to App.tsx
- Update invoice list rows to link to `/invoices/:id`

---

## Technical Details

### New dependencies:
- `xlsx` (SheetJS) -- for Excel export

### New files:
| File | Purpose |
|------|---------|
| `src/pages/SalesRegister.tsx` | Sales register report with filters and Excel export |
| `src/pages/InvoiceView.tsx` | Invoice detail view with print/PDF |
| `src/components/invoice/InvoicePrintView.tsx` | A4 print-optimized invoice layout |
| `supabase/functions/manage-users/index.ts` | Edge function for admin user creation |

### Modified files:
| File | Changes |
|------|---------|
| `src/App.tsx` | Add new routes |
| `src/components/layout/AppSidebar.tsx` | Add Sales Register nav link |
| `src/pages/UsersManagement.tsx` | Complete rebuild with user CRUD |
| `src/pages/Invoices.tsx` | Link rows to invoice view |

### Database migrations:
1. Update `handle_new_user()` to promote first user to super_admin
2. Add admin INSERT policy on profiles (for creating user profiles)

### Execution order:
1. Database migration (first-user promotion + policies)
2. Edge function for user management
3. All frontend pages (can be done in parallel)
4. Route and navigation updates

