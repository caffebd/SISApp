import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const db = admin.firestore();

interface CertificateData {
  name: string;
  templateName: string;
  customer: {
    name: string;
    address: string;
    postcode: string;
    telephone: string;
    email: string;
  };
  appliance: any;
  visibleApplianceFields?: string[];
  fields: any[];
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
  status: string;
  issuedDate: string;
}

interface BusinessDetails {
  businessName: string;
  companyNumber: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  logoUrl?: string;
}

interface GenerateCertificatePDFRequest {
  userId: string;
  contactId: string;
  certificateId: string;
}

// Helper function to format date
function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Helper function to render field value
function renderFieldValue(field: any): string {
  const props = field.properties || {};

  switch (field.type) {
    // Legacy types
    case "textbox":
      return props.label || "";
    case "inputbox":
      return props.userInput || props.defaultValue || field.value || "";
    // Standard certificate types
    case "text-header":
      return ""; // Headers rendered separately
    case "text-input":
    case "text-area":
    case "date-input":
      return field.value || "";
    case "checkbox":
      const isChecked =
        props.userInput ?? props.defaultValue ?? field.value ?? false;
      return isChecked
        ? "☑ " + (props.label || "")
        : "☐ " + (props.label || "");
    case "dropdown":
      return props.userInput || props.defaultValue || field.value || "";
    default:
      return "";
  }
}

// Generate HTML for certificate
function generateCertificateHTML(
  certificate: CertificateData,
  businessDetails: BusinessDetails,
): string {
  // Helper to check if field should be shown
  const shouldShowField = (fieldName: string): boolean => {
    if (!certificate.visibleApplianceFields) return true;
    return certificate.visibleApplianceFields.includes(fieldName);
  };

  // Generate appliance fields HTML
  let applianceFieldsHTML = "";
  if (certificate.appliance) {
    const fields = [];

    if (shouldShowField("location")) {
      fields.push(`
        <div>
          <span class="label">Location:</span>
          <p class="value">${certificate.appliance.location || ""}</p>
        </div>
      `);
    }

    if (shouldShowField("type")) {
      fields.push(`
        <div>
          <span class="label">Type:</span>
          <p class="value">${certificate.appliance.type || ""}</p>
        </div>
      `);
    }

    if (shouldShowField("manufacturer")) {
      fields.push(`
        <div>
          <span class="label">Manufacturer:</span>
          <p class="value">${certificate.appliance.manufacturer || ""}</p>
        </div>
      `);
    }

    if (shouldShowField("model")) {
      fields.push(`
        <div>
          <span class="label">Model:</span>
          <p class="value">${certificate.appliance.model || ""}</p>
        </div>
      `);
    }

    if (shouldShowField("fuelType")) {
      fields.push(`
        <div>
          <span class="label">Fuel Type:</span>
          <p class="value">${certificate.appliance.fuelType || ""}</p>
        </div>
      `);
    }

    if (shouldShowField("ventilationPresent")) {
      fields.push(`
        <div>
          <span class="label">Ventilation Present:</span>
          <p class="value">${certificate.appliance.ventilationPresent ? "Yes" : "No"}</p>
        </div>
      `);
    }

    if (shouldShowField("coAlarmPresent")) {
      fields.push(`
        <div>
          <span class="label">CO Alarm Present:</span>
          <p class="value">${certificate.appliance.coAlarmPresent ? "Yes" : "No"}</p>
        </div>
      `);
    }

    applianceFieldsHTML = fields.join("");
  }

  // Filter fields for left column (sweeping + resweep)
  const leftColumnFields = certificate.fields.filter((field: any) => {
    if (
      field.id === "header-title" ||
      field.id === "section-customer" ||
      field.id === "customer-name" ||
      field.id === "customer-address" ||
      field.id === "customer-postcode" ||
      field.id === "customer-telephone" ||
      field.id === "customer-email" ||
      field.id === "section-appliance" ||
      field.id === "appliance-location" ||
      field.id === "appliance-type" ||
      field.id === "appliance-manufacturer" ||
      field.id === "appliance-model" ||
      field.id === "fuel-type" ||
      field.id === "section-signoff" ||
      field.id === "engineer-name" ||
      field.id === "business-name" ||
      field.id === "certificate-date" ||
      field.id === "certificate-number" ||
      field.id === "customer-signature-name"
    ) {
      return false;
    }

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

  // Filter fields for right column (checks + co alarm)
  const rightColumnFields = certificate.fields.filter((field: any) => {
    if (
      field.id === "header-title" ||
      field.id === "section-customer" ||
      field.id === "customer-name" ||
      field.id === "customer-address" ||
      field.id === "customer-postcode" ||
      field.id === "customer-telephone" ||
      field.id === "customer-email" ||
      field.id === "section-appliance" ||
      field.id === "appliance-location" ||
      field.id === "appliance-type" ||
      field.id === "appliance-manufacturer" ||
      field.id === "appliance-model" ||
      field.id === "fuel-type" ||
      field.id === "section-signoff" ||
      field.id === "engineer-name" ||
      field.id === "business-name" ||
      field.id === "certificate-date" ||
      field.id === "certificate-number" ||
      field.id === "customer-signature-name"
    ) {
      return false;
    }

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

  // Get condition check fields for 2x4 grid
  const checkFields = certificate.fields.filter(
    (f: any) =>
      f.id === "terminal-condition" ||
      f.id === "chimney-pot-condition" ||
      f.id === "obstructions-found" ||
      f.id === "smoke-evacuation" ||
      f.id === "ventilation-adequate" ||
      f.id === "co-alarm-installed" ||
      f.id === "fire-safety-concerns" ||
      f.id === "general-appliance-condition",
  );

  const leftChecks = checkFields.slice(0, 4);
  const rightChecks = checkFields.slice(4);

  // Helper to render field HTML
  const renderFieldHTML = (field: any, isCheckField = false): string => {
    if (field.type === "text-header") {
      const text = field.properties?.text || "";
      const isSectionHeader = /^[A-Z]\.\s/.test(text);

      if (isSectionHeader) {
        const textWithoutPrefix = text.replace(/^[A-Z]\.\s/, "");

        // Special handling for checks section
        if (field.id === "section-checks") {
          let checksGridHTML = '<div class="checks-grid">';

          // Left column checks
          checksGridHTML += '<div class="checks-column">';
          leftChecks.forEach((checkField: any) => {
            const value = renderFieldValue(checkField);
            if (value) {
              checksGridHTML += `
                <div class="check-item">
                  <span class="label">${checkField.properties?.label || ""}:</span>
                  <p class="value">${value}</p>
                </div>
              `;
            }
          });
          checksGridHTML += "</div>";

          // Right column checks
          checksGridHTML += '<div class="checks-column">';
          rightChecks.forEach((checkField: any) => {
            const value = renderFieldValue(checkField);
            if (value) {
              checksGridHTML += `
                <div class="check-item">
                  <span class="label">${checkField.properties?.label || ""}:</span>
                  <p class="value">${value}</p>
                </div>
              `;
            }
          });
          checksGridHTML += "</div>";

          checksGridHTML += "</div>";

          return `<div class="section-header">${textWithoutPrefix}</div>${checksGridHTML}`;
        }

        return `<div class="section-header">${textWithoutPrefix}</div>`;
      } else {
        return `<div class="sub-header">${text}</div>`;
      }
    }

    // Skip individual check fields (rendered in grid)
    if (checkFields.some((cf: any) => cf.id === field.id)) {
      return "";
    }

    const value = renderFieldValue(field);
    if (!value) return "";

    if (field.type === "textbox") {
      return `<div class="field"><p class="value font-medium">${value}</p></div>`;
    } else if (field.type === "checkbox") {
      return `<div class="field checkbox">${value}</div>`;
    } else {
      const label = field.properties?.label || "";
      return `
        <div class="field">
          ${label ? `<span class="label">${label}:</span>` : ""}
          <p class="value">${value}</p>
        </div>
      `;
    }
  };

  // Generate left column HTML
  const leftColumnHTML = leftColumnFields
    .map((field: any) => renderFieldHTML(field))
    .join("");

  // Generate right column HTML
  const rightColumnHTML = rightColumnFields
    .map((field: any) => renderFieldHTML(field))
    .join("");

  // Get sign-off fields
  const businessName =
    certificate.fields.find((f: any) => f.id === "business-name")?.value || "";
  const engineerName =
    certificate.fields.find((f: any) => f.id === "engineer-name")?.value || "";
  const certNumber =
    certificate.fields.find((f: any) => f.id === "certificate-number")?.value ||
    "";
  const customerName =
    certificate.fields.find((f: any) => f.id === "customer-signature-name")
      ?.value || "";
  const certDate =
    certificate.fields.find((f: any) => f.id === "certificate-date")?.value ||
    "";

  // Generate signatures HTML
  let signaturesHTML = "";
  if (
    certificate.signatures &&
    (certificate.signatures.engineer || certificate.signatures.customer)
  ) {
    signaturesHTML = '<div class="signatures">';

    if (certificate.signatures.engineer) {
      signaturesHTML += `
        <div class="signature-box">
          <p class="sig-label">Engineer Signature:</p>
          <div class="sig-container">
            ${
              certificate.signatures.engineer.type === "drawn"
                ? `<img src="${certificate.signatures.engineer.data}" alt="Engineer signature" />`
                : `<p class="typed-sig">${certificate.signatures.engineer.data}</p>`
            }
          </div>
        </div>
      `;
    }

    if (certificate.signatures.customer) {
      signaturesHTML += `
        <div class="signature-box">
          <p class="sig-label">Customer Signature:</p>
          <div class="sig-container">
            ${
              certificate.signatures.customer.type === "drawn"
                ? `<img src="${certificate.signatures.customer.data}" alt="Customer signature" />`
                : `<p class="typed-sig">${certificate.signatures.customer.data}</p>`
            }
          </div>
        </div>
      `;
    }

    signaturesHTML += "</div>";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
      letter-spacing: 0.025em;
      margin-bottom: 4px;
    }

    .header p {
      font-size: 10px;
      color: #4b5563;
    }

    .info-boxes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }

    .info-box {
      border: 1px solid #d1d5db;
      border-radius: 2px;
      padding: 8px;
    }

    .info-box h2 {
      font-size: 11px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e5e7eb;
    }

    .info-box .content {
      font-size: 10px;
    }

    .info-box .content > div {
      margin-top: 2px;
    }

    .info-box .label {
      font-weight: 600;
      color: #374151;
    }

    .info-box .value {
      color: #111827;
      margin: 0;
    }

    .logo {
      max-height: 50px;
      max-width: 100%;
      margin-bottom: 4px;
      object-fit: contain;
    }

    .columns {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }

    .column {
      border: 1px solid #d1d5db;
      border-radius: 2px;
      padding: 8px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 700;
      color: #111827;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
      margin-bottom: 4px;
    }

    .section-header:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }

    .sub-header {
      font-size: 10px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 2px;
    }

    .field {
      font-size: 10px;
      margin-top: 3px;
    }

    .field .label {
      font-weight: 600;
      color: #374151;
    }

    .field .value {
      color: #111827;
      margin-top: 1px;
      white-space: pre-wrap;
    }

    .field.checkbox {
      display: flex;
      align-items: flex-start;
    }

    .font-medium {
      font-weight: 500;
    }

    .checks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-top: 4px;
    }

    .checks-column {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .check-item {
      font-size: 10px;
    }

    .check-item .label {
      font-weight: 600;
      color: #374151;
    }

    .check-item .value {
      color: #111827;
      margin-top: 1px;
    }

    .signoff-section {
      border: 1px solid #d1d5db;
      border-radius: 2px;
      padding: 8px;
      margin-bottom: 8px;
    }

    .signoff-row {
      display: grid;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 10px;
    }

    .signoff-row:last-child {
      margin-bottom: 0;
    }

    .signoff-row-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .signoff-row-2 {
      grid-template-columns: repeat(3, 1fr);
    }

    .signoff-row .label {
      font-weight: 600;
      color: #374151;
    }

    .signoff-row .value {
      color: #111827;
      margin: 0;
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

    .signature-box .sig-label {
      font-size: 10px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }

    .signature-box .sig-container {
      border: 1px solid #d1d5db;
      border-radius: 2px;
      padding: 4px;
      background: white;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .signature-box img {
      max-height: 40px;
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
    }

    .footer p {
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

    <!-- Three Column Layout: Business, Customer, Appliance -->
    <div class="info-boxes">
      <!-- Business Details -->
      <div class="info-box">
        <h2>Business Details</h2>
        <div class="content">
          ${businessDetails.logoUrl ? `<img src="${businessDetails.logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'" />` : ""}
          <div><strong>${businessDetails.businessName || ""}</strong></div>
          ${businessDetails.companyNumber ? `<div>Company No: ${businessDetails.companyNumber}</div>` : ""}
          <div style="white-space: pre-line;">${businessDetails.businessAddress || ""}</div>
          <div>${businessDetails.businessPhone || ""}</div>
          <div>${businessDetails.businessEmail || ""}</div>
        </div>
      </div>

      <!-- Customer Details -->
      <div class="info-box">
        <h2>Customer Details</h2>
        <div class="content">
          <div>
            <span class="label">Name:</span>
            <p class="value">${certificate.customer.name}</p>
          </div>
          <div>
            <span class="label">Address:</span>
            <p class="value">${certificate.customer.address}</p>
          </div>
          <div>
            <span class="label">Postcode:</span>
            <p class="value">${certificate.customer.postcode}</p>
          </div>
          <div>
            <span class="label">Telephone:</span>
            <p class="value">${certificate.customer.telephone}</p>
          </div>
          <div>
            <span class="label">Email:</span>
            <p class="value">${certificate.customer.email}</p>
          </div>
        </div>
      </div>

      <!-- Appliance Details -->
      ${
        certificate.appliance
          ? `
      <div class="info-box">
        <h2>Appliance Details</h2>
        <div class="content">
          ${applianceFieldsHTML}
        </div>
      </div>
      `
          : '<div class="info-box"></div>'
      }
    </div>

    <!-- Certificate Fields - Two Column Layout -->
    <div class="columns">
      <!-- Left Column: Sweeping + Resweep -->
      <div class="column">
        ${leftColumnHTML}
      </div>

      <!-- Right Column: Checks + CO Alarm -->
      <div class="column">
        ${rightColumnHTML}
      </div>
    </div>

    <!-- Sign-Off Section -->
    <div class="signoff-section">
      <!-- Row 1: Business, Engineer, Cert Number -->
      <div class="signoff-row signoff-row-3">
        <div>
          <span class="label">Business Name:</span>
          <p class="value">${businessName}</p>
        </div>
        <div>
          <span class="label">Engineer Name:</span>
          <p class="value">${engineerName}</p>
        </div>
        <div>
          <span class="label">Certificate Number:</span>
          <p class="value">${certNumber}</p>
        </div>
      </div>

      <!-- Row 2: Customer Name, Empty, Date -->
      <div class="signoff-row signoff-row-2">
        <div>
          <span class="label">Customer Name:</span>
          <p class="value">${customerName}</p>
        </div>
        <div></div>
        <div>
          <span class="label">Date:</span>
          <p class="value">${certDate}</p>
        </div>
      </div>

      <!-- Signatures -->
      ${signaturesHTML}
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

export const generateCertificatePDF = onCall(
  {
    region: "europe-west2",
    memory: "2GiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      // Get request data
      const { userId, contactId, certificateId } =
        request.data as GenerateCertificatePDFRequest;

      if (!userId || !contactId || !certificateId) {
        throw new HttpsError("invalid-argument", "Missing required parameters");
      }

      // Fetch certificate data
      const certRef = db
        .collection("USERS")
        .doc(userId)
        .collection("contacts")
        .doc(contactId)
        .collection("issuedCertificates")
        .doc(certificateId);

      const certSnap = await certRef.get();

      if (!certSnap.exists) {
        throw new HttpsError("not-found", "Certificate not found");
      }

      const certificate = certSnap.data() as CertificateData;

      // Fetch business details
      const userDoc = await db.collection("USERS").doc(userId).get();
      const userData = userDoc.data();

      const businessDetails: BusinessDetails = {
        businessName: userData?.businessName || "",
        companyNumber: userData?.companyNumber || "",
        businessAddress: userData?.businessAddress || "",
        businessPhone: userData?.businessPhone || "",
        businessEmail: userData?.businessEmail || "",
        logoUrl: userData?.logoUrl || "",
      };

      // Generate HTML
      const html = generateCertificateHTML(certificate, businessDetails);

      // Launch Puppeteer with Chromium
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();

      // Set content and wait for resources
      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      // Wait a bit for any fonts or images to load
      await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: {
          top: "10mm",
          bottom: "10mm",
          left: "10mm",
          right: "10mm",
        },
      });

      await browser.close();

      // Convert to base64
      const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

      // Return PDF
      return {
        success: true,
        pdf: pdfBase64,
        filename: `${certificate.name}.pdf`,
      };
    } catch (error: any) {
      console.error("Error generating certificate PDF:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to generate PDF",
      );
    }
  },
);
