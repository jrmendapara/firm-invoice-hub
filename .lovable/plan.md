

# GSTIN Auto-Fetch Implementation

## What This Does
When you enter a GSTIN number in the Company or Customer creation form and click "Fetch from GST", the system will automatically look up the taxpayer details from the GST portal and fill in the form fields (name, address, city, state, pincode, PAN).

## Changes

### 1. New Backend Function: `fetch-gstin`
- Receives a GSTIN, validates the format, and calls the GST portal's public taxpayer search API
- Returns mapped fields: trade name, legal name, address, city, state code, pincode
- Handles errors gracefully (invalid GSTIN, portal down, taxpayer not found)
- No API key needed -- uses the GST portal's public search endpoint

### 2. Company Form (`Companies.tsx`)
- Add a "Fetch from GST" button next to the GSTIN input
- On click: calls the backend function, auto-fills name, legal name, address, city, state, pincode, and PAN (extracted from GSTIN characters 3-12)
- Shows loading state and error messages via toast notifications

### 3. Customer Form (`Customers.tsx`)
- Add a "Fetch from GST" button next to the GSTIN input (visible only for "Registered" customer type)
- On click: auto-fills trade name, legal name, address, city, state, pincode
- Same loading/error handling

### 4. Config Update
- Register the new `fetch-gstin` function in the backend configuration

## Technical Details

**Field Mapping from GST Portal Response:**

| GST Portal Field | Maps To |
|---|---|
| `tradeNam` | Company Name / Trade Name |
| `lgnm` | Legal Name |
| `pradr.addr` (building + street + locality) | Address |
| `pradr.addr.dst` | City |
| `pradr.addr.stcd` | State Code |
| `pradr.addr.pncd` | Pincode |
| GSTIN chars 3-12 | PAN (Company form only) |

**Files created:**
- `supabase/functions/fetch-gstin/index.ts`

**Files modified:**
- `src/pages/Companies.tsx` -- add fetch button + auto-fill logic
- `src/pages/Customers.tsx` -- add fetch button + auto-fill logic
- `supabase/config.toml` -- register new function

