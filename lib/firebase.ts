import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDu9BKmq87ZkH__F9Hrx234INSD9gU3YNE",
  authDomain: "stoveindustryapp-97cd8.firebaseapp.com",
  projectId: "stoveindustryapp-97cd8",
  storageBucket: "stoveindustryapp-97cd8.firebasestorage.app",
  messagingSenderId: "401042306431",
  appId: "1:401042306431:web:35d965846c7b7d7780164a",
  measurementId: "G-BGQSKS7J4Y"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// Use europe-west2 to match your Firestore region
const functions = getFunctions(app, 'europe-west2');

// Connect to Functions emulator when running locally if requested
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  try {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    // eslint-disable-next-line no-console
    console.log('[Firebase] Connected Functions emulator at 127.0.0.1:5001');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Firebase] Failed to connect Functions emulator', e);
  }
}

export { app, auth, db, storage, functions };
