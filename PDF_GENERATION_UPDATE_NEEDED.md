# PDF Generation Update Guide

## Issue

The Cloud Function `generateCertificatePDF` is generating PDFs with the old certificate layout. It's missing:
- Two-column layout for certificate fields
- Split condition checks (2x4 grid)
- Updated sign-off section layout
- Signature support
- New field types (text-input, text-area, date-input)

## Current Status

The downloaded PDF shows only:
- Header (title, reference, date) ✅
- Business/Customer/Appliance info boxes ✅
- **Missing**: All certificate fields (sections C, D, E, F)
- **Missing**: Sign-off section
- **Missing**: Signatures

## Required Updates

### 1. Update Field Type Support

**File**: `firebase-functions/src/generateCertificatePDF.ts`
**Function**: `renderFieldValue()`

Add support for new standard certificate field types:

```typescript
case "text-header":
  return ""; // Headers rendered separately
case "text-input":
case "text-area":
case "date-input":
  return field.value || "";
```

Update existing cases to check `field.value`:

```typescript
case "inputbox":
  return props.userInput || props.defaultValue || field.value || "";
case "checkbox":
  const isChecked = props.userInput ?? props.defaultValue ?? field.value ?? false;
case "dropdown":
  return props.userInput || props.defaultValue || field.value || "";
```

### 2. Add Signatures to Interface

Add to `CertificateData` interface:

```typescript
interface CertificateData {
  // ... existing fields
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

### 3. Filter Fields for Two Columns

Split fields into left and right columns:

**Left Column** (Sweeping Info + Re-Sweep):
```typescript
const leftColumnFields = certificate.fields.filter((field: any) => {
  // Filter out sections A, B, G
  if (field.id === "header-title" || 
      field.id === "section-customer" ||
      field.id?.includes("customer-") ||
      field.id === "section-appliance" ||
      field.id?.includes("appliance-") ||
      field.id === "section-signoff" ||
      field.id === "engineer-name" ||
      field.id === "business-name" ||
      field.id === "certificate-date" ||
      field.id === "certificate-number" ||
      field.id === "customer-signature-name") {
    return false;
  }

  // Left column: sweeping + resweep
  return (
    field.id?.includes("sweeping") ||
    field.id?.includes("fuels-used") ||
    field.id?.includes("sweeping-method") ||
    field.id?.includes("deposits") ||
    field.id?.includes("additional") ||
    field.id === "section-sweeping" ||
    field.id === "section-resweep" ||
    field.id === "resweep-interval"
  );
});
```

**Right Column** (Condition Checks + CO Alarm):
```typescript
const rightColumnFields = certificate.fields.filter((field: any) => {
  // Filter out sections A, B, G
  // ... same filters as above

  // Right column: checks + co alarm
  return (
    field.id?.includes("terminal") ||
    field.id?.includes("chimney") ||
    field.id?.includes("obstruction") ||
    field.id?.includes("smoke") ||
    field.id?.includes("ventilation") ||
    field.id?.includes("co-alarm") ||
    field.id?.includes("fire-safety") ||
    field.id?.includes("general-appliance") ||
    field.id === "section-checks" ||
    field.id === "section-co-alarm" ||
    field.id === "co-alarm-comments"
  );
});
```

### 4. Get Condition Check Fields for 2x4 Grid

```typescript
const checkFields = certificate.fields.filter((f: any) =>
  f.id === "terminal-condition" ||
  f.id === "chimney-pot-condition" ||
  f.id === "obstructions-found" ||
  f.id === "smoke-evacuation" ||
  f.id === "ventilation-adequate" ||
  f.id === "co-alarm-installed" ||
  f.id === "fire-safety-concerns" ||
  f.id === "general-appliance-condition"
);

const leftChecks = checkFields.slice(0, 4);
const rightChecks = checkFields.slice(4);
```

### 5. Get Sign-Off Fields

```typescript
const businessName = certificate.fields.find((f: any) => f.id === "business-name")?.value || "";
const engineerName = certificate.fields.find((f: any) => f.id === "engineer-name")?.value || "";
const certNumber = certificate.fields.find((f: any) => f.id === "certificate-number")?.value || "";
const customerName = certificate.fields.find((f: any) => f.id === "customer-signature-name")?.value || "";
const certDate = certificate.fields.find((f: any) => f.id === "certificate-date")?.value || "";
```

### 6. Update HTML Structure

**New HTML Structure** (replace existing HTML from line ~160 onwards):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-page {
      width: 277mm;
      min-height: 190mm;
      background: white;
      padding: 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #1f2937;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      text-transform: uppercase;
    }
    .header p {
      font-size: 10px;
      color: #4b5563;
      margin-top: 2px;
    }
    .info-boxes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .info-box {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 8px;
    }
    .info-box h2 {
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-box .content {
      font-size: 10px;
    }
    .columns {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .column {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 8px;
    }
    .section-header {
      font-size: 11px;
      font-weight: 700;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
    }
    .section-header:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .field {
      font-size: 10px;
      margin-top: 4px;
    }
    .field .label {
      font-weight: 600;
      color: #374151;
    }
    .field .value {
      color: #111827;
      margin-top: 2px;
      white-space: pre-wrap;
    }
    .checks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 4px;
    }
    .signoff-section {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .signoff-row {
      display: grid;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 10px;
    }
    .signoff-row-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box .label {
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .signature-box .sig-container {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 4px;
      background: white;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .signature-box img {
      max-height: 32px;
      max-width: 100%;
    }
    .signature-box .typed-sig {
      font-size: 16px;
      font-family: cursive;
    }
    .footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 10px;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="certificate-page">
    <!-- Header -->
    <div class="header">
      <h1>${certificate.templateName}</h1>
      <p>Certificate Reference: ${certificate.name} | Issue Date: ${formatDate(certificate.issuedDate)}</p>
    </div>

    <!-- Info Boxes: Business, Customer, Appliance -->
    <div class="info-boxes">
      <div class="info-box">
        <h2>Business Details</h2>
        <div class="content">
          ${businessDetails.logoUrl ? `<img src="${businessDetails.logoUrl}" style="height: 32px; margin-bottom: 4px;">` : ""}
          <p><strong>${businessDetails.businessName}</strong></p>
          ${businessDetails.companyNumber ? `<p>Company No: ${businessDetails.companyNumber}</p>` : ""}
          <p style="white-space: pre-line;">${businessDetails.businessAddress}</p>
          <p>${businessDetails.businessPhone}</p>
          <p>${businessDetails.businessEmail}</p>
        </div>
      </div>

      <div class="info-box">
        <h2>Customer Details</h2>
        <div class="content">
          <p><span class="label">Name:</span> ${certificate.customer.name}</p>
          <p><span class="label">Address:</span> ${certificate.customer.address}</p>
          <p><span class="label">Postcode:</span> ${certificate.customer.postcode}</p>
          <p><span class="label">Telephone:</span> ${certificate.customer.telephone}</p>
          <p><span class="label">Email:</span> ${certificate.customer.email}</p>
        </div>
      </div>

      <div class="info-box">
        <h2>Appliance Details</h2>
        <div class="content">
          ${applianceFieldsHTML}
        </div>
      </div>
    </div>

    <!-- Two-Column Layout for Certificate Fields -->
    <div class="columns">
      <!-- Left Column: Sweeping + Re-Sweep -->
      <div class="column">
        ${leftColumnFields.map(field => {
          if (field.type === "text-header") {
            const text = field.properties?.text || "";
            const textWithoutPrefix = text.replace(/^[A-Z]\.\s/, "");
            return `<div class="section-header">${textWithoutPrefix}</div>`;
          }
          const value = renderFieldValue(field);
          if (!value) return "";
          const label = field.properties?.label || "";
          return `
            <div class="field">
              ${label ? `<span class="label">${label}:</span>` : ""}
              <p class="value">${value}</p>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Right Column: Condition Checks + CO Alarm -->
      <div class="column">
        ${rightColumnFields.map(field => {
          // Special handling for Visual/Condition Checks section
          if (field.id === "section-checks") {
            const text = field.properties?.text || "";
            const textWithoutPrefix = text.replace(/^[A-Z]\.\s/, "");
            return `
              <div class="section-header">${textWithoutPrefix}</div>
              <div class="checks-grid">
                <div>
                  ${leftChecks.map(checkField => {
                    const value = renderFieldValue(checkField);
                    const label = checkField.properties?.label || "";
                    return `
                      <div class="field">
                        <span class="label">${label}:</span>
                        <p class="value">${value}</p>
                      </div>
                    `;
                  }).join("")}
                </div>
                <div>
                  ${rightChecks.map(checkField => {
                    const value = renderFieldValue(checkField);
                    const label = checkField.properties?.label || "";
                    return `
                      <div class="field">
                        <span class="label">${label}:</span>
                        <p class="value">${value}</p>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }

          // Skip individual check fields (already rendered in grid)
          if (checkFields.includes(field)) {
            return "";
          }

          // Render other fields
          if (field.type === "text-header") {
            const text = field.properties?.text || "";
            const textWithoutPrefix = text.replace(/^[A-Z]\.\s/, "");
            return `<div class="section-header">${textWithoutPrefix}</div>`;
          }

          const value = renderFieldValue(field);
          if (!value) return "";
          const label = field.properties?.label || "";
          return `
            <div class="field">
              ${label ? `<span class="label">${label}:</span>` : ""}
              <p class="value">${value}</p>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <!-- Sign-Off Section -->
    <div class="signoff-section">
      <div class="signoff-row signoff-row-3">
        <div>
          <span class="label">Business Name:</span>
          <p>${businessName}</p>
        </div>
        <div>
          <span class="label">Engineer Name:</span>
          <p>${engineerName}</p>
        </div>
        <div>
          <span class="label">Certificate Number:</span>
          <p>${certNumber}</p>
        </div>
      </div>

      <div class="signoff-row signoff-row-3">
        <div>
          <span class="label">Customer Name:</span>
          <p>${customerName}</p>
        </div>
        <div></div>
        <div>
          <span class="label">Date:</span>
          <p>${certDate}</p>
        </div>
      </div>

      ${certificate.signatures && (certificate.signatures.engineer || certificate.signatures.customer) ? `
        <div class="signatures">
          ${certificate.signatures.engineer ? `
            <div class="signature-box">
              <p class="label">Engineer Signature:</p>
              <div class="sig-container">
                ${certificate.signatures.engineer.type === "drawn" 
                  ? `<img src="${certificate.signatures.engineer.data}" alt="Engineer signature">` 
                  : `<p class="typed-sig">${certificate.signatures.engineer.data}</p>`}
              </div>
            </div>
          ` : ""}

          ${certificate.signatures.customer ? `
            <div class="signature-box">
              <p class="label">Customer Signature:</p>
              <div class="sig-container">
                ${certificate.signatures.customer.type === "drawn" 
                  ? `<img src="${certificate.signatures.customer.data}" alt="Customer signature">` 
                  : `<p class="typed-sig">${certificate.signatures.customer.data}</p>`}
              </div>
            </div>
          ` : ""}
        </div>
      ` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This certificate was issued on ${formatDate(certificate.issuedDate)} and is valid as of the date of inspection.</p>
    </div>
  </div>
</body>
</html>
  `;
}
```

## Key Changes Summary

1. **Field Type Support**: Added text-input, text-area, date-input, text-header
2. **Two-Column Layout**: Left (sweeping + resweep), Right (checks + CO alarm)
3. **Split Condition Checks**: 2x4 grid within right column
4. **Sign-Off Section**: 3-column row (business, engineer, cert#) + 3-column row (customer, empty, date)
5. **Signatures**: Display both drawn (images) and typed (cursive text) signatures
6. **Removed Section Letters**: "C. Sweeping" → "Sweeping"
7. **Removed Duplicates**: Sections A, B, G filtered from main columns
8. **Updated Spacing**: Matches new compact 10-11px font sizes

## Testing After Update

1. Deploy Cloud Function: `firebase deploy --only functions:generateCertificatePDF`
2. Download a certificate PDF
3. Verify all sections appear:
   - ✅ Header
   - ✅ Business/Customer/Appliance boxes
   - ✅ Left column (Sweeping, Re-Sweep)
   - ✅ Right column (Checks in 2x4, CO Alarm)
   - ✅ Sign-off section
   - ✅ Signatures
   - ✅ Footer

## Deployment

```bash
cd firebase-functions
npm install
npm run build
firebase deploy --only functions:generateCertificatePDF
```

## Troubleshooting

**Issue**: PDF still shows old layout
- **Solution**: Clear function cache, redeploy, wait 2-3 minutes for propagation

**Issue**: Images (logos/signatures) not showing
- **Solution**: Ensure images are publicly accessible URLs (check CORS/permissions)

**Issue**: Grid layout broken
- **Solution**: Check CSS `display: grid` is supported by Puppeteer version

**Issue**: Fields missing
- **Solution**: Verify field IDs match filter conditions exactly

---

**Status**: Documentation Complete
**Action Required**: Update Cloud Function code as described above
**Priority**: High (PDF downloads currently broken)