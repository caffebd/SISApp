'use client';

import { useState } from 'react';

interface Slot {
  date: string;
  time: string;
  engineerId: string;
}

interface CalendarGridProps {
  month: string; // YYYY-MM
  slots: Slot[];
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectSlot: (date: string, time: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  weekStartDate: string; // YYYY-MM-DD of the first day in the current week view
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export default function CalendarGrid({
  month,
  slots,
  selectedDate,
  selectedTime,
  onSelectSlot,
  onPrevWeek,
  onNextWeek,
  weekStartDate,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const [year, monthNum] = month.split('-').map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = slot.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  // Build 7-day week starting from weekStartDate
  const weekStart = new Date(weekStartDate + 'T00:00:00');
  const weekDays: Array<{ date: Date; dateKey: string; dayName: string; dayNum: number }> = [];
  
  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    weekDays.push({ date, dateKey, dayName, dayNum });
  }

  // Get selected day slots
  const selectedDaySlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];
  // Deduplicate by time across engineers and sort ascending
  const uniqueSelectedSlots = (() => {
    const map = new Map<string, Slot>();
    for (const s of selectedDaySlots) {
      if (!map.has(s.time)) map.set(s.time, s);
    }
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
  })();

  return (
    <div className="w-full">
      {/* Month Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthName}
        </h2>
      </div>

      {/* Week Navigation + Days Row */}
      <div className="flex items-center gap-3 mb-6">
        {/* Prev Arrow */}
        <button
          onClick={onPrevWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Previous week"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 gap-3">
          {weekDays.map(({ dateKey, dayName, dayNum }) => {
            const daySlots = slotsByDate[dateKey] || [];
            const hasSlots = daySlots.length > 0;
            const isSelected = selectedDate === dateKey;
            const isPastOrToday = dateKey <= todayStr;

            return (
              <button
                key={dateKey}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-gray-200'
                    : isPastOrToday || !hasSlots
                    ? 'bg-gray-100 cursor-not-allowed opacity-50'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  if (!isPastOrToday && hasSlots) {
                    onSelectSlot(dateKey, '');
                  }
                }}
                disabled={isPastOrToday || !hasSlots}
              >
                <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                  {dayName}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })} {dayNum}
                </div>
              </button>
            );
          })}
        </div>

        {/* Next Arrow */}
        <button
          onClick={onNextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Next week"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Time Slots Grid - shown below when a date is selected */}
      {selectedDate && selectedDaySlots.length > 0 && (
        <div className="space-y-3">
          {uniqueSelectedSlots.map((slot, index) => {
            const isSelectedTime = selectedTime === slot.time;
            
            // Show only first 4 slots, then a "more" button
            if (index < 4) {
              return (
                <button
                  key={slot.time}
                  onClick={() => onSelectSlot(selectedDate, slot.time)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-base transition-all ${
                    isSelectedTime
                      ? 'bg-teal-700 text-white shadow-md'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {slot.time}
                </button>
              );
            }
            
            if (index === 4) {
              return (
                <button
                  key="more"
                  className="w-full py-3 px-4 rounded-xl font-semibold text-base bg-teal-600 text-white hover:bg-teal-700 transition-all"
                >
                  more
                </button>
              );
            }
            
            return null;
          })}
        </div>
      )}
      
      {selectedDate && selectedDaySlots.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No available slots for this date
        </div>
      )}
    </div>
  );
}
