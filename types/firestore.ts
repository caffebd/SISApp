// Firestore data model types for the booking system
// These types mirror the collections created by Cloud Functions and the app

export type ISODate = string; // e.g. "2025-11-02"
export type ISODateTime = string; // e.g. "2025-11-02T09:30:00Z"

export interface GeoPointLike {
  lat: number;
  lng: number;
}

// Engineers that can receive bookings
export interface Engineer {
  id: string; // document id
  name: string;
  active: boolean;
  basePostcode?: string;
  baseLocation?: GeoPointLike; // optional cached geocoded base
  maxTravelKm: number; // max distance allowed between consecutive appointments
  skills?: string[];
}

// A working day for an engineer (denormalized for quick lookups)
export interface EngineerDay {
  id: string; // document id
  engineerId: string;
  date: ISODate; // YYYY-MM-DD (local business timezone)
  startLocation?: GeoPointLike; // starting location for the day (base or first job)
  slots: Slot[];
}

export interface Slot {
  start: ISODateTime; // ISO timestamp
  end: ISODateTime;   // ISO timestamp
  booked: boolean;
  appointmentId?: string; // set when booked
}

// Customer appointment document
export interface Appointment {
  id: string; // document id
  status: 'pending' | 'offered' | 'confirmed' | 'declined' | 'cancelled' | 'complete';
  engineerId?: string; // set after offer/assignment
  date: ISODate; // convenience
  start: ISODateTime;
  end: ISODateTime;
  appointmentType?: string;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address: {
    postcode: string;
    location?: GeoPointLike; // latitude/longitude for the postcode
  };
  meta?: Record<string, unknown>;
}
