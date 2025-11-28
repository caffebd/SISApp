# Certificate Type Handling - Standard vs User-Created

## Overview
The certificate system supports two types of certificates with different rendering approaches:
1. **Standard Certificates** - Predefined templates with complex two-column layout
2. **User-Created Certificates** - Custom templates with simple single-column layout

---

## Problem Solved
When fixing the standard certificate viewer for the Solid Fuel Sweep certificate, we broke user-created certificates. The standard certificate viewer uses specific field IDs for filtering and layout, which don't exist in user-created certificates, causing all fields to be filtered out.

---

## Solution Approach

### Detection Method
Certificates are identified by checking:
```typescript
const isStandard = certificate.templateId?.startsWith("standard-") || certificate.isStandard === true;
```

### Conditional Rendering
- **If standard:** Use complex two-column layout with specialized field filtering
- **If user-created:** Use simple single-column layout showing all fields

---

## Standard Certificates

### Characteristics
- **Template ID:** Starts with `"standard-"` (e.g., `"standard-solid-fuel-sweep"`)
- **Source:** JSON files in `data/certificates/standard/`
- **Flag:** `isStandard: true` in template JSON
- **Field Types:** `text-header`, `text-input`, `text-area`, `date-input`, `checkbox`, `dropdown`
- **Field IDs:** Specific predefined IDs (e.g., `section-customer`, `sweeping-method`, etc.)

### Layout
```
┌─────────────┬─────────────┬─────────────┐
│  Business   │  Customer   │  Appliance  │ (3 columns)
├─────────────┴─────────────┴─────────────┤
│  Sweeping Info     │  Visual Checks     │ (2 columns)
│  Re-sweep Rec.     │  CO Alarm Comments │
├─────────────────────┴─────────────────────┤
│  Business | Engineer | Cert Number      │
│  Customer |          | Date             │
│  Engineer Signature | Customer Signature │
└─────────────────────────────────────────┘
```

### Special Features
- Field filtering by specific IDs
- Section headers with letter prefixes (A-G)
- 2×4 condition checks grid
- Two-column certificate fields layout
- Sign-off section with specialized formatting

---

## User-Created Certificates

### Characteristics
- **Template ID:** Custom string (e.g., `"abc123xyz"`)
- **Source:** Firebase `USERS/{userId}/Certificates` collection
- **Flag:** `isStandard: false` or undefined
- **Field Types:** Legacy types - `textbox`, `inputbox`, `checkbox`, `dropdown`
- **Field IDs:** Generic or user-defined

### Layout
```
┌─────────────┬─────────────┬─────────────┐
│  Business   │  Customer   │  Appliance  │ (3 columns)
├─────────────────────────────────────────┤
│  All Certificate Fields                 │ (1 column)
│  (displayed in order, no filtering)     │
│                                         │
├─────────────────────────────────────────┤
│  Engineer Signature | Customer Signature │
└─────────────────────────────────────────┘
```

### Special Features
- No field filtering (all fields shown)
- Simple sequential display
- Basic label: value formatting
- Standard signature section

---

## Implementation

### 1. Certificate Interface
Added flags to track certificate type:

```typescript
interface CertificateData {
  // ... other fields
  templateId: string;
  isStandard?: boolean;
}
```

**Files:**
- `app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`
- `firebase-functions/src/generateCertificatePDF.ts`

### 2. Certificate Issuance
When issuing a certificate, save the `isStandard` flag:

```typescript
const certificateToSave = {
  // ... other fields
  templateId: selectedTemplate.id,
  isStandard: selectedTemplate.isStandard || false,
};
```

**File:** `app/admin/contacts/[id]/certificates/new/page.tsx`

### 3. Certificate Viewer
Conditional rendering based on certificate type:

```typescript
{certificate.templateId?.startsWith("standard-") || certificate.isStandard ? (
  /* Standard Certificate: Two Column Layout */
  <div className="grid grid-cols-2 gap-2 mb-2">
    {/* Complex filtering and specialized rendering */}
  </div>
) : (
  /* User-Created Certificate: Simple Single Column Layout */
  <div className="border border-gray-300 rounded p-3 mb-2">
    {certificate.fields.map(field => renderField(field))}
  </div>
)}
```

**File:** `app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`

### 4. PDF Generation
Separate HTML generation functions:

```typescript
function generateCertificateHTML(certificate, businessDetails) {
  const isStandard = certificate.templateId?.startsWith("standard-") || 
                     certificate.isStandard === true;
  
  if (!isStandard) {
    return generateUserCreatedCertificateHTML(...);
  }
  
  // Generate standard certificate HTML with two-column layout
  return standardCertificateHTML;
}
```

**File:** `firebase-functions/src/generateCertificatePDF.ts`

---

## Key Differences

| Feature | Standard Certificate | User-Created Certificate |
|---------|---------------------|-------------------------|
| Layout | Two-column | Single-column |
| Filtering | Field ID based | None (show all) |
| Section Headers | With letter prefixes | Simple headers |
| Checks Grid | 2×4 specialized grid | Normal display |
| Field Types | New types (text-header, etc.) | Legacy types (textbox, etc.) |
| Complexity | High | Low |

---

## Benefits of This Approach

✅ **Preserves Standard Certificate Features** - Complex layout remains intact
✅ **Enables User-Created Certificates** - Simple layout works for any structure
✅ **No Breaking Changes** - Standard certificates continue to work perfectly
✅ **Backward Compatible** - Existing certificates without flag default to user-created
✅ **Easy Detection** - Simple check determines rendering path
✅ **Maintainable** - Two separate code paths, each optimized for its use case

---

## Testing

### Standard Certificate (Solid Fuel Sweep)
1. Issue certificate
2. Verify two-column layout in viewer
3. Verify 2×4 checks grid displays
4. Verify section headers without letter prefixes
5. Download PDF - should match viewer exactly
6. Print - should match viewer and PDF

### User-Created Certificate (Custom)
1. Create custom template in certificate builder
2. Issue certificate from custom template
3. Verify single-column layout in viewer
4. Verify all fields display in order
5. Download PDF - should match viewer exactly
6. Print - should match viewer and PDF

---

## Migration Notes

### Existing Certificates
- Certificates issued before this update don't have `isStandard` or `templateId` starting with "standard-"
- They will be treated as user-created certificates (safe fallback)
- If they were actually standard certificates, re-issue them to get proper layout

### New Certificates
- All new certificates automatically get the correct `isStandard` flag
- Standard templates from JSON have `isStandard: true`
- User templates from Firebase have `isStandard: false`

---

## File Changes

### Front-End
1. **`app/admin/contacts/[id]/certificates/new/page.tsx`**
   - Line ~423: Save `isStandard` flag with certificate data

2. **`app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`**
   - Line ~56: Add `isStandard` to interface
   - Line ~731: Conditional rendering (standard vs user-created)

### Back-End
3. **`firebase-functions/src/generateCertificatePDF.ts`**
   - Line ~11: Add `templateId` to interface
   - Line ~34: Add `isStandard` to interface
   - Line ~98: Check certificate type
   - Line ~180: Branch to user-created HTML generator
   - Line ~880: New function `generateUserCreatedCertificateHTML()`

---

## Troubleshooting

### Standard Certificate Shows Single Column
- Check `templateId` starts with "standard-"
- Check `isStandard` is `true` in Firestore
- Verify template JSON has `"isStandard": true`

### User-Created Certificate Shows Nothing
- Check fields are not being filtered
- Verify rendering path goes to single-column layout
- Check `isStandard` is `false` or `undefined`

### PDF Doesn't Match Viewer
- Verify both use same detection logic
- Check cloud function is updated and deployed
- Verify certificate data includes `templateId` and `isStandard`

---

## Future Enhancements

### Possible Improvements
1. Add certificate type badge in viewer ("Standard" / "Custom")
2. Migration tool to mark existing standard certificates
3. Add more standard certificate types with specialized layouts
4. Create preview mode showing which layout will be used
5. Add certificate type filter in certificate list

---

## Summary

The certificate system now intelligently handles both standard and user-created certificates by:
1. **Detecting** certificate type using `templateId` or `isStandard` flag
2. **Routing** to appropriate renderer (complex vs simple)
3. **Preserving** standard certificate features (two-column, checks grid, etc.)
4. **Enabling** user-created certificates with simple flexible layout

This approach maintains the sophisticated layout for standard certificates while providing a simple, reliable rendering path for custom user-created certificates.

---

**Status:** ✅ Deployed and Working  
**Version:** 2.2  
**Date:** 2024  
**Deployment:** Both front-end and cloud function updated