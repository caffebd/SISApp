'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormsNavigation from '../../../components/FormsNavigation';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';

interface InvoiceTemplate {
  id: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [invoices, setInvoices] = useState<InvoiceTemplate[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        await fetchInvoices(user.uid);
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchInvoices = async (uid: string) => {
    setLoadingInvoices(true);
    try {
      const invoicesRef = collection(db, 'USERS', uid, 'Invoices');
      const q = query(invoicesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const invs: InvoiceTemplate[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as InvoiceTemplate));

      setInvoices(invs);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceTemplate | null>(null);

  const confirmDelete = (inv: InvoiceTemplate) => {
    setDeleteTarget(inv);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      const docRef = doc(db, 'USERS', userId, 'Invoices', deleteTarget.id);
      await deleteDoc(docRef);
      await fetchInvoices(userId);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete invoice template', err);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      alert('Failed to delete invoice template');
    }
  };

  const handleCreateNew = () => {
    router.push('/admin/forms/invoices/invoice-builder');
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    const name = inv.name || '';
    return name.toLowerCase().includes(search);
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
                <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Create New Invoice Template
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  View and manage all your invoice templates in one place.
                </p>

                {/* Search Bar */}
                {invoices.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search invoices..."
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

                {/* Invoices List */}
                <div className="mt-6 border-t pt-6">
                  {loadingInvoices ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : invoices.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No invoice templates yet. Create your first template to get started.
                    </p>
                  ) : filteredInvoices.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No invoices match your search.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {inv.name || 'Untitled Invoice Template'}
                              </h3>
                              <div className="flex gap-4 text-sm flex-wrap">
                                {inv.createdAt && (
                                  <span className="text-gray-500">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Created: {inv.createdAt.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex items-start gap-2">
                              <button
                                onClick={() => router.push(`/admin/forms/invoices/invoice-builder?invoiceId=${inv.id}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Edit template"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => confirmDelete(inv)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                title="Delete template"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
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

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteModal(false)}
          title="Delete Invoice Template"
          message={`Are you sure you want to delete "${deleteTarget?.name || 'this template'}"?`}
        />
      </div>
    </div>
  );
}