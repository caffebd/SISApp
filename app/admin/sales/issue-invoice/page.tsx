'use client';

import { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ContactSelectModal from '../../../components/ContactSelectModal';
import SignatureModal from '../../../components/SignatureModal';
import FillableInvoiceViewer from '../../../components/FillableInvoiceViewer';
import type { InvoiceElement } from '../../../components/InvoiceBuilderTypes';
import { loadBankDetails, BankDetails } from '../../../../lib/bankingClient';
import InvoiceNameModal from '../../../components/InvoiceNameModal';
import SaveSuccessModal from '../../../components/SaveSuccessModal';
import SendInvoiceModal from '../../../components/SendInvoiceModal';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface InvoiceTemplate {
    id: string;
    name: string;
    elements?: InvoiceElement[];
}

interface LineItem {
    id: string;
    qty: number;
    description: string;
    unitPrice: number;
    total: number;
}

interface BillToData {
    name: string;
    address1: string;
    address2: string;
    city: string;
    postcode: string;
}

interface InvoiceData {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    poNumber?: string;
    billTo?: BillToData;
    lineItems?: LineItem[];
    signature?: {
        data: string;
        type: 'drawn' | 'typed';
    } | null;
}

interface BusinessDetails {
    businessName: string;
    companyNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
}

export function IssueInvoicePageContent() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<InvoiceTemplate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | undefined>(undefined);
    const [bankDetails, setBankDetails] = useState<BankDetails | undefined>(undefined);

    // Invoice data
    const [invoiceSaveName, setInvoiceSaveName] = useState('');
    const [invoiceData, setInvoiceData] = useState<InvoiceData>({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        poNumber: '',
        billTo: {
            name: '',
            address1: '',
            address2: '',
            city: '',
            postcode: '',
        },
        lineItems: [
            { id: '1', qty: 1, description: '', unitPrice: 0, total: 0 },
        ],
        signature: null,
    });

    // Modals
    const [showContactModal, setShowContactModal] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const invoiceId = searchParams.get('id');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                await fetchTemplates();
                await loadBusinessDetails(user.uid);
                await loadBankingDetails();

                // Load existing invoice if ID is provided
                if (invoiceId) {
                    await loadExistingInvoice(invoiceId);
                }
            } else {
                router.push('/admin');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, invoiceId]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredTemplates(templates);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredTemplates(templates.filter((t) => t.name.toLowerCase().includes(term)));
        }
    }, [searchTerm, templates]);

    const fetchTemplates = async () => {
        try {
            const templatesRef = collection(db, 'USERS', USER_ID, 'Invoices');
            const q = query(templatesRef, orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const templatesList: InvoiceTemplate[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name || 'Untitled',
                elements: doc.data().elements || [],
            }));
            setTemplates(templatesList);
            setFilteredTemplates(templatesList);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const loadBusinessDetails = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'USERS', uid));
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
    };

    const loadBankingDetails = async () => {
        try {
            const res = await loadBankDetails();
            if (res.ok && res.bankDetails) {
                setBankDetails(res.bankDetails);
            }
        } catch (err) {
            console.error('Error fetching bank details:', err);
        }
    };

    const loadExistingInvoice = async (id: string) => {
        try {
            const invoiceRef = doc(db, 'USERS', USER_ID, 'InvoicesIssued', id);
            const invoiceSnap = await getDoc(invoiceRef);

            if (invoiceSnap.exists()) {
                const data = invoiceSnap.data();
                setExistingInvoiceId(id);
                setInvoiceSaveName(data.saveName || '');
                setInvoiceData({
                    invoiceNumber: data.invoiceNumber || '',
                    invoiceDate: data.dateIssued ? new Date(data.dateIssued.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    dueDate: data.dueDate ? new Date(data.dueDate.toDate()).toISOString().split('T')[0] : '',
                    poNumber: data.poNumber || '',
                    billTo: data.billTo || { name: '', address1: '', address2: '', city: '', postcode: '' },
                    lineItems: data.lineItems || [{ id: '1', qty: 1, description: '', unitPrice: 0, total: 0 }],
                    signature: data.signature || null,
                });

                // Load the template directly from Firebase
                if (data.templateId) {
                    const templateRef = doc(db, 'USERS', USER_ID, 'Invoices', data.templateId);
                    const templateSnap = await getDoc(templateRef);
                    if (templateSnap.exists()) {
                        const templateData = templateSnap.data();
                        setSelectedTemplate({
                            id: templateSnap.id,
                            name: templateData.name || 'Untitled',
                            elements: templateData.elements || [],
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading existing invoice:', error);
        }
    };

    const handleContactSelect = (contact: any) => {
        setInvoiceData({
            ...invoiceData,
            billTo: {
                name: contact.name || '',
                address1: contact.address_1 || '',
                address2: contact.address_2 || '',
                city: contact.town || '',
                postcode: contact.postcode || '',
            },
        });
    };

    const handleSignatureSave = (signatureData: string, signatureType: 'drawn' | 'typed') => {
        setInvoiceData({
            ...invoiceData,
            signature: { data: signatureData, type: signatureType },
        });
    };

    const calculateTotal = () => {
        return (invoiceData.lineItems || []).reduce((sum, item) => sum + item.total, 0);
    };

    const handleSaveClick = () => {
        if (!invoiceSaveName.trim()) {
            setShowNameModal(true);
        } else {
            performSave(invoiceSaveName);
        }
    };

    const performSave = async (saveName: string) => {
        setSaving(true);
        try {
            const invoiceToSave = {
                saveName: saveName,
                invoiceNumber: invoiceData.invoiceNumber,
                dateIssued: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date(),
                dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
                poNumber: invoiceData.poNumber,
                billTo: invoiceData.billTo,
                lineItems: invoiceData.lineItems,
                totalAmount: calculateTotal(),
                signature: invoiceData.signature,
                templateId: selectedTemplate?.id || null,
                templateName: selectedTemplate?.name || null,
                status: 'Draft',
                updatedAt: new Date(),
            };

            if (existingInvoiceId) {
                // Update existing invoice
                const invoiceRef = doc(db, 'USERS', USER_ID, 'InvoicesIssued', existingInvoiceId);
                await updateDoc(invoiceRef, invoiceToSave);
            } else {
                // Create new invoice
                const invoicesRef = collection(db, 'USERS', USER_ID, 'InvoicesIssued');
                await addDoc(invoicesRef, {
                    ...invoiceToSave,
                    createdAt: new Date(),
                });
            }

            setInvoiceSaveName(saveName);
            setShowSuccessModal(true);

            // Redirect after a short delay
            setTimeout(() => {
                router.push('/admin/sales/invoices');
            }, 1500);
        } catch (error) {
            console.error('Error saving invoice:', error);
            // Could add an error modal here if desired
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="py-8">
            <div className="max-w-[1800px] mx-auto px-4">
                <div className="mb-8">
                    <Link
                        href="/admin/sales/invoices"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Invoices
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Issue Invoice</h1>
                    <p className="text-gray-600">Create and issue a new invoice</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Templates */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-4">
                            <div className="p-4 border-b">
                                <h2 className="text-lg font-bold text-gray-900 mb-3">Invoice Templates</h2>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search templates..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <div className="max-h-[600px] overflow-y-auto">
                                {filteredTemplates.length === 0 ? (
                                    <p className="p-4 text-sm text-gray-500 text-center">No templates found</p>
                                ) : (
                                    <div className="divide-y">
                                        {filteredTemplates.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedTemplate(template)}
                                                className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                                    }`}
                                            >
                                                <div className="font-medium text-gray-900">{template.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Invoice */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl shadow-md p-8">
                            {selectedTemplate && selectedTemplate.elements && selectedTemplate.elements.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Invoice Save Name */}
                                    <div className="mb-6">
                                        <input
                                            type="text"
                                            value={invoiceSaveName}
                                            onChange={(e) => setInvoiceSaveName(e.target.value)}
                                            placeholder="Invoice Save Name"
                                            className="w-full px-4 py-3 text-xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Invoice Preview */}
                                    <div className="overflow-x-auto">
                                        <FillableInvoiceViewer
                                            elements={selectedTemplate.elements}
                                            businessDetails={businessDetails}
                                            bankDetails={bankDetails}
                                            invoiceData={invoiceData}
                                            onDataChange={setInvoiceData}
                                            onSelectContact={() => setShowContactModal(true)}
                                            onAddSignature={() => setShowSignatureModal(true)}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4">
                                        <div className="max-w-[794px] mx-auto flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowSendModal(true)}
                                                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                                            >
                                                Send Invoice
                                            </button>
                                            <button
                                                onClick={handleSaveClick}
                                                disabled={saving}
                                                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {saving ? 'Saving...' : 'Save Invoice'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-lg">Select a template from the left to get started</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ContactSelectModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                onSelect={handleContactSelect}
            />
            <SignatureModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onSave={handleSignatureSave}
            />
            <InvoiceNameModal
                isOpen={showNameModal}
                initialName={invoiceSaveName}
                onClose={() => setShowNameModal(false)}
                onSave={(name) => {
                    setShowNameModal(false);
                    setInvoiceSaveName(name);
                    performSave(name);
                }}
            />
            <SaveSuccessModal
                isOpen={showSuccessModal}
                name={invoiceSaveName}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.push('/admin/sales/invoices');
                }}
            />
            <SendInvoiceModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                customerEmail={invoiceData.billTo?.name || ''}
                invoiceNumber={invoiceData.invoiceNumber}
            />
        </div>
    );
}

export default function IssueInvoicePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        }>
            <IssueInvoicePageContent />
        </Suspense>
    );
}
