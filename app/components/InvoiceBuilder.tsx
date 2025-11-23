'use client';

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import type { InvoiceElement, InvoiceElementType } from './InvoiceBuilderTypes';
import { BankDetails } from '../../lib/bankingClient';

interface BusinessDetails {
    businessName: string;
    companyNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
}

interface InvoiceBuilderProps {
    userId: string;
    preview?: boolean;
    initialElements?: InvoiceElement[];
    businessDetails?: BusinessDetails;
    bankDetails?: BankDetails;
}

type InvoiceBuilderHandle = {
    getElements: () => InvoiceElement[];
};

const InvoiceBuilder = forwardRef<InvoiceBuilderHandle, InvoiceBuilderProps>(function InvoiceBuilder({
    userId,
    preview = false,
    initialElements = [],
    businessDetails,
    bankDetails
}: InvoiceBuilderProps, ref) {
    const [elements, setElements] = useState<InvoiceElement[]>([]);
    const [draggedType, setDraggedType] = useState<InvoiceElementType | null>(null);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [resizingElement, setResizingElement] = useState<string | null>(null);
    const [elementWidths, setElementWidths] = useState<Record<string, number>>({});
    const [draggingElement, setDraggingElement] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragOverElement, setDragOverElement] = useState<string | null>(null);

    // Load initial elements
    useEffect(() => {
        if (initialElements && initialElements.length > 0) {
            setElements(initialElements);
            const widths: Record<string, number> = {};
            initialElements.forEach(el => {
                if (el.properties?.width) {
                    widths[el.id] = el.properties.width;
                }
            });
            if (Object.keys(widths).length > 0) setElementWidths(widths);
        }
    }, [initialElements]);

    const toolboxItems: { type: InvoiceElementType; label: string; icon: React.ReactNode }[] = [
        {
            type: 'image-header',
            label: 'Image Header',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            type: 'text-header',
            label: 'Text Header',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        },
        {
            type: 'company-address',
            label: 'Company Address',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        },
        {
            type: 'bill-to',
            label: 'Bill To Section',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        },
        {
            type: 'invoice-number',
            label: 'Invoice Number',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
        },
        {
            type: 'invoice-date',
            label: 'Invoice Date',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            type: 'po-number',
            label: 'PO Number',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
            type: 'due-date',
            label: 'Due Date',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            type: 'line-items',
            label: 'Line Items Table',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            type: 'payment-details',
            label: 'Payment Details',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        },
        {
            type: 'signature',
            label: 'Signature',
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        },
    ];

    const handleDragStart = (type: InvoiceElementType) => {
        setDraggedType(type);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();

        if (draggedType) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const newElement: InvoiceElement = {
                id: `element-${Date.now()}`,
                type: draggedType,
                position: { x, y },
                properties: {
                    label: getLabelForType(draggedType),
                    width: 400,
                    prefillBusiness: draggedType === 'company-address',
                    prefillBank: draggedType === 'payment-details',
                    alignment: 'left',
                    fontSize: 16,
                },
            };

            setElements(prev => [...prev, newElement]);
            setDraggedType(null);
        }
    };

    const getLabelForType = (type: InvoiceElementType): string => {
        switch (type) {
            case 'text-header': return 'INVOICE';
            case 'invoice-number': return 'Invoice #';
            case 'invoice-date': return 'Date';
            case 'po-number': return 'PO Number';
            case 'due-date': return 'Due Date';
            case 'signature': return 'Authorized Signature';
            default: return '';
        }
    };

    const handleElementClick = (id: string) => {
        setSelectedElement(id);
    };

    const handlePropertyChange = (id: string, property: keyof InvoiceElement['properties'], value: any) => {
        setElements(elements.map(el =>
            el.id === id ? { ...el, properties: { ...el.properties, [property]: value } } : el
        ));
    };

    const handleDeleteElement = (id: string) => {
        setElements(elements.filter(el => el.id !== id));
        if (selectedElement === id) setSelectedElement(null);
    };

    const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
        e.stopPropagation();
        setResizingElement(elementId);
    };

    const handleResizeMove = (e: React.MouseEvent) => {
        if (!resizingElement) return;
        const elementDiv = document.getElementById(`element-${resizingElement}`);
        if (!elementDiv) return;
        const rect = elementDiv.getBoundingClientRect();
        const newWidth = Math.max(200, e.clientX - rect.left);
        setElementWidths(prev => ({ ...prev, [resizingElement]: newWidth }));
        handlePropertyChange(resizingElement, 'width', newWidth);
    };

    const handleResizeEnd = () => {
        setResizingElement(null);
    };

    const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
        if (resizingElement) return;
        const elementDiv = document.getElementById(`element-${elementId}`);
        if (!elementDiv) return;
        const rect = elementDiv.getBoundingClientRect();
        setDraggingElement(elementId);
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (resizingElement) {
            handleResizeMove(e);
        } else if (draggingElement) {
            const rect = e.currentTarget.getBoundingClientRect();
            const newX = e.clientX - rect.left - dragOffset.x;
            const newY = e.clientY - rect.top - dragOffset.y;
            setElements(elements.map(el =>
                el.id === draggingElement
                    ? { ...el, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
                    : el
            ));
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingElement(null);
        if (resizingElement) handleResizeEnd();
    };

    useImperativeHandle(ref, () => ({
        getElements: () => elements,
    }));

    const renderElementContent = (element: InvoiceElement) => {
        const isSelected = selectedElement === element.id && !preview;

        switch (element.type) {
            case 'image-header':
                return (
                    <div className="w-full">
                        {preview ? (
                            element.properties.imageUrl ? (
                                <img src={element.properties.imageUrl} alt="Header" className="max-h-32 object-contain mx-auto" />
                            ) : (
                                <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                                    No Header Image
                                </div>
                            )
                        ) : (
                            <div className="w-full">
                                {element.properties.imageUrl ? (
                                    <div className="relative group flex justify-center">
                                        <img src={element.properties.imageUrl} alt="Header" className="max-h-32 object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <label
                                                className="cursor-pointer px-3 py-1.5 bg-white text-gray-900 text-sm rounded-md font-medium hover:bg-gray-100 transition-colors shadow-sm"
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                Change Image
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/png, image/jpeg, image/jpg"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                handlePropertyChange(element.id, 'imageUrl', reader.result as string);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <label
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative group ${dragOverElement === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
                                            }`}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragOverElement(element.id);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragOverElement(null);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragOverElement(null);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg')) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    handlePropertyChange(element.id, 'imageUrl', reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col items-center justify-center text-center p-2">
                                            <div className={`mb-2 p-2 rounded-full transition-colors ${dragOverElement === element.id ? 'bg-blue-100' : 'bg-blue-50 group-hover:bg-blue-100'
                                                }`}>
                                                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">
                                                {dragOverElement === element.id ? 'Drop to Upload' : 'Upload Header Image'}
                                            </p>
                                            <p className="text-xs text-gray-400 font-medium mt-1">
                                                Drag & Drop or browse
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/jpg"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        handlePropertyChange(element.id, 'imageUrl', reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'text-header':
                return (
                    <div className="w-full">
                        {preview ? (
                            <div
                                className="font-bold text-gray-900"
                                style={{
                                    fontSize: `${element.properties.fontSize || 24}px`,
                                    textAlign: element.properties.alignment || 'left'
                                }}
                            >
                                {element.properties.label || 'HEADER'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={element.properties.label || ''}
                                    onChange={(e) => handlePropertyChange(element.id, 'label', e.target.value)}
                                    className="w-full font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500"
                                    style={{
                                        fontSize: `${element.properties.fontSize || 24}px`,
                                        textAlign: element.properties.alignment || 'left'
                                    }}
                                    placeholder="Enter Header Text"
                                />
                                {isSelected && (
                                    <div className="flex gap-2 text-sm">
                                        <select
                                            value={element.properties.fontSize}
                                            onChange={(e) => handlePropertyChange(element.id, 'fontSize', parseInt(e.target.value))}
                                            className="border rounded px-1"
                                        >
                                            <option value="16">Small</option>
                                            <option value="24">Medium</option>
                                            <option value="32">Large</option>
                                            <option value="48">Extra Large</option>
                                        </select>
                                        <select
                                            value={element.properties.alignment}
                                            onChange={(e) => handlePropertyChange(element.id, 'alignment', e.target.value)}
                                            className="border rounded px-1"
                                        >
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'company-address':
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</span>
                            {!preview && isSelected && (
                                <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={element.properties.prefillBusiness}
                                        onChange={(e) => handlePropertyChange(element.id, 'prefillBusiness', e.target.checked)}
                                    />
                                    Prefill from Settings
                                </label>
                            )}
                        </div>
                        {element.properties.prefillBusiness && businessDetails ? (
                            <div className="text-sm text-gray-700">
                                <p className="font-bold">{businessDetails.businessName}</p>
                                <p className="whitespace-pre-line">{businessDetails.businessAddress}</p>
                                <p>{businessDetails.businessPhone}</p>
                                <p>{businessDetails.businessEmail}</p>
                            </div>
                        ) : (
                            <textarea
                                className="w-full p-2 border border-gray-200 rounded bg-gray-50 text-sm"
                                placeholder="Enter company address details..."
                                rows={4}
                                readOnly={preview}
                            />
                        )}
                    </div>
                );

            case 'bill-to':
                return (
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bill To</span>
                        <div className="p-4 border border-gray-200 rounded bg-gray-50 text-sm text-gray-500">
                            <p className="font-medium text-gray-700">[Client Name]</p>
                            <p>[Address Line 1]</p>
                            <p>[Address Line 2]</p>
                            <p>[City, State]</p>
                            <p>[Postcode]</p>
                        </div>
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
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="p-2 text-gray-400">1</td>
                                    <td className="p-2 text-gray-400">Example Item Description</td>
                                    <td className="p-2 text-right text-gray-400">$0.00</td>
                                    <td className="p-2 text-right text-gray-400">$0.00</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="p-2 text-gray-400">2</td>
                                    <td className="p-2 text-gray-400">Another Item</td>
                                    <td className="p-2 text-right text-gray-400">$0.00</td>
                                    <td className="p-2 text-right text-gray-400">$0.00</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-gray-900">
                                    <td colSpan={3} className="p-2 text-right">Total:</td>
                                    <td className="p-2 text-right">$0.00</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                );

            case 'payment-details':
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</span>
                            {!preview && isSelected && (
                                <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={element.properties.prefillBank}
                                        onChange={(e) => handlePropertyChange(element.id, 'prefillBank', e.target.checked)}
                                    />
                                    Prefill from Settings
                                </label>
                            )}
                        </div>
                        {element.properties.prefillBank && bankDetails ? (
                            <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded border border-gray-200">
                                <p><span className="font-medium">Bank:</span> {bankDetails.bankName}</p>
                                <p><span className="font-medium">Account Name:</span> {bankDetails.accountName}</p>
                                <p><span className="font-medium">Sort Code:</span> {bankDetails.sortCode}</p>
                                <p><span className="font-medium">Account No:</span> {bankDetails.accountNumber}</p>
                            </div>
                        ) : (
                            <textarea
                                className="w-full p-2 border border-gray-200 rounded bg-gray-50 text-sm"
                                placeholder="Enter payment instructions..."
                                rows={4}
                                readOnly={preview}
                            />
                        )}
                    </div>
                );

            case 'signature':
                return (
                    <div className="space-y-2">
                        {!preview ? (
                            <input
                                type="text"
                                value={element.properties.label || ''}
                                onChange={(e) => handlePropertyChange(element.id, 'label', e.target.value)}
                                className="font-medium text-gray-700 border-b border-gray-300 focus:outline-none focus:border-blue-500 w-full"
                                placeholder="Label (e.g. Authorized Signature)"
                            />
                        ) : (
                            <div className="font-medium text-gray-700">{element.properties.label}</div>
                        )}
                        <div className="h-24 border-b border-gray-400 mt-8 relative">
                            <span className="absolute bottom-1 left-0 text-xs text-gray-400">Sign here</span>
                        </div>
                    </div>
                );

            default:
                // Generic input fields (Invoice #, Date, PO, Due Date)
                return (
                    <div className="space-y-1">
                        {!preview ? (
                            <input
                                type="text"
                                value={element.properties.label || ''}
                                onChange={(e) => handlePropertyChange(element.id, 'label', e.target.value)}
                                className="font-medium text-gray-700 border-b border-gray-300 focus:outline-none focus:border-blue-500 w-full"
                                placeholder="Label"
                            />
                        ) : (
                            <div className="font-medium text-gray-700">{element.properties.label}</div>
                        )}
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-400">
                            {element.type === 'invoice-date' || element.type === 'due-date' ? 'DD/MM/YYYY' : 'Value...'}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-[calc(100vh-73px)]">
            {/* Left Toolbox */}
            {!preview && (
                <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Invoice Elements</h2>
                    <div className="space-y-2">
                        {toolboxItems.map((item) => (
                            <div
                                key={item.type}
                                draggable
                                onDragStart={() => handleDragStart(item.type)}
                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-100 hover:border-blue-300 transition-colors active:cursor-grabbing"
                            >
                                <div className="text-gray-600">{item.icon}</div>
                                <span className="font-medium text-gray-700">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Drag elements to build your invoice template.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Canvas */}
            <div className="flex-1 p-6 overflow-auto bg-gray-100">
                <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="relative min-h-[1123px] w-[794px] mx-auto bg-white shadow-lg p-8" // A4 size approx
                    style={{
                        transform: 'scale(1)',
                        transformOrigin: 'top center'
                    }}
                >
                    {elements.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-gray-400">
                                <p className="text-lg font-medium">Drop elements here</p>
                            </div>
                        </div>
                    )}

                    {elements.map((element) => {
                        const elementWidth = elementWidths[element.id] || element.properties.width || 400;
                        const isInteractive = !preview;

                        return (
                            <div
                                key={element.id}
                                id={`element-${element.id}`}
                                onClick={isInteractive ? () => handleElementClick(element.id) : undefined}
                                onMouseDown={isInteractive ? (e) => { if (!e.defaultPrevented) handleElementMouseDown(e, element.id); } : undefined}
                                className={`absolute ${preview ? 'cursor-default' : (resizingElement === element.id ? 'cursor-ew-resize' : draggingElement === element.id ? 'cursor-grabbing' : 'cursor-grab')} ${!preview && selectedElement === element.id ? 'ring-2 ring-blue-500 z-10' : 'z-0'}`}
                                style={{
                                    left: `${element.position.x}px`,
                                    top: `${element.position.y}px`,
                                    width: `${elementWidth}px`,
                                }}
                            >
                                <div className="relative group">
                                    {renderElementContent(element)}

                                    {!preview && selectedElement === element.id && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteElement(element.id);
                                                }}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                                title="Delete element"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div
                                                onMouseDown={(e) => handleResizeStart(e, element.id)}
                                                className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-8 cursor-ew-resize bg-blue-100 hover:bg-blue-200 rounded border border-blue-300 flex items-center justify-center"
                                                title="Resize width"
                                            >
                                                <div className="w-0.5 h-4 bg-blue-400"></div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default InvoiceBuilder;
