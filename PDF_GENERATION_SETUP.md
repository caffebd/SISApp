# PDF Generation Setup Documentation

## Overview

This document describes the server-side PDF generation implementation for certificates using Firebase Cloud Functions and Puppeteer.

## Architecture

- **Client-Side**: React/Next.js app makes a call to Firebase Cloud Function
- **Server-Side**: Cloud Function uses Puppeteer (headless Chrome) to generate high-quality PDFs
- **Storage**: PDFs are generated on-demand (not stored)
- **Region**: europe-west2 (matches Firestore region)

## Implementation Details

### Cloud Function

**File**: `firebase-functions/src/generateCertificatePDF.ts`

**Configuration**:
- Memory: 2GiB (required for Puppeteer/Chrome)
- Timeout: 60 seconds
- Region: europe-west2
- Authentication: Required

**Function Name**: `generateCertificatePDF`

**Input Parameters**:
```typescript
{
  userId: string;
  contactId: string;
  certificateId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  pdf: string;        // Base64-encoded PDF
  filename: string;   // Suggested filename
}
```

### Client-Side Implementation

**File**: `app/admin/contacts/[id]/certificates/[certificateId]/page.tsx`

**Features**:
- ✅ Loading state with spinner
- ✅ Automatic download trigger
- ✅ Error handling
- ✅ Disabled state during generation
- ✅ Works on mobile devices

**Usage**:
```typescript
const handleDownloadPDF = async () => {
  const generatePDF = httpsCallable(functions, "generateCertificatePDF");
  const result = await generatePDF({ userId, contactId, certificateId });
  // Convert base64 to blob and trigger download
};
```

## Deployment

### Deploy Cloud Function

```bash
cd firebase-functions
npm run build
npm run deploy
```

### Deploy Next.js App

No changes required - the client code is already deployed with your Next.js app.

## Testing

1. Navigate to a certificate viewer page
2. Click the "Download" button
3. Wait 2-5 seconds for PDF generation
4. PDF should automatically download with the correct filename

## Cost Estimation

**Firebase Cloud Functions Pricing** (as of 2024):
- Invocations: $0.40 per 1M invocations
- Compute time: $0.00001667 per GB-second
- Memory: 2GiB
- Average duration: ~5 seconds

**Cost per PDF**:
- Invocation: $0.0000004
- Compute: ~$0.00017 (5 seconds × 2GiB × $0.00001667)
- **Total: ~$0.00017 per PDF** (or ~5,900 PDFs per $1)

**Monthly estimates**:
- 100 PDFs/month: $0.017 (~$0.02)
- 1,000 PDFs/month: $0.17
- 10,000 PDFs/month: $1.70

## Advantages of Server-Side PDF Generation

### ✅ Pros
1. **Perfect Quality**: Exact match to print CSS
2. **Consistent Output**: Same on all devices (mobile, desktop, tablet)
3. **Better Mobile Experience**: Server handles heavy processing
4. **Professional PDFs**: Proper page breaks, fonts, layout
5. **Reusable for Email**: Same function can generate PDFs for email attachments
6. **No Bundle Size Impact**: Puppeteer runs on server, not in user's browser

### ❌ Cons
1. **Network Latency**: 2-5 second wait time
2. **Costs Money**: ~$0.00017 per PDF
3. **Requires Server**: Firebase Cloud Functions setup
4. **Cold Start**: First request after inactivity can be slower

## Future Enhancements

### Email Integration
The same Cloud Function can be extended to send PDFs via email:
```typescript
// Generate PDF
const pdfBuffer = await page.pdf({ ... });

// Send via email (using SendGrid, Nodemailer, etc.)
await sendEmail({
  to: customer.email,
  subject: `Certificate: ${certificate.name}`,
  attachments: [{ filename: 'certificate.pdf', content: pdfBuffer }]
});
```

### PDF Storage (Optional)
If you want to store PDFs for faster retrieval:
```typescript
// Upload to Firebase Storage
const bucket = admin.storage().bucket();
const file = bucket.file(`certificates/${certificateId}.pdf`);
await file.save(pdfBuffer, { contentType: 'application/pdf' });

// Get download URL
const [url] = await file.getSignedUrl({
  action: 'read',
  expires: '03-01-2500'
});
```

### Batch Generation
Generate multiple certificates at once:
```typescript
export const batchGenerateCertificates = onCall(async (request) => {
  const { certificateIds } = request.data;
  const pdfs = await Promise.all(
    certificateIds.map(id => generateSinglePDF(id))
  );
  return { success: true, pdfs };
});
```

## Troubleshooting

### Function Timeout
If PDFs are complex and take >60 seconds:
```typescript
{
  timeoutSeconds: 120, // Increase to 120 seconds
}
```

### Memory Issues
If Puppeteer crashes due to memory:
```typescript
{
  memory: "4GiB", // Increase to 4GiB
}
```

### Chrome Not Found
Puppeteer includes Chrome, but if issues occur:
```bash
cd firebase-functions
npm install puppeteer --ignore-scripts=false
```

### CORS Errors
If calling from different domain, update Firebase hosting config:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "Access-Control-Allow-Origin", "value": "*" }
        ]
      }
    ]
  }
}
```

## Security

### Authentication
- Function requires Firebase Authentication
- Only authenticated users can generate PDFs
- User can only access their own certificates

### Authorization (Future)
Add additional checks:
```typescript
// Verify user owns the certificate
const certRef = db.collection('USERS').doc(userId)
  .collection('contacts').doc(contactId)
  .collection('issuedCertificates').doc(certificateId);

const certSnap = await certRef.get();

if (!certSnap.exists) {
  throw new HttpsError('not-found', 'Certificate not found');
}

// Verify request.auth.uid matches userId
if (request.auth.uid !== userId) {
  throw new HttpsError('permission-denied', 'Unauthorized');
}
```

## Monitoring

### Cloud Console
Monitor function performance:
1. Go to Firebase Console → Functions
2. Click on `generateCertificatePDF`
3. View metrics: invocations, errors, execution time, memory usage

### Logs
View function logs:
```bash
firebase functions:log --only generateCertificatePDF
```

### Alerts (Optional)
Set up alerts for:
- High error rate
- Slow execution time (>10 seconds)
- Memory limit reached

## Dependencies

**firebase-functions/package.json**:
```json
{
  "dependencies": {
    "firebase-admin": "^13.0.1",
    "firebase-functions": "^6.2.0",
    "puppeteer": "^21.x.x"
  }
}
```

## File Structure

```
firebase-functions/
├── src/
│   ├── index.ts                    # Exports all functions
│   ├── generateCertificatePDF.ts   # PDF generation function
│   └── ...
├── package.json
└── tsconfig.json

app/
└── admin/
    └── contacts/
        └── [id]/
            └── certificates/
                └── [certificateId]/
                    └── page.tsx    # Certificate viewer with download
```

## Notes

1. **Bundle Size**: Puppeteer adds ~200MB to the deployed function, but this is server-side only
2. **Cold Starts**: First invocation after ~15 min of inactivity may take 10-15 seconds
3. **Concurrent Requests**: Function can handle multiple simultaneous PDF generations
4. **Image Loading**: External images (like business logo) must be publicly accessible
5. **Fonts**: Standard system fonts work out of the box; custom fonts need to be embedded in CSS

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review Cloud Function metrics
3. Test locally using Firebase Emulator Suite:
   ```bash
   cd firebase-functions
   npm run serve
   ```
4. Contact Firebase Support for platform-specific issues