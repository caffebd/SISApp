import StatusBadge from './StatusBadge';
import Link from 'next/link';

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

interface AppointmentCardProps {
  appointment: Appointment;
  engineerName?: string;
}

export default function AppointmentCard({ appointment, engineerName }: AppointmentCardProps) {
  const formatAppointmentDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatAppointmentTime = (isoDateTime: string): string => {
    const date = new Date(isoDateTime);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <Link href={`/admin/appointments/${appointment.id}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 cursor-pointer hover:border-blue-300">
      {/* Header with Date and Status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {formatAppointmentDate(appointment.date)}
          </h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatAppointmentTime(appointment.start)}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Customer Details */}
      <div className="space-y-3 mb-4">
        {appointment.appointmentType && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-semibold text-gray-900">{appointment.appointmentType}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-semibold text-gray-900">{appointment.customer.name || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium text-gray-900">{appointment.address.postcode}</p>
          </div>
        </div>

        {appointment.customer.email && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{appointment.customer.email}</p>
            </div>
          </div>
        )}

        {appointment.customer.phone && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{appointment.customer.phone}</p>
            </div>
          </div>
        )}
      </div>

      {/* Engineer Assignment */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-500">Engineer:</span>
          <span className="font-semibold text-gray-900">
            {engineerName || appointment.engineerId || 'Not assigned'}
          </span>
        </div>
      </div>
      </div>
    </Link>
  );
}