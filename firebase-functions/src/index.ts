import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

// Initialize Admin SDK once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Get USER_ID from environment variable
const USER_ID = defineString('USER_ID');

// Helper function to get user's subcollection
function getUserCollection(userId: string, collectionName: string) {
  return db.collection('USERS').doc(userId).collection(collectionName);
}

// Small helper: haversine distance in km
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function kmToMiles(km: number): number {
  return km * 0.621371;
}

function milesToKm(miles: number): number {
  return miles / 0.621371;
}

// Business rules
const OFFICE_LOCATION = { lat: 51.509865, lng: -0.118092 }; // Central London for now
const MAX_OFFICE_RADIUS_MILES = 25;
const MAX_CUSTOMER_DISTANCE_MILES = 10;
const SLOT_DURATION_MINUTES = 60;
const EARLIEST_TIME_HOUR = 10; // 10am
const LATEST_TIME_HOUR = 16;   // 4pm (last slot starts at 4pm, ends at 5pm)

interface GetAvailableSlotsInput {
  location: { lat: number; lng: number };
  month: string; // YYYY-MM (e.g. "2025-11")
}

export const getAvailableSlots = onCall<GetAvailableSlotsInput>({ region: 'europe-west2' }, async (request) => {
  const { location, month } = request.data || {};
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number' || !month) {
    return { ok: false, reason: 'Invalid input' };
  }

  const userId = USER_ID.value();

  // Check if customer is within 25 miles of main office
  const distanceFromOfficeKm = haversineKm(OFFICE_LOCATION, location);
  const distanceFromOfficeMiles = kmToMiles(distanceFromOfficeKm);
  if (distanceFromOfficeMiles > MAX_OFFICE_RADIUS_MILES) {
    return { ok: false, reason: `Location is ${distanceFromOfficeMiles.toFixed(1)} miles from office (max ${MAX_OFFICE_RADIUS_MILES} miles)` };
  }

  // Parse month to get date range
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59)); // last day of month
  
  // Get current date (start of today in UTC) to filter out past dates
  const now = new Date();
  const todayStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split('T')[0];
  
  // Query engineerDays for the entire month from user's subcollection
  const daysSnap = await getUserCollection(userId, 'engineerDays')
    .where('date', '>=', startDate.toISOString().split('T')[0])
    .where('date', '<=', endDate.toISOString().split('T')[0])
    .get();

  const availableSlots: Array<{ date: string; time: string; engineerId: string }> = [];

  // Track which engineerId+date combinations are explicitly defined in engineerDays
  const definedDayKeys = new Set<string>();

  for (const doc of daysSnap.docs) {
    const day = doc.data() as any;
    const { engineerId, date } = day;
    definedDayKeys.add(`${engineerId}_${date}`);

    // Skip past dates and today
    if (date <= todayStr) continue;

    // Get all appointments for this engineer on this date, sorted by start time
    const appointmentsSnap = await getUserCollection(userId, 'appointments')
      .where('engineerId', '==', engineerId)
      .where('date', '==', date)
      .where('status', 'in', ['confirmed', 'offered'])
      .get();

    const bookedAppts = appointmentsSnap.docs.map((d) => {
      const a = d.data();
      return {
        start: a.start,
        end: a.end,
        location: a.address?.location as { lat: number; lng: number } | undefined,
      };
    }).sort((a, b) => a.start.localeCompare(b.start));

    // If no appointments, offer 10am
    if (bookedAppts.length === 0) {
      const slot10am = `${date}T10:00:00Z`;
      const slotDate = new Date(slot10am);
      if (slotDate.getUTCHours() >= EARLIEST_TIME_HOUR && slotDate.getUTCHours() < LATEST_TIME_HOUR) {
        availableSlots.push({ date, time: '10:00', engineerId });
      }
      continue;
    }

    // Check each gap after a booked appointment
    for (const appt of bookedAppts) {
      if (!appt.location) continue;

      const distanceKm = haversineKm(appt.location, location);
      const distanceMiles = kmToMiles(distanceKm);

      // Only proceed if within 10 miles of this appointment
      if (distanceMiles > MAX_CUSTOMER_DISTANCE_MILES) continue;

      // Determine buffer based on distance
      let bufferMinutes = 30;
      if (distanceMiles > 5 && distanceMiles <= 10) {
        bufferMinutes = 45;
      }

      // Proposed start = end of last appointment + buffer
      const apptEnd = new Date(appt.end);
      const proposedStart = new Date(apptEnd.getTime() + bufferMinutes * 60 * 1000);
      const proposedEnd = new Date(proposedStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

      // Check if proposed slot is within working hours
      const hourUTC = proposedStart.getUTCHours();
      if (hourUTC < EARLIEST_TIME_HOUR || hourUTC >= LATEST_TIME_HOUR) continue;

      // Check if this slot overlaps with any already booked slot
      const overlaps = bookedAppts.some((other) => {
        const otherStart = new Date(other.start);
        const otherEnd = new Date(other.end);
        return proposedStart < otherEnd && proposedEnd > otherStart;
      });

      if (!overlaps) {
        const timeStr = proposedStart.toISOString().substring(11, 16); // HH:MM
        availableSlots.push({ date, time: timeStr, engineerId });
        break; // one slot per engineer per day for simplicity
      }
    }
  }

  // Fallback rule: if no engineerDays record exists for an engineer on a given day,
  // and it's not Sunday, assume engineer is available from 10:00 (first appointment).
  // This applies only if there are no appointments already for that engineer on that date.

  // Gather engineers (union of engineers collection and any seen in engineerDays)
  const engineersSet = new Set<string>();
  daysSnap.docs.forEach((d) => engineersSet.add((d.data() as any).engineerId));
  const engineersSnap = await getUserCollection(userId, 'engineers').get();
  engineersSnap.forEach((doc) => engineersSet.add(doc.id));
  const engineerIds = Array.from(engineersSet);

  // Iterate all days of the month
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const dayOfWeek = d.getUTCDay(); // 0=Sun
    if (dayOfWeek === 0) continue; // skip Sundays
    const dateStr = d.toISOString().split('T')[0];

    // Skip past dates and today
    if (dateStr <= todayStr) continue;

    for (const engineerId of engineerIds) {
      const key = `${engineerId}_${dateStr}`;
      if (definedDayKeys.has(key)) continue; // explicit day exists, handled above

      // Check for any existing appointments for this engineer and date
      const appointmentsSnap = await getUserCollection(userId, 'appointments')
        .where('engineerId', '==', engineerId)
        .where('date', '==', dateStr)
        .where('status', 'in', ['confirmed', 'offered'])
        .get();

      if (appointmentsSnap.empty) {
        // Offer 10:00 as the first slot within working hours
        availableSlots.push({ date: dateStr, time: '10:00', engineerId });
      }
    }
  }

  return { ok: true, slots: availableSlots };
});

// --- Seeding support for production (one-time use) ---
// NOTE: This is intentionally simple and should be removed or disabled after use.
// It seeds small sample datasets into Firestore in the same project/region.

type SeedInput = { seedKey?: string };

const SAMPLE_ENGINEERS: Array<{
  id: string;
  name: string;
  email: string;
  phone: string;
}> = [
  {
    id: 'eng-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44 20 1234 5678',
  },
  {
    id: 'eng-002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+44 161 234 5678',
  },
];

const SAMPLE_ENGINEER_DAYS: Array<{
  engineerId: string;
  date: string;
  startLocation?: { lat: number; lng: number };
  slots: Array<{ start: string; end: string; booked: boolean; appointmentId?: string }>;
}> = [
  {
    engineerId: 'eng-001',
    date: '2025-11-02',
    startLocation: { lat: 51.509865, lng: -0.118092 },
    slots: [
      { start: '2025-11-02T09:00:00Z', end: '2025-11-02T10:00:00Z', booked: true, appointmentId: 'appt-001' },
      { start: '2025-11-02T10:30:00Z', end: '2025-11-02T11:30:00Z', booked: false },
      { start: '2025-11-02T12:00:00Z', end: '2025-11-02T13:00:00Z', booked: false },
    ],
  },
  {
    engineerId: 'eng-002',
    date: '2025-11-02',
    startLocation: { lat: 53.480759, lng: -2.242631 },
    slots: [
      { start: '2025-11-02T09:00:00Z', end: '2025-11-02T10:00:00Z', booked: false },
      { start: '2025-11-02T10:30:00Z', end: '2025-11-02T11:30:00Z', booked: false },
    ],
  },
];

const SAMPLE_APPOINTMENTS: Array<{
  id?: string;
  status: string;
  engineerId?: string;
  date: string;
  start: string;
  end: string;
  customer?: { name?: string };
  address: { postcode: string; location?: { lat: number; lng: number } };
}> = [
  {
    id: 'appt-001',
    status: 'confirmed',
    engineerId: 'eng-001',
    date: '2025-11-02',
    start: '2025-11-02T09:00:00Z',
    end: '2025-11-02T10:00:00Z',
    customer: { name: 'Alice' },
    address: { postcode: 'SW1A 1AA', location: { lat: 51.501364, lng: -0.14189 } },
  },
];

export const seedSampleData = onCall<SeedInput>({ region: 'europe-west2' }, async (request) => {
  const { seedKey } = request.data || {};
  // Change this key before running, then remove the function after seeding.
  const REQUIRED_KEY = 'ALLOW_SEED';
  if (seedKey !== REQUIRED_KEY) {
    return { ok: false, reason: 'unauthorized' };
  }

  const userId = USER_ID.value();

  // Upsert engineers
  let engineersWritten = 0;
  for (const e of SAMPLE_ENGINEERS) {
    await getUserCollection(userId, 'engineers').doc(e.id).set({
      name: e.name,
      email: e.email,
      phone: e.phone,
    });
    engineersWritten++;
  }

  // Upsert engineerDays with a deterministic doc id for idempotency
  let daysWritten = 0;
  for (const d of SAMPLE_ENGINEER_DAYS) {
    const id = `${d.engineerId}_${d.date}`;
    await getUserCollection(userId, 'engineerDays').doc(id).set({
      engineerId: d.engineerId,
      date: d.date,
      startLocation: d.startLocation,
      slots: d.slots,
    });
    daysWritten++;
  }

  // Upsert appointments (use provided id if present)
  let apptsWritten = 0;
  for (const a of SAMPLE_APPOINTMENTS) {
    if (a.id) {
      const { id, ...rest } = a as any;
      await getUserCollection(userId, 'appointments').doc(String(id)).set(rest);
    } else {
      await getUserCollection(userId, 'appointments').add(a);
    }
    apptsWritten++;
  }

  return { ok: true, engineersWritten, daysWritten, apptsWritten };
});

// --- Booking function ---
interface BookAppointmentInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer: { name: string; email: string; phone: string; addressLine?: string };
  address: { postcode: string; location: { lat: number; lng: number } };
}

export const bookAppointment = onCall<BookAppointmentInput>({ region: 'europe-west2' }, async (request) => {
  try {
    const data = request.data;
    if (!data || !data.date || !data.time || !data.customer || !data.address) {
      return { ok: false, reason: 'Invalid input' };
    }

    const userId = USER_ID.value();
    const { date, time, customer, address } = data;
    if (!customer.name || !customer.email || !customer.phone) {
      return { ok: false, reason: 'Missing customer details' };
    }

    const startISO = `${date}T${time}:00Z`;
    const start = new Date(startISO);
    if (isNaN(start.getTime())) {
      return { ok: false, reason: 'Invalid date/time' };
    }
    const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    // Gather candidate engineers (union of engineers collection and engineerDays for the month, plus appointments in month)
    const engineersSet = new Set<string>();
    const [yyyy, mm] = date.split('-').map(Number);
    const monthStart = new Date(Date.UTC(yyyy as number, (mm as number) - 1, 1));
    const monthEnd = new Date(Date.UTC(yyyy as number, (mm as number), 0, 23, 59, 59));

    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    const monthDaysSnap = await getUserCollection(userId, 'engineerDays')
      .where('date', '>=', monthStartStr)
      .where('date', '<=', monthEndStr)
      .get();
    monthDaysSnap.forEach((d) => engineersSet.add((d.data() as any).engineerId));

    const engineersSnap = await getUserCollection(userId, 'engineers').get();
    engineersSnap.forEach((doc) => engineersSet.add(doc.id));

    const monthApptsSnap = await getUserCollection(userId, 'appointments')
      .where('date', '>=', monthStartStr)
      .where('date', '<=', monthEndStr)
      .get();
    monthApptsSnap.forEach((d) => {
      const a = d.data() as any;
      if (a.engineerId) engineersSet.add(String(a.engineerId));
    });

    const engineerIds = Array.from(engineersSet);

    if (engineerIds.length === 0) {
      return { ok: false, reason: 'No engineers configured' };
    }

    // Find engineers busy at that time (overlap)
    const sameDayAppts = await getUserCollection(userId, 'appointments')
      .where('date', '==', date)
      .where('status', 'in', ['confirmed', 'offered'])
      .get();

    const busy = new Set<string>();
    sameDayAppts.forEach((doc) => {
      const a = doc.data();
      const otherStart = new Date(a.start);
      const otherEnd = new Date(a.end);
      const overlaps = start < otherEnd && end > otherStart;
      if (overlaps && a.engineerId) busy.add(String(a.engineerId));
    });

    const freeEngineer = engineerIds.find((id) => !busy.has(id));
    if (!freeEngineer) {
      return { ok: false, reason: 'No engineer free at selected time' };
    }

    // Create appointment and update engineerDays in a transaction, re-checking availability
    const result = await db.runTransaction(async (tx) => {
      // Prepare refs first (creating a doc ref does not perform a write)
      const apptRef = getUserCollection(userId, 'appointments').doc();
      const dayId = `${freeEngineer}_${date}`;
      const dayRef = getUserCollection(userId, 'engineerDays').doc(dayId);

      // All reads BEFORE any writes
      const apptsSnap = await tx.get(
        getUserCollection(userId, 'appointments')
          .where('engineerId', '==', freeEngineer)
          .where('date', '==', date)
          .where('status', 'in', ['confirmed', 'offered'])
      );
      const daySnap = await tx.get(dayRef);

      let conflict = false;
      apptsSnap.forEach((d) => {
        const a = d.data() as any;
        const otherStart = new Date(a.start);
        const otherEnd = new Date(a.end);
        if (start < otherEnd && end > otherStart) {
          conflict = true;
        }
      });
      if (conflict) {
        return { ok: false, reason: 'Slot just taken, please pick another' } as const;
      }

      // Now perform writes
      const apptData = {
        status: 'pending',
        engineerId: freeEngineer,
        date,
        start: start.toISOString(),
        end: end.toISOString(),
        appointmentType: 'visit', // default type for customer booking
        customer: { name: customer.name, email: customer.email, phone: customer.phone },
        address: { postcode: address.postcode, line: customer.addressLine, location: address.location },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.set(apptRef, apptData);

      const slot = { start: start.toISOString(), end: end.toISOString(), booked: true, appointmentId: apptRef.id };

      if (!daySnap.exists) {
        tx.set(dayRef, {
          engineerId: freeEngineer,
          date,
          slots: [slot],
        });
      } else {
        const dayData = daySnap.data() as any;
        const slots: any[] = Array.isArray(dayData.slots) ? [...dayData.slots] : [];
        const idx = slots.findIndex((s) => s.start === slot.start && s.end === slot.end);
        if (idx >= 0) {
          slots[idx] = { ...slots[idx], booked: true, appointmentId: apptRef.id };
        } else {
          slots.push(slot);
        }
        tx.update(dayRef, { slots });
      }

      return { ok: true, appointmentId: apptRef.id } as const;
    });

    return result;
  } catch (e: any) {
    console.error('bookAppointment error', e);
    return { ok: false, reason: e?.message || 'internal' };
  }
});

// Export banking functions
export * from './bankDetails';
