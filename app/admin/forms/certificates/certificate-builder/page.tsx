'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../../lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CertificateBuilder from '../../../../components/CertificateBuilder';
import type { FormElement } from '../../../../components/CertificateBuilderTypes';
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import CertificateNameModal from '../../../../components/CertificateNameModal';
import SaveSuccessModal from '../../../../components/SaveSuccessModal';

export default function CertificateBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certificateId = searchParams.get('certificateId');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [preview, setPreview] = useState(false);
  const [certificateName, setCertificateName] = useState('');
  const [initialElements, setInitialElements] = useState<FormElement[]>([]);
  const builderRef = useRef<{ getElements: () => FormElement[] } | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedCertificateName, setSavedCertificateName] = useState<string | null>(null);

  const saveCertificate = async (name: string) => {
    if (!userId) {
      // show a simple error for now
      window.alert('You must be signed in to save a certificate.');
      return;
    }

    try {
      const elements = builderRef.current?.getElements() || [];

      // preserve visual order by sorting on Y position
      const ordered = [...elements].sort((a, b) => a.position.y - b.position.y);

      // sanitize elements to remove undefined values (Firestore rejects undefined)
      const sanitized = ordered.map((el) => ({
        id: el.id,
        type: el.type,
        position: { x: Number(el.position.x) || 0, y: Number(el.position.y) || 0 },
        properties: {
          label: el.properties?.label ?? '',
          required: !!el.properties?.required,
          placeholder: el.properties?.placeholder ?? null,
          options: el.properties?.options ? [...el.properties.options] : [],
          defaultValue: el.properties?.defaultValue ?? null,
        },
      }));

      if (certificateId) {
        // Update existing certificate
        const docRef = doc(db, 'USERS', userId, 'Certificates', certificateId);
        await updateDoc(docRef, {
          name,
          elements: sanitized,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new certificate
        await addDoc(collection(db, 'USERS', userId, 'Certificates'), {
          name,
          elements: sanitized,
          createdAt: serverTimestamp(),
          createdBy: userId,
        });
      }

      setSavedCertificateName(name);
      setShowSavedModal(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save certificate', err);
      window.alert('Failed to save certificate');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        
        // Load certificate if editing
        if (certificateId) {
          try {
            const docRef = doc(db, 'USERS', user.uid, 'Certificates', certificateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              setCertificateName(data.name || '');
              setInitialElements(data.elements || []);
            } else {
              console.error('Certificate not found');
              window.alert('Certificate not found');
            }
          } catch (err) {
            console.error('Error loading certificate:', err);
            window.alert('Failed to load certificate');
          }
        }
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/forms/certificates"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Certificates
            </Link>

            {/* Certificate name input replaces the title in the header */}
            <input
              type="text"
              value={certificateName}
              onChange={(e) => setCertificateName(e.target.value)}
              placeholder="Certificate name"
              className="ml-2 px-3 py-2 border border-gray-300 rounded-md text-lg font-semibold w-80"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreview((p) => !p)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            >
              {preview ? 'Exit Preview' : 'Preview'}
            </button>
            <button
              onClick={async () => {
                const name = certificateName?.trim();
                if (!name) {
                  setShowNameModal(true);
                  return;
                }

                // already have a name -> save
                await saveCertificate(name);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Save Certificate
            </button>
          </div>
        </div>
      </div>
      
      <CertificateBuilder ref={builderRef} userId={userId} preview={preview} initialElements={initialElements} />
      <CertificateNameModal
        isOpen={showNameModal}
        initialName={certificateName}
        onClose={() => setShowNameModal(false)}
        onSave={async (name) => {
          setShowNameModal(false);
          setCertificateName(name);
          await saveCertificate(name);
        }}
      />

      <SaveSuccessModal
        isOpen={showSavedModal}
        name={savedCertificateName ?? undefined}
        onClose={() => setShowSavedModal(false)}
      />
    </div>
  );
}