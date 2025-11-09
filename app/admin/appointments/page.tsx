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
            <CalendarViewSelector 
              currentView={viewMode}
              onViewChange={handleViewChange}
            />
          </div>
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
          />
        )}
      </div>
    </div>
  );
}