# PDF Generation Fixed - Certificate Download Matching Viewer

## Problem
The PDF download function (`generateCertificatePDF`) was using an old template that didn't match the certificate viewer at `/admin/contacts/[id]/certificates/[certificateId]`. This resulted in:

- Different layout (old 3-column vs new 2-column with sections)
- Missing signature rendering
- Missing 2×4 condition checks grid
- Missing proper appliance fields (ventilation, CO alarm present)
- Different styling and spacing
- Downloaded PDFs didn't show the certificate as users saw it on screen

## Solution
Completely rewrote the `generateCertificateHTML` function in `firebase-functions/src/generateCertificatePDF.ts` to match the viewer's exact layout.

## Changes Made

### 1. Layout Structure
**Old:** Three-column layout with all certificate fields in one section
**New:** 
- Three info boxes at top (Business | Customer | Appliance)
- Two-column certificate fields layout (Left: Sweeping + Resweep | Right: Checks + CO Alarm)
- Dedicated sign-off section
- Signature display section
- Footer

### 2. Appliance Fields
Added support for all appliance fields visible in viewer:
- Location
- Type
- Manufacturer
- Model
- Fuel Type
- Ventilation Present (Yes/No)
- CO Alarm Present (Yes/No)

### 3. Field Filtering
Implemented proper field filtering to match viewer:

**Left Column:**
- Section C: Sweeping Information (fuels used, sweeping method, deposits, additional info)
- Section F: Re-sweep Recommendation

**Right Column:**
- Section D: Visual/Condition Checks (2×4 grid)
- Section E: CO Alarm Comments

### 4. Condition Checks Grid
Special rendering for the 8 condition check fields in a 2×4 grid:
- Terminal Condition
- Chimney Pot Condition
- Obstructions Found
- Smoke Evacuation
- Ventilation Adequate
- CO Alarm Installed
- Fire Safety Concerns
- General Appliance Condition

Split into two columns (4 checks each) to save vertical space.

### 5. Sign-Off Section
Three-row layout matching viewer:
1. Business Name | Engineer Name | Certificate Number
2. Customer Name | (empty) | Date
3. Signatures (Engineer | Customer)

### 6. Signature Rendering
Full support for digital signatures:
- **Drawn signatures:** Rendered as images from data URLs
- **Typed signatures:** Rendered in cursive font
- Proper styling with bordered containers
- Labels above each signature

### 7. Styling Improvements
- Reduced font sizes and spacing to fit A4 landscape
- Consistent border styles (1px solid #d1d5db)
- Proper text colors (#111827 for values, #374151 for labels)
- Section headers with top borders
- Optimized padding (4px standard, 8px for page)

### 8. CSS Classes
Organized CSS classes for clarity:
- `.info-boxes` - Top 3-column grid
- `.columns` - Two-column certificate fields
- `.section-header` - Section titles (with letter prefix removed)
- `.field` - Individual field rendering
- `.checks-grid` - 2×4 condition checks
- `.signoff-section` - Engineer/customer sign-off
- `.signatures` - Signature display grid
- `.footer` - Bottom footer text

## Technical Details

### HTML Structure
```
certificate-page
├── header (Title + Reference)
├── info-boxes (Business | Customer | Appliance)
├── columns (Left fields | Right fields)
├── signoff-section
│   ├── signoff-row (Business, Engineer, Cert #)
│   ├── signoff-row (Customer, Empty, Date)
│   └── signatures (Engineer | Customer)
└── footer
```

### Field Type Support
Both legacy and standard template field types:
- Legacy: `textbox`, `inputbox`, `checkbox`, `dropdown`
- Standard: `text-header`, `text-input`, `text-area`, `date-input`, `checkbox`, `dropdown`

### Section Header Processing
- Detects section headers by regex: `/^[A-Z]\.\s/`
- Strips letter prefix (e.g., "C. " from "C. Sweeping Information")
- Special handling for Section D (Visual Checks) to render 2×4 grid

## Deployment

### Build and Deploy
```bash
cd firebase-functions
npm run build
firebase deploy --only functions:generateCertificatePDF
```

### Important: Collection Paths
The function uses the correct Firestore collection paths:
- User templates: `USERS/{userId}/Certificates` (capital C)
- Issued certificates: `USERS/{userId}/contacts/{contactId}/issuedCertificates` (lowercase)

This matches the front-end implementation.

### Environment
- Region: `europe-west2`
- Memory: `2GiB`
- Timeout: `60 seconds`
- Uses `@sparticuz/chromium` and `puppeteer-core` for PDF generation

## Testing Checklist

### Test Standard Certificate (Solid Fuel Sweep)
1. ✅ Issue a certificate with all fields filled
2. ✅ Add CO Alarm preset comments
3. ✅ Add engineer signature (drawn or typed)
4. ✅ Add customer signature (drawn or typed)
5. ✅ View certificate in browser
6. ✅ Download PDF
7. ✅ Verify PDF matches browser view:
   - Layout matches (2 columns, 3 info boxes)
   - All fields present and correct
   - Signatures render correctly
   - 2×4 checks grid displays properly
   - Section headers show without letter prefixes
   - Spacing and fonts look good

### Test Legacy Certificate
1. ✅ Issue a user-built certificate (legacy template)
2. ✅ Download PDF
3. ✅ Verify backward compatibility

### Test Edge Cases
- ✅ Certificate without signatures
- ✅ Certificate without appliance details
- ✅ Certificate with only engineer signature
- ✅ Certificate with only customer signature
- ✅ Long text in text areas (CO Alarm Comments)
- ✅ Business logo loading (or graceful fallback if missing)

## Files Modified
- `firebase-functions/src/generateCertificatePDF.ts` - Complete rewrite of HTML generation
  - Fixed collection path: `issuedCertificates` (not `Certificates`)
  - Fixed collection path: `contacts` (not `Contacts`)
  - Updated HTML structure to match viewer exactly
  - Added signature rendering (drawn + typed)
  - Implemented 2×4 condition checks grid
  - Added two-column certificate fields layout

## Related Documentation
- `PDF_GENERATION_UPDATE_NEEDED.md` - Original plan (now obsolete)
- `SIGNATURE_IMPLEMENTATION.md` - Signature feature details
- `CERTIFICATE_VIEWER_FIX.md` - Viewer fixes that PDF now matches
- `CERTIFICATE_LAYOUT_FINAL.md` - Final layout specifications

## Result
✅ PDF downloads now exactly match the certificate viewer
✅ All fields, signatures, and layout elements render correctly
✅ Fits on single A4 landscape page
✅ Professional appearance ready for customer distribution

---

**Status:** ✅ COMPLETED  
**Date:** 2024  
**Function:** `generateCertificatePDF` (Cloud Function)