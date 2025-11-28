export type ElementType =
  | "textbox"
  | "inputbox"
  | "checkbox"
  | "dropdown"
  | "text-header"
  | "text-input"
  | "text-area"
  | "date-input";

export interface FormElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  properties: {
    label?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    defaultValue?: string | boolean;
    // For text-header elements
    text?: string;
    fontSize?: number;
    alignment?: "left" | "center" | "right";
    bold?: boolean;
  };
  value?: any;
}

export interface Certificate {
  id: string;
  title: string;
  elements: FormElement[];
  createdAt: Date;
  updatedAt: Date;
}
