

# GSTIN Auto-Fetch for Company & Customer Creation

## Overview
Add a "Fetch from GST" button on both the Company and Customer creation forms. When you enter a GSTIN and click the button, the system will fetch taxpayer details from the GST portal and auto-fill the form fields.

## How It Works

1. **Backend function** calls the GST portal's taxpayer search API (`https://services.gst.gov.in/services/api/search/taxpayerDetails`) with the GSTIN
2. The GST portal returns taxpayer details including trade name, legal name, address, state, pincode, and registration status
3. These details are mapped to the form fields automatically

## Field Mapping (GST Response to Form)

| GST Portal Field | Company Form Field | Customer Form Field |
|---|---|---|
| `tradeNam` | Company Name | Trade Name |
| `lgnm` | Legal Name | Legal Name |
| `gstin` | GSTIN | GSTIN |
| `pradr.addr` (building, street, locality) | Address Line 1 | Billing Address |
| `pradr.addr.dst` | City | Billing City |
| `pradr.addr.stcd` | State Code | Billing State Code |
| `pradr.addr.pncd` | Pincode | Billing Pincode |
| `ctb` (constitution of business) | -- | -- |
| `sts` (status: Active/Cancelled) | Validation check | Validation check |

PAN is extracted from GSTIN characters 3-12.

## Changes

### New Edge Function
**`supabase/functions/fetch-gstin/index.ts`**
- Accepts `{ gstin: string }` in POST body
- Validates GSTIN format
- Calls GST portal API to fetch taxpayer details
- Returns structured response with mapped fields
- Handles errors (invalid GSTIN, API down, taxpayer not found)

### Modified: `src/pages/Companies.tsx`
- Add a "Fetch from GST" button next to the GSTIN input field
- When clicked, calls the edge function and auto-fills: name, legal_name, address, city, state, pincode, PAN
- Shows loading spinner while fetching
- Shows error toast if GSTIN not found or API fails

### Modified: `src/pages/Customers.tsx`
- Add a "Fetch from GST" button next to the GSTIN input field (visible for "Registered" customer type)
- When clicked, auto-fills: trade_name, legal_name, address, city, state, pincode
- Same loading/error handling as Companies

### Updated: `supabase/config.toml`
- Add `verify_jwt = false` for the new `fetch-gstin` function (auth checked in code)

## Technical Notes
- The GST portal's public search API does not require authentication or captcha for basic taxpayer lookup
- The edge function acts as a proxy to avoid CORS issues (browser cannot call GST portal directly)
- If the GST portal is temporarily unavailable, the user can still manually enter details
- The fetched data pre-fills the form but remains editable before saving

