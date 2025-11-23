export type InvoiceElementType =
    | 'image-header'
    | 'text-header'
    | 'company-address'
    | 'bill-to'
    | 'invoice-number'
    | 'invoice-date'
    | 'po-number'
    | 'due-date'
    | 'line-items'
    | 'payment-details'
    | 'signature';

export interface InvoiceElement {
    id: string;
    type: InvoiceElementType;
    position: { x: number; y: number };
    properties: {
        label?: string;
        value?: string; // For static text or default values
        required?: boolean;
        placeholder?: string;
        width?: number;
        height?: number;
        imageUrl?: string; // For image header
        fontSize?: number; // For text header
        fontWeight?: string; // For text header
        alignment?: 'left' | 'center' | 'right'; // For text header
        prefillBusiness?: boolean; // For company address
        prefillBank?: boolean; // For payment details
    };
}

export interface InvoiceTemplate {
    id: string;
    name: string;
    elements: InvoiceElement[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
