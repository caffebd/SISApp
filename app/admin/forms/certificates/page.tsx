'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormsNavigation from '../../../components/FormsNavigation';

interface Certificate {
  id: string;
  title?: string;
  description?: string;
  issueDate?: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        await fetchCertificates(user.uid);
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchCertificates = async (uid: string) => {
    setLoadingCertificates(true);
    try {
      const certificatesRef = collection(db, 'USERS', uid, 'certificates');
      const q = query(certificatesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const certs: Certificate[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        issueDate: doc.data().issueDate?.toDate(),
        expiryDate: doc.data().expiryDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as Certificate));
      
      setCertificates(certs);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoadingCertificates(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/admin/forms/certificates/certificate-builder');
  };

  // Filter certificates based on search term
  const filteredCertificates = certificates.filter((cert) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      cert.title?.toLowerCase().includes(search) ||
      cert.description?.toLowerCase().includes(search) ||
      cert.certificateNumber?.toLowerCase().includes(search) ||
      cert.status?.toLowerCase().includes(search)
    );
  });

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
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
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
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Forms and Certificates</h1>
          <p className="text-gray-600">Manage your certificates and invoices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FormsNavigation />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Certificates</h2>
                <button 
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Create New Certificate
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  View and manage all your certificates in one place.
                </p>

                {/* Search Bar */}
                {certificates.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search certificates by title, description, number, or status..."
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
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Certificates List */}
                <div className="mt-6 border-t pt-6">
                  {loadingCertificates ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : certificates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No certificates yet. Create your first certificate to get started.
                    </p>
                  ) : filteredCertificates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No certificates match your search. Try different keywords.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredCertificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {cert.title || 'Untitled Certificate'}
                              </h3>
                              {cert.description && (
                                <p className="text-sm text-gray-600 mb-2">{cert.description}</p>
                              )}
                              <div className="flex gap-4 text-sm flex-wrap">
                                {cert.certificateNumber && (
                                  <span className="text-gray-700">
                                    <span className="font-medium">No:</span> {cert.certificateNumber}
                                  </span>
                                )}
                                {cert.status && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    cert.status.toLowerCase() === 'active' 
                                      ? 'bg-green-100 text-green-700'
                                      : cert.status.toLowerCase() === 'expired'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {cert.status}
                                  </span>
                                )}
                                {cert.issueDate && (
                                  <span className="text-gray-500">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Issued: {cert.issueDate.toLocaleDateString()}
                                  </span>
                                )}
                                {cert.expiryDate && (
                                  <span className="text-gray-500">
                                    Expires: {cert.expiryDate.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => console.log('View/Edit certificate:', cert.id)}
                              className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="View certificate"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}