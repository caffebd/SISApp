import { useMemo } from 'react';
import AppointmentBlock from './AppointmentBlock';

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

interface WeekCalendarProps {
  currentDate: Date;
  appointments: Appointment[];
  engineerNames: Record<string, string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function WeekCalendar({
  currentDate,
  appointments,
  engineerNames,
  onPrevious,
  onNext,
  onToday,
}: WeekCalendarProps) {
  // Get the week days - currentDate is the first day shown (leftmost)
  const weekDays = useMemo(() => {
    const days = [];
    const startDate = new Date(currentDate);
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
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
    return grouped;
  }, [appointments]);

  // Time slots from 08:00 to 15:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 15; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get current time for indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimePercent = ((currentHour - 8) * 60 + currentMinute) / ((15 - 8 + 1) * 60) * 100;
  const showCurrentTime = currentHour >= 8 && currentHour <= 15;

  const formatDateRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getFullYear()}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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
              aria-label="Previous day"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next day"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900">{formatDateRange()}</h2>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4"></div>
            {weekDays.map((date, index) => {
              const today = isToday(date);
              return (
                <div
                  key={index}
                  className={`p-4 text-center border-l border-gray-200 ${
                    today ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase mb-1 ${today ? 'text-white' : 'text-gray-600'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm ${today ? 'text-white font-bold' : 'text-gray-500'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-200">
                <div className="p-2 text-right pr-4 text-sm text-gray-500 font-medium">
                  {time}
                </div>
                {weekDays.map((date, dayIndex) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const dayAppointments = appointmentsByDate[dateKey] || [];
                  
                  // Filter appointments that fall in this time slot
                  const slotAppointments = dayAppointments.filter(apt => {
                    const startTime = new Date(apt.start).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    });
                    const startHour = parseInt(startTime.split(':')[0]);
                    const slotHour = parseInt(time.split(':')[0]);
                    return startHour === slotHour;
                  });

                  return (
                    <div
                      key={dayIndex}
                      className={`p-2 border-l border-gray-200 min-h-[80px] ${
                        isToday(date) ? 'bg-gray-50' : ''
                      }`}
                    >
                      {slotAppointments.map(apt => (
                        <AppointmentBlock
                          key={apt.id}
                          appointment={apt}
                          engineerName={apt.engineerId ? engineerNames[apt.engineerId] : undefined}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Current Time Indicator */}
            {showCurrentTime && isToday(weekDays.find(d => isToday(d)) || weekDays[0]) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ top: `${currentTimePercent}%` }}
              >
                <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="absolute -right-0 -top-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                  {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}