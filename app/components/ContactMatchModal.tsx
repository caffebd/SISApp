'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface Contact {
  id: string;
  name: string;
  company?: string;
  address_1?: string;
  town?: string;
  postcode?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

interface ContactMatch extends Contact {
  matchScore: number;
  matchReason: string;
  matchType: 'exact' | 'partial' | 'other';
}

interface ContactMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address: {
    postcode: string;
    line?: string;
  };
  currentMatchedContactId?: string;
  onMatchSuccess?: (contactId: string, contactName: string) => void;
}

export default function ContactMatchModal({
  isOpen,
  onClose,
  appointmentId,
  customerName,
  customerEmail,
  customerPhone,
  address,
  currentMatchedContactId,
  onMatchSuccess,
}: ContactMatchModalProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  // Calculate matches when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0) {
      calculateMatches();
    }
  }, [contacts]);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
      const querySnapshot = await getDocs(contactsRef);
      
      const fetchedContacts: Contact[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        fetchedContacts.push({
          id: docSnapshot.id,
          name: data.name || 'N/A',
          company: data.company,
          address_1: data.address_1,
          town: data.town,
          postcode: data.postcode,
          email: data.email,
          phone: data.phone,
          mobile: data.mobile,
        });
      });
      
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatches = () => {
    const potentialMatches: ContactMatch[] = [];

    contacts.forEach((contact) => {
      let score = 0;
      let reason = '';
      let matchType: 'exact' | 'partial' | 'other' = 'other';

      // Exact postcode match (highest priority)
      if (contact.postcode && address.postcode) {
        const contactPostcode = contact.postcode.replace(/\s/g, '').toUpperCase();
        const appointmentPostcode = address.postcode.replace(/\s/g, '').toUpperCase();
        
        if (contactPostcode === appointmentPostcode) {
          score += 100;
          reason = 'Exact postcode match';
          matchType = 'exact';
        }
      }

      // Partial address match
      if (contact.address_1 && address.line) {
        const contactAddress = contact.address_1.toLowerCase();
        const appointmentAddress = address.line.toLowerCase();
        
        if (contactAddress.includes(appointmentAddress) || appointmentAddress.includes(contactAddress)) {
          score += 50;
          if (!reason) {
            reason = 'Partial address match';
            matchType = 'partial';
          }
        }
      }

      // Name similarity (optional)
      if (contact.name && customerName) {
        const contactNameLower = contact.name.toLowerCase();
        const customerNameLower = customerName.toLowerCase();
        
        if (contactNameLower === customerNameLower) {
          score += 30;
          if (!reason) reason = 'Name match';
        } else if (contactNameLower.includes(customerNameLower) || customerNameLower.includes(contactNameLower)) {
          score += 15;
          if (!reason) reason = 'Partial name match';
        }
      }

      // Email match
      if (contact.email && customerEmail) {
        if (contact.email.toLowerCase() === customerEmail.toLowerCase()) {
          score += 40;
          if (!reason) reason = 'Email match';
        }
      }

      // Phone match
      if (customerPhone) {
        const cleanCustomerPhone = customerPhone.replace(/\s/g, '');
        const contactPhoneClean = contact.phone?.replace(/\s/g, '') || '';
        const contactMobileClean = contact.mobile?.replace(/\s/g, '') || '';
        
        if (contactPhoneClean === cleanCustomerPhone || contactMobileClean === cleanCustomerPhone) {
          score += 40;
          if (!reason) reason = 'Phone match';
        }
      }

      // Only include contacts with some match
      if (score > 0) {
        potentialMatches.push({
          ...contact,
          matchScore: score,
          matchReason: reason,
          matchType,
        });
      }
    });

    // Sort by score (highest first) and limit to top 10
    potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
    setMatches(potentialMatches.slice(0, 10));
  };

  const handleConfirmMatch = async (contactId: string) => {
    setIsMatching(true);
    setError('');
    setSuccessMessage('');

    try {
      // Step 1: Check if appointment is already in this contact's array
      const newContactRef = doc(db, 'USERS', USER_ID, 'contacts', contactId);
      const newContactSnap = await getDoc(newContactRef);
      
      if (newContactSnap.exists()) {
        const newContactData = newContactSnap.data();
        const existingAppointmentIds = newContactData.appointmentIds || [];
        
        // If already matched to this contact, just close
        if (existingAppointmentIds.includes(appointmentId)) {
          setSuccessMessage('Already matched to this contact!');
          setTimeout(() => {
            onClose();
            setSuccessMessage('');
          }, 1500);
          setIsMatching(false);
          return;
        }
      }

      // Step 2: If there's a current match, remove appointment from old contact
      if (currentMatchedContactId && currentMatchedContactId !== contactId) {
        try {
          const oldContactRef = doc(db, 'USERS', USER_ID, 'contacts', currentMatchedContactId);
          await updateDoc(oldContactRef, {
            appointmentIds: arrayRemove(appointmentId),
            updatedAt: new Date().toISOString(),
          });
          console.log('Removed appointment from old contact:', currentMatchedContactId);
        } catch (err) {
          console.error('Error removing from old contact:', err);
          // Continue anyway - we still want to add to new contact
        }
      }

      // Step 3: Add appointment to new contact
      await updateDoc(newContactRef, {
        appointmentIds: arrayUnion(appointmentId),
        updatedAt: new Date().toISOString(),
      });

      const contactName = newContactSnap.exists() ? newContactSnap.data().name : 'Unknown Contact';
      console.log('Contact matched successfully:', { contactId, appointmentId, contactName });
      
      // Notify parent component of successful match
      if (onMatchSuccess) {
        onMatchSuccess(contactId, contactName);
      }

      setSuccessMessage('Contact matched successfully!');
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      console.error('Error matching contact:', err);
      setError('Failed to match contact. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddToContacts = () => {
    // Build URL with pre-filled data
    const params = new URLSearchParams({
      fromAppointment: 'true',
      appointmentId: appointmentId, // Track the appointment ID
    });

    if (customerName) params.append('name', customerName);
    if (address.line) params.append('address', address.line);
    if (address.postcode) params.append('postcode', address.postcode);
    if (customerEmail) params.append('email', customerEmail);
    if (customerPhone) params.append('phone', customerPhone);
    
    // Include current matched contact ID so we can remove it from the old contact
    if (currentMatchedContactId) {
      params.append('oldContactId', currentMatchedContactId);
    }

    router.push(`/admin/contacts/new?${params.toString()}`);
  };

  const getMatchBadgeColor = (matchType: 'exact' | 'partial' | 'other') => {
    switch (matchType) {
      case 'exact':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Match Customer to Contact</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Appointment Customer:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>{' '}
              <span className="font-semibold text-gray-900">{customerName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Postcode:</span>{' '}
              <span className="font-semibold text-gray-900">{address.postcode}</span>
            </div>
            {address.line && (
              <div className="col-span-2">
                <span className="text-gray-600">Address:</span>{' '}
                <span className="font-semibold text-gray-900">{address.line}</span>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading contacts...</p>
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Matching Contacts Found</h3>
              <p className="text-gray-600 mb-4">No existing contacts match this customer's details.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Found {matches.length} potential {matches.length === 1 ? 'match' : 'matches'}
              </p>
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{match.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getMatchBadgeColor(match.matchType)}`}>
                          {match.matchReason}
                        </span>
                      </div>
                      
                      {match.company && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Company:</span> {match.company}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {match.address_1 && (
                          <div>
                            <span className="text-gray-600">Address:</span>{' '}
                            <span className="text-gray-900">{match.address_1}</span>
                          </div>
                        )}
                        {match.postcode && (
                          <div>
                            <span className="text-gray-600">Postcode:</span>{' '}
                            <span className="text-gray-900 font-semibold">{match.postcode}</span>
                          </div>
                        )}
                        {match.email && (
                          <div>
                            <span className="text-gray-600">Email:</span>{' '}
                            <span className="text-gray-900">{match.email}</span>
                          </div>
                        )}
                        {(match.phone || match.mobile) && (
                          <div>
                            <span className="text-gray-600">Phone:</span>{' '}
                            <span className="text-gray-900">{match.phone || match.mobile}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleConfirmMatch(match.id)}
                      disabled={isMatching}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isMatching ? 'Matching...' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleAddToContacts}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            No match? Add to contacts
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}