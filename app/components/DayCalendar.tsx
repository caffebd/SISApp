import { useMemo, useState, useEffect, useRef } from 'react';
import AppointmentBlock from './AppointmentBlock';
import { assignAppointmentColumns, getCommonPostcodeArea, fetchPostcodeAreaName } from '../../lib/calendarUtils';

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

interface DayCalendarProps {
  currentDate: Date;
  appointments: Appointment[];
  engineerNames: Record<string, string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  selectionMode?: boolean;
  selectedTimeSlots?: Array<{ date: string; startTime: string; endTime: string }>;
  onToggleTimeSlot?: (date: string, startTime: string, endTime: string) => void;
  totalEngineers?: number;
  selectedEngineerId?: string;
}

export default function DayCalendar({
  currentDate,
  appointments,
  engineerNames,
  onPrevious,
  onNext,
  onToday,
  selectionMode = false,
  selectedTimeSlots = [],
  onToggleTimeSlot,
  totalEngineers = 0,
  selectedEngineerId,
}: DayCalendarProps) {
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState<string | null>(null);

  // Filter appointments for current day
  const dayAppointments = useMemo(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    return appointments
      .filter(apt => apt.date === dateKey)
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [currentDate, appointments]);

  // Fetch area name for the day
  useEffect(() => {
    if (!selectedEngineerId || selectedEngineerId === 'all') {
      setAreaName(null);
      setAreaCode(null);
      return;
    }

    const fetchArea = async () => {
      const postcodes = dayAppointments.map(a => a.address?.postcode).filter(Boolean);
      const code = getCommonPostcodeArea(postcodes);
      setAreaCode(code);

      if (code) {
        const name = await fetchPostcodeAreaName(code);
        setAreaName(name);
      } else {
        setAreaName(null);
      }
    };

    fetchArea();
  }, [dayAppointments, selectedEngineerId]);

  // Assign columns to appointments for proper overlap handling
  const columnAssignments = useMemo(() => {
    return assignAppointmentColumns(dayAppointments);
  }, [dayAppointments]);

  // Calculate which appointments should be rendered in each time slot
  const getAppointmentsForSlot = (slotHour: number) => {
    return dayAppointments.filter(apt => {
      const startTime = new Date(apt.start);
      const startHour = startTime.getHours();

      // Only render appointment in its starting hour slot
      return startHour === slotHour;
    });
  };

  // Check if a time slot is fully booked (all engineers are busy)
  const isSlotFullyBooked = (slotStartTime: string, slotEndTime: string) => {
    // If no engineers configured, slot is always available
    if (totalEngineers === 0) return false;

    const dateKey = currentDate.toISOString().split('T')[0];

    // Parse slot times
    const slotStart = new Date(`${dateKey}T${slotStartTime}:00`).getTime();
    const slotEnd = new Date(`${dateKey}T${slotEndTime}:00`).getTime();

    // Count unique engineers who are busy during this slot
    const busyEngineers = new Set<string>();

    dayAppointments.forEach(apt => {
      const aptStart = new Date(apt.start).getTime();
      const aptEnd = new Date(apt.end).getTime();

      // Check for overlap: appointment starts before slot ends AND appointment ends after slot starts
      if (aptStart < slotEnd && aptEnd > slotStart) {
        // This appointment overlaps with the slot
        if (apt.engineerId) {
          busyEngineers.add(apt.engineerId);
        }
      }
    });

    // Slot is fully booked only if all engineers are busy
    return busyEngineers.size >= totalEngineers;
  };

  // Calculate the height of an appointment in pixels
  const calculateAppointmentHeight = (appointment: Appointment) => {
    const start = new Date(appointment.start);
    const end = new Date(appointment.end);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const durationHours = durationMinutes / 60;

    // Each hour slot is 100px (min-h-[100px])
    const heightPerHour = 100;
    return durationHours * heightPerHour;
  };

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

  const formatDate = () => {
    return currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  const dateKey = currentDate.toISOString().split('T')[0];

  // Handle drag selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, startTimeStr: string, endTimeStr: string, slotIsFullyBooked: boolean) => {
    if (!selectionMode || !onToggleTimeSlot || slotIsFullyBooked) return;

    // Prevent all default behaviors
    e.preventDefault();
    e.stopPropagation();

    // Get current scroll positions
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    setIsDragging(true);
    setDragStartTime(startTimeStr);

    // Toggle the starting slot
    onToggleTimeSlot(dateKey, startTimeStr, endTimeStr);

    // Force scroll position to stay the same
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default click behavior
    e.preventDefault();
    e.stopPropagation();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent context menu
    e.preventDefault();
  };

  const handleMouseEnter = (startTimeStr: string, endTimeStr: string, slotIsFullyBooked: boolean) => {
    if (!isDragging || !selectionMode || !onToggleTimeSlot || slotIsFullyBooked) return;

    // Check if slot is already selected
    const isAlreadySelected = selectedTimeSlots.some(
      slot => slot.date === dateKey && slot.startTime === startTimeStr
    );

    // Only select if not already selected (prevent deselecting during drag)
    if (!isAlreadySelected) {
      onToggleTimeSlot(dateKey, startTimeStr, endTimeStr);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartTime(null);
  };

  // Add global mouse up listener to handle drag end outside calendar
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

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
        <div className="flex flex-col items-end">
          <h2 className="text-lg font-bold text-gray-900">{formatDate()}</h2>
          {selectedEngineerId && selectedEngineerId !== 'all' && (areaCode || areaName) && (
            <div className="text-sm font-bold text-indigo-700 mt-1">
              {areaName ? `${areaName} (${areaCode})` : areaCode}
            </div>
          )}
        </div>
      </div>

      {/* Time Grid */}
      <div className="p-4" style={{ scrollBehavior: 'auto' }}>
        <div className="relative">
          {timeSlots.map((time) => {
            const slotHour = parseInt(time.split(':')[0]);
            const slotAppointments = getAppointmentsForSlot(slotHour);

            // Calculate end time
            const endHour = slotHour + 1;
            const startTimeStr = `${String(slotHour).padStart(2, '0')}:00`;
            const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;

            // Check if this slot is selected
            const isSlotSelected = selectedTimeSlots.some(
              slot => slot.date === dateKey && slot.startTime === startTimeStr
            );

            // Check if this slot is fully booked (all engineers busy)
            const slotIsFullyBooked = isSlotFullyBooked(startTimeStr, endTimeStr);

            return (
              <div key={time} className="flex border-b border-gray-200">
                <div className="w-20 p-3 text-right text-sm text-gray-500 font-medium flex-shrink-0">
                  {time}
                </div>
                <div
                  onMouseDown={(e) => handleMouseDown(e, startTimeStr, endTimeStr, slotIsFullyBooked)}
                  onMouseEnter={() => handleMouseEnter(startTimeStr, endTimeStr, slotIsFullyBooked)}
                  onMouseUp={handleMouseUp}
                  onClick={handleClick}
                  onContextMenu={handleContextMenu}
                  onDragStart={(e) => e.preventDefault()}
                  onFocus={(e) => e.preventDefault()}
                  tabIndex={-1}
                  style={isSlotSelected ? { boxShadow: 'inset 0 0 0 2px rgb(20 184 166)' } : undefined}
                  className={`relative flex-1 p-3 min-h-[100px] select-none ${isDragging ? 'cursor-grabbing' : selectionMode && !slotIsFullyBooked ? 'cursor-pointer' : ''
                    } ${isToday() ? 'bg-gray-50' : ''} ${selectionMode && !slotIsFullyBooked && !isDragging ? 'hover:bg-teal-50' : ''
                    } ${selectionMode && slotIsFullyBooked ? 'cursor-not-allowed bg-gray-100' : ''
                    } ${isSlotSelected ? 'bg-teal-100' : ''
                    }`}
                >
                  {selectionMode && slotIsFullyBooked && (
                    <div className="absolute top-1 right-1 z-30">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {isSlotSelected && (
                    <div className="absolute top-1 right-1 z-30">
                      <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {slotAppointments.map((apt) => {
                    const height = calculateAppointmentHeight(apt);
                    const startTime = new Date(apt.start);
                    const startMinutes = startTime.getMinutes();

                    // Calculate top offset based on minutes past the hour
                    const topOffset = (startMinutes / 60) * 100; // 100px per hour

                    // Get column assignment for this appointment
                    const columnInfo = columnAssignments.get(apt.id);
                    const column = columnInfo?.column ?? 0;
                    const columnCount = columnInfo?.columnCount ?? 1;

                    // Calculate horizontal position based on column assignment
                    const widthPercent = 100 / columnCount;
                    const leftPercent = column * widthPercent;

                    return (
                      <div
                        key={apt.id}
                        className={`absolute ${selectionMode ? 'opacity-40 pointer-events-none' : ''}`}
                        style={{
                          top: `${topOffset}px`,
                          height: `${height}px`,
                          left: `calc(12px + ${leftPercent}%)`,
                          width: `calc(${widthPercent}% - 12px)`,
                          zIndex: 10 + column,
                          paddingLeft: column > 0 ? '2px' : '0',
                          paddingRight: column < columnCount - 1 ? '2px' : '0',
                        }}
                      >
                        <AppointmentBlock
                          appointment={apt}
                          engineerName={apt.engineerId ? engineerNames[apt.engineerId] : undefined}
                          columnWidth={widthPercent}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Current Time Indicator */}
          {showCurrentTime && isToday() && (
            <div
              className="absolute left-20 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
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
  );
}