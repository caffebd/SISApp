'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SalesNavigation from '../../../components/SalesNavigation';
import SendInvoiceModal from '../../../components/SendInvoiceModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';

interface IssuedInvoice {
    id: string;
    invoiceNumber?: string;
    customerName?: string;
    customerEmail?: string;
    totalAmount?: number;
    status?: string;
    dateIssued?: Date;
    dueDate?: Date;
    [key: string]: any;
}

export default function SalesInvoicesPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState('');
    const [invoices, setInvoices] = useState<IssuedInvoice[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<IssuedInvoice | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<IssuedInvoice | null>(null);

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
            const invoicesRef = collection(db, 'USERS', uid, 'InvoicesIssued');
            const q = query(invoicesRef, orderBy('dateIssued', 'desc'));
            const snapshot = await getDocs(q);

            const invs: IssuedInvoice[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    customerName: data.billTo?.name || '',
                    customerEmail: data.billTo?.email || '',
                    dateIssued: data.dateIssued?.toDate(),
                    dueDate: data.dueDate?.toDate(),
                } as IssuedInvoice;
            });

            setInvoices(invs);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handleIssueInvoice = () => {
        router.push('/admin/sales/issue-invoice');
    };

    const handleSendInvoice = (invoice: IssuedInvoice) => {
        setSelectedInvoice(invoice);
        setShowSendModal(true);
    };

    const handleViewInvoice = (invoice: IssuedInvoice) => {
        router.push(`/admin/sales/issue-invoice?id=${invoice.id}`);
    };

    const confirmDelete = (invoice: IssuedInvoice) => {
        setDeleteTarget(invoice);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget || !userId) return;
        try {
            const docRef = doc(db, 'USERS', userId, 'InvoicesIssued', deleteTarget.id);
            await deleteDoc(docRef);
            await fetchInvoices(userId);
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (err) {
            console.error('Failed to delete invoice', err);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            alert('Failed to delete invoice');
        }
    };

    const filteredInvoices = invoices.filter((inv) => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        const number = inv.invoiceNumber?.toLowerCase() || '';
        const customer = inv.customerName?.toLowerCase() || '';
        return number.includes(search) || customer.includes(search);
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
        <>
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

                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales</h1>
                        <p className="text-gray-600">Manage your sales and invoices</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <SalesNavigation />
                        </div>

                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-xl shadow-md p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                                    <button
                                        onClick={handleIssueInvoice}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Issue Invoice
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-gray-600">
                                        View and manage all your issued invoices.
                                    </p>

                                    {/* Search Bar */}
                                    {invoices.length > 0 && (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search invoices by number or customer..."
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
                                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices issued</h3>
                                                <p className="mt-1 text-sm text-gray-500">Get started by issuing a new invoice.</p>
                                                <div className="mt-6">
                                                    <button
                                                        onClick={handleIssueInvoice}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Issue Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        ) : filteredInvoices.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-8">
                                                No invoices match your search.
                                            </p>
                                        ) : (
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Invoice #</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Customer</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date Issued</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Due Date</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                                <span className="sr-only">Actions</span>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                        {filteredInvoices.map((inv) => (
                                                            <tr key={inv.id}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                                    {inv.invoiceNumber || '—'}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {inv.customerName || '—'}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {inv.dateIssued ? inv.dateIssued.toLocaleDateString() : '—'}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {inv.dueDate ? inv.dueDate.toLocaleDateString() : '—'}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {inv.totalAmount ? `$${inv.totalAmount.toFixed(2)}` : '—'}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                                            inv.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                                                'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                        {inv.status || 'Draft'}
                                                                    </span>
                                                                </td>
                                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                                    <div className="flex justify-end gap-3">
                                                                        <button
                                                                            onClick={() => handleSendInvoice(inv)}
                                                                            className="text-green-600 hover:text-green-900"
                                                                        >
                                                                            Send
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleViewInvoice(inv)}
                                                                            className="text-blue-600 hover:text-blue-900"
                                                                        >
                                                                            View
                                                                        </button>
                                                                        {inv.status === 'Draft' && (
                                                                            <button
                                                                                onClick={() => confirmDelete(inv)}
                                                                                className="text-red-600 hover:text-red-900"
                                                                                aria-label="Delete invoice"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SendInvoiceModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                customerEmail={selectedInvoice?.customerEmail}
                invoiceNumber={selectedInvoice?.invoiceNumber}
            />

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setShowDeleteModal(false)}
                title="Delete Invoice"
                message={`Are you sure you want to delete invoice #${deleteTarget?.invoiceNumber || 'this invoice'}?`}
            />
        </>
    );
}
