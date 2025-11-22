'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface Contact {
  id: string;
  name: string;
  company: string;
  title: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  country: string;
  postcode: string;
  address_1: string;
  address_2: string;
  town: string;
  county: string;
  type: string;
  status: string;
  disableCommunication: boolean;
  appointmentIds?: string[];
  addressLocation?: { lat: number; lng: number };
  additionalContacts?: Array<{
    name: string;
    phone: string;
    email: string;
    relationship: string;
  }>;
}

interface RelatedAppointment {
  id: string;
  date: string;
  start: string;
  engineerId?: string;
  engineerName?: string;
}

export default function ContactDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [pastAppointments, setPastAppointments] = useState<RelatedAppointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<RelatedAppointment[]>([]);
  const [viewMode, setViewMode] = useState<'none' | 'map' | 'street'>('none');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const streetDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const panoInstanceRef = useRef<any>(null);
  const mapsLoaderRef = useRef<Promise<void> | null>(null);
  const markerInstanceRef = useRef<any>(null);
  const mapId: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID as string | undefined;

  const [expandedContactIndex, setExpandedContactIndex] = useState<number | null>(null);

  const toggleContactAccordion = (index: number) => {
    setExpandedContactIndex(expandedContactIndex === index ? null : index);
  };

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push('/admin');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch contact data
  useEffect(() => {
    const fetchContact = async () => {
      if (!contactId) return;

      try {
        const contactRef = doc(db, 'USERS', USER_ID, 'contacts', contactId);
        const contactDoc = await getDoc(contactRef);

        if (contactDoc.exists()) {
          setContact({
            id: contactDoc.id,
            ...contactDoc.data(),
          } as Contact);
        } else {
          console.error('Contact not found');
          router.push('/admin/contacts');
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchContact();
    }
  }, [contactId, isAuthenticated, router]);

  // Fetch related (past) appointments using appointmentIds stored on the contact
  useEffect(() => {
    const loadRelated = async () => {
      if (!isAuthenticated || !contact) return;
      const ids = contact.appointmentIds || [];
      if (ids.length === 0) {
        setPastAppointments([]);
        setUpcomingAppointments([]);
        return;
      }

      setLoadingAppointments(true);
      try {
        const now = new Date();
        const past: RelatedAppointment[] = [];
        const upcoming: RelatedAppointment[] = [];

        await Promise.all(
          ids.map(async (aid) => {
            try {
              const apptRef = doc(db, 'USERS', USER_ID, 'appointments', aid);
              const apptSnap = await getDoc(apptRef);
              if (!apptSnap.exists()) return;
              const data: any = apptSnap.data();
              const startISO: string | undefined = data.start;
              const dateStr: string | undefined = data.date;

              // Derive a comparable Date for classification. If no start, fall back to midnight local time of date.
              let derivedStart: Date | null = null;
              if (startISO) {
                derivedStart = new Date(startISO);
              } else if (dateStr) {
                derivedStart = new Date(`${dateStr}T00:00:00`);
              }

              // Debug to verify classification
              console.debug('[Contact related appt] id:', aid, 'startISO:', startISO, 'date:', dateStr, 'derivedStart:', derivedStart?.toISOString());

              if (derivedStart) {
                let engineerName: string | undefined = undefined;
                if (data.engineerId) {
                  try {
                    const engSnap = await getDoc(doc(db, 'USERS', USER_ID, 'engineers', data.engineerId));
                    if (engSnap.exists()) {
                      engineerName = engSnap.data().name || data.engineerId;
                    }
                  } catch (e) {
                    console.warn('Engineer fetch failed for', data.engineerId, e);
                  }
                }

                const item: RelatedAppointment = {
                  id: apptSnap.id,
                  date: data.date,
                  start: startISO || '',
                  engineerId: data.engineerId,
                  engineerName,
                };

                if (derivedStart < now) {
                  past.push(item);
                } else {
                  upcoming.push(item);
                }
              }
            } catch (e) {
              console.warn('Appointment fetch failed for', aid, e);
            }
          })
        );

        past.sort((a, b) => new Date(b.start || a.date).getTime() - new Date(a.start || a.date).getTime());
        upcoming.sort((a, b) => new Date(a.start || a.date).getTime() - new Date(b.start || b.date).getTime());
        setPastAppointments(past);
        setUpcomingAppointments(upcoming);
      } finally {
        setLoadingAppointments(false);
      }
    };

    loadRelated();
  }, [isAuthenticated, contact]);

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDisplayTime = (startISO: string): string => {
    if (!startISO) return '';
    const d = new Date(startISO);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // NOTE: Removed early returns that occurred before all hooks executed.
  // Returning earlier caused a hook count change once loading/auth/contact resolved,
  // triggering "Rendered more hooks than during the previous render". We now always
  // execute all hooks and conditionally render UI inside the returned JSX.

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      const contactRef = doc(db, 'USERS', USER_ID, 'contacts', contactId);
      await deleteDoc(contactRef);

      // Navigate back to contacts list
      router.push('/admin/contacts');
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const isCompany = !!(contact?.company && contact.company.trim() !== '');

  // Helper: full address string for geocoding
  const fullAddress = () => {
    if (!contact) return '';
    const parts = [
      contact.address_1,
      contact.address_2,
      contact.town,
      contact.county,
      contact.postcode,
      contact.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Helper: load Google Maps JS API script once
  const ensureGoogleMaps = async () => {
    if (typeof window === 'undefined') return;
    // Already loaded
    if ((window as any).google && (window as any).google.maps) return;
    // Already loading
    if (mapsLoaderRef.current) return mapsLoaderRef.current;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    }

    mapsLoaderRef.current = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API'));
      document.head.appendChild(script);
    });

    return mapsLoaderRef.current;
  };

  // Helper: geocode address to coords (uses Maps JS Geocoder)
  const geocodeIfNeeded = async (): Promise<{ lat: number; lng: number }> => {
    if (coords) return coords;
    // Use cached coordinates from contact, if available
    if (contact && contact.addressLocation) {
      setCoords(contact.addressLocation);
      return contact.addressLocation;
    }
    await ensureGoogleMaps();
    const google = (window as any).google as any;
    const geocoder = new google.maps.Geocoder();
    const address = fullAddress();
    if (!address) throw new Error('No address found for this contact');
    const result = await geocoder.geocode({ address }).then((res: any) => res);
    const first = result.results && result.results[0];
    if (!first) throw new Error('Geocoding failed: no results');
    const loc = first.geometry.location;
    const latLng = { lat: loc.lat(), lng: loc.lng() };
    setCoords(latLng);
    // Cache coordinates into Firestore on the contact document to avoid future geocoding
    try {
      await updateDoc(doc(db, 'USERS', USER_ID, 'contacts', contactId), {
        addressLocation: latLng,
      });
      // also update local contact state
      setContact((prev) => (prev ? { ...prev, addressLocation: latLng } as Contact : prev));
    } catch (e) {
      console.warn('Failed to cache geocode on contact:', e);
    }
    return latLng;
  };

  // Initialize or update Map instance
  const showMap = async () => {
    try {
      setMapLoading(true);
      setMapError('');
      const latLng = await geocodeIfNeeded();
      await ensureGoogleMaps();
      const google = (window as any).google as any;
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapDivRef.current, {
          center: latLng,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: true,
          ...(mapId ? { mapId } : {}),
        });
        // Use AdvancedMarkerElement only when a valid Map ID is configured
        if (mapId && google.maps.marker?.AdvancedMarkerElement) {
          try {
            const AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement;
            markerInstanceRef.current = new AdvancedMarkerElement({
              position: latLng,
              map: mapInstanceRef.current,
            });
          } catch {
            markerInstanceRef.current = new google.maps.Marker({ position: latLng, map: mapInstanceRef.current });
          }
        } else {
          if (!mapId) {
            // Informative note for developers; avoids noisy runtime errors from Advanced Markers
            console.info('[Map] No NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID configured; using legacy Marker.');
          }
          markerInstanceRef.current = new google.maps.Marker({ position: latLng, map: mapInstanceRef.current });
        }
      } else {
        // If the map was hidden and is now visible again, force a resize then re-center
        if (google?.maps?.event && mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
        mapInstanceRef.current.setCenter(latLng);
        // Move marker to new position
        if (markerInstanceRef.current) {
          try {
            // AdvancedMarkerElement supports direct position assignment
            markerInstanceRef.current.position = latLng;
          } catch {
            if (markerInstanceRef.current.setPosition) {
              markerInstanceRef.current.setPosition(latLng);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setMapError(e.message || 'Failed to load map');
    } finally {
      setMapLoading(false);
    }
  };

  // Initialize or update Street View instance
  const showStreet = async () => {
    try {
      setMapLoading(true);
      setMapError('');
      const latLng = await geocodeIfNeeded();
      await ensureGoogleMaps();
      const google = (window as any).google as any;
      const sv = new google.maps.StreetViewService();
      // Find nearest panorama within 100 meters
      const panoData = await new Promise<any>((resolve, reject) => {
        sv.getPanorama({ location: latLng, radius: 100 }, (data: any, status: string) => {
          if (status === 'OK' && data) resolve(data);
          else reject(new Error('No Street View imagery found near this address'));
        });
      });

      const panoPos = panoData.location && panoData.location.latLng ? panoData.location.latLng : latLng;

      if (!panoInstanceRef.current) {
        panoInstanceRef.current = new google.maps.StreetViewPanorama(streetDivRef.current, {
          position: panoPos,
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
        });
      } else {
        if (google?.maps?.event && panoInstanceRef.current) {
          google.maps.event.trigger(panoInstanceRef.current, 'resize');
        }
        panoInstanceRef.current.setPosition(panoPos);
      }
    } catch (e: any) {
      console.error(e);
      setMapError(e.message || 'Failed to load Street View');
    } finally {
      setMapLoading(false);
    }
  };

  // React to viewMode changes
  useEffect(() => {
    if (viewMode === 'map') {
      showMap();
    } else if (viewMode === 'street') {
      showStreet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  return (
    <div className="py-8">
      {/* Loading / unauthenticated state */}
      {(!isAuthenticated || loading) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}
      {/* Main content when contact is loaded */}
      {isAuthenticated && !loading && contact && (
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/contacts"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Contacts
            </Link>
          </div>

          {/* Top Card - Contact Details */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit and Delete Icons */}
              <div className="flex gap-2">
                <Link
                  href={`/admin/contacts/${contactId}/edit`}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                  title="Edit Contact"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Link>

                <button
                  onClick={handleDeleteClick}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                  title="Delete Contact"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              {isCompany && (
                <div>
                  <h3 className="text-sm font-semibold text-green-600 mb-1">Company</h3>
                  <p className="text-gray-900">{contact.company}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contact.title && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 mb-1">Title & Full Name</h3>
                    <p className="text-gray-900">{contact.name}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-green-600 mb-1">Customer Status</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${contact.status === 'normal' ? 'bg-green-100 text-green-800' :
                    contact.status === 'risky' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                    {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-green-600 mb-3">Main Contact</h3>

                <div className="space-y-2">
                  {contact.mobile && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 w-32">Mobile (SMS)</span>
                      <span className="text-gray-900">{contact.mobile}</span>
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 w-32">Email</span>
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {contact.disableCommunication && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Communication disabled with this customer</span>
                </div>
              )}
            </div>

            {/* Additional Contacts */}
            {contact.additionalContacts && contact.additionalContacts.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold text-green-600 mb-3">Additional Contacts</h3>
                <div className="space-y-3">
                  {contact.additionalContacts.map((ac, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleContactAccordion(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {ac.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{ac.name}</h4>
                            <p className="text-xs text-gray-500">{ac.relationship}</p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedContactIndex === index ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expandedContactIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-3 bg-white border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                              <p className="text-gray-900">{ac.phone || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
                              {ac.email ? (
                                <a href={`mailto:${ac.email}`} className="text-blue-600 hover:underline">
                                  {ac.email}
                                </a>
                              ) : (
                                <span className="text-gray-900">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card - Address */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-xl font-bold text-green-600">Main Address</h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 font-semibold rounded-lg transition-colors ${viewMode === 'map'
                    ? 'bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setViewMode('street')}
                  className={`px-4 py-2 font-semibold rounded-lg transition-colors ${viewMode === 'street'
                    ? 'bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  Street View
                </button>
                {/* Directions link opens Google Maps in a new tab */}
                <a
                  href={(function () {
                    const destination = coords
                      ? `${coords.lat},${coords.lng}`
                      : encodeURIComponent(fullAddress());
                    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                  title="Open directions in Google Maps"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Directions
                </a>
                {viewMode !== 'none' && (
                  <button
                    onClick={() => setViewMode('none')}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1 text-gray-900">
              {contact.address_1 && <p>{contact.address_1}</p>}
              {contact.address_2 && <p>{contact.address_2}</p>}
              {contact.town && <p>{contact.town}</p>}
              {contact.postcode && <p className="font-semibold text-blue-600">{contact.postcode}</p>}
              {contact.county && <p>{contact.county}</p>}
              {contact.country && <p>{contact.country}</p>}
            </div>

            {/* Map / Street View container (always mounted to preserve instances) */}
            <div className={`mt-4 transition-opacity ${viewMode === 'none' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'} `}>
              <div className={`relative w-full ${viewMode === 'none' ? 'h-0' : 'h-96'} rounded-lg overflow-hidden border border-gray-200`}>
                <div
                  ref={mapDivRef}
                  className={`${viewMode === 'map' ? 'block' : 'hidden'} w-full h-full`}
                />
                <div
                  ref={streetDivRef}
                  className={`${viewMode === 'street' ? 'block' : 'hidden'} w-full h-full`}
                />
              </div>
              <div className="flex items-center gap-3 mt-2 min-h-[1.5rem]">
                {mapLoading && (
                  <span className="text-sm text-gray-600">Loading…</span>
                )}
                {mapError && (
                  <span className="text-sm text-red-600">{mapError}</span>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-bold text-green-600">Upcoming Appointments</h2>
            </div>

            {loadingAppointments ? (
              <div className="text-gray-500">Loading appointments…</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-gray-600">No upcoming appointments for this contact.</div>
            ) : (
              <div className="divide-y">
                {upcomingAppointments.map((apt) => (
                  <Link key={apt.id} href={`/admin/appointments/${apt.id}`} className="block py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{formatDisplayDate(apt.date)}</p>
                        <p className="text-base font-medium text-gray-900">{apt.start ? formatDisplayTime(apt.start) : '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Engineer</p>
                        <p className="text-base font-semibold text-gray-900">{apt.engineerName || apt.engineerId || 'Not assigned'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-bold text-green-600">Past Appointments</h2>
            </div>

            {loadingAppointments ? (
              <div className="text-gray-500">Loading appointments…</div>
            ) : pastAppointments.length === 0 ? (
              <div className="text-gray-600">No past appointments found for this contact.</div>
            ) : (
              <div className="divide-y">
                {pastAppointments.map((apt) => (
                  <Link key={apt.id} href={`/admin/appointments/${apt.id}`} className="block py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{formatDisplayDate(apt.date)}</p>
                        <p className="text-base font-medium text-gray-900">{apt.start ? formatDisplayTime(apt.start) : '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Engineer</p>
                        <p className="text-base font-semibold text-gray-900">{apt.engineerName || apt.engineerId || 'Not assigned'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              {/* Warning Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">WARNING</h2>
              </div>

              {/* Message */}
              <p className="text-gray-700 mb-6 text-lg">
                Are you sure you want to delete this contact?
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {isDeleting ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
