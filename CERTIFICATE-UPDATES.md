# Certificate Form Updates - December 2024

## Overview
Fixed certificate issuance form to display properly without duplicating fields and to dynamically show only relevant appliance details.

---

## Problems Fixed

### 1. ❌ Duplicate Customer/Appliance Sections
**Problem**: Customer and appliance details were shown twice:
- Once in the hardcoded sections at the top
- Again in the certificate form fields below

**Solution**: Removed the hardcoded sections. Customer and appliance details are now only shown within the certificate form itself, populated from the template's field definitions.

### 2. ❌ Static Appliance Fields
**Problem**: All appliance fields were always shown (location, type, manufacturer, model, fuel type), regardless of what the certificate actually needed.

**Solution**: Appliance fields are now dynamic and only show the fields defined in the certificate template. The form auto-populates these fields when an appliance is selected.

### 3. ❌ Confusing Form Layout
**Problem**: Using `CertificateBuilder` (a canvas-based drag-drop tool) caused:
- Empty boxes at absolute positions
- Overlapping elements
- Missing labels
- Unusable form fields

**Solution**: Created `CertificateFormRenderer` component that displays fields sequentially with proper form layout.

---

## Technical Changes

### New Component: `CertificateFormRenderer.tsx`

A form-based renderer that:
- ✅ Displays certificate elements in sequential flow (top to bottom)
- ✅ Auto-detects side-by-side fields (2-column grid)
- ✅ Renders proper labels, inputs, dropdowns, text areas, date pickers
- ✅ Identifies section headers (A., B., C.) and adds visual separation
- ✅ Handles all field types with appropriate styling

**Key Features**:
```typescript
- Groups elements by Y position (fields at same Y are rendered side-by-side)
- Sorts groups by Y position for proper top-to-bottom flow
- Detects section headers and adds borders/spacing
- Responsive 2-column grid for paired fields
```

### Updated: `CertificateBuilderTypes.ts`

Extended type definitions to support:
```typescript
export type ElementType =
  | "textbox"           // Original
  | "inputbox"          // Original
  | "checkbox"          // Original
  | "dropdown"          // Original
  | "text-header"       // NEW - Section headers/titles
  | "text-input"        // NEW - Single-line inputs
  | "text-area"         // NEW - Multi-line text
  | "date-input";       // NEW - Date pickers

interface FormElement {
  // ... existing fields
  properties: {
    // ... existing properties
    // NEW properties for headers:
    text?: string;
    fontSize?: number;
    alignment?: "left" | "center" | "right";
    bold?: boolean;
  };
  value?: any;  // NEW - stores field value
}
```

### Updated: `certificates/new/page.tsx`

**Removed**:
- Hardcoded "Customer Details" section
- Hardcoded "Appliance Details" section with all fields
- `certificateBuilderRef` (no longer needed)
- `CertificateBuilder` component usage

**Added**:
- Dynamic appliance selector (only shows if certificate has appliance fields)
- `certificateFields` state to track all form values
- Auto-population logic for customer/appliance fields
- Bidirectional sync between `certificateFields` and `certificateData`

**Smart Appliance Detection**:
```typescript
// Only show appliance selector if certificate needs it
selectedTemplate.elements.some(
  (el) => el.id.includes("appliance") || el.id.includes("fuel-type")
)
```

---

## How It Works Now

### 1. Certificate Selection
User selects a certificate template from sidebar → Form renders dynamically

### 2. Appliance Selector
- If certificate has appliance-related fields → Appliance selector appears
- If no appliance fields → No appliance selector shown
- User can add new appliances via "Add Appliance" button

### 3. Form Rendering
`CertificateFormRenderer` processes the template elements:

**Sequential Flow**:
```
Certificate Title (large, centered)
↓
Section A: Customer Details (header with border)
├─ [Customer Name]  [Telephone]      ← Side by side
├─ [Address]        [Postcode]       ← Side by side
└─ [Email]                           ← Full width
↓
Section B: Appliance Details (header with border)
├─ [Location]       [Type]           ← Side by side
├─ [Manufacturer]   [Model]          ← Side by side
└─ [Fuel Type]                       ← Full width
↓
Section C: Sweeping Information
└─ ... and so on
```

**Field Grouping Logic**:
- Elements at same Y position (±10px tolerance) = same row
- Multiple inputs on same row = 2-column grid
- Single element = full width
- Headers = full width with special styling

### 4. Auto-Population
When appliance is selected:
```typescript
handleApplianceSelect(applianceId)
  ↓
certificateData updated with appliance details
  ↓
Values passed to CertificateFormRenderer
  ↓
Form fields auto-populated
```

Customer fields auto-populate from contact data on page load.

### 5. Bidirectional Sync
When user edits a customer/appliance field in the form:
```typescript
onChange(elementId, value)
  ↓
certificateFields[elementId] = value
  ↓
If field is customer/appliance → also update certificateData
  ↓
Ensures both states stay in sync
```

### 6. Saving
```typescript
handleSaveCertificate()
  ↓
Combines certificateData + certificateFields
  ↓
Saves to Firestore: USERS/{userId}/contacts/{contactId}/issuedCertificates/
```

---

## Benefits

### For Users
✅ **No duplicate fields** - Each field appears once
✅ **Clean form layout** - Professional, easy-to-read flow
✅ **Only relevant fields** - Shows what the certificate needs
✅ **Auto-population** - Less typing, fewer errors
✅ **Visual hierarchy** - Clear sections with borders

### For Developers
✅ **Reusable component** - `CertificateFormRenderer` works with any template
✅ **Dynamic rendering** - No hardcoded fields
✅ **Type-safe** - Extended types support all field types
✅ **Maintainable** - Easy to add new field types
✅ **Consistent** - Same rendering logic for all certificates

### For Template Creators
✅ **Flexible** - Define any fields needed
✅ **No code changes** - Just edit JSON
✅ **Predictable** - Layout follows Y-position order
✅ **Professional** - Automatic formatting and spacing

---

## Field ID Conventions

For auto-population to work, use these field IDs in certificate templates:

### Customer Fields
```json
{
  "id": "customer-name",
  "id": "customer-address",
  "id": "customer-postcode",
  "id": "customer-telephone",
  "id": "customer-email"
}
```

### Appliance Fields
```json
{
  "id": "appliance-location",
  "id": "appliance-type",
  "id": "appliance-manufacturer",
  "id": "appliance-model",
  "id": "fuel-type"
}
```

Any field with these IDs will auto-populate and sync bidirectionally.

---

## Example: Solid Fuel Sweep Certificate

**Template Elements**: 28 fields
- 1 title header
- 7 section headers (A-G)
- 5 customer fields (auto-populated)
- 5 appliance fields (auto-populated when appliance selected)
- 10 certificate-specific fields (sweeping info, checks, comments, etc.)

**User Experience**:
1. Select "Solid Fuel Sweep Certificate" from sidebar
2. Appliance selector appears (because template has appliance fields)
3. Customer fields pre-filled from contact data
4. Select appliance → appliance fields populate
5. Fill remaining certificate-specific fields
6. Save → Complete certificate issued

**Result**: Clean, single-page form with no duplication.

---

## Testing Checklist

When creating/testing certificates:

- [ ] Certificate appears in "Standard Certificates" sidebar
- [ ] Appliance selector only shows if certificate needs appliances
- [ ] Customer fields auto-populate from contact
- [ ] Appliance fields auto-populate when appliance selected
- [ ] Section headers display with proper styling and borders
- [ ] Side-by-side fields render in 2-column grid
- [ ] Full-width fields span entire width
- [ ] Dropdowns show all options
- [ ] Date pickers work correctly
- [ ] Text areas have adequate height
- [ ] Required fields marked with asterisk (*)
- [ ] Form validates before saving
- [ ] Certificate saves successfully to Firestore
- [ ] No duplicate fields appear
- [ ] No overlapping elements

---

## Future Enhancements

### Phase 1 (Completed) ✅
- Dynamic form rendering
- Auto-population of customer/appliance fields
- Remove duplicate sections
- Clean, professional layout

### Phase 2 (Planned)
- [ ] Multi-select buttons/checkboxes instead of text inputs
- [ ] Modal for preset comment options
- [ ] Auto-generate certificate numbers
- [ ] Digital signature integration
- [ ] Photo upload fields
- [ ] Conditional field visibility (show/hide based on other values)

### Phase 3 (Future)
- [ ] Multi-page certificate support
- [ ] Print preview before saving
- [ ] PDF generation at issuance time
- [ ] Real-time field validation
- [ ] Auto-save drafts
- [ ] Certificate templates marketplace

---

## Related Files

### Core Components
- `app/components/CertificateFormRenderer.tsx` - Form field renderer
- `app/components/CertificateBuilderTypes.ts` - Type definitions
- `app/admin/contacts/[id]/certificates/new/page.tsx` - Certificate issuance page

### Standard Certificates
- `data/certificates/standard/index.ts` - Certificate exports
- `data/certificates/standard/solid-fuel-sweep.json` - Example certificate
- `data/certificates/standard/README.md` - Documentation
- `data/certificates/standard/SOLID-FUEL-SWEEP-LAYOUT.md` - Layout guide

### Supporting Components
- `app/components/ApplianceModal.tsx` - Add/edit appliances
- `app/components/SignatureModal.tsx` - Digital signatures (future use)

---

## Migration Notes

### Existing Certificates
Old certificates created before this update will still work:
- Stored in Firestore under `USERS/{userId}/contacts/{contactId}/issuedCertificates/`
- May have been created with `CertificateBuilder` (canvas-based)
- Will display correctly when viewed (viewer unchanged)

### New Certificates
All new certificates use:
- `CertificateFormRenderer` for issuance
- Sequential form layout
- Auto-population where applicable
- Dynamic appliance field detection

No migration required - both systems coexist.

---

**Last Updated**: December 2024  
**Affected Version**: Current production build  
**Breaking Changes**: None (backward compatible)  
**Status**: ✅ Implemented and tested