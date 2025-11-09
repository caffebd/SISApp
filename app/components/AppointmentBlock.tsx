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

interface AppointmentBlockProps {
  appointment: Appointment;
  engineerName?: string;
  compact?: boolean;
  showTime?: boolean;
}

const statusColors: Record<AppointmentStatus, string> = {
  confirmed: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
  pending: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
  offered: 'bg-cyan-500 hover:bg-cyan-600 border-cyan-600',
  complete: 'bg-gray-400 hover:bg-gray-500 border-gray-500',
  cancelled: 'bg-orange-500 hover:bg-orange-600 border-orange-600',
  declined: 'bg-red-500 hover:bg-red-600 border-red-600',
};

export default function AppointmentBlock({ 
  appointment, 
  engineerName, 
  compact = false,
  showTime = true 
}: AppointmentBlockProps) {
  const formatTime = (isoDateTime: string): string => {
    const date = new Date(isoDateTime);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getJobDescription = () => {
    return appointment.appointmentType?.trim() || 'Visit';
  };

  const colorClass = statusColors[appointment.status] || statusColors.pending;

  if (compact) {
    return (
      <Link href={`/admin/appointments/${appointment.id}`}>
        <div className={`${colorClass} text-white rounded px-2 py-1 text-xs font-medium cursor-pointer transition-colors border-l-2 mb-1`}>
          <div className="font-semibold">
            {showTime && `${formatTime(appointment.start)} - ${formatTime(appointment.end)}`}
          </div>
          <div className="truncate opacity-90">{getJobDescription()}</div>
          {appointment.customer.name && (
            <div className="truncate opacity-90 text-[10px]">{appointment.customer.name}</div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/admin/appointments/${appointment.id}`}>
      <div className={`${colorClass} text-white rounded-lg p-3 cursor-pointer transition-colors border-l-4 shadow-sm`}>
        <div className="font-bold text-sm mb-1">
          {formatTime(appointment.start)} - {formatTime(appointment.end)}
        </div>
        <div className="text-sm font-medium mb-1">{getJobDescription()}</div>
        <div className="text-xs opacity-90">
          {appointment.address.postcode}
        </div>
        <div className="text-xs opacity-90 mt-1">
          {appointment.customer.name || 'Customer'}
        </div>
      </div>
    </Link>
  );
}