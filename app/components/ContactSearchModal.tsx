'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

interface ContactSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
}

export default function ContactSearchModal({
  isOpen,
  onClose,
  onSelectContact,
}: ContactSearchModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter contacts when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = contacts.filter((contact) => {
        return (
          contact.name?.toLowerCase().includes(term) ||
          contact.company?.toLowerCase().includes(term) ||
          contact.address_1?.toLowerCase().includes(term) ||
          contact.postcode?.toLowerCase().includes(term) ||
          contact.email?.toLowerCase().includes(term) ||
          contact.phone?.includes(term) ||
          contact.mobile?.includes(term)
        );
      });
      setFilteredContacts(filtered);
    }
  }, [searchTerm, contacts]);

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
      
      // Sort by name
      fetchedContacts.sort((a, b) => a.name.localeCompare(b.name));
      
      setContacts(fetchedContacts);
      setFilteredContacts(fetchedContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Search Contacts</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 bg-teal-50 border-b border-teal-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, address, phone, or postcode..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'} found
          </p>
        </div>

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading contacts...</p>
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Contacts Found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try a different search term' : 'No contacts available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{contact.name}</h4>
                      </div>
                      
                      {contact.company && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Company:</span> {contact.company}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {contact.address_1 && (
                          <div>
                            <span className="text-gray-600">Address:</span>{' '}
                            <span className="text-gray-900">{contact.address_1}</span>
                          </div>
                        )}
                        {contact.town && (
                          <div>
                            <span className="text-gray-600">Town:</span>{' '}
                            <span className="text-gray-900">{contact.town}</span>
                          </div>
                        )}
                        {contact.postcode && (
                          <div>
                            <span className="text-gray-600">Postcode:</span>{' '}
                            <span className="text-gray-900 font-semibold">{contact.postcode}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div>
                            <span className="text-gray-600">Email:</span>{' '}
                            <span className="text-gray-900">{contact.email}</span>
                          </div>
                        )}
                        {(contact.phone || contact.mobile) && (
                          <div>
                            <span className="text-gray-600">Phone:</span>{' '}
                            <span className="text-gray-900">{contact.phone || contact.mobile}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleSelectContact(contact)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
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