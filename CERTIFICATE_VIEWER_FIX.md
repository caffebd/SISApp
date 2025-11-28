# Certificate Viewer Fix - Standard Certificate Support

## Issue Description

When viewing issued standard certificates (e.g., Solid Fuel Sweep Certificate), the certificate viewer page was not displaying the certificate form fields. Only the Business Details, Customer Details, and Appliance Details sections were showing, with an empty "Certificate Data" section.

This issue only affected **standard certificates** (stored as JSON templates) and not **user-created certificates** (built with the Certificate Builder).

## Root Cause

The certificate viewer's `renderFieldValue()` function only supported legacy field types from the Certificate Builder:
- `textbox`
- `inputbox`
- `checkbox`
- `dropdown`

It did **not** support the new standard certificate field types:
- `text-header`
- `text-input`
- `text-area`
- `date-input`

When standard certificates were viewed, the function couldn't render these field types, resulting in blank fields.

## Solution Implemented

### 1. Updated `renderFieldValue()` Function

**File**: `app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`

Added support for standard certificate field types:

```typescript
case "text-header":
  return null; // Headers are rendered separately

case "text-input":
case "text-area":
case "date-input":
  return field.value || "";
```

Also updated existing cases to check `field.value` property (used by standard certificates):

```typescript
case "inputbox":
  return props.userInput || props.defaultValue || field.value || "";

case "checkbox":
  const isChecked = props.userInput ?? props.defaultValue ?? field.value ?? false;

case "dropdown":
  return props.userInput || props.defaultValue || field.value || "";
```

### 2. Added Section Header Rendering

Standard certificates use `text-header` elements for section titles (e.g., "A. Customer Details", "B. Appliance Details"). Added special rendering logic:

```typescript
if (field.type === "text-header") {
  const text = field.properties.text || "";
  const isSectionHeader = /^[A-Z]\.\s/.test(text); // Matches "A. ", "B. ", etc.

  if (isSectionHeader) {
    return (
      <div className="mt-4 mb-2 pt-3 border-t border-gray-200">
        <h3 className="text-sm font-bold text-gray-900">{text}</h3>
      </div>
    );
  } else {
    return (
      <div className="text-xs font-medium text-gray-700 mb-1">
        {text}
      </div>
    );
  }
}
```

### 3. Added Signature Display

Added a new "Signatures" section to display engineer and customer signatures:

```typescript
{certificate.signatures &&
  (certificate.signatures.engineer || certificate.signatures.customer) && (
    <div className="border-2 border-gray-300 rounded p-3 mb-4">
      <h2 className="text-sm font-bold text-gray-900 mb-3">Signatures</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Engineer and Customer signature display */}
      </div>
    </div>
  )}
```

Signatures are rendered differently based on type:
- **Drawn signatures**: Displayed as `<img>` with base64 data
- **Typed signatures**: Displayed as text with cursive font

### 4. Updated TypeScript Interface

Added signatures to the `CertificateData` interface:

```typescript
interface CertificateData {
  // ... other fields
  signatures?: {
    engineer?: {
      data: string;
      type: "drawn" | "typed";
    } | null;
    customer?: {
      data: string;
      type: "drawn" | "typed";
    } | null;
  };
}
```

## Testing Checklist

- [x] View standard certificate (Solid Fuel Sweep) - all fields display
- [x] View user-created certificate - still works (backward compatibility)
- [x] Section headers render with proper styling
- [x] Drawn signatures display correctly
- [x] Typed signatures display correctly
- [x] Certificates without signatures don't show empty section
- [x] Print preview includes all data
- [ ] PDF export includes signatures (future enhancement)

## Files Modified

1. `app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`
   - Updated `renderFieldValue()` function
   - Added section header rendering logic
   - Added signatures display section
   - Updated `CertificateData` interface

## Backward Compatibility

✅ **Fully backward compatible**

- Legacy certificates (built with Certificate Builder) continue to work
- Both `props.userInput`/`props.defaultValue` (legacy) and `field.value` (standard) are checked
- Old field types (`textbox`, `inputbox`, etc.) still supported

## Visual Result

### Before Fix
- Business Details: ✅ Visible
- Customer Details: ✅ Visible
- Appliance Details: ✅ Visible
- Certificate Data: ❌ Empty/Blank
- Signatures: ❌ Not shown

### After Fix
- Business Details: ✅ Visible
- Customer Details: ✅ Visible
- Appliance Details: ✅ Visible
- Certificate Data: ✅ All sections and fields visible
  - Section headers (A, B, C, etc.) with proper styling
  - All form fields with labels and values
- Signatures: ✅ Displayed if present

## Future Enhancements

1. **PDF Export**: Include signatures in generated PDFs
2. **Signature Timestamps**: Show when signatures were added
3. **Email Integration**: Send certificates with signatures via email
4. **Mobile Optimization**: Improve signature display on smaller screens
5. **Signature Verification**: Add verification/authentication layer

## Related Documentation

- `SIGNATURE_IMPLEMENTATION.md` - Details on digital signature feature
- `data/certificates/standard/README.md` - Standard certificate templates
- `data/certificates/standard/SOLID-FUEL-SWEEP-LAYOUT.md` - Solid Fuel Sweep structure

---

**Status**: ✅ Fixed and Tested
**Date**: 2025
**Impact**: Critical - Enables viewing of all standard certificates