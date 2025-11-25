'use client';

import { useState } from 'react';

interface SendInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerEmail?: string;
    invoiceNumber?: string;
}

export default function SendInvoiceModal({
    isOpen,
    onClose,
    customerEmail = '',
    invoiceNumber = ''
}: SendInvoiceModalProps) {
    const [email, setEmail] = useState(customerEmail);
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        setSending(true);
        // TODO: Implement email sending functionality
        setTimeout(() => {
            setSending(false);
            alert('Email sending functionality will be implemented soon');
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Invoice</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice Number
                                </label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recipient Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="customer@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-800">
                                    The invoice will be sent as a PDF attachment to the email address above.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={onClose}
                                disabled={sending}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !email.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
