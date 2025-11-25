'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerUploadModal from '../../components/CustomerUploadModal';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface Contact {
  id: string;
  name: string;
  company?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  address_1?: string;
  address_2?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  type?: string;
  status?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  // Fetch contacts from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchContacts = async () => {
      setLoading(true);
      setError('');

      try {
        // Fetch contacts from user's subcollection
        const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
        const q = query(contactsRef, orderBy('lastName', 'asc'), orderBy('firstName', 'asc'));
        const querySnapshot = await getDocs(q);

        const fetchedContacts: Contact[] = [];

        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          fetchedContacts.push({
            id: docSnapshot.id,
            name: data.name || 'N/A',
            company: data.company,
            title: data.title,
            firstName: data.firstName,
            lastName: data.lastName,
            address_1: data.address_1,
            address_2: data.address_2,
            town: data.town,
            county: data.county,
            postcode: data.postcode,
            country: data.country,
            type: data.type,
            status: data.status,
            email: data.email,
            phone: data.phone,
            mobile: data.mobile,
          });
        });

        setContacts(fetchedContacts);
        setFilteredContacts(fetchedContacts);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError('Failed to load contacts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [isAuthenticated]);

  const refreshContacts = () => {
    // Re-trigger the effect by toggling a dependency or just calling the function if extracted
    // For simplicity, we can just reload the page or re-fetch. 
    // Since fetchContacts is inside useEffect, let's extract it or just force a reload for now, 
    // or better, duplicate the fetch logic or move it out.
    // Actually, the easiest way without refactoring too much is to just reload the window or 
    // make fetchContacts a useCallback and call it.
    // Let's just reload the page for a clean state, or better yet, just toggle a refresh trigger.
    window.location.reload();
  };

  // Apply search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredContacts(contacts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(term) ||
      contact.company?.toLowerCase().includes(term) ||
      contact.firstName?.toLowerCase().includes(term) ||
      contact.lastName?.toLowerCase().includes(term) ||
      contact.address_1?.toLowerCase().includes(term) ||
      contact.address_2?.toLowerCase().includes(term) ||
      contact.town?.toLowerCase().includes(term) ||
      contact.county?.toLowerCase().includes(term) ||
      contact.postcode?.toLowerCase().includes(term) ||
      contact.type?.toLowerCase().includes(term) ||
      contact.status?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.phone?.toLowerCase().includes(term) ||
      contact.mobile?.toLowerCase().includes(term)
    );

    setFilteredContacts(filtered);
  }, [contacts, searchTerm]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Contacts</h1>
              <p className="text-gray-600">
                {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'} found
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Upload Contacts
              </button>
              <Link
                href="/admin/contacts/new"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                New Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts by name, company, address, postcode, type, or status..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Try adjusting your search terms to find more contacts.'
                : 'There are no contacts in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/admin/contacts/${contact.id}`}
                  className="block border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
                        {contact.type && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {contact.type}
                          </span>
                        )}
                        {contact.status && (
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${contact.status.toLowerCase() === 'active'
                              ? 'bg-green-100 text-green-700'
                              : contact.status.toLowerCase() === 'inactive'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {contact.status}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {/* Company */}
                        {contact.company && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" />
                            </svg>
                            <span className="text-gray-700 font-medium">{contact.company}</span>
                          </div>
                        )}

                        {/* Email */}
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-700">{contact.email}</span>
                          </div>
                        )}

                        {/* Mobile/Phone */}
                        {(contact.mobile || contact.phone) && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-gray-700">{contact.mobile || contact.phone}</span>
                          </div>
                        )}

                        {/* Address */}
                        {contact.address_1 && (
                          <div className="flex items-start gap-2 md:col-span-2">
                            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="text-gray-700">
                              <div>{contact.address_1}</div>
                              {contact.address_2 && <div>{contact.address_2}</div>}
                              {contact.town && <div>{contact.town}</div>}
                              {contact.county && <div>{contact.county}</div>}
                              {contact.postcode && <div className="font-medium">{contact.postcode}</div>}
                              {contact.country && contact.country !== 'UNITED KINGDOM' && (
                                <div>{contact.country}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CustomerUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={refreshContacts}
      />
    </div >
  );
}