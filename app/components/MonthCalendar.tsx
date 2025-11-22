import { useMemo, useState, useEffect } from 'react';
import AppointmentBlock from './AppointmentBlock';
import { getCommonPostcodeArea, fetchPostcodeAreaName } from '../../lib/calendarUtils';

type AppointmentStatus = 'pending' | 'offered' | 'confirmed' | 'declined' | 'cancelled' | 'complete';

interface Appointment {
  id: string;
  status: AppointmentStatus;
  engineerId?: string;
  date: string;
  start: string;
  end: string;
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

interface MonthCalendarProps {
  currentDate: Date;
  appointments: Appointment[];
  engineerNames: Record<string, string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  selectionMode?: boolean;
  selectedTimeSlots?: Array<{ date: string; startTime: string; endTime: string }>;
  onToggleTimeSlot?: (date: string, startTime: string, endTime: string) => void;
  selectedEngineerId?: string;
}

export default function MonthCalendar({
  currentDate,
  appointments,
  engineerNames,
  onPrevious,
  onNext,
  onToday,
  selectionMode = false,
  selectedTimeSlots = [],
  onToggleTimeSlot,
  selectedEngineerId,
}: MonthCalendarProps) {
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  // Get calendar grid (6 weeks)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Start from Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const diff = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    startDate.setDate(firstDay.getDate() + diff);

    // Generate 42 days (6 weeks)
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return days;
  }, [currentDate]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach(apt => {
      const dateKey = apt.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    // Sort appointments by start time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.start.localeCompare(b.start));
    });
    return grouped;
    return grouped;
  }, [appointments]);

  // Fetch area names for the month
  useEffect(() => {
    if (!selectedEngineerId || selectedEngineerId === 'all') {
      setAreaNames({});
      return;
    }

    const fetchAreas = async () => {
      const newAreaNames: Record<string, string> = {};
      const promises: Promise<void>[] = [];
      const codesToFetch = new Set<string>();

      calendarDays.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const dayAppointments = appointmentsByDate[dateKey] || [];
        const postcodes = dayAppointments.map(a => a.address?.postcode).filter(Boolean);
        const areaCode = getCommonPostcodeArea(postcodes);

        if (areaCode) {
          newAreaNames[dateKey] = areaCode;
          codesToFetch.add(areaCode);
        }
      });

      for (const code of codesToFetch) {
        promises.push(
          fetchPostcodeAreaName(code).then(name => {
            if (name) {
              Object.keys(newAreaNames).forEach(dateKey => {
                if (newAreaNames[dateKey] === code) {
                  newAreaNames[dateKey] = name;
                }
              });
            }
          })
        );
      }

      await Promise.all(promises);
      setAreaNames(newAreaNames);
    };

    fetchAreas();
  }, [calendarDays, appointmentsByDate, selectedEngineerId]);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="bg-white rounded-xl shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={onToday}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900">{monthName}</h2>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayAppointments = appointmentsByDate[dateKey] || [];
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);
            const visibleAppointments = dayAppointments.slice(0, 2);
            const remainingCount = dayAppointments.length - visibleAppointments.length;
            return (
              <div
                key={index}
                className={`relative min-h-[120px] border rounded-lg p-2 ${today
                  ? 'bg-blue-50 border-blue-300'
                  : 'border-gray-200'
                  } ${!currentMonth ? 'bg-gray-50' : 'bg-white'} ${selectionMode ? 'opacity-60' : ''
                  }`}
              >
                <div className={`text-sm font-semibold mb-2 ${today
                  ? 'text-blue-700'
                  : currentMonth
                    ? 'text-gray-900'
                    : 'text-gray-400'
                  }`}>
                  {date.getDate()}
                </div>
                {selectedEngineerId && selectedEngineerId !== 'all' && (
                  (() => {
                    const dayAppointments = appointmentsByDate[dateKey] || [];
                    const postcodes = dayAppointments.map(a => a.address?.postcode).filter(Boolean);
                    const areaCode = getCommonPostcodeArea(postcodes);
                    const areaName = areaNames[dateKey];

                    if (!areaCode) return null;

                    return (
                      <div className="text-xs font-bold text-indigo-700 mb-1 whitespace-normal break-words leading-tight" title={areaName ? `${areaName} (${areaCode})` : areaCode}>
                        {areaName ? `${areaName} (${areaCode})` : areaCode}
                      </div>
                    );
                  })()
                )}
                <div className="space-y-1">
                  {visibleAppointments.map(apt => (
                    <AppointmentBlock
                      key={apt.id}
                      appointment={apt}
                      engineerName={apt.engineerId ? engineerNames[apt.engineerId] : undefined}
                      compact={true}
                    />
                  ))}
                  {remainingCount > 0 && (
                    <div className="text-xs text-gray-600 font-medium px-2 py-1">
                      +{remainingCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}