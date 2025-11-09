'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import Link from 'next/link';
import StatusBadge from '../../../components/StatusBadge';
import ContactMatchModal from '../../../components/ContactMatchModal';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

type AppointmentStatus = 'pending' | 'offered' | 'confirmed' | 'declined' | 'cancelled' | 'complete';

interface Appointment {
  id: string;
  status: AppointmentStatus;
  engineerId?: string;
  date: string;
  start: string;
  end: string;
  appointmentType?: string;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address: {
    postcode: string;
    line?: string;
    location?: { lat: number; lng: number };
  };
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [engineerName, setEngineerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showContactMatch, setShowContactMatch] = useState(false);
  const [matchedContact, setMatchedContact] = useState<{ id: string; name: string } | null>(null);
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);

  // Form state
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAmPm, setEditAmPm] = useState<'AM' | 'PM'>('AM');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('pending');
  const [editType, setEditType] = useState('');
  const [engineers, setEngineers] = useState<Array<{ id: string; name: string }>>([]);
  const [engineersLoading, setEngineersLoading] = useState(false);
  const [editEngineerId, setEditEngineerId] = useState<string | undefined>(undefined);
  const [busyEngineerIds, setBusyEngineerIds] = useState<Set<string>>(new Set());

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push('/admin');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch appointment details
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAppointment = async () => {
      setLoading(true);
      setError('');

      try {
        const appointmentRef = doc(db, 'USERS', USER_ID, 'appointments', id);
        const appointmentSnap = await getDoc(appointmentRef);

        if (!appointmentSnap.exists()) {
          setError('Appointment not found');
          setLoading(false);
          return;
        }

        const data = appointmentSnap.data();
        const appt: Appointment = {
          id: appointmentSnap.id,
          status: data.status as AppointmentStatus,
          engineerId: data.engineerId,
          date: data.date,
          start: data.start,
          end: data.end,
          appointmentType: data.appointmentType,
          customer: {
            name: data.customer?.name,
            email: data.customer?.email,
            phone: data.customer?.phone,
          },
          address: {
            postcode: data.address?.postcode || '',
            line: data.address?.line,
            location: data.address?.location,
          },
        };

    setAppointment(appt);
    setEditStatus(appt.status);
    setEditType(appt.appointmentType || '');
    setEditEngineerId(appt.engineerId);

        // Parse date and time from ISO string
        const startDate = new Date(appt.start);
        setEditDate(appt.date);
        
        // Convert to 12-hour format
        let hours = startDate.getUTCHours();
        const minutes = startDate.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        
        setEditTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        setEditAmPm(ampm);

        // Fetch engineer name if assigned
        if (data.engineerId) {
          try {
            const engineerDoc = await getDoc(doc(db, 'USERS', USER_ID, 'engineers', data.engineerId));
            if (engineerDoc.exists()) {
              setEngineerName(engineerDoc.data().name || data.engineerId);
            }
          } catch (err) {
            console.error('Error fetching engineer:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [isAuthenticated, id]);

  // Check if appointment is already matched to a contact
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const checkContactMatch = async () => {
      setIsCheckingMatch(true);
      try {
        const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
        const querySnapshot = await getDocs(contactsRef);
        
        const matchedContacts: Array<{ id: string; name: string; updatedAt: string }> = [];
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const appointmentIds = data.appointmentIds || [];
          
          if (appointmentIds.includes(id)) {
            matchedContacts.push({
              id: docSnapshot.id,
              name: data.name || 'Unknown Contact',
              updatedAt: data.updatedAt || data.createdAt || '',
            });
          }
        });

        if (matchedContacts.length > 0) {
          // If multiple matches found, use the most recently updated one
          matchedContacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          setMatchedContact({
            id: matchedContacts[0].id,
            name: matchedContacts[0].name,
          });
          
          // Log warning if multiple matches found
          if (matchedContacts.length > 1) {
            console.warn('Multiple contacts found with same appointment ID:', {
              appointmentId: id,
              contacts: matchedContacts,
            });
          }
        } else {
          setMatchedContact(null);
        }
      } catch (err) {
        console.error('Error checking contact match:', err);
      } finally {
        setIsCheckingMatch(false);
      }
    };

    checkContactMatch();
  }, [isAuthenticated, id]);

  const handleContactMatchSuccess = (contactId: string, contactName: string) => {
    setMatchedContact({ id: contactId, name: contactName });
  };

  const handleModalClose = () => {
    setShowContactMatch(false);
    // Refresh match status when modal closes
    // This ensures we pick up any changes made
    if (isAuthenticated && id) {
      const checkContactMatch = async () => {
        setIsCheckingMatch(true);
        try {
          const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
          const querySnapshot = await getDocs(contactsRef);
          
          const matchedContacts: Array<{ id: string; name: string; updatedAt: string }> = [];
          
          querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const appointmentIds = data.appointmentIds || [];
            
            if (appointmentIds.includes(id)) {
              matchedContacts.push({
                id: docSnapshot.id,
                name: data.name || 'Unknown Contact',
                updatedAt: data.updatedAt || data.createdAt || '',
              });
            }
          });

          if (matchedContacts.length > 0) {
            matchedContacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            setMatchedContact({
              id: matchedContacts[0].id,
              name: matchedContacts[0].name,
            });
          } else {
            setMatchedContact(null);
          }
        } catch (err) {
          console.error('Error checking contact match:', err);
        } finally {
          setIsCheckingMatch(false);
        }
      };
      checkContactMatch();
    }
  };

  const handleSave = async () => {
    if (!appointment) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      // Parse time and convert to 24-hour format
      const [hours, minutes] = editTime.split(':').map(Number);
      let hour24 = hours;
      if (editAmPm === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (editAmPm === 'AM' && hours === 12) {
        hour24 = 0;
      }

      // Create ISO datetime strings
      const startISO = `${editDate}T${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
      const startDate = new Date(startISO);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

      // Update Firestore
      const appointmentRef = doc(db, 'USERS', USER_ID, 'appointments', id);
      await updateDoc(appointmentRef, {
        status: editStatus,
        date: editDate,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        appointmentType: editType.trim(),
        engineerId: editEngineerId || null,
      });

      // Update local state
      setAppointment({
        ...appointment,
        status: editStatus,
        date: editDate,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        appointmentType: editType.trim(),
        engineerId: editEngineerId,
      });

      // Update displayed engineer name
      if (editEngineerId) {
        const selectedEngineer = engineers.find(e => e.id === editEngineerId);
        setEngineerName(selectedEngineer?.name || editEngineerId);
      } else {
        setEngineerName('');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving appointment:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch engineers list
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchEngineers = async () => {
      setEngineersLoading(true);
      try {
        const engineersRef = collection(db, 'USERS', USER_ID, 'engineers');
        const snap = await getDocs(engineersRef);
        const list: Array<{ id: string; name: string }> = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
            list.push({ id: docSnap.id, name: data.name || docSnap.id });
        });
        setEngineers(list);
        // If engineerId loaded earlier, ensure engineerName sync
        if (editEngineerId) {
          const eng = list.find(e => e.id === editEngineerId);
          if (eng) setEngineerName(eng.name);
        }
      } catch (err) {
        console.error('Error fetching engineers:', err);
      } finally {
        setEngineersLoading(false);
      }
    };
    fetchEngineers();
  }, [isAuthenticated, editEngineerId]);

  // Recompute busy engineers whenever date/time changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!editDate || !editTime) return;
    const computeBusy = async () => {
      try {
        // Convert selected time to start/end Date objects
        const [hours, minutes] = editTime.split(':').map(Number);
        let hour24 = hours;
        if (editAmPm === 'PM' && hours !== 12) hour24 = hours + 12;
        if (editAmPm === 'AM' && hours === 12) hour24 = 0;
        const startISO = `${editDate}T${String(hour24).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00Z`;
        const startCandidate = new Date(startISO);
        const endCandidate = new Date(startCandidate.getTime() + 60*60*1000); // 1 hour slot

        const apptsRef = collection(db, 'USERS', USER_ID, 'appointments');
        // Query all appointments for same date (not just confirmed/offered)
        const qAppts = query(apptsRef, where('date','==', editDate));
        const snap = await getDocs(qAppts);
        const busy = new Set<string>();
        snap.forEach(docSnap => {
          // Skip the current appointment being edited
          if (docSnap.id === appointment?.id) return;
          
          const data = docSnap.data();
          const status = data.status;
          
          // Only consider confirmed or offered appointments as blocking
          if (status !== 'confirmed' && status !== 'offered') return;
          
          const engineerId = data.engineerId;
          if (!engineerId) return;
          
          const otherStart = new Date(data.start);
          const otherEnd = new Date(data.end);
          
          // Check for time overlap
          const overlap = startCandidate < otherEnd && endCandidate > otherStart;
          if (overlap) {
            busy.add(engineerId);
          }
        });
        setBusyEngineerIds(busy);
      } catch (err) {
        console.error('Error computing busy engineers:', err);
      }
    };
    computeBusy();
  }, [isAuthenticated, editDate, editTime, editAmPm, appointment?.id]);

  const handleEmailClick = () => {
    if (!appointment?.customer.email || !appointment?.customer.name) return;

    // Format date and time for email
    const appointmentDate = new Date(editDate + 'T00:00:00');
    const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFormatted = appointmentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const emailSubject = 'SIS Appointment';
    const emailBody = `Dear ${appointment.customer.name},

Thank you for your enquiry. Unfortunately, we couldn't book the exact date and time you requested.

Would the following work for you?

${dayName} ${dateFormatted} at ${editTime} ${editAmPm}

If so please confirm by replying to this email or calling 0123456678

Thank you,
SIS Team`;

    const mailtoLink = `mailto:${appointment.customer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const formatDisplayDate = (isoDate: string): string => {
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-red-800 mb-4">{error}</p>
          <Link href="/admin/appointments">
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
              Back to Appointments
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/appointments"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Appointments
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900">Appointment Details</h1>
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-semibold">Changes saved successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  {matchedContact ? (
                    <Link
                      href={`/admin/contacts/${matchedContact.id}`}
                      className="text-lg font-semibold text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      title="View matched contact"
                      aria-label={`View contact ${matchedContact.name}`}
                    >
                      {appointment.customer.name || matchedContact.name || 'N/A'}
                    </Link>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{appointment.customer.name || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-lg font-medium text-gray-900">{appointment.customer.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-lg font-medium text-gray-900">{appointment.customer.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="text-lg font-medium text-gray-900">{appointment.address.postcode}</p>
                  {appointment.address.line && (
                    <p className="text-sm text-gray-600 mt-1">{appointment.address.line}</p>
                  )}
                </div>
              </div>

              {/* Assigned Engineer moved to Edit card */}

              {/* Contact Match Status */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                {isCheckingMatch ? (
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span className="text-sm">Checking match status...</span>
                  </div>
                ) : matchedContact ? (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800">Matched to existing contact</p>
                        <Link
                          href={`/admin/contacts/${matchedContact.id}`}
                          className="text-sm text-green-700 mt-1 underline focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                          title="Open contact details"
                          aria-label={`Open contact ${matchedContact.name}`}
                        >
                          {matchedContact.name}
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-600">Not matched to an existing contact</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowContactMatch(true)}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {matchedContact ? 'Change Matched Contact' : 'Match to Contact'}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Appointment Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Appointment</h2>

            <div className="space-y-5">
              {/* Date Picker */}
              <div>
                <label htmlFor="edit-date" className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Date
                </label>
                <input
                  type="date"
                  id="edit-date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-medium"
                />
                <p className="mt-2 text-sm text-gray-600">
                  {editDate && formatDisplayDate(editDate)}
                </p>
              </div>

              {/* Time Picker */}
              <div>
                <label htmlFor="edit-time" className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Time
                </label>
                <div className="flex gap-3">
                  <input
                    type="time"
                    id="edit-time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-medium"
                  />
                  <select
                    value={editAmPm}
                    onChange={(e) => setEditAmPm(e.target.value as 'AM' | 'PM')}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-semibold bg-white"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Engineer Selector */}
              <div>
                <label htmlFor="edit-engineer" className="block text-sm font-semibold text-gray-700 mb-2">
                  Assigned Engineer
                </label>
                <select
                  id="edit-engineer"
                  value={editEngineerId || ''}
                  onChange={(e) => setEditEngineerId(e.target.value || undefined)}
                  disabled={engineersLoading}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-medium bg-white"
                >
                  <option value="">Unassigned</option>
                  {engineers.map(eng => {
                    const isBusy = busyEngineerIds.has(eng.id);
                    const disabled = isBusy && eng.id !== editEngineerId; // allow keeping current engineer even if overlapping
                    return (
                      <option
                        key={eng.id}
                        value={eng.id}
                        disabled={disabled}
                      >
                        {eng.name}{isBusy ? ' (Busy)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-2 text-xs text-gray-600">Busy engineers are disabled. Adjust time/date to free up slots.</p>
              </div>

              {/* Appointment Type Field */}
                  {/* Appointment Type Field */}
                  <div>
                    <label htmlFor="edit-type" className="block text-sm font-semibold text-gray-700 mb-2">
                      Appointment Type
                    </label>
                    <input
                      id="edit-type"
                      type="text"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      placeholder="e.g. visit, survey, install"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-medium bg-white"
                    />
                  </div>

                  {/* Status Dropdown */}
              <div>
                <label htmlFor="edit-status" className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-medium bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="offered">Offered</option>
                  <option value="declined">Declined</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>

                <button
                  onClick={handleEmailClick}
                  disabled={!appointment.customer.email}
                  className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Amended Appointment
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment ID */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Appointment ID:</span> {appointment.id}
          </p>
        </div>

        {/* Contact Match Modal */}
        <ContactMatchModal
          isOpen={showContactMatch}
          onClose={handleModalClose}
          appointmentId={id}
          customerName={appointment.customer.name}
          customerEmail={appointment.customer.email}
          customerPhone={appointment.customer.phone}
          address={{
            postcode: appointment.address.postcode,
            line: appointment.address.line,
          }}
          currentMatchedContactId={matchedContact?.id}
          onMatchSuccess={handleContactMatchSuccess}
        />
      </div>
    </div>
  );
}