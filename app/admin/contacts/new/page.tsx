'use client';

import { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import ContactForm from '../ContactForm';

function NewContactContent() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  if (!isAuthenticated) {
    return null;
  }

  return <ContactForm isEdit={false} />;
}

export default function NewContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <NewContactContent />
    </Suspense>
  );
}
