'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface Contact {
    id: string;
    name: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    town?: string;
    county?: string;
    postcode?: string;
    country?: string;
}

interface ContactSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (contact: Contact) => void;
}

export default function ContactSelectModal({ isOpen, onClose, onSelect }: ContactSelectModalProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredContacts(contacts);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredContacts(
                contacts.filter(
                    (c) =>
                        c.name.toLowerCase().includes(term) ||
                        c.company?.toLowerCase().includes(term) ||
                        c.postcode?.toLowerCase().includes(term)
                )
            );
        }
    }, [searchTerm, contacts]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
            const q = query(contactsRef, orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const contactsList: Contact[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name || '',
                company: doc.data().company,
                address_1: doc.data().address_1,
                address_2: doc.data().address_2,
                town: doc.data().town,
                county: doc.data().county,
                postcode: doc.data().postcode,
                country: doc.data().country,
            }));
            setContacts(contactsList);
            setFilteredContacts(contactsList);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                    <div className="p-6 border-b">
                        <h2 className="text-2xl font-bold text-gray-900">Select Contact</h2>
                        <div className="mt-4 relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search contacts..."
                                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No contacts found</p>
                        ) : (
                            <div className="space-y-2">
                                {filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        onClick={() => {
                                            onSelect(contact);
                                            onClose();
                                        }}
                                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                    >
                                        <div className="font-semibold text-gray-900">{contact.name}</div>
                                        {contact.company && (
                                            <div className="text-sm text-gray-600">{contact.company}</div>
                                        )}
                                        {contact.address_1 && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {contact.address_1}
                                                {contact.town && `, ${contact.town}`}
                                                {contact.postcode && ` ${contact.postcode}`}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
