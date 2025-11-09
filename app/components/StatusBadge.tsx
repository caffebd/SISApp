type AppointmentStatus = 'pending' | 'offered' | 'confirmed' | 'declined' | 'cancelled' | 'complete';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'declined':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'complete':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusStyles()}`}>
      {formatStatus(status)}
    </span>
  );
}