# Quick Deployment Guide - PDF Generation Fix

## What Was Fixed
The PDF download function now matches the certificate viewer exactly, including:
- ✅ Two-column layout (Sweeping/Resweep | Checks/CO Alarm)
- ✅ 2×4 condition checks grid
- ✅ Digital signatures (drawn and typed)
- ✅ All appliance fields (ventilation, CO alarm present)
- ✅ Proper spacing to fit A4 landscape

## Deploy Steps

### 1. Navigate to Functions Directory
```bash
cd firebase-functions
```

### 2. Install Dependencies (if needed)
```bash
npm install
```

### 3. Build the Functions
```bash
npm run build
```

### 4. Deploy the Function
```bash
firebase deploy --only functions:generateCertificatePDF
```

### 5. Monitor Deployment
Watch for:
- ✅ "Deploy complete!"
- ✅ Function URL displayed
- ⚠️ Any errors in deployment

## Expected Output
```
✔  functions[generateCertificatePDF(europe-west2)] Successful update operation.
✔  Deploy complete!
```

## Test After Deployment

### Test 1: Standard Certificate with Signatures
1. Go to a contact page
2. Issue a new Solid Fuel Sweep certificate
3. Fill in all fields
4. Add CO Alarm preset comments
5. Add engineer signature (draw or type)
6. Add customer signature (draw or type)
7. Save certificate
8. View certificate in browser (verify it looks good)
9. Click "Download PDF"
10. Open PDF and verify:
    - ✅ Layout matches browser view
    - ✅ All fields present
    - ✅ Signatures render correctly
    - ✅ 2×4 checks grid displays
    - ✅ Fits on one A4 landscape page

### Test 2: Certificate Without Signatures
1. Issue certificate without signatures
2. Download PDF
3. Verify sign-off section still renders correctly

### Test 3: Certificate Without Appliance
1. Issue certificate without appliance details
2. Download PDF
3. Verify layout handles missing section gracefully

## Troubleshooting

### "Function not found" Error
- Make sure you're in the `firebase-functions` directory
- Run `firebase list` to verify project
- Run `firebase use <project-id>` to select correct project

### Build Errors
```bash
# Clean and rebuild
rm -rf lib/
npm run build
```

### Deployment Timeout
- The function uses 2GiB memory and 60s timeout
- This is normal for Puppeteer/Chromium
- Wait for full deployment (may take 2-3 minutes)

### Images Not Showing in PDF
- Verify business logo URL is publicly accessible
- Check if URL is valid in certificate viewer
- Logo should work if it works in browser view

### Signatures Missing in PDF
- Verify signatures were saved with certificate
- Check Firestore: `USERS/{userId}/contacts/{contactId}/issuedCertificates/{certId}`
- Look for `signatures.engineer` and `signatures.customer` fields
- Should have `data` (string) and `type` ("drawn" or "typed")

## Rollback (if needed)
If something goes wrong:

```bash
# View previous deployments
firebase functions:log --only generateCertificatePDF

# Deploy specific version (if needed)
firebase deploy --only functions:generateCertificatePDF --force
```

Or restore the old function code from git:
```bash
git checkout HEAD~1 firebase-functions/src/generateCertificatePDF.ts
npm run build
firebase deploy --only functions:generateCertificatePDF
```

## Cost Considerations
- Function uses 2GiB memory (higher cost tier)
- Average execution: 5-10 seconds per PDF
- Chromium startup overhead included
- Monitor costs in Firebase Console > Usage

## Monitoring After Deployment

### Check Logs
```bash
# View real-time logs
firebase functions:log --only generateCertificatePDF

# Or in Firebase Console
# Functions > generateCertificatePDF > Logs
```

### Success Indicators
- No error logs
- PDF downloads complete successfully
- Users report PDFs match viewer
- No timeout errors

### Common Issues in Logs
- **"Memory limit exceeded"** → Increase to 4GiB if needed
- **"Timeout"** → Increase timeout to 120s if needed
- **"Image failed to load"** → Logo URL issue (non-critical)
- **"Field not found"** → Template mismatch (check certificate template version)

## Files Changed
- `firebase-functions/src/generateCertificatePDF.ts` - Complete rewrite

## Documentation
- `PDF_GENERATION_FIXED.md` - Detailed technical documentation
- `PDF_GENERATION_UPDATE_NEEDED.md` - Original plan (obsolete)

## Success Criteria
✅ PDF downloads work without errors
✅ PDF layout matches certificate viewer exactly
✅ Signatures render correctly (drawn and typed)
✅ All fields display properly
✅ Certificate fits on one A4 landscape page
✅ No timeout or memory errors in logs

---

**Ready to Deploy?** Follow steps 1-4 above.

**Need Help?** Check troubleshooting section or review logs.