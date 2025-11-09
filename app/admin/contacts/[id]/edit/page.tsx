'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../../lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import ContactForm from '../../ContactForm';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          });
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

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return <ContactForm isEdit={true} contactData={contact} />;
}
