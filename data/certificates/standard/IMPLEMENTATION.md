# Standard Certificates Implementation Summary

## Overview

Standard certificates are now stored locally as JSON files instead of in Firebase. This provides significant benefits in terms of cost, performance, and maintainability.

## Architecture

### File Structure
```
data/certificates/standard/
├── README.md                    # Documentation for adding certificates
├── IMPLEMENTATION.md            # This file
├── index.ts                     # Central export point
├── gas-safety.json             # Gas Safety Certificate
├── electrical-safety.json      # Electrical Safety Certificate
└── [future-certificates].json   # Add more here
```

### Data Flow

1. **Standard Certificates** (Local JSON)
   - Loaded from `data/certificates/standard/`
   - Imported directly into the application
   - No network calls required
   - Zero Firebase costs

2. **User Certificates** (Firebase)
   - Loaded from `USERS/{userId}/Certificates`
   - Created via Certificate Builder
   - User-specific templates

3. **Merged in UI**
   - Standard certificates appear in "Standard Certificates" section
   - User certificates appear in "My Certificates" section
   - Both are fully functional and interchangeable

## Implementation Details

### 1. Standard Certificate Template Interface

```typescript
interface StandardCertificateTemplate {
  id: string;              // Unique ID (prefix with "standard-")
  name: string;            // Display name
  description: string;     // Brief description
  isStandard: boolean;     // Always true for standard certificates
  elements: FormElement[]; // Certificate fields
}
```

### 2. Loading Standard Certificates

Standard certificates are imported and merged with user certificates in the `fetchTemplates` function:

```typescript
const fetchTemplates = async (uid: string) => {
  // Load user templates from Firebase
  const userTemplatesList = [...];

  // Combine with standard certificates
  const allTemplates = [
    ...standardCertificates.map(cert => ({
      id: cert.id,
      name: cert.name,
      elements: cert.elements as FormElement[],
      isStandard: true,
    })),
    ...userTemplatesList,
  ];

  setTemplates(allTemplates);
};
```

### 3. UI Rendering

The sidebar splits templates into two sections based on the `isStandard` flag:

- **Standard Certificates** - Gray header, appears first
- **My Certificates** - Gray header, appears second

Both sections support:
- Search/filtering
- Template selection
- Visual indicators for selected template
- Element count display

## Benefits

### Performance
- **Instant loading** - No network latency
- **Reduced Firebase reads** - Saves on operational costs
- **Better offline support** - Standard templates work without connectivity

### Development
- **Version control** - Track changes in Git
- **Easy updates** - Edit JSON files directly
- **No deployment** - Changes deploy with code
- **Type safety** - TypeScript validates structure

### Maintenance
- **Centralized** - All standard templates in one place
- **Documented** - README provides clear instructions
- **Scalable** - Add unlimited certificates without database impact
- **Testable** - Can test templates locally

## Current Standard Certificates

### 1. Gas Safety Certificate (`gas-safety.json`)
- **Purpose**: Gas appliance safety inspections
- **Fields**: 17 form elements including:
  - Engineer details and Gas Safe registration
  - Inspection dates
  - Appliance condition assessments
  - Safety checks (gas tightness, flame supervision, etc.)
  - Remedial work notes
  - Declaration and signature

### 2. Electrical Safety Certificate (`electrical-safety.json`)
- **Purpose**: Electrical installation condition reports
- **Fields**: 20 form elements including:
  - Inspector details and registration
  - Installation type and earthing arrangement
  - Test results (earth fault loop, insulation resistance, RCD)
  - Observations checklist
  - Overall assessment
  - Recommendations and certification

## Adding New Standard Certificates

### Quick Start

1. Create `your-certificate.json` in this directory
2. Copy structure from existing certificate
3. Modify fields to match your requirements
4. Add import to `index.ts`
5. Add to export array
6. Test by issuing certificate to a contact

### Example Template

```json
{
  "id": "standard-your-cert",
  "name": "Your Certificate Name",
  "description": "What this certificate is for",
  "isStandard": true,
  "elements": [
    {
      "id": "header-1",
      "type": "text-header",
      "properties": {
        "text": "CERTIFICATE TITLE",
        "fontSize": 24,
        "alignment": "center",
        "bold": true
      },
      "position": { "x": 50, "y": 20 },
      "size": { "width": 700, "height": 40 }
    }
  ]
}
```

## Technical Considerations

### TypeScript Compatibility
JSON files are imported with proper type assertions to ensure TypeScript compatibility:

```typescript
import certificate from "./certificate.json";
// Used as: certificate as StandardCertificateTemplate
```

### Element Types
All standard form element types are supported:
- `text-header` - Headers and titles
- `text-input` - Single-line inputs
- `text-area` - Multi-line text
- `date-input` - Date pickers
- `dropdown` - Select menus
- `checkbox` - Boolean fields

### Positioning
- Origin: Top-left corner (0, 0)
- Units: Pixels
- Canvas size: ~800px wide for certificates
- Recommended spacing: 60-80px between sections

### Element IDs
Must be unique within each certificate. Recommended format:
- `section-name` for headers
- `field-description` for inputs
- Use kebab-case

## Future Enhancements

### Potential Additions
1. **More certificate types**:
   - Boiler Service Record
   - Landlord Gas Safety Record (CP12)
   - PAT Testing Certificate
   - Fire Alarm Certificate
   - Emergency Lighting Certificate

2. **Enhanced features**:
   - Multi-page certificates
   - Conditional fields (show/hide based on other inputs)
   - Calculated fields (auto-fill based on formulas)
   - Image upload fields for photos
   - Digital signature capture

3. **Internationalization**:
   - Translations for different languages
   - Region-specific certificate variants
   - Locale-specific date/number formatting

### Migration Path
If standard certificates need to become dynamic (user-editable):
1. Copy JSON to Firebase collection
2. Add admin UI for editing
3. Keep local JSON as fallback/defaults
4. Maintain backward compatibility

## Testing Checklist

When adding a new standard certificate:

- [ ] JSON syntax is valid
- [ ] All element IDs are unique
- [ ] Required fields are marked correctly
- [ ] Dropdown options are complete
- [ ] Positioning looks good on preview
- [ ] Certificate fits on one page (if possible)
- [ ] All fields are accessible and fillable
- [ ] Certificate can be saved successfully
- [ ] PDF generation works correctly
- [ ] Certificate prints properly

## Support & Documentation

- Main README: `data/certificates/standard/README.md`
- Element types: See `CertificateBuilderTypes.ts`
- Form builder: `app/components/CertificateBuilder.tsx`
- Certificate viewer: Contact certificate pages

## Changelog

### Initial Implementation (Current)
- Created standard certificate storage structure
- Implemented Gas Safety Certificate
- Implemented Electrical Safety Certificate
- Added documentation and examples
- Integrated with certificate issuance flow
- Split sidebar into Standard/User sections

---

**Last Updated**: December 2024  
**Maintained By**: Development Team