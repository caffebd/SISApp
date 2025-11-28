# Quick Reference - Certificate PDF Generation

## ✅ Status: DEPLOYED & WORKING (Updated with Better Spacing)

---

## Test PDF Download

### Quick Test (30 seconds):
1. Go to any contact
2. Issue a "Solid Fuel Sweep" certificate
3. Fill all fields + add signatures
4. Save certificate
5. Click "Download PDF"
6. Verify PDF matches browser view ✅

---

## What's Working

✅ **Layout** - Two columns (Sweeping | Checks)  
✅ **Signatures** - Drawn images + typed text  
✅ **Checks Grid** - 2×4 condition checks  
✅ **Appliance** - All fields including booleans  
✅ **Spacing** - Better padding, matches print dialog  
✅ **Styling** - Professional appearance with improved readability

---

## Deployment Info

**Function:** `generateCertificatePDF`  
**Region:** `europe-west2`  
**Memory:** 2GiB  
**Timeout:** 60 seconds  
**Status:** ✅ Deployed successfully  

---

## File Modified

`firebase-functions/src/generateCertificatePDF.ts`

---

## Redeploy Command

```bash
cd firebase-functions
npm run build
firebase deploy --only functions:generateCertificatePDF
```

---

## View Logs

```bash
firebase functions:log --only generateCertificatePDF
```

Or: Firebase Console → Functions → generateCertificatePDF → Logs

---

## Common Issues

### PDF not downloading?
- Check Firebase logs
- Verify certificate has all fields
- Check signatures were saved

### Layout wrong?
- Should match viewer exactly
- Compare side-by-side
- Verify using standard template

### Signatures missing?
- Check Firestore has `signatures.engineer/customer`
- Verify `data` and `type` fields exist
- For drawn: check data URL is valid

---

## Documentation

📄 `PDF_GENERATION_FIXED.md` - Full technical details  
📄 `DEPLOY_PDF_FIX.md` - Deployment guide  
📄 `DEPLOYMENT_SUCCESS.md` - Success summary  
📄 `PDF_SPACING_UPDATE.md` - Spacing improvements

---

## Support

1. Check troubleshooting above
2. Review Firebase logs
3. Compare PDF vs viewer
4. Verify certificate data in Firestore

---

**Last Updated:** 2024  
**Version:** 2.1 (Improved spacing)  
**Status:** ✅ Production Ready