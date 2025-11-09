import * as admin from 'firebase-admin';
import * as CryptoJS from 'crypto-js';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Initialize Admin SDK if not already
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Use a private environment variable for the encryption key
// Secret defined via: firebase functions:secrets:set BANK_ENCRYPTION_KEY
const BANK_ENCRYPTION_KEY = defineSecret('BANK_ENCRYPTION_KEY');

// Helper functions
function encryptField(value: string): string {
  const key = BANK_ENCRYPTION_KEY.value();
  if (!key) return value;
  return CryptoJS.AES.encrypt(value, key).toString();
}
function decryptField(ciphertext: string): string {
  const key = BANK_ENCRYPTION_KEY.value();
  if (!key) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails or produces empty string, assume value was stored in plaintext (pre-migration)
    return result || ciphertext;
  } catch {
    // If not decryptable, assume it's plaintext and return as-is (helps migrate old data)
    return ciphertext;
  }
}

// Callable function to save bank details (encrypt before saving)
export const saveBankDetails = onCall({ 
  region: 'europe-west2', 
  secrets: [BANK_ENCRYPTION_KEY],
  cors: true
}, async (request) => {
  const { data, auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const userId = auth.uid;
  const { bankName, accountName, accountNumber, sortCode } = data;
  const docRef = db.collection('USERS').doc(userId).collection('bankDetails').doc('main');
  await docRef.set({
    bankName: encryptField(bankName),
    accountName: encryptField(accountName),
    accountNumber: encryptField(accountNumber),
    sortCode: encryptField(sortCode),
  }, { merge: true });
  return { ok: true };
});

// Callable function to load bank details (decrypt after reading)
export const loadBankDetails = onCall({ 
  region: 'europe-west2', 
  secrets: [BANK_ENCRYPTION_KEY],
  cors: true
}, async (request) => {
  const { auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const userId = auth.uid;
  const docRef = db.collection('USERS').doc(userId).collection('bankDetails').doc('main');
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return { ok: true, bankDetails: null };
  }
  const d = docSnap.data() || {};
  return {
    ok: true,
    bankDetails: {
      bankName: d.bankName ? decryptField(d.bankName) : '',
      accountName: d.accountName ? decryptField(d.accountName) : '',
      accountNumber: d.accountNumber ? decryptField(d.accountNumber) : '',
      sortCode: d.sortCode ? decryptField(d.sortCode) : '',
    },
  };
});

// Explicit HTTP endpoints with manual ID token auth & CORS (fallback when callable blocked by CORS)
function getCorsOrigin(req: any): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  const allowed = [
    'http://localhost:3000',
    'https://stoveindustryapp-97cd8.web.app',
    'https://stoveindustryapp-97cd8.firebaseapp.com'
  ];
  return allowed.includes(origin) ? origin : null;
}

async function verifyIdToken(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new HttpsError('unauthenticated', 'Missing ID token');
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  } catch (e) {
    throw new HttpsError('unauthenticated', 'Invalid ID token');
  }
}

export const loadBankDetailsHttp = onRequest({ region: 'europe-west2', secrets: [BANK_ENCRYPTION_KEY] }, async (req, res) => {
  const origin = getCorsOrigin(req);
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.status(204).send('');
    return;
  }
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const uid = await verifyIdToken(token);
    const docSnap = await db.collection('USERS').doc(uid).collection('bankDetails').doc('main').get();
    if (!docSnap.exists) {
      res.json({ ok: true, bankDetails: null });
      return;
    }
    const d = docSnap.data() || {};
    res.json({
      ok: true,
      bankDetails: {
        bankName: d.bankName ? decryptField(d.bankName) : '',
        accountName: d.accountName ? decryptField(d.accountName) : '',
        accountNumber: d.accountNumber ? decryptField(d.accountNumber) : '',
        sortCode: d.sortCode ? decryptField(d.sortCode) : '',
      }
    });
  } catch (e: any) {
    console.error('[loadBankDetailsHttp] error', e);
    res.status(401).json({ ok: false, error: e.message || 'Unauthorized' });
  }
});

export const saveBankDetailsHttp = onRequest({ region: 'europe-west2', secrets: [BANK_ENCRYPTION_KEY] }, async (req, res) => {
  const origin = getCorsOrigin(req);
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.status(204).send('');
    return;
  }
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const uid = await verifyIdToken(token);
    const { bankName = '', accountName = '', accountNumber = '', sortCode = '' } = req.body || {};
    const docRef = db.collection('USERS').doc(uid).collection('bankDetails').doc('main');
    await docRef.set({
      bankName: encryptField(bankName),
      accountName: encryptField(accountName),
      accountNumber: encryptField(accountNumber),
      sortCode: encryptField(sortCode),
    }, { merge: true });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[saveBankDetailsHttp] error', e);
    res.status(401).json({ ok: false, error: e.message || 'Unauthorized' });
  }
});
