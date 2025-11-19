interface Appointment {
  id: string;
  date: string;
  start: string;
  end: string;
}

interface AppointmentWithColumn extends Appointment {
  column: number;
  columnCount: number;
}

/**
 * Checks if two appointments overlap in time
 */
function appointmentsOverlap(apt1: Appointment, apt2: Appointment): boolean {
  const start1 = new Date(apt1.start).getTime();
  const end1 = new Date(apt1.end).getTime();
  const start2 = new Date(apt2.start).getTime();
  const end2 = new Date(apt2.end).getTime();

  return start1 < end2 && start2 < end1;
}

/**
 * Assigns column positions to overlapping appointments using a greedy algorithm
 * Returns a map of appointment ID to column assignment info
 */
export function assignAppointmentColumns(
  appointments: Appointment[]
): Map<string, { column: number; columnCount: number }> {
  const result = new Map<string, { column: number; columnCount: number }>();
  
  if (appointments.length === 0) {
    return result;
  }

  // Sort appointments by start time, then by duration (longer first)
  const sorted = [...appointments].sort((a, b) => {
    const startCompare = a.start.localeCompare(b.start);
    if (startCompare !== 0) return startCompare;
    
    const durationA = new Date(a.end).getTime() - new Date(a.start).getTime();
    const durationB = new Date(b.end).getTime() - new Date(b.start).getTime();
    return durationB - durationA; // Longer appointments first
  });

  // Track which columns are occupied and their end times
  const columns: { endTime: number; appointments: Appointment[] }[] = [];

  // Assign each appointment to a column
  for (const apt of sorted) {
    const startTime = new Date(apt.start).getTime();
    const endTime = new Date(apt.end).getTime();

    // Find the first available column (where no appointment overlaps)
    let assignedColumn = -1;
    
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      
      // Check if this appointment overlaps with any appointment in this column
      const hasOverlap = column.appointments.some(existingApt => 
        appointmentsOverlap(apt, existingApt)
      );
      
      if (!hasOverlap) {
        assignedColumn = i;
        break;
      }
    }

    // If no available column found, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push({ endTime, appointments: [] });
    }

    // Add appointment to the column
    columns[assignedColumn].appointments.push(apt);
    columns[assignedColumn].endTime = Math.max(columns[assignedColumn].endTime, endTime);
  }

  // Calculate column count for each group of overlapping appointments
  const columnCount = columns.length;

  // Assign column info to each appointment
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    for (const apt of columns[colIndex].appointments) {
      result.set(apt.id, {
        column: colIndex,
        columnCount,
      });
    }
  }

  return result;
}

/**
 * Groups appointments by date and assigns columns for each day
 */
export function assignColumnsByDate(
  appointments: Appointment[]
): Map<string, Map<string, { column: number; columnCount: number }>> {
  const byDate = new Map<string, Map<string, { column: number; columnCount: number }>>();

  // Group appointments by date
  const appointmentsByDate = new Map<string, Appointment[]>();
  
  for (const apt of appointments) {
    if (!appointmentsByDate.has(apt.date)) {
      appointmentsByDate.set(apt.date, []);
    }
    appointmentsByDate.get(apt.date)!.push(apt);
  }

  // Assign columns for each date
  for (const [date, dateAppointments] of appointmentsByDate) {
    const columnAssignments = assignAppointmentColumns(dateAppointments);
    byDate.set(date, columnAssignments);
  }

  return byDate;
}