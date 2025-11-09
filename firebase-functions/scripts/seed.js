/*
  Seed Firestore Emulator with sample data.
  Usage:
    1) Start Firestore emulator (and Functions is fine too):
       firebase emulators:start --only firestore
    2) In another terminal, from the functions/ directory:
       npm run seed
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Ensure we target the emulator by default
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'demo-no-project' });
}

const db = admin.firestore();

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function upsertDoc(collection, id, data) {
  if (id) {
    await db.collection(collection).doc(String(id)).set(data, { merge: false });
  } else {
    await db.collection(collection).add(data);
  }
}

async function seedArray(array, defaultCollection) {
  for (const entry of array) {
    if (!entry || typeof entry !== 'object') continue;
    const { __collection__, id, ...rest } = entry;
    const collection = __collection__ || defaultCollection;
    if (!collection) continue;
    await upsertDoc(collection, id, rest);
  }
}

(async () => {
  try {
    const root = path.resolve(__dirname, '../../');
    const dataDir = path.join(root, 'data');

    const engineerDaysPath = path.join(dataDir, 'sample.engineerDays.json');
    const appointmentsPath = path.join(dataDir, 'sample.appointments.json');

    const engineerDays = fs.existsSync(engineerDaysPath) ? readJson(engineerDaysPath) : [];
    const appointments = fs.existsSync(appointmentsPath) ? readJson(appointmentsPath) : [];

    console.log(`[seed] Seeding engineerDays (${engineerDays.length})...`);
    await seedArray(engineerDays, 'engineerDays');

    console.log(`[seed] Seeding appointments (${appointments.length})...`);
    await seedArray(appointments, 'appointments');

    console.log('[seed] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err);
    process.exit(1);
  }
})();
