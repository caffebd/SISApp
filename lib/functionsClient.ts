import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface GetAvailableSlotsInput {
  location: { lat: number; lng: number };
  month: string; // YYYY-MM
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  engineerId: string;
}

export interface GetAvailableSlotsResult {
  ok: boolean;
  slots?: AvailableSlot[];
  reason?: string;
}

export async function getAvailableSlots(input: GetAvailableSlotsInput): Promise<GetAvailableSlotsResult> {
  const callable = httpsCallable<GetAvailableSlotsInput, GetAvailableSlotsResult>(functions, 'getAvailableSlots');
  const { data } = await callable(input);
  return data;
}

// Booking API
export interface BookAppointmentInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer: { name: string; email: string; phone: string; addressLine?: string };
  address: { postcode: string; location: { lat: number; lng: number } };
}

export interface BookAppointmentResult {
  ok: boolean;
  appointmentId?: string;
  reason?: string;
}

export async function bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
  const callable = httpsCallable<BookAppointmentInput, BookAppointmentResult>(functions, 'bookAppointment');
  const { data } = await callable(input);
  return data;
}

// Banking API
