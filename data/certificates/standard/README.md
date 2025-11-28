# Standard Certificate Templates

This directory contains industry-standard certificate templates that are bundled with the application. These templates are stored as JSON files and loaded directly into the app without requiring Firebase storage.

## Benefits of Local Storage

- **Zero Firebase costs** - No database reads for standard templates
- **Faster loading** - No network calls required
- **Version control** - Easy to track changes in Git
- **Easy maintenance** - Simply edit JSON files to update templates
- **Always available** - No dependency on Firebase connectivity

## File Structure

```
standard/
├── README.md                    # This file
├── index.ts                     # Exports all standard certificates
├── gas-safety.json             # Gas Safety Certificate template
├── electrical-safety.json      # Electrical Safety Certificate template
└── [your-certificate].json     # Add more certificates here
```

## Adding a New Standard Certificate

### Step 1: Create the JSON File

Create a new `.json` file in this directory with the following structure:

```json
{
  "id": "standard-your-certificate-name",
  "name": "Your Certificate Name",
  "description": "Description of what this certificate is for",
  "isStandard": true,
  "elements": [
    {
      "id": "unique-element-id",
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
    // Add more elements here...
  ]
}
```

### Step 2: Update index.ts

Add your new certificate to the `index.ts` file:

```typescript
import gasSafety from "./gas-safety.json";
import electricalSafety from "./electrical-safety.json";
import yourCertificate from "./your-certificate.json";  // Add this line

export const standardCertificates: StandardCertificateTemplate[] = [
  gasSafety as StandardCertificateTemplate,
  electricalSafety as StandardCertificateTemplate,
  yourCertificate as StandardCertificateTemplate,  // Add this line
];
```

### Step 3: Test

The certificate will automatically appear in the "Standard Certificates" section when issuing certificates to contacts.

## Available Element Types

Your certificate can include these element types:

- **`text-header`** - Section headers and titles
- **`text-input`** - Single-line text input fields
- **`text-area`** - Multi-line text input fields
- **`date-input`** - Date picker fields
- **`dropdown`** - Dropdown select menus (specify `options` array)
- **`checkbox`** - Checkbox fields

## Element Structure

Each element must have:

```json
{
  "id": "unique-id-for-element",
  "type": "element-type",
  "properties": {
    "label": "Field Label",
    "placeholder": "Placeholder text (for inputs)",
    "text": "Display text (for headers)",
    "fontSize": 16,
    "alignment": "left",
    "bold": true,
    "required": true,
    "options": ["Option 1", "Option 2"]  // For dropdowns
  },
  "position": { "x": 50, "y": 100 },
  "size": { "width": 300, "height": 60 }
}
```

## Best Practices

1. **Use descriptive IDs** - Makes debugging easier
   - Good: `"gas-safe-number"`, `"inspector-name"`
   - Bad: `"field1"`, `"input2"`

2. **Follow industry standards** - Model certificates after official templates in your industry

3. **Group related fields** - Use text-headers to create logical sections

4. **Set appropriate sizes** - Standard field height is 60px, headers are 30-40px

5. **Mark critical fields as required** - Set `"required": true` for mandatory fields

6. **Test thoroughly** - Issue a test certificate to verify all fields work correctly

## Example Certificates

- **gas-safety.json** - Template for gas appliance safety inspections
- **electrical-safety.json** - Template for electrical installation condition reports

Use these as references when creating new certificates.

## Support

For questions or issues with standard certificates, refer to the main application documentation or contact the development team.