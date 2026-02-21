
# GST Sales Invoice & Sales Register Export System

## Phase 1: Foundation & Core Invoicing (Initial Build)

### 1. Database Setup (Lovable Cloud)
- **Companies table**: name, legal name, GSTIN, PAN, address, state/state code, email, mobile, invoice prefix, bank details, signatory name, logo, financial year settings, status
- **Customers table**: GSTIN, trade/legal name, contact person, billing & shipping address, state/state code, mobile, email, customer type (Registered/Unregistered/Export/SEZ), linked company
- **Items table**: name, HSN/SAC, unit, GST rate, default price, type (Goods/Services), description, linked company
- **Invoices table**: company, customer, invoice number, date, place of supply, reverse charge flag, e-way bill, vehicle/LR number, payment terms, due date, status (Draft/Final/Cancelled), discount, round-off, totals
- **Invoice Items table**: item details, qty, rate, discount, taxable value, CGST/SGST/IGST amounts, total
- **Invoice Tax Summary table**: rate-wise GST breakup per invoice
- **Audit Logs table**: user, action, entity, timestamp, details

### 2. Authentication & Roles
- Email/password login via Supabase Auth
- **Roles**: Super Admin, Admin, User (stored in separate user_roles table)
- **User-Company Access table**: maps users to permitted companies with granular permissions (create/edit/cancel invoice, export, view reports)
- Role-based route protection throughout the app
- Company-level data isolation via RLS policies

### 3. Company Management (Admin Panel)
- Create/edit companies with all GST-required fields
- Logo upload via Supabase Storage
- Invoice prefix & financial year configuration
- Activate/deactivate companies
- Map users to companies with specific permissions

### 4. User Management (Admin Panel)
- Create users with login credentials
- Assign company access (single or multiple)
- Set granular permissions per company
- Activate/deactivate users, reset passwords

### 5. Customer Management
- Customer creation form with GSTIN format validation (15-char alphanumeric pattern)
- Support for Registered, Unregistered, Export, SEZ customer types
- Prevent duplicate GSTIN within same company
- Allow same customer across different companies
- Search by name, GSTIN, or mobile with autocomplete

### 6. Product/Item Master
- Create items with HSN/SAC, unit, GST rate, default price
- Autocomplete search in invoice entry
- Allow custom line items not in master

### 7. Sales Invoice Creation (Core Feature)
- **Invoice header**: Auto-populated company details, auto-generated invoice number (with manual override option), date picker (DD-MM-YYYY), customer selection with autocomplete, place of supply, billing/shipping addresses
- **Line items**: Item search/autocomplete, HSN/SAC, qty, unit, rate, line-wise discount, auto-calculated taxable value and GST
- **GST Logic**: 
  - Compare company state code vs customer/place of supply state code
  - Intra-state → CGST + SGST (split equally)
  - Inter-state → IGST (full amount)
  - Support standard GST rates: 0%, 5%, 12%, 18%, 28%
  - Rate-wise tax summary table
- **Invoice-level**: Invoice-wise discount, round-off, total in figures and words (Indian number system - lakhs/crores)
- **Actions**: Save as draft, finalize, edit (with permission check), soft cancel with audit trail, duplicate/copy invoice

### 8. Invoice PDF Generation
- GST Tax Invoice format on A4 layout
- Company logo, name, GSTIN, address
- Customer details and GSTIN
- Itemized table with HSN, qty, rate, tax breakup
- Rate-wise tax summary
- Total in words
- Declaration text and authorized signatory block
- Print-friendly design

### 9. Sales Register & Excel Export
- Filterable report: company, date range, customer, invoice number, GST type (B2B/B2C), status
- Columns: date, invoice no, customer, GSTIN, state, taxable value, CGST, SGST, IGST, total tax, invoice total, status
- Summary totals row
- Grouping by month/customer/tax rate
- Export to .xlsx with clean formatting for accounting use
- Option for item-wise detail export

### 10. Dashboard
- Company-wise summary cards: total invoices, total sales, GST collected, pending drafts
- Recent invoices list
- Quick action buttons: New Invoice, Add Customer, Export Register
- Company selector for users with multi-company access

## Phase 2: Advanced Features (Future Iterations)
- GSTIN auto-fetch API integration
- GSTR-1 outward supply summary report
- E-invoice and E-way bill integration placeholders
- Credit note / Debit note
- Payment receipt entry and outstanding tracking
- Financial year locking
- Email/WhatsApp invoice sharing
- Dark mode
- Data backup/restore tools

## UI/UX Approach
- Clean, professional UI suited for CA/accounting offices
- Desktop-first design, mobile-usable
- Keyboard-friendly invoice entry (tab navigation, hotkeys)
- Indian date format (DD-MM-YYYY) and INR (₹) currency formatting
- Dropdown search/autocomplete for customers and items
- Responsive tables with sorting and filtering
- Comprehensive input validations (GSTIN format, mandatory fields, numeric checks, date range checks)
