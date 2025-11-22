'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import SaveConfirmModal from '../../components/SaveConfirmModal';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';
const OFFICE_ADDRESS = '3 russell centre, Coniston Rd, Flitwick, Bedford MK45 1QY';

interface Appointment {
    id: string;
    start: string;
    end: string;
    customer: {
        name?: string;
    };
    address: {
        postcode: string;
        location?: { lat: number; lng: number };
        address_1?: string;
        town?: string;
    };
    contact?: {
        mobile?: string;
        landline?: string;
    };
    appointmentType?: string;
}

interface RouteStep {
    type: 'travel' | 'appointment' | 'start' | 'end';
    time: string; // HH:MM
    description: string;
    duration?: string;
    distance?: string;
    address?: string;
    appointment?: Appointment;
    isEarly?: boolean;
    earlyDuration?: string;
    expectedArrival?: string;
    originalTime?: string;
    newStartTime?: Date;
    newEndTime?: Date;
}

function RoutePlanContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');
    const engineerIdParam = searchParams.get('engineerId');

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [originalAppointments, setOriginalAppointments] = useState<Appointment[]>([]);
    const [routeStartTime, setRouteStartTime] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');
    const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
    const [mapError, setMapError] = useState('');
    const [engineerName, setEngineerName] = useState('');

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const directionsRendererRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) router.push('/admin');
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!engineerIdParam || engineerIdParam === 'all') {
            setEngineerName('All Engineers');
            return;
        }

        const fetchEngineer = async () => {
            try {
                const docRef = doc(db, 'USERS', USER_ID, 'engineers', engineerIdParam);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEngineerName(docSnap.data().name || 'Unknown Engineer');
                } else {
                    setEngineerName('Unknown Engineer');
                }
            } catch (e) {
                console.error('Error fetching engineer:', e);
                setEngineerName('Unknown Engineer');
            }
        };

        fetchEngineer();
    }, [engineerIdParam]);

    useEffect(() => {
        if (!dateParam) return;

        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const appointmentsRef = collection(db, 'USERS', USER_ID, 'appointments');
                const q = query(appointmentsRef, where('date', '==', dateParam));
                const querySnapshot = await getDocs(q);

                const fetched: Appointment[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (engineerIdParam && engineerIdParam !== 'all' && data.engineerId !== engineerIdParam) return;

                    fetched.push({
                        id: doc.id,
                        start: data.start,
                        end: data.end,
                        customer: { name: data.customer?.name },
                        address: {
                            postcode: data.address?.postcode,
                            location: data.address?.location,
                            address_1: data.address?.address_1,
                            town: data.address?.town,
                        },
                        contact: data.contact,
                        appointmentType: data.appointmentType
                    });
                });

                // Sort by start time
                fetched.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                setAppointments(fetched);
                setOriginalAppointments(JSON.parse(JSON.stringify(fetched))); // Deep copy
                if (fetched.length > 0) {
                    setRouteStartTime(new Date(fetched[0].start));
                }
                setIsDirty(false);

            } catch (err) {
                console.error(err);
                setError('Failed to load appointments');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [dateParam, engineerIdParam]);

    // Load Google Maps and Calculate Route
    useEffect(() => {
        if (appointments.length === 0 || loading) return;

        const calculateRoute = async () => {
            setCalculating(true);
            try {
                await ensureGoogleMaps();
                const google = (window as any).google;
                const directionsService = new google.maps.DirectionsService();

                if (!mapInstanceRef.current && mapDivRef.current) {
                    mapInstanceRef.current = new google.maps.Map(mapDivRef.current, {
                        zoom: 10,
                        center: { lat: 52.0, lng: -0.5 }, // Rough center
                    });
                    directionsRendererRef.current = new google.maps.DirectionsRenderer({
                        map: mapInstanceRef.current,
                        suppressMarkers: true // We will add custom markers
                    });
                }

                const origin = OFFICE_ADDRESS;
                const destination = OFFICE_ADDRESS; // Return to office

                const request = {
                    origin: origin,
                    destination: destination,
                    waypoints: appointments.map(apt => ({
                        location: apt.address.postcode,
                        stopover: true
                    })),
                    optimizeWaypoints: false, // Keep our time-based order
                    travelMode: google.maps.TravelMode.DRIVING,
                };

                directionsService.route(request, (result: any, status: any) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current.setDirections(result);
                        processRouteResult(result, appointments);
                    } else {
                        setMapError('Directions request failed: ' + status);
                    }
                    setCalculating(false);
                });

            } catch (err) {
                console.error(err);
                setMapError('Failed to load map or calculate route');
                setCalculating(false);
            }
        };

        calculateRoute();
    }, [appointments, loading]);

    const processRouteResult = (result: any, sortedAppointments: Appointment[]) => {
        const legs = result.routes[0].legs;
        const newSteps: RouteStep[] = [];
        const google = (window as any).google;
        const map = mapInstanceRef.current;

        // Clear old markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // 1. Office Marker (Start)
        const startLocation = legs[0].start_location;
        const officeMarker = new google.maps.Marker({
            position: startLocation,
            map: map,
            label: { text: 'O', color: 'white' },
            title: 'Office',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4F46E5', // Indigo
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
            }
        });
        markersRef.current.push(officeMarker);

        // Determine start time: use routeStartTime if available (from original schedule), else first appt start
        const startTime = routeStartTime ? new Date(routeStartTime) : new Date(sortedAppointments[0].start);

        // Leg 0 is Office -> Appt 1
        const firstLeg = legs[0];
        const travelTimeMs = firstLeg.duration.value * 1000;
        const leaveTime = new Date(startTime.getTime() - travelTimeMs);

        // 1. Start Step
        newSteps.push({
            type: 'start',
            time: formatTime(leaveTime),
            description: 'Leave Office',
            address: OFFICE_ADDRESS
        });

        let currentSimulatedTime = new Date(startTime); // Arrival at first appt

        // 2. Process appointments
        sortedAppointments.forEach((apt, index) => {
            const legToHere = legs[index]; // Leg 0 is Office -> Appt 1

            // Add Marker for Appointment
            const apptLocation = legToHere.end_location;
            const marker = new google.maps.Marker({
                position: apptLocation,
                map: map,
                label: { text: `${index + 1}`, color: 'white' },
                title: apt.customer.name || `Job ${index + 1}`,
            });
            markersRef.current.push(marker);

            // Travel Step
            newSteps.push({
                type: 'travel',
                time: formatTime(new Date(currentSimulatedTime.getTime() - legToHere.duration.value * 1000)),
                description: index === 0 ? 'Travel to first job' : 'Travel to next job',
                duration: legToHere.duration.text,
                distance: legToHere.distance.text,
            });

            // Calculate duration of this appointment
            const durationMs = new Date(apt.end).getTime() - new Date(apt.start).getTime();
            const durationMins = Math.round(durationMs / 60000);
            const durationText = durationMins >= 60
                ? `${Math.floor(durationMins / 60)} hr ${durationMins % 60 > 0 ? `${durationMins % 60} mins` : ''}`
                : `${durationMins} mins`;

            // Arrival at this appointment is currentSimulatedTime
            const newStart = currentSimulatedTime;
            const newEnd = new Date(newStart.getTime() + durationMs);

            const originalStart = new Date(apt.start);

            // Appointment Step
            newSteps.push({
                type: 'appointment',
                time: formatTime(newStart),
                description: `Appointment: ${apt.customer.name || 'Unknown Customer'}`,
                address: `${apt.address.address_1 || ''} ${apt.address.town || ''} ${apt.address.postcode}`,
                appointment: apt,
                expectedArrival: formatTime(newStart),
                originalTime: formatTime(originalStart),
                newStartTime: newStart,
                newEndTime: newEnd,
                duration: durationText
            });

            // Update simulated time to be the end of this appointment
            // For the next iteration, we need to add the travel time of the NEXT leg to get arrival time
            if (index < sortedAppointments.length - 1) {
                const nextLeg = legs[index + 1];
                currentSimulatedTime = new Date(newEnd.getTime() + nextLeg.duration.value * 1000);
            } else {
                currentSimulatedTime = newEnd; // Just end of last appt
            }
        });

        // 3. Return to Office
        const lastLeg = legs[legs.length - 1]; // The last leg is Appt Last -> Office

        newSteps.push({
            type: 'travel',
            time: formatTime(currentSimulatedTime),
            description: 'Return to Office',
            duration: lastLeg.duration.text,
            distance: lastLeg.distance.text
        });

        const arrivalAtOffice = new Date(currentSimulatedTime.getTime() + lastLeg.duration.value * 1000);
        newSteps.push({
            type: 'end',
            time: formatTime(arrivalAtOffice),
            description: 'Arrive at Office',
            address: OFFICE_ADDRESS
        });

        setRouteSteps(newSteps);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(appointments);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setAppointments(items);
        setIsDirty(true);
    };

    const saveChanges = () => {
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        setShowSaveModal(false);
        setLoading(true);
        try {
            const batch = writeBatch(db);

            // Iterate through routeSteps to find appointments and their NEW times
            routeSteps.forEach(step => {
                if (step.type === 'appointment' && step.appointment && step.newStartTime && step.newEndTime) {
                    const apptRef = doc(db, 'USERS', USER_ID, 'appointments', step.appointment.id);
                    batch.update(apptRef, {
                        start: step.newStartTime.toISOString(),
                        end: step.newEndTime.toISOString()
                    });
                }
            });

            await batch.commit();

            // Update originalAppointments to match the new state so "Reset" goes back to this new saved state
            setOriginalAppointments(JSON.parse(JSON.stringify(appointments))); // Update original state
            setIsDirty(false);

            setSaveSuccessMessage('Appointments updated successfully!');
            setTimeout(() => setSaveSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving changes:', err);
            alert('Failed to save changes.');
        } finally {
            setLoading(false);
        }
    };

    const resetChanges = () => {
        setAppointments(JSON.parse(JSON.stringify(originalAppointments)));
        setIsDirty(false);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link href="/admin/appointments" className="text-blue-600 hover:underline flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Calendar
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Route Plan</h1>
                        <p className="text-gray-600">Date: {dateParam} | Engineer: {engineerName || engineerIdParam}</p>
                        {saveSuccessMessage && (
                            <p className="text-green-600 font-medium mt-1 transition-opacity duration-500 ease-in-out">
                                {saveSuccessMessage}
                            </p>
                        )}
                    </div>
                    {isDirty && (
                        <div className="flex gap-4">
                            <button
                                onClick={resetChanges}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={saveChanges}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Route List */}
                <div className="lg:col-span-1 space-y-6">
                    {loading ? (
                        <p>Loading appointments...</p>
                    ) : error ? (
                        <p className="text-red-600">{error}</p>
                    ) : routeSteps.length === 0 ? (
                        <p>No appointments found for this day.</p>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Start Step */}
                            {routeSteps.find(s => s.type === 'start') && (
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-16 pt-1">
                                            <span className="text-sm font-bold text-gray-900">{routeSteps.find(s => s.type === 'start')?.time}</span>
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-gray-800 text-lg">
                                                {routeSteps.find(s => s.type === 'start')?.description}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">{routeSteps.find(s => s.type === 'start')?.address}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="route-list">
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {appointments.map((apt, index) => {
                                                const stepIndex = routeSteps.findIndex(s => s.type === 'appointment' && s.appointment?.id === apt.id);
                                                const step = routeSteps[stepIndex];
                                                const travelStep = stepIndex > 0 ? routeSteps[stepIndex - 1] : null;

                                                if (!step) return null;

                                                return (
                                                    <Draggable key={apt.id} draggableId={apt.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`border-b border-gray-100 last:border-0 bg-white ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500 z-10' : ''}`}
                                                                style={provided.draggableProps.style}
                                                            >
                                                                {/* Travel Info */}
                                                                {travelStep && (
                                                                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 text-xs text-gray-600">
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        <span>{travelStep.duration} ({travelStep.distance})</span>
                                                                        <span className="text-gray-400 mx-1">•</span>
                                                                        <span>{travelStep.description}</span>
                                                                    </div>
                                                                )}

                                                                {/* Appointment Card */}
                                                                <div className="p-4">
                                                                    <div className="flex items-start gap-4">
                                                                        <div className="flex-shrink-0 w-16 pt-1 text-center">
                                                                            <span className="text-sm font-bold text-gray-900 block">{step.time}</span>
                                                                            {step.originalTime && step.time !== step.originalTime && (
                                                                                <span className="text-xs text-gray-400 line-through block">{step.originalTime}</span>
                                                                            )}

                                                                            {/* Duration with Clock Icon */}
                                                                            <div className="mt-2 flex flex-col items-center text-gray-500">
                                                                                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                <span className="text-xs font-medium leading-tight">{step.duration}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex-grow">
                                                                            <Link
                                                                                href={`/admin/appointments/${step.appointment?.id}?source=route-plan&returnDate=${dateParam}&returnEngineer=${engineerIdParam}`}
                                                                                className="block group"
                                                                            >
                                                                                <h3 className="font-semibold text-indigo-700 text-lg group-hover:underline cursor-pointer">
                                                                                    {step.description}
                                                                                </h3>
                                                                            </Link>

                                                                            {/* Address */}
                                                                            {step.address && <p className="text-sm text-gray-600 mt-1">{step.address}</p>}

                                                                            {/* Phone Number */}
                                                                            {(step.appointment?.contact?.mobile || step.appointment?.contact?.landline) && (
                                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                                    {step.appointment?.contact?.mobile || step.appointment?.contact?.landline}
                                                                                </p>
                                                                            )}

                                                                            {/* Appointment Type */}
                                                                            {step.appointment?.appointmentType && (
                                                                                <p className="text-base font-bold text-gray-800 mt-2">
                                                                                    {step.appointment.appointmentType}
                                                                                </p>
                                                                            )}

                                                                            {step.originalTime && step.time !== step.originalTime && (
                                                                                <div className="mt-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                                                                    Rescheduled (was {step.originalTime})
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>

                            {/* Return Travel and End Step */}
                            {routeSteps.length > 0 && (
                                <>
                                    {/* Return Travel */}
                                    {(() => {
                                        // The return travel step is the second to last step
                                        const returnStep = routeSteps[routeSteps.length - 2];
                                        if (returnStep && returnStep.type === 'travel') {
                                            return (
                                                <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 text-xs text-gray-600 border-b border-gray-100">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <span>{returnStep.duration} ({returnStep.distance})</span>
                                                    <span className="text-gray-400 mx-1">•</span>
                                                    <span>{returnStep.description}</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* End Step */}
                                    {(() => {
                                        const endStep = routeSteps[routeSteps.length - 1];
                                        if (endStep && endStep.type === 'end') {
                                            return (
                                                <div className="p-4 bg-gray-50">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0 w-16 pt-1">
                                                            <span className="text-sm font-bold text-gray-900">{endStep.time}</span>
                                                        </div>
                                                        <div className="flex-grow">
                                                            <h3 className="font-bold text-gray-800 text-lg">
                                                                {endStep.description}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-1">{endStep.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 h-[600px] sticky top-8">
                        <div ref={mapDivRef} className="w-full h-full rounded-lg bg-gray-100" />
                        {mapError && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 text-red-600">{mapError}</div>}
                        {calculating && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 text-indigo-600 font-bold">Calculating Route...</div>}
                    </div>
                </div>
            </div>

            <SaveConfirmModal
                isOpen={showSaveModal}
                onConfirm={handleConfirmSave}
                onCancel={() => setShowSaveModal(false)}
            />
        </div>
    );
}

export default function RoutePlanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RoutePlanContent />
        </Suspense>
    );
}

// Helper to load Google Maps
let mapsLoader: Promise<void> | null = null;
const ensureGoogleMaps = async () => {
    if (typeof window === 'undefined') return;
    if ((window as any).google && (window as any).google.maps) return;
    if (mapsLoader) return mapsLoader;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

    mapsLoader = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API'));
        document.head.appendChild(script);
    });

    return mapsLoader;
};
