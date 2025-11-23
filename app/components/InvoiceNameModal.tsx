"use client";

import { useState } from 'react';

interface InvoiceNameModalProps {
    isOpen: boolean;
    initialName?: string;
    onClose: () => void;
    onSave: (name: string) => void;
}

export default function InvoiceNameModal({ isOpen, initialName = '', onClose, onSave }: InvoiceNameModalProps) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    function handleSave(e?: React.FormEvent) {
        e?.preventDefault();
        setError(null);
        if (!name || !name.trim()) {
            setError('Please enter an invoice template name.');
            return;
        }
        onSave(name.trim());
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Enter Invoice Template Name</h2>
                    <button onClick={onClose} type="button" className="text-gray-500 hover:text-gray-700" aria-label="Close">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    <div className="flex flex-col gap-1">
                        <label htmlFor="invoiceName" className="text-sm font-medium text-gray-700">Template name</label>
                        <input
                            id="invoiceName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="My Invoice Template"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700">Save</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
