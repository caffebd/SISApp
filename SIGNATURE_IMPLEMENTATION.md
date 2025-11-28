# Digital Signature Implementation for Certificates

## Overview

Digital signature functionality has been successfully implemented in the certificate issuance flow, allowing both engineers and customers to sign certificates either by drawing their signature or typing their name.

## Implementation Date

Implemented: [Current Date]

## Files Modified

### 1. `app/admin/contacts/[id]/certificates/new/page.tsx`
- Added `SignatureModal` import
- Added state management for signatures:
  - `showSignatureModal`: Controls modal visibility
  - `signatureTarget`: Tracks which signature is being captured ('engineer' or 'customer')
  - `engineerSignature`: Stores engineer signature data and type
  - `customerSignature`: Stores customer signature data and type
- Added `handleSignatureSave()` function to process signature data from modal
- Updated certificate save logic to include signatures in Firestore document
- Added signature UI section in the form with:
  - Two signature boxes (Engineer and Customer)
  - Visual preview of captured signatures
  - "Change" button to update existing signatures
  - Purple-themed styling to differentiate from other sections

### 2. `app/components/SignatureModal.tsx`
- Reused existing signature modal component from invoice flow
- Supports two modes:
  - **Draw Mode**: Canvas-based signature drawing with mouse
  - **Type Mode**: Text input with cursive font styling
- Features:
  - Clear canvas functionality for drawn signatures
  - Real-time preview
  - Validation (disabled save button until signature is provided)
  - Modal overlay with backdrop click to close

### 3. `data/certificates/standard/solid-fuel-sweep.json`
- Removed placeholder text: "Note: Digital signature functionality will be added"
- Kept `customer-signature-name` field for reference but signatures are now captured digitally

## How It Works

### User Flow

1. **Engineer fills out certificate form** including all required fields
2. **In Section G (Engineer & Customer Sign-Off)**, two signature boxes appear:
   - Engineer Signature
   - Customer Signature
3. **Click "+ Add Engineer Signature"** or **"+ Add Customer Signature"**
4. **SignatureModal opens** with two tabs:
   - **Draw Signature**: Use mouse to draw signature on canvas
   - **Type Name**: Type name which displays in cursive font
5. **Save Signature**: Click "Save Signature" button
6. **Preview appears**: Signature displays in the respective box
7. **Change if needed**: Click "Change" button to update signature
8. **Save Certificate**: Signatures are saved with the certificate document

### Data Structure

Signatures are saved in Firestore under the issued certificate document:

```javascript
{
  // ... other certificate fields
  signatures: {
    engineer: {
      data: "base64-image-data" | "John Smith",
      type: "drawn" | "typed"
    },
    customer: {
      data: "base64-image-data" | "Jane Doe",
      type: "drawn" | "typed"
    }
  }
}
```

#### Drawn Signatures
- `type: "drawn"`
- `data`: Base64-encoded PNG image (data URL format)
- Canvas size: 600x200 pixels
- Stored as: `data:image/png;base64,iVBORw0KG...`

#### Typed Signatures
- `type: "typed"`
- `data`: Plain text string (e.g., "John Smith")
- Rendered with `fontFamily: 'cursive'` for signature-like appearance

## UI Design

### Signature Section
- **Location**: After all certificate form fields, before action buttons
- **Styling**: Purple-themed box (`bg-purple-50`, `border-purple-200`)
- **Layout**: Two-column grid (responsive to single column on mobile)
- **State Indicators**:
  - Empty: Dashed border button with "+ Add [Role] Signature" text
  - Filled: Solid green border with signature preview and "Change" button

### Signature Preview
- **Drawn signatures**: Displayed as `<img>` with max-height of 24 (6rem)
- **Typed signatures**: Displayed as text with cursive font at 2xl size
- **Alignment**: Center-aligned within preview box

## Technical Notes

### Canvas Drawing
- Uses HTML5 Canvas API
- Mouse events: `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`
- Stroke settings:
  - Color: Black (`#000`)
  - Width: 2px
  - Line cap: Round
- Canvas automatically clears and resets when modal opens

### State Management
- `signatureTarget` tracks which signature slot is being edited
- Modal closes and resets target after successful save
- Signatures can be updated multiple times before certificate is saved
- No signature validation - both are optional

### Firestore Integration
- Signatures saved as part of certificate document
- Path: `USERS/{userId}/contacts/{contactId}/issuedCertificates/{certId}`
- No separate signature collection needed
- Saved at the same time as certificate issuance

## Future Enhancements

### Potential Improvements
1. **Touch Support**: Add touch event handlers for mobile/tablet drawing
2. **Signature Required**: Make signatures mandatory for certain certificate types
3. **Signature Date/Time**: Capture timestamp when signature is added
4. **Multiple Engineers**: Support multiple engineer signatures for larger teams
5. **Signature Verification**: Add signature verification/authentication layer
6. **Export Options**: Include signatures in PDF generation
7. **Signature Templates**: Pre-saved signature templates for frequent users
8. **Undo/Redo**: Add undo/redo functionality for drawn signatures
9. **Color Options**: Allow different signature colors
10. **Signature History**: Track signature changes/audit trail

### PDF Integration (Next Priority)
When implementing PDF export:
- Include signature images in the generated PDF
- Position signatures in Section G of the certificate
- Ensure signatures are high-resolution (current 600x200 is adequate)
- Consider adding date/time stamp near signatures
- Format typed signatures with appropriate font in PDF

## Testing Checklist

- [ ] Draw signature and save
- [ ] Type signature and save
- [ ] Change existing signature
- [ ] Clear drawn signature and redraw
- [ ] Cancel signature modal (should not save)
- [ ] Save certificate with both signatures
- [ ] Save certificate with only engineer signature
- [ ] Save certificate with only customer signature
- [ ] Save certificate with no signatures
- [ ] View saved certificate in contact's issued certificates
- [ ] Verify signatures are stored in Firestore correctly
- [ ] Test on mobile/tablet (note: drawing may be difficult without touch events)

## Related Components

- **SignatureModal**: `app/components/SignatureModal.tsx`
- **Invoice Signatures**: Same modal used in `app/admin/sales/issue-invoice/page.tsx`
- **Certificate Viewer**: Will need updates to display signatures
- **PDF Generator**: Will need updates to include signatures in exported PDFs

## Security Considerations

- Signatures are stored as base64 images (no encryption currently)
- Access controlled by Firestore security rules (user can only access their own data)
- No signature verification/authentication implemented
- Consider adding:
  - Timestamp verification
  - IP address logging
  - Two-factor authentication for sensitive certificates
  - Digital signature certificates (X.509) for legal compliance

## Compliance Notes

For legal/regulatory compliance in certain industries:
- Current implementation is basic and suitable for internal records
- May not meet requirements for legally binding electronic signatures in some jurisdictions
- Consider implementing:
  - E-signature compliance (e.g., eIDAS in EU, ESIGN Act in US)
  - Audit trails
  - Identity verification
  - Non-repudiation measures

## Support & Troubleshooting

### Common Issues

**Signature not saving**
- Ensure signature is captured before clicking "Save Signature"
- Check browser console for errors
- Verify Firestore write permissions

**Canvas not drawing**
- Check if mouse events are firing
- Ensure canvas is properly initialized
- Try clearing and starting fresh

**Typed signature not appearing**
- Ensure text is entered in the input field
- Check if "cursive" font is available
- Verify browser font support

**Signature quality poor in preview**
- Current canvas is 600x200 which is adequate
- For higher quality, increase canvas dimensions in `SignatureModal.tsx`
- Consider using vector format (SVG) for drawn signatures

## Change Log

### Version 1.0 (Initial Implementation)
- Added digital signature functionality
- Implemented draw and type modes
- Integrated with certificate issuance flow
- Updated Solid Fuel Sweep certificate template
- Added signature preview and change functionality

---

**Status**: ✅ Implementation Complete
**Last Updated**: [Current Date]
**Implemented By**: AI Assistant
**Approved By**: [Pending]