'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import Link from 'next/link';
import ContactSearchModal from '../../../components/ContactSearchModal';
import { useRef } from 'react';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

function CreateAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parse URL parameters - now expecting time slots instead of dates
  const slotsParam = searchParams.get('slots') || '';
  const selectedTimeSlots = slotsParam
    ? decodeURIComponent(slotsParam).split(',').map(slot => {
      const [date, startTime, endTime] = slot.split('|');
      return { date, startTime, endTime };
    }).filter(slot => slot.date && slot.startTime && slot.endTime)
    : [];

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postcode, setPostcode] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [engineers, setEngineers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');
  const [existingAppointments, setExistingAppointments] = useState<Array<{
    id: string;
    engineerId?: string;
    start: string;
    end: string;
  }>>([]);

  // Appointment Types state
  const [savedTypes, setSavedTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdAppointments, setCreatedAppointments] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);

  // Contact search modal state
  const [showContactSearch, setShowContactSearch] = useState(false);

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        router.push('/admin');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch engineers list and existing appointments
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        // Fetch engineers
        const engineersRef = collection(db, 'USERS', USER_ID, 'engineers');
        const engineersSnap = await getDocs(engineersRef);
        const engineersList: Array<{ id: string; name: string }> = [];
        engineersSnap.forEach(docSnap => {
          const data = docSnap.data();
          engineersList.push({ id: docSnap.id, name: data.name || docSnap.id });
        });
        setEngineers(engineersList);

        // Fetch existing appointments
        const appointmentsRef = collection(db, 'USERS', USER_ID, 'appointments');
        const appointmentsSnap = await getDocs(appointmentsRef);
        const appointmentsList: Array<{
          id: string;
          engineerId?: string;
          start: string;
          end: string;
        }> = [];
        appointmentsSnap.forEach(docSnap => {
          const data = docSnap.data();
          appointmentsList.push({
            id: docSnap.id,
            engineerId: data.engineerId,
            start: data.start,
            end: data.end,
          });
        });
        setExistingAppointments(appointmentsList);

        // Fetch saved appointment types
        const typesRef = collection(db, 'USERS', USER_ID, 'appointmentTypes');
        const typesQuery = query(typesRef, orderBy('name'));
        const typesSnap = await getDocs(typesQuery);
        const typesList: Array<{ id: string; name: string }> = [];
        typesSnap.forEach(docSnap => {
          typesList.push({ id: docSnap.id, name: docSnap.data().name });
        });
        setSavedTypes(typesList);

      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Calculate merged appointment count (same logic as in appointments page)
  const calculateMergedAppointmentCount = () => {
    if (selectedTimeSlots.length === 0) return 0;

    const sortedSlots = [...selectedTimeSlots].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    let count = 0;
    let i = 0;

    while (i < sortedSlots.length) {
      count++;
      const currentSlot = sortedSlots[i];
      let endTime = currentSlot.endTime;

      while (i + 1 < sortedSlots.length) {
        const nextSlot = sortedSlots[i + 1];

        if (nextSlot.date === currentSlot.date && nextSlot.startTime === endTime) {
          endTime = nextSlot.endTime;
          i++;
        } else {
          break;
        }
      }

      i++;
    }

    return count;
  };

  const mergedAppointmentCount = calculateMergedAppointmentCount();

  // Check if an engineer is busy during the selected time slots
  const isEngineerBusy = (engineerId: string): boolean => {
    if (!engineerId) return false;

    // For each selected time slot, check if this engineer has an appointment
    return selectedTimeSlots.some(slot => {
      const slotStart = new Date(`${slot.date}T${slot.startTime}:00`).getTime();
      const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`).getTime();

      // Check if engineer has any appointment overlapping with this slot
      return existingAppointments.some(apt => {
        if (apt.engineerId !== engineerId) return false;

        const aptStart = new Date(apt.start).getTime();
        const aptEnd = new Date(apt.end).getTime();

        // Check for overlap
        return aptStart < slotEnd && aptEnd > slotStart;
      });
    });
  };

  // Get list of available engineers
  const availableEngineers = engineers.filter(eng => !isEngineerBusy(eng.id));
  const busyEngineers = engineers.filter(eng => isEngineerBusy(eng.id));

  // Validate we have required data
  useEffect(() => {
    if (!loading && isAuthenticated && selectedTimeSlots.length === 0) {
      router.push('/admin/appointments');
    }
  }, [loading, isAuthenticated, selectedTimeSlots.length, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const saveAppointmentType = async (typeName: string) => {
    const trimmedName = typeName.trim();
    if (!trimmedName) return;

    // Check if already exists (case insensitive)
    const exists = savedTypes.some(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (!exists) {
      try {
        const docRef = await addDoc(collection(db, 'USERS', USER_ID, 'appointmentTypes'), {
          name: trimmedName
        });
        setSavedTypes(prev => [...prev, { id: docRef.id, name: trimmedName }].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error saving appointment type:', err);
      }
    }
  };

  const deleteAppointmentType = async (e: React.MouseEvent, typeId: string) => {
    e.stopPropagation(); // Prevent selecting the item
    if (window.confirm('Are you sure you want to delete this appointment type?')) {
      try {
        await deleteDoc(doc(db, 'USERS', USER_ID, 'appointmentTypes', typeId));
        setSavedTypes(prev => prev.filter(t => t.id !== typeId));
      } catch (err) {
        console.error('Error deleting appointment type:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !postcode) {
      setError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessCount(0);

    try {
      let successfulBookings = 0;
      const failedSlots: string[] = [];

      // Group consecutive time slots into continuous appointments
      const mergedAppointments: Array<{
        date: string;
        startTime: string;
        endTime: string;
      }> = [];

      // Sort slots by date and time
      const sortedSlots = [...selectedTimeSlots].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      // Merge consecutive slots
      for (let i = 0; i < sortedSlots.length; i++) {
        const currentSlot = sortedSlots[i];

        // Start a new merged appointment
        let mergedSlot = {
          date: currentSlot.date,
          startTime: currentSlot.startTime,
          endTime: currentSlot.endTime,
        };

        // Check if next slots are consecutive
        while (i + 1 < sortedSlots.length) {
          const nextSlot = sortedSlots[i + 1];

          // Check if same date and consecutive times
          if (nextSlot.date === mergedSlot.date && nextSlot.startTime === mergedSlot.endTime) {
            // Merge by extending end time
            mergedSlot.endTime = nextSlot.endTime;
            i++; // Skip the next slot as it's merged
          } else {
            break; // Not consecutive, stop merging
          }
        }

        mergedAppointments.push(mergedSlot);
      }

      // Create appointments from merged slots
      for (const slot of mergedAppointments) {
        try {
          // Parse times and create ISO datetime strings
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);

          const startDateTime = `${slot.date}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
          const endDateTime = `${slot.date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

          await addDoc(collection(db, 'USERS', USER_ID, 'appointments'), {
            date: slot.date,
            start: startDateTime,
            end: endDateTime,
            status: 'pending',
            engineerId: selectedEngineerId || undefined,
            customer: {
              name,
              email,
              phone,
            },
            address: {
              postcode,
              addressLine: addressLine || undefined,
            },
            appointmentType: appointmentType || undefined,
            createdAt: new Date().toISOString(),
          });

          successfulBookings++;
        } catch (err) {
          console.error(`Failed to create appointment for ${slot.date} ${slot.startTime}:`, err);
          failedSlots.push(`${slot.date} ${slot.startTime}`);
        }
      }

      // Save appointment type if new
      if (appointmentType) {
        await saveAppointmentType(appointmentType);
      }

      setSuccessCount(successfulBookings);
      setCreatedAppointments(mergedAppointments);

      if (failedSlots.length > 0) {
        setError(`Successfully created ${successfulBookings} appointment(s). Failed for: ${failedSlots.join(', ')}`);
      } else {
        setShowSuccess(true);
      }

    } catch (err: any) {
      setError(err?.message || 'Failed to create appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToAppointments = () => {
    router.push('/admin/appointments');
  };

  const handleSelectContact = (contact: any) => {
    // Autofill form with contact details
    setName(contact.name || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || contact.mobile || '');
    setPostcode(contact.postcode || '');
    setAddressLine(contact.address_1 || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg p-10">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-center text-gray-900">
              Appointments Created Successfully
            </h2>
            <p className="text-center text-gray-600 mb-6">
              {successCount} appointment{successCount !== 1 ? 's' : ''} created
              {selectedTimeSlots.length > successCount && ` (${selectedTimeSlots.length} time slots merged into ${successCount})`}
            </p>
            <div className="space-y-2 mb-8">
              {createdAppointments.map((slot, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                  <span className="font-medium text-gray-900">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="text-teal-600 font-semibold ml-2">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleGoToAppointments}
              className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors"
            >
              View Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <Link
              href="/admin/appointments"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Calendar
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Appointments</h1>
          <p className="text-gray-600 mb-6">
            Fill in the details below to create appointments for {selectedTimeSlots.length} selected time {selectedTimeSlots.length === 1 ? 'slot' : 'slots'}
          </p>

          {/* Selected Time Slots Display */}
          <div className="mb-6 bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Selected Time Slots:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedTimeSlots.map((slot, idx) => (
                <div key={idx} className="bg-white rounded-lg p-2 text-sm">
                  <div className="font-medium text-gray-900">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-teal-600 font-semibold">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Appointment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Customer Name *
                </label>
                <button
                  type="button"
                  onClick={() => setShowContactSearch(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Contacts
                </button>
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="07123 456789"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                Postcode *
              </label>
              <input
                type="text"
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                required
                placeholder="SW1A 1AA"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line (Optional)
              </label>
              <input
                type="text"
                id="address"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div>
              <label htmlFor="engineer" className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Engineer (Optional)
              </label>
              <select
                id="engineer"
                value={selectedEngineerId}
                onChange={(e) => setSelectedEngineerId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="">Unassigned</option>

                {/* Available Engineers */}
                {availableEngineers.length > 0 && (
                  <optgroup label="Available">
                    {availableEngineers.map(eng => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Busy Engineers - Disabled */}
                {busyEngineers.length > 0 && (
                  <optgroup label="Busy (Not Available)">
                    {busyEngineers.map(eng => (
                      <option key={eng.id} value={eng.id} disabled>
                        {eng.name} (Busy)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {busyEngineers.length > 0 && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ {busyEngineers.length} engineer{busyEngineers.length !== 1 ? 's are' : ' is'} busy during the selected time slots
                </p>
              )}

              {availableEngineers.length === 0 && engineers.length > 0 && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  ⚠️ All engineers are busy during the selected time slots. You can still create an unassigned appointment.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Type (Optional)
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  id="appointmentType"
                  value={appointmentType}
                  onChange={(e) => {
                    setAppointmentType(e.target.value);
                    setShowTypeDropdown(true);
                  }}
                  onFocus={() => setShowTypeDropdown(true)}
                  placeholder="e.g., Installation, Repair, Consultation"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
                  autoComplete="off"
                />

                {/* Type Dropdown */}
                {showTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {savedTypes
                      .filter(t => t.name.toLowerCase().includes(appointmentType.toLowerCase()))
                      .map(type => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-teal-50 cursor-pointer group"
                          onClick={() => {
                            setAppointmentType(type.name);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <span className="text-gray-700">{type.name}</span>
                          <button
                            type="button"
                            onClick={(e) => deleteAppointmentType(e, type.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Remove type"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    {savedTypes.filter(t => t.name.toLowerCase().includes(appointmentType.toLowerCase())).length === 0 && appointmentType && (
                      <div className="px-4 py-2 text-sm text-gray-500 italic">
                        Press Create to save "{appointmentType}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/admin/appointments" className="flex-1">
                <button
                  type="button"
                  className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors"
              >
                {isSubmitting ? 'Creating...' : `Create ${mergedAppointmentCount} Appointment${mergedAppointmentCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contact Search Modal */}
      <ContactSearchModal
        isOpen={showContactSearch}
        onClose={() => setShowContactSearch(false)}
        onSelectContact={handleSelectContact}
      />
    </div>
  );
}

export default function CreateAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateAppointmentContent />
    </Suspense>
  );
}