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

/**
 * Extracts components from a UK postcode
 * Handles postcodes with or without spaces (e.g. "SW1A 1AA" or "SW1A1AA")
 */
export function getPostcodeComponents(postcode: string) {
  const normalized = postcode.toUpperCase().trim().replace(/\s+/g, '');

  // UK postcodes always have an Inward Code of 3 chars (e.g. 1AA)
  // The rest is the Outward Code (e.g. SW1A)
  if (normalized.length < 5) {
    // Too short to be a full postcode, treat as just outward code
    return { area: '', district: '', outward: normalized };
  }

  const outward = normalized.slice(0, -3);
  // const inward = normalized.slice(-3); // Not needed for area logic

  const areaMatch = outward.match(/^[A-Z]+/);
  const area = areaMatch ? areaMatch[0] : '';

  // District logic: remove trailing letter if present (e.g. W1A -> W1)
  const district = outward.replace(/[A-Z]$/, '');

  return { area, district, outward };
}

/**
 * Finds the most specific common postcode area/district/sub-district for a list of postcodes
 */
export function getCommonPostcodeArea(postcodes: string[]): string {
  if (!postcodes.length) return '';

  const parsed = postcodes.map(getPostcodeComponents);

  // 1. Check Outward Code (Sub-District) - e.g. SW1A
  const firstOutward = parsed[0].outward;
  if (firstOutward && parsed.every(p => p.outward === firstOutward)) {
    return firstOutward;
  }

  // 2. Check District - e.g. SW1
  const firstDistrict = parsed[0].district;
  if (firstDistrict && parsed.every(p => p.district === firstDistrict)) {
    return firstDistrict;
  }

  // 3. Check Area - e.g. SW
  const firstArea = parsed[0].area;
  if (firstArea && parsed.every(p => p.area === firstArea)) {
    return firstArea;
  }

  return '';
}

/**
 * Fetches the administrative district name for a given outward code
 */
export async function fetchPostcodeAreaName(outwardCode: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/outcodes/${outwardCode}`);
    const data = await response.json();

    if (data.status === 200 && data.result) {
      // Prefer admin_district, fall back to parish or admin_county
      return data.result.admin_district?.[0] ||
        data.result.parish?.[0] ||
        data.result.admin_county?.[0] ||
        null;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching area name for ${outwardCode}:`, error);
    return null;
  }
}