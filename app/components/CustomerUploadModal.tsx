'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface CustomerUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
}

interface ParsedContact {
    company?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    mobile?: string;
    email?: string;
    country?: string;
    postcode?: string;
    address_1?: string;
    address_2?: string;
    town?: string;
    county?: string;
}

export default function CustomerUploadModal({ isOpen, onClose, onUploadSuccess }: CustomerUploadModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setError('');
        } else {
            setError('Please upload a valid CSV or Excel file.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const processFile = async () => {
        if (!file) return;

        setUploading(true);
        setError('');
        setSuccessMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

                if (jsonData.length === 0) {
                    throw new Error('The file appears to be empty.');
                }

                setProgress({ current: 0, total: jsonData.length });

                let successCount = 0;
                const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];

                    // Map fields based on template headers
                    // CompanyName	Title	FirstName	LastName	Mobile	Email	Country	Postcode	Address1	Address2	Town	County

                    const contactData = {
                        company: row['CompanyName'] || '',
                        title: row['Title'] || '',
                        firstName: row['FirstName'] || '',
                        lastName: row['LastName'] || '',
                        mobile: row['Mobile'] ? String(row['Mobile']) : '',
                        email: row['Email'] || '',
                        country: row['Country'] || 'UNITED KINGDOM',
                        postcode: row['Postcode'] ? String(row['Postcode']).toUpperCase() : '',
                        address_1: row['Address1'] || '',
                        address_2: row['Address2'] || '',
                        town: row['Town'] || '',
                        county: row['County'] || '',

                        // Default fields
                        type: 'customer',
                        status: 'normal',
                        disableCommunication: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        additionalContacts: [],
                    };

                    // Construct full name
                    const nameParts = [contactData.title, contactData.firstName, contactData.lastName].filter(Boolean);
                    const fullName = nameParts.length > 0 ? nameParts.join(' ') : contactData.company;

                    if (!fullName) {
                        console.warn(`Skipping row ${i + 1}: No name or company name provided.`);
                        continue;
                    }

                    await addDoc(contactsRef, {
                        ...contactData,
                        name: fullName
                    });

                    successCount++;
                    setProgress(prev => ({ ...prev, current: i + 1 }));
                }

                setSuccessMessage(`Successfully imported ${successCount} contacts.`);
                setTimeout(() => {
                    onUploadSuccess();
                    onClose();
                    setFile(null);
                    setSuccessMessage('');
                    setUploading(false);
                }, 2000);

            } catch (err) {
                console.error('Error processing file:', err);
                setError('Failed to process file. Please check the format and try again.');
                setUploading(false);
            }
        };

        reader.onerror = () => {
            setError('Failed to read file.');
            setUploading(false);
        };

        reader.readAsBinaryString(file);
    };

    return (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    {/* Modal Panel */}
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Upload Customers
                                    </h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Upload a CSV or Excel file to import customers. Use the templates below to ensure correct formatting.
                                        </p>

                                        {/* Template Downloads */}
                                        <div className="flex gap-4 mb-6 justify-center">
                                            <a
                                                href="/downloads/customer_template.xlsx"
                                                download
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <svg className="mr-2 h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Excel Template
                                            </a>
                                            <a
                                                href="/downloads/customer_template.csv"
                                                download
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <svg className="mr-2 h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                CSV Template
                                            </a>
                                        </div>

                                        {/* Drag and Drop Area */}
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        >
                                            <div className="space-y-1 text-center">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label
                                                        htmlFor="file-upload"
                                                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                                    >
                                                        <span>Upload a file</span>
                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileSelect} accept=".csv, .xlsx, .xls" />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    CSV, XLS, XLSX up to 10MB
                                                </p>
                                            </div>
                                        </div>

                                        {/* Selected File Info */}
                                        {file && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-md flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                                                    <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                                </div>
                                                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        )}

                                        {/* Status Messages */}
                                        {error && (
                                            <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                {error}
                                            </div>
                                        )}
                                        {successMessage && (
                                            <div className="mt-4 text-sm text-green-600 bg-green-50 p-2 rounded">
                                                {successMessage}
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="mt-4">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 text-center">Processing {progress.current} of {progress.total} contacts...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                onClick={processFile}
                                disabled={!file || uploading}
                                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm ${(!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? 'Processing...' : 'Upload'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={uploading}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
