'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../../lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InvoiceBuilder from '../../../../components/InvoiceBuilder';
import type { InvoiceElement } from '../../../../components/InvoiceBuilderTypes';
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import InvoiceNameModal from '../../../../components/InvoiceNameModal';
import SaveSuccessModal from '../../../../components/SaveSuccessModal';
import { loadBankDetails, BankDetails } from '../../../../../lib/bankingClient';

interface BusinessDetails {
    businessName: string;
    companyNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
}

function InvoiceBuilderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const invoiceId = searchParams.get('invoiceId');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState('');
    const [preview, setPreview] = useState(false);
    const [invoiceName, setInvoiceName] = useState('');
    const [initialElements, setInitialElements] = useState<InvoiceElement[]>([]);
    const builderRef = useRef<{ getElements: () => InvoiceElement[] } | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [savedInvoiceName, setSavedInvoiceName] = useState<string | null>(null);

    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | undefined>(undefined);
    const [bankDetails, setBankDetails] = useState<BankDetails | undefined>(undefined);

    const saveInvoice = async (name: string) => {
        if (!userId) {
            window.alert('You must be signed in to save an invoice template.');
            return;
        }

        try {
            const elements = builderRef.current?.getElements() || [];

            // preserve visual order by sorting on Y position
            const ordered = [...elements].sort((a, b) => a.position.y - b.position.y);

            // sanitize elements
            const sanitized = ordered.map((el) => ({
                id: el.id,
                type: el.type,
                position: { x: Number(el.position.x) || 0, y: Number(el.position.y) || 0 },
                properties: {
                    ...el.properties,
                    // Ensure no undefined values
                    label: el.properties?.label ?? '',
                    required: !!el.properties?.required,
                    placeholder: el.properties?.placeholder ?? null,
                    value: el.properties?.value ?? null,
                },
            }));

            if (invoiceId) {
                // Update existing invoice template
                const docRef = doc(db, 'USERS', userId, 'Invoices', invoiceId);
                await updateDoc(docRef, {
                    name,
                    elements: sanitized,
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Create new invoice template
                await addDoc(collection(db, 'USERS', userId, 'Invoices'), {
                    name,
                    elements: sanitized,
                    createdAt: serverTimestamp(),
                    createdBy: userId,
                });
            }

            setSavedInvoiceName(name);
            setShowSavedModal(true);
        } catch (err) {
            console.error('Failed to save invoice template', err);
            window.alert('Failed to save invoice template');
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                setUserId(user.uid);

                // Load business details
                try {
                    const userDoc = await getDoc(doc(db, 'USERS', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setBusinessDetails({
                            businessName: data.businessName || '',
                            companyNumber: data.companyNumber || '',
                            businessAddress: data.businessAddress || '',
                            businessPhone: data.businessPhone || '',
                            businessEmail: data.businessEmail || '',
                        });
                    }
                } catch (err) {
                    console.error('Error fetching business details:', err);
                }

                // Load bank details
                try {
                    const res = await loadBankDetails();
                    if (res.ok && res.bankDetails) {
                        setBankDetails(res.bankDetails);
                    }
                } catch (err) {
                    console.error('Error fetching bank details:', err);
                }

                // Load invoice template if editing
                if (invoiceId) {
                    try {
                        const docRef = doc(db, 'USERS', user.uid, 'Invoices', invoiceId);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setInvoiceName(data.name || '');
                            setInitialElements(data.elements || []);
                        } else {
                            console.error('Invoice template not found');
                            window.alert('Invoice template not found');
                        }
                    } catch (err) {
                        console.error('Error loading invoice template:', err);
                        window.alert('Failed to load invoice template');
                    }
                }
            } else {
                router.push('/admin');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, invoiceId]);

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
                            href="/admin/forms/invoices"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Invoices
                        </Link>

                        <input
                            type="text"
                            value={invoiceName}
                            onChange={(e) => setInvoiceName(e.target.value)}
                            placeholder="Invoice Template Name"
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
                                const name = invoiceName?.trim();
                                if (!name) {
                                    setShowNameModal(true);
                                    return;
                                }
                                await saveInvoice(name);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                        >
                            Save Template
                        </button>
                    </div>
                </div>
            </div>

            <InvoiceBuilder
                ref={builderRef}
                userId={userId}
                preview={preview}
                initialElements={initialElements}
                businessDetails={businessDetails}
                bankDetails={bankDetails}
            />

            <InvoiceNameModal
                isOpen={showNameModal}
                initialName={invoiceName}
                onClose={() => setShowNameModal(false)}
                onSave={async (name) => {
                    setShowNameModal(false);
                    setInvoiceName(name);
                    await saveInvoice(name);
                }}
            />

            <SaveSuccessModal
                isOpen={showSavedModal}
                name={savedInvoiceName ?? undefined}
                onClose={() => setShowSavedModal(false)}
            />
        </div>
    );
}

export default function InvoiceBuilderPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <InvoiceBuilderContent />
        </Suspense>
    );
}
