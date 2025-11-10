export type ElementType = 'textbox' | 'checkbox' | 'dropdown';

export interface FormElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  properties: {
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    defaultValue?: string | boolean;
  };
}

export interface Certificate {
  id: string;
  title: string;
  elements: FormElement[];
  createdAt: Date;
  updatedAt: Date;
}