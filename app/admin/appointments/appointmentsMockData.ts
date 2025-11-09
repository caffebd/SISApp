type AppointmentStatus = 'pending' | 'offered' | 'confirmed' | 'declined' | 'cancelled';

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

// Mock appointments data for preview
export const mockRootProps = {
  appointments: [
    {
      id: 'appt-001',
      status: 'confirmed' as const,
      engineerId: 'eng-001',
      date: '2025-11-15',
      start: '2025-11-15T09:00:00Z',
      end: '2025-11-15T10:00:00Z',
      customer: {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+44 7700 900123'
      },
      address: {
        postcode: 'SW1A 1AA',
        location: { lat: 51.501364, lng: -0.14189 }
      }
    },
    {
      id: 'appt-002',
      status: 'confirmed' as const,
      engineerId: 'eng-002',
      date: '2025-11-16',
      start: '2025-11-16T14:00:00Z',
      end: '2025-11-16T15:00:00Z',
      customer: {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '+44 7700 900456'
      },
      address: {
        postcode: 'M1 1AE',
        location: { lat: 53.483959, lng: -2.244644 }
      }
    },
    {
      id: 'appt-002',
      status: 'confirmed' as const,
      engineerId: 'eng-002',
      date: '2025-11-16',
      start: '2025-11-16T14:00:00Z',
      end: '2025-11-16T15:00:00Z',
      customer: {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '+44 7700 900456'
      },
      address: {
        postcode: 'M1 1AE',
        location: { lat: 53.483959, lng: -2.244644 }
      }
    },
    {
      id: 'appt-003',
      status: 'pending' as const,
      engineerId: 'eng-001',
      date: '2025-11-17',
      start: '2025-11-17T10:30:00Z',
      end: '2025-11-17T11:30:00Z',
      customer: {
        name: 'Michael Brown',
        email: 'mbrown@example.com',
        phone: '+44 7700 900789'
      },
      address: {
        postcode: 'B1 1AA',
        location: { lat: 52.486243, lng: -1.890401 }
      }
    },
    {
      id: 'appt-004',
      status: 'offered' as const,
      engineerId: 'eng-003',
      date: '2025-11-18',
      start: '2025-11-18T11:00:00Z',
      end: '2025-11-18T12:00:00Z',
      customer: {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        phone: '+44 7700 900321'
      },
      address: {
        postcode: 'L1 1AA',
        location: { lat: 53.408371, lng: -2.991573 }
      }
    },
    {
      id: 'appt-005',
      status: 'cancelled' as const,
      engineerId: 'eng-002',
      date: '2025-11-19',
      start: '2025-11-19T15:30:00Z',
      end: '2025-11-19T16:30:00Z',
      customer: {
        name: 'David Wilson',
        email: 'dwilson@example.com',
        phone: '+44 7700 900654'
      },
      address: {
        postcode: 'EH1 1AA',
        location: { lat: 55.953251, lng: -3.188267 }
      }
    }
  ] as Appointment[]
};