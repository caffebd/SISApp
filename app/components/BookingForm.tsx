'use client';

import { useState, useEffect } from 'react';
import { getAvailableSlots, type AvailableSlot, bookAppointment } from '../../lib/functionsClient';
import CalendarGrid from './CalendarGrid';

interface PostcodeData {
  postcode: string;
  latitude: number;
  longitude: number;
}

export default function BookingForm() {
  const [postcode, setPostcode] = useState('');
  const [postcodeData, setPostcodeData] = useState<PostcodeData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Selection state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Customer details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation state
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedDate, setConfirmedDate] = useState('');
  const [confirmedTime, setConfirmedTime] = useState('');

  // Initialize current month and week on mount
  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(month);
    
    // Set week start to the Monday of the current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // adjust to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];
    setWeekStartDate(weekStart);
  }, []);

  const validatePostcode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPostcodeData(null);
    setIsLoading(true);
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedTime(null);

    try {
      // Remove spaces and convert to uppercase for the API
      const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
      
      const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
      const data = await response.json();

      if (data.status === 200 && data.result) {
        const postcodeInfo = {
          postcode: data.result.postcode,
          latitude: data.result.latitude,
          longitude: data.result.longitude,
        };
        setPostcodeData(postcodeInfo);

        // Immediately fetch available slots for current month
        await fetchAvailableSlots(postcodeInfo, currentMonth);
      } else {
        setError('Looks like that is not a valid postcode, please check and try again');
      }
    } catch (err) {
      setError('Looks like that is not a valid postcode, please check and try again');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (location: PostcodeData, month: string) => {
    setIsLoadingSlots(true);
    setSlotsError('');
    setAvailableSlots([]);
    try {
      const res = await getAvailableSlots({
        location: { lat: location.latitude, lng: location.longitude },
        month,
      });
      if (res.ok && res.slots) {
        setAvailableSlots(res.slots);
        // Don't set error for empty slots - calendar will handle it
      } else {
        // Check if it's an out-of-area error
        if (res.reason && res.reason.includes('miles from office')) {
          setError('Sorry, looks like you are outside of our service area');
          setPostcodeData(null);
        } else {
          setSlotsError(res.reason || 'Unable to load available times.');
        }
      }
    } catch (err: any) {
      setSlotsError(err?.message || 'Unable to load available times.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleReset = () => {
    setPostcode('');
    setPostcodeData(null);
    setError('');
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setSlotsError('');
  };

  const handleSelectSlot = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowDetails(false);
  };

  const handlePrevMonth = () => {
    if (!postcodeData) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1); // month-2 because JS months are 0-indexed
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(prevMonth);
    setSelectedDate(null);
    setSelectedTime(null);
    fetchAvailableSlots(postcodeData, prevMonth);
  };

  const handleNextMonth = () => {
    if (!postcodeData) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextMonth);
    setSelectedDate(null);
    setSelectedTime(null);
    fetchAvailableSlots(postcodeData, nextMonth);
  };

    const handlePrevWeek = () => {
      const weekStart = new Date(weekStartDate);
      weekStart.setDate(weekStart.getDate() - 7);
      const newWeekStart = weekStart.toISOString().split('T')[0];
      setWeekStartDate(newWeekStart);
    
      // Update month if week crosses month boundary
      const newMonth = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
      if (newMonth !== currentMonth) {
        setCurrentMonth(newMonth);
        if (postcodeData) {
          fetchAvailableSlots(postcodeData, newMonth);
        }
      }
    
      setSelectedDate(null);
      setSelectedTime(null);
    };

    const handleNextWeek = () => {
      const weekStart = new Date(weekStartDate);
      weekStart.setDate(weekStart.getDate() + 7);
      const newWeekStart = weekStart.toISOString().split('T')[0];
      setWeekStartDate(newWeekStart);
    
      // Update month if week crosses month boundary
      const newMonth = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
      if (newMonth !== currentMonth) {
        setCurrentMonth(newMonth);
        if (postcodeData) {
          fetchAvailableSlots(postcodeData, newMonth);
        }
      }
    
      setSelectedDate(null);
      setSelectedTime(null);
    };

  const handleNextToDetails = () => {
    setShowDetails(true);
    setSubmitError('');
  };

  const handleSubmitBooking = async () => {
    if (!postcodeData || !selectedDate || !selectedTime) return;
    if (!name || !email || !phone || !addressLine) {
      setSubmitError('Please complete all fields.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await bookAppointment({
        date: selectedDate,
        time: selectedTime,
        customer: { name, email, phone, addressLine },
        address: {
          postcode: postcodeData.postcode,
          location: { lat: postcodeData.latitude, lng: postcodeData.longitude },
        },
      });
      if (!res.ok) {
        setSubmitError(res.reason || 'Unable to book, please try another time.');
      } else {
        // Show confirmation screen
        setConfirmedDate(selectedDate);
        setConfirmedTime(selectedTime);
        setBookingConfirmed(true);
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Booking failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoHome = () => {
    // Reset all state to initial
    setPostcode('');
    setPostcodeData(null);
    setError('');
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setShowDetails(false);
    setName('');
    setEmail('');
    setPhone('');
    setAddressLine('');
    setSubmitError('');
    setBookingConfirmed(false);
    setConfirmedDate('');
    setConfirmedTime('');
    setSlotsError('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Booking Confirmation Screen */}
      {bookingConfirmed && (
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg p-10">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#000' }}>Booking Confirmed</h2>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="text-xl font-semibold mb-2" style={{ color: '#000' }}>
                {new Date(confirmedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-2xl font-bold" style={{ color: '#0d9488' }}>
                {confirmedTime}
              </div>
            </div>
            <button
              onClick={handleGoHome}
              className="w-full px-10 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-colors shadow-md hover:shadow-lg"
            >
              HOME
            </button>
          </div>
        </div>
      )}

      {/* Main Booking Flow - hide when confirmed */}
      {!bookingConfirmed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Panel - Instructions */}
          <div className="bg-gradient-to-br from-sky-700 to-blue-900 rounded-3xl p-10 text-white shadow-xl">
            <h1 className="text-4xl font-bold mb-12">Book your engineer's visit.</h1>
            
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="numbered-circle">1</div>
                <p className="text-lg leading-relaxed pt-1">
                  Enter your postcode below. We will check if we can service your area and check for the next available appointments.
                </p>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="numbered-circle">2</div>
                <p className="text-lg leading-relaxed pt-1">
                  Select a date and time from the calendar on the right.
                </p>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="numbered-circle">3</div>
                <p className="text-lg leading-relaxed pt-1">
                  Continue to enter your details to book your visit.
                </p>
              </div>
            </div>

            {/* Postcode Input Section */}
            <div className="mt-12">
              <form onSubmit={validatePostcode} className="space-y-4">
                <input
                  type="text"
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  required
                  className="w-full px-6 py-4 text-lg text-gray-900 rounded-2xl focus:ring-2 focus:ring-white/50 outline-none transition-all bg-white/95 placeholder:text-gray-500"
                  placeholder="Please enter your postcode"
                  disabled={isLoading}
                />
                
                <button
                  type="submit"
                  disabled={isLoading || !postcode.trim()}
                  className="w-full px-8 py-4 bg-white text-sky-700 font-bold text-lg rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 shadow-lg"
                >
                  {isLoading ? 'Checking...' : 'Check for appointments'}
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl">
                  <p className="font-medium text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="mt-4 p-4 bg-white/20 rounded-xl">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <p className="font-medium text-sm">Validating postcode...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Calendar */}
          <div className="bg-white rounded-3xl p-8 shadow-xl min-h-[600px]">
            {!postcodeData && !isLoading && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-lg">Enter your postcode to view available appointments</p>
              </div>
            )}

            {/* Slots Loading State */}
            {isLoadingSlots && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="font-medium text-gray-600">Loading available times...</p>
                </div>
              </div>
            )}

            {/* Slots Error */}
            {slotsError && (
              <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
                <p className="font-medium text-center text-gray-900">{slotsError}</p>
              </div>
            )}

            {/* Calendar View */}
            {postcodeData && !isLoadingSlots && !slotsError && (
              <div>
                <CalendarGrid
                  month={currentMonth}
                  slots={availableSlots}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectSlot={handleSelectSlot}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  weekStartDate={weekStartDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />

                {/* NEXT Button to details */}
                {selectedDate && selectedTime && !showDetails && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleNextToDetails}
                      className="px-12 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-colors shadow-md hover:shadow-lg"
                    >
                      NEXT
                    </button>
                  </div>
                )}

                {/* Details Form */}
                {selectedDate && selectedTime && showDetails && (
                  <div className="mt-8 bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Your details</h3>
                    <div className="space-y-4">
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
                        placeholder="Address"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                      />
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    {submitError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-sm rounded-lg text-gray-900">
                        {submitError}
                      </div>
                    )}
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleSubmitBooking}
                        disabled={isSubmitting}
                        className="px-10 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-bold rounded-full transition-colors"
                      >
                        {isSubmitting ? 'SUBMITTING…' : 'SUBMIT'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
