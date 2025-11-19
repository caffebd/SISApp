'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CalendarViewSelector from '../../components/CalendarViewSelector';
import WeekCalendar from '../../components/WeekCalendar';
import MonthCalendar from '../../components/MonthCalendar';
import DayCalendar from '../../components/DayCalendar';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

type ViewMode = 'day' | 'week' | 'month';
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
    location?: { lat: number; lng: number };
  };
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [engineerNames, setEngineerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  
  // Time slot selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize to Monday of current week for week view
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

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

  // Fetch appointments and engineer names from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAppointments = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch appointments from user's subcollection
        const appointmentsRef = collection(db, 'USERS', USER_ID, 'appointments');
        const q = query(appointmentsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedAppointments: Appointment[] = [];
        const engineerIds = new Set<string>();
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          fetchedAppointments.push({
            id: docSnapshot.id,
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
              location: data.address?.location,
            },
          });
          
          if (data.engineerId) {
            engineerIds.add(data.engineerId);
          }
        });
        
        setAppointments(fetchedAppointments);
        
        // Fetch engineer names from user's subcollection
        const engineerNamesMap: Record<string, string> = {};
        for (const engineerId of engineerIds) {
          try {
            const engineerDoc = await getDoc(doc(db, 'USERS', USER_ID, 'engineers', engineerId));
            if (engineerDoc.exists()) {
              const engineerData = engineerDoc.data();
              engineerNamesMap[engineerId] = engineerData.name || engineerId;
            }
          } catch (err) {
            console.error(`Error fetching engineer ${engineerId}:`, err);
          }
        }
        
        setEngineerNames(engineerNamesMap);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [isAuthenticated]);

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day' || viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day' || viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    if (viewMode === 'week') {
      // For week view, set to Monday of current week
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentDate(monday);
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
    // Exit selection mode when changing views
    setSelectionMode(false);
    setSelectedTimeSlots([]);
    // Reset to today when changing views
    if (newView === 'week') {
      // For week view, set to Monday of current week
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentDate(monday);
    } else {
      setCurrentDate(new Date());
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTimeSlots([]);
  };

  const handleToggleTimeSlot = (date: string, startTime: string, endTime: string) => {
    const slotKey = `${date}-${startTime}`;
    
    setSelectedTimeSlots(prev => {
      const exists = prev.find(slot => `${slot.date}-${slot.startTime}` === slotKey);
      
      if (exists) {
        return prev.filter(slot => `${slot.date}-${slot.startTime}` !== slotKey);
      } else {
        return [...prev, { date, startTime, endTime }].sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });
      }
    });
  };

  const handleBookTimeSlots = () => {
    if (selectedTimeSlots.length === 0) return;
    
    // Navigate to appointment creation page with selected time slots
    const slotsParam = selectedTimeSlots.map(slot => `${slot.date}|${slot.startTime}|${slot.endTime}`).join(',');
    router.push(`/admin/appointments/create?slots=${encodeURIComponent(slotsParam)}`);
  };

  // Calculate the actual number of appointments that will be created (after merging)
  const calculateMergedAppointmentCount = () => {
    if (selectedTimeSlots.length === 0) return 0;
    
    // Sort slots by date and time
    const sortedSlots = [...selectedTimeSlots].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    let count = 0;
    let i = 0;
    
    while (i < sortedSlots.length) {
      count++; // Start a new appointment
      const currentSlot = sortedSlots[i];
      let endTime = currentSlot.endTime;
      
      // Check for consecutive slots
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

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Appointments</h1>
              <p className="text-gray-600">
                {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} total
              </p>
            </div>
            <div className="flex items-center gap-4">
              <CalendarViewSelector 
                currentView={viewMode}
                onViewChange={handleViewChange}
              />
              <button
                onClick={toggleSelectionMode}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectionMode
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {selectionMode ? 'Cancel Selection' : 'Select Time Slots'}
              </button>
            </div>
          </div>
        </div>

        {/* Reserved space for selection banner - always present to prevent layout shift */}
        <div className="mb-6" style={{ minHeight: selectionMode ? '88px' : '0px', transition: 'min-height 0.2s ease-in-out' }}>
          {selectionMode && selectedTimeSlots.length > 0 && (() => {
            const appointmentCount = calculateMergedAppointmentCount();
            return (
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedTimeSlots.length} time {selectedTimeSlots.length === 1 ? 'slot' : 'slots'} selected
                      {appointmentCount < selectedTimeSlots.length && (
                        <span className="text-teal-600 ml-2">
                          → {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTimeSlots.slice(0, 3).map(slot => 
                        `${new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${slot.startTime}`
                      ).join(', ')}
                      {selectedTimeSlots.length > 3 && ` +${selectedTimeSlots.length - 3} more`}
                    </p>
                  </div>
                  <button
                    onClick={handleBookTimeSlots}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg"
                  >
                    Create {appointmentCount} Appointment{appointmentCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Calendar Views */}
        {viewMode === 'week' && (
          <WeekCalendar
            currentDate={currentDate}
            appointments={appointments}
            engineerNames={engineerNames}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            selectionMode={selectionMode}
            selectedTimeSlots={selectedTimeSlots}
            onToggleTimeSlot={handleToggleTimeSlot}
            totalEngineers={Object.keys(engineerNames).length}
          />
        )}

        {viewMode === 'month' && (
          <MonthCalendar
            currentDate={currentDate}
            appointments={appointments}
            engineerNames={engineerNames}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            selectionMode={selectionMode}
            selectedTimeSlots={selectedTimeSlots}
            onToggleTimeSlot={handleToggleTimeSlot}
          />
        )}

        {viewMode === 'day' && (
          <DayCalendar
            currentDate={currentDate}
            appointments={appointments}
            engineerNames={engineerNames}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            selectionMode={selectionMode}
            selectedTimeSlots={selectedTimeSlots}
            onToggleTimeSlot={handleToggleTimeSlot}
            totalEngineers={Object.keys(engineerNames).length}
          />
        )}
      </div>
    </div>
  );
}