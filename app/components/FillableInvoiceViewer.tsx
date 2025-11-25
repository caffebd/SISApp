'use client';

import React, { useState, useEffect } from 'react';
import type { InvoiceElement } from './InvoiceBuilderTypes';
import { BankDetails } from '../../lib/bankingClient';

interface BusinessDetails {
    businessName: string;
    companyNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
}

interface InvoiceData {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    poNumber?: string;
    billTo?: {
        name: string;
        address1: string;
        address2: string;
        city: string;
        postcode: string;
    };
    lineItems?: Array<{
        id: string;
        qty: number;
        description: string;
        unitPrice: number;
        total: number;
    }>;
    signature?: {
        data: string;
        type: 'drawn' | 'typed';
    } | null;
}

interface FillableInvoiceViewerProps {
    elements: InvoiceElement[];
    businessDetails?: BusinessDetails;
    bankDetails?: BankDetails;
    invoiceData: InvoiceData;
    onDataChange: (data: InvoiceData) => void;
    onSelectContact: () => void;
    onAddSignature: () => void;
}

export default function FillableInvoiceViewer({
    elements,
    businessDetails,
    bankDetails,
    invoiceData,
    onDataChange,
    onSelectContact,
    onAddSignature,
}: FillableInvoiceViewerProps) {
    const [elementWidths, setElementWidths] = useState<Record<string, number>>({});

    useEffect(() => {
        const widths: Record<string, number> = {};
        elements.forEach((el) => {
            if (el.properties?.width) {
                widths[el.id] = el.properties.width;
            }
        });
        setElementWidths(widths);
    }, [elements]);

    const updateLineItem = (index: number, field: string, value: any) => {
        const newLineItems = [...(invoiceData.lineItems || [])];
        newLineItems[index] = { ...newLineItems[index], [field]: value };

        if (field === 'qty' || field === 'unitPrice') {
            newLineItems[index].total = newLineItems[index].qty * newLineItems[index].unitPrice;
        }

        onDataChange({ ...invoiceData, lineItems: newLineItems });
    };

    const addLineItem = () => {
        const newLineItems = [...(invoiceData.lineItems || [])];
        newLineItems.push({
            id: Date.now().toString(),
            qty: 1,
            description: '',
            unitPrice: 0,
            total: 0,
        });
        onDataChange({ ...invoiceData, lineItems: newLineItems });
    };

    const removeLineItem = (index: number) => {
        const newLineItems = [...(invoiceData.lineItems || [])];
        newLineItems.splice(index, 1);
        onDataChange({ ...invoiceData, lineItems: newLineItems });
    };

    const calculateTotal = () => {
        return (invoiceData.lineItems || []).reduce((sum, item) => sum + item.total, 0);
    };

    const renderElementContent = (element: InvoiceElement) => {
        switch (element.type) {
            case 'image-header':
                return (
                    <div className="w-full">
                        {element.properties.imageUrl ? (
                            <img
                                src={element.properties.imageUrl}
                                alt="Header"
                                className="max-h-32 object-contain mx-auto"
                            />
                        ) : (
                            <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                                No Header Image
                            </div>
                        )}
                    </div>
                );

            case 'text-header':
                return (
                    <div
                        className="font-bold text-gray-900 w-full"
                        style={{
                            fontSize: `${element.properties.fontSize || 24}px`,
                            textAlign: element.properties.alignment || 'left',
                        }}
                    >
                        {element.properties.label || 'INVOICE'}
                    </div>
                );

            case 'company-address':
                return (
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</span>
                        {element.properties.prefillBusiness && businessDetails ? (
                            <div className="text-sm text-gray-700">
                                <p className="font-bold">{businessDetails.businessName}</p>
                                <p className="whitespace-pre-line">{businessDetails.businessAddress}</p>
                                <p>{businessDetails.businessPhone}</p>
                                <p>{businessDetails.businessEmail}</p>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Company address will appear here</div>
                        )}
                    </div>
                );

            case 'bill-to':
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bill To</span>
                            <button
                                onClick={onSelectContact}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                                Select Contact
                            </button>
                        </div>
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={invoiceData.billTo?.name || ''}
                                onChange={(e) =>
                                    onDataChange({
                                        ...invoiceData,
                                        billTo: { ...invoiceData.billTo!, name: e.target.value },
                                    })
                                }
                                placeholder="Customer Name"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                value={invoiceData.billTo?.address1 || ''}
                                onChange={(e) =>
                                    onDataChange({
                                        ...invoiceData,
                                        billTo: { ...invoiceData.billTo!, address1: e.target.value },
                                    })
                                }
                                placeholder="Address Line 1"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                value={invoiceData.billTo?.address2 || ''}
                                onChange={(e) =>
                                    onDataChange({
                                        ...invoiceData,
                                        billTo: { ...invoiceData.billTo!, address2: e.target.value },
                                    })
                                }
                                placeholder="Address Line 2"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="grid grid-cols-2 gap-1">
                                <input
                                    type="text"
                                    value={invoiceData.billTo?.city || ''}
                                    onChange={(e) =>
                                        onDataChange({
                                            ...invoiceData,
                                            billTo: { ...invoiceData.billTo!, city: e.target.value },
                                        })
                                    }
                                    placeholder="City"
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    value={invoiceData.billTo?.postcode || ''}
                                    onChange={(e) =>
                                        onDataChange({
                                            ...invoiceData,
                                            billTo: { ...invoiceData.billTo!, postcode: e.target.value },
                                        })
                                    }
                                    placeholder="Postcode"
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'invoice-number':
                return (
                    <div className="space-y-1">
                        <div className="font-medium text-gray-700 text-sm">{element.properties.label || 'Invoice #'}</div>
                        <input
                            type="text"
                            value={invoiceData.invoiceNumber || ''}
                            onChange={(e) => onDataChange({ ...invoiceData, invoiceNumber: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm"
                            placeholder="Enter invoice number"
                        />
                    </div>
                );

            case 'invoice-date':
                return (
                    <div className="space-y-1">
                        <div className="font-medium text-gray-700 text-sm">{element.properties.label || 'Date'}</div>
                        <input
                            type="date"
                            value={invoiceData.invoiceDate || ''}
                            onChange={(e) => onDataChange({ ...invoiceData, invoiceDate: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm"
                        />
                    </div>
                );

            case 'po-number':
                return (
                    <div className="space-y-1">
                        <div className="font-medium text-gray-700 text-sm">{element.properties.label || 'PO Number'}</div>
                        <input
                            type="text"
                            value={invoiceData.poNumber || ''}
                            onChange={(e) => onDataChange({ ...invoiceData, poNumber: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm"
                            placeholder="Enter PO number"
                        />
                    </div>
                );

            case 'due-date':
                return (
                    <div className="space-y-1">
                        <div className="font-medium text-gray-700 text-sm">{element.properties.label || 'Due Date'}</div>
                        <input
                            type="date"
                            value={invoiceData.dueDate || ''}
                            onChange={(e) => onDataChange({ ...invoiceData, dueDate: e.target.value })}
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm"
                        />
                    </div>
                );

            case 'line-items':
                return (
                    <div className="w-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 font-semibold">
                                <tr>
                                    <th className="p-2 w-16">Qty</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2 w-24 text-right">Unit Price</th>
                                    <th className="p-2 w-24 text-right">Total</th>
                                    <th className="p-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoiceData.lineItems || []).map((item, index) => (
                                    <tr key={item.id} className="border-b border-gray-100">
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                                                className="w-full px-1 py-1 border border-gray-300 rounded text-sm"
                                                min="0"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                                className="w-full px-1 py-1 border border-gray-300 rounded text-sm"
                                                placeholder="Item description"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full px-1 py-1 border border-gray-300 rounded text-sm text-right"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="p-2 text-right font-medium">${item.total.toFixed(2)}</td>
                                        <td className="p-2">
                                            {(invoiceData.lineItems?.length || 0) > 1 && (
                                                <button
                                                    onClick={() => removeLineItem(index)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-gray-900">
                                    <td colSpan={3} className="p-2 text-right">Total:</td>
                                    <td className="p-2 text-right">${calculateTotal().toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                        <button
                            onClick={addLineItem}
                            className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                            + Add Line
                        </button>
                    </div>
                );

            case 'payment-details':
                return (
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</span>
                        {element.properties.prefillBank && bankDetails ? (
                            <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded border border-gray-200">
                                <p><span className="font-medium">Bank:</span> {bankDetails.bankName}</p>
                                <p><span className="font-medium">Account Name:</span> {bankDetails.accountName}</p>
                                <p><span className="font-medium">Sort Code:</span> {bankDetails.sortCode}</p>
                                <p><span className="font-medium">Account No:</span> {bankDetails.accountNumber}</p>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Payment details will appear here</div>
                        )}
                    </div>
                );

            case 'signature':
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="font-medium text-gray-700 text-sm">{element.properties.label || 'Signature'}</div>
                            <button
                                onClick={onAddSignature}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                                {invoiceData.signature ? 'Change' : 'Add'} Signature
                            </button>
                        </div>
                        {invoiceData.signature ? (
                            <div className="border border-gray-300 rounded p-2 bg-gray-50">
                                {invoiceData.signature.type === 'drawn' ? (
                                    <img src={invoiceData.signature.data} alt="Signature" className="max-h-20" />
                                ) : (
                                    <p className="text-xl" style={{ fontFamily: 'cursive' }}>{invoiceData.signature.data}</p>
                                )}
                            </div>
                        ) : (
                            <div className="h-20 border-b border-gray-400 relative">
                                <span className="absolute bottom-1 left-0 text-xs text-gray-400">Sign here</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-[1123px] w-[794px] mx-auto bg-white shadow-lg p-8">
            {elements.map((element) => {
                const elementWidth = elementWidths[element.id] || element.properties.width || 400;

                return (
                    <div
                        key={element.id}
                        className="absolute"
                        style={{
                            left: `${element.position.x}px`,
                            top: `${element.position.y}px`,
                            width: `${elementWidth}px`,
                        }}
                    >
                        {renderElementContent(element)}
                    </div>
                );
            })}
        </div>
    );
}
