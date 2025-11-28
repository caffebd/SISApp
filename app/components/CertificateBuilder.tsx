"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import type { FormElement, ElementType } from "./CertificateBuilderTypes";
import DropdownOptionsModal from "./DropdownOptionsModal";

interface CertificateBuilderProps {
  userId: string;
  preview?: boolean;
  initialElements?: FormElement[];
}

type CertificateBuilderHandle = {
  getElements: () => FormElement[];
};

const CertificateBuilder = forwardRef<
  CertificateBuilderHandle,
  CertificateBuilderProps
>(function CertificateBuilder(
  { userId, preview = false, initialElements = [] }: CertificateBuilderProps,
  ref,
) {
  const [elements, setElements] = useState<FormElement[]>([]);
  const [draggedType, setDraggedType] = useState<ElementType | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [editingDropdownId, setEditingDropdownId] = useState<string | null>(
    null,
  );
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [elementWidths, setElementWidths] = useState<Record<string, number>>(
    {},
  );
  const [elementHeights, setElementHeights] = useState<Record<string, number>>(
    {},
  );
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const prevPreviewRef = useRef(preview);

  // Load initial elements when editing
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      setElements(initialElements);
      // Restore element sizes if they exist in properties
      const widths: Record<string, number> = {};
      const heights: Record<string, number> = {};
      initialElements.forEach((el) => {
        if ((el.properties as any)?.width) {
          widths[el.id] = (el.properties as any).width;
        }
        if ((el.properties as any)?.height) {
          heights[el.id] = (el.properties as any).height;
        }
      });
      if (Object.keys(widths).length > 0) setElementWidths(widths);
      if (Object.keys(heights).length > 0) setElementHeights(heights);
    }
  }, [initialElements]);

  // Handle preview mode transitions
  useEffect(() => {
    const prevPreview = prevPreviewRef.current;

    if (preview !== prevPreview) {
      if (preview) {
        // Entering preview mode - resize textareas and recalculate positions
        setTimeout(() => {
          elements.forEach((element) => {
            if (element.type === "textbox" || element.type === "inputbox") {
              const textarea = document.getElementById(
                `${element.type === "textbox" ? "textarea" : "input-textarea"}-${element.id}`,
              ) as HTMLTextAreaElement;
              if (textarea) {
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
              }
            }
          });
          // Recalculate positions after textareas are resized
          setTimeout(() => recalculateAllPositions(), 50);
        }, 0);
      } else {
        // Exiting preview mode - resize textareas back to their content and recalculate
        setTimeout(() => {
          elements.forEach((element) => {
            if (element.type === "textbox" || element.type === "inputbox") {
              const textarea = document.getElementById(
                `${element.type === "textbox" ? "textarea" : "input-textarea"}-${element.id}`,
              ) as HTMLTextAreaElement;
              if (textarea) {
                // Resize textarea to fit content
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
              }
            }
          });
          // Recalculate positions after textareas are resized
          setTimeout(() => recalculateAllPositions(), 50);
        }, 0);
      }

      prevPreviewRef.current = preview;
    }
  }, [preview, elements]);

  const toolboxItems: {
    type: ElementType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: "textbox",
      label: "Text Box",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16m-7 6h7"
          />
        </svg>
      ),
    },
    {
      type: "inputbox",
      label: "Input Box",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      type: "checkbox",
      label: "Checkbox",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      type: "dropdown",
      label: "Dropdown",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      ),
    },
  ];

  const handleDragStart = (type: ElementType) => {
    setDraggedType(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const calculateElementYPosition = (index: number) => {
    let totalY = 20; // Initial padding
    for (let i = 0; i < index; i++) {
      const elementDiv = document.getElementById(`element-${elements[i].id}`);
      const elementHeight = elementDiv
        ? elementDiv.offsetHeight
        : elementHeights[elements[i].id] || 80;
      totalY += elementHeight + 20; // Add element height + spacing
    }
    return totalY;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (draggedType) {
      // Adding new element from toolbox
      const newElement: FormElement = {
        id: `element-${Date.now()}`,
        type: draggedType,
        position: { x: 20, y: calculateElementYPosition(elements.length) }, // Calculate position based on existing elements
        properties: {
          label:
            draggedType === "textbox"
              ? ""
              : draggedType === "inputbox"
                ? "Input Title"
                : draggedType === "checkbox"
                  ? "Checkbox Label"
                  : "Dropdown Label",
          required: false,
          placeholder:
            draggedType === "textbox"
              ? "Text Field"
              : draggedType === "inputbox"
                ? "Enter text here..."
                : undefined,
          options:
            draggedType === "dropdown" ? ["Option 1", "Option 2"] : undefined,
        },
      };

      setElements((prevElements) => [...prevElements, newElement]);
      setDraggedType(null);
    } else if (draggingElement) {
      // Repositioning existing element
      setDraggingElement(null);
    }
  };

  const recalculateAllPositions = () => {
    setElements((prevElements) => {
      // Sort elements by Y position
      const sortedElements = [...prevElements].sort(
        (a, b) => a.position.y - b.position.y,
      );

      let currentY = 20;
      const updatedElements = sortedElements.map((element) => {
        const elementDiv = document.getElementById(`element-${element.id}`);
        const elementHeight = elementDiv ? elementDiv.offsetHeight : 80;

        const updatedElement = {
          ...element,
          position: { x: 20, y: currentY },
        };

        currentY += elementHeight + 20;
        return updatedElement;
      });

      return updatedElements;
    });
  };

  const handleElementClick = (id: string) => {
    setSelectedElement(id);
  };

  const handleLabelChange = (id: string, newLabel: string) => {
    setElements(
      elements.map((el) =>
        el.id === id
          ? { ...el, properties: { ...el.properties, label: newLabel } }
          : el,
      ),
    );
  };

  const handlePlaceholderChange = (id: string, newPlaceholder: string) => {
    setElements(
      elements.map((el) =>
        el.id === id
          ? {
              ...el,
              properties: { ...el.properties, placeholder: newPlaceholder },
            }
          : el,
      ),
    );
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setResizingElement(elementId);
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingElement) return;

    const element = elements.find((el) => el.id === resizingElement);
    if (!element) return;

    const elementDiv = document.getElementById(`element-${resizingElement}`);
    if (!elementDiv) return;

    const rect = elementDiv.getBoundingClientRect();
    const newWidth = Math.max(200, e.clientX - rect.left);

    setElementWidths((prev) => ({
      ...prev,
      [resizingElement]: newWidth,
    }));
  };

  const handleResizeEnd = () => {
    setResizingElement(null);
  };

  const handleTextareaInput = (id: string, textarea: HTMLTextAreaElement) => {
    // Auto-resize textarea
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";

    // Recalculate positions whenever textarea height changes (both edit and preview modes)
    const elementDiv = document.getElementById(`element-${id}`);
    if (elementDiv) {
      const newHeight = elementDiv.offsetHeight;
      const oldHeight = elementHeights[id];

      if (oldHeight !== newHeight) {
        setElementHeights((prev) => ({
          ...prev,
          [id]: newHeight,
        }));

        // Recalculate all positions to maintain proper spacing
        setTimeout(() => recalculateAllPositions(), 0);
      }
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (resizingElement) return; // Don't drag while resizing

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;
    const elementDiv = document.getElementById(`element-${elementId}`);
    if (!elementDiv) return;

    // Use the element's viewport rect to calculate the mouse offset
    // relative to the element's top-left. This keeps client coordinates
    // consistent with the getBoundingClientRect() used in mouse move.
    const elemRect = elementDiv.getBoundingClientRect();

    setDraggingElement(elementId);
    setDragOffset({
      x: e.clientX - elemRect.left,
      y: e.clientY - elemRect.top,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (resizingElement) {
      handleResizeMove(e);
    } else if (draggingElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setElements(
        elements.map((el) =>
          el.id === draggingElement
            ? {
                ...el,
                position: { x: Math.max(0, newX), y: Math.max(0, newY) },
              }
            : el,
        ),
      );
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingElement) {
      setDraggingElement(null);
      // Recalculate positions after dragging with a delay to ensure DOM is updated
      setTimeout(() => recalculateAllPositions(), 100);
    }
    if (resizingElement) {
      handleResizeEnd();
    }
  };

  const handleDeleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const handleEditDropdown = (id: string) => {
    setEditingDropdownId(id);
    setShowDropdownModal(true);
  };

  const handleSaveDropdownOptions = (options: string[]) => {
    if (editingDropdownId) {
      setElements(
        elements.map((el) =>
          el.id === editingDropdownId
            ? { ...el, properties: { ...el.properties, options } }
            : el,
        ),
      );
    }
    setShowDropdownModal(false);
    setEditingDropdownId(null);
  };

  const getCurrentDropdownOptions = (): string[] => {
    if (!editingDropdownId) return [];
    const element = elements.find((el) => el.id === editingDropdownId);
    return element?.properties.options || [];
  };

  // expose imperative API to parent
  useImperativeHandle(ref, () => ({
    getElements: () => elements,
  }));

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Left Toolbox */}
      {!preview && (
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Form Elements
          </h2>
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
              <strong>Tip:</strong> Drag elements from here onto the canvas to
              build your certificate.
            </p>
          </div>
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 p-6 overflow-auto">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="relative min-h-[800px] bg-white border-2 border-dashed border-gray-300 rounded-lg p-8"
          style={{ minWidth: "800px" }}
        >
          {elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-medium">
                  Drop elements here to start building
                </p>
              </div>
            </div>
          )}

          {elements.map((element) => {
            const elementWidth = elementWidths[element.id] || 400;
            const isInteractive = !preview;

            return (
              <div
                key={element.id}
                id={`element-${element.id}`}
                onClick={
                  isInteractive
                    ? () => handleElementClick(element.id)
                    : undefined
                }
                onMouseDown={
                  isInteractive
                    ? (e) => {
                        if (!e.defaultPrevented) {
                          handleElementMouseDown(e, element.id);
                        }
                      }
                    : undefined
                }
                className={`absolute ${preview ? "cursor-default" : resizingElement === element.id ? "cursor-ew-resize" : draggingElement === element.id ? "cursor-grabbing" : "cursor-grab"} ${!preview && selectedElement === element.id ? "ring-2 ring-blue-500" : ""}`}
                style={{
                  left: `${element.position.x}px`,
                  top: `${element.position.y}px`,
                  width:
                    element.type === "textbox" || element.type === "inputbox"
                      ? `${elementWidth}px`
                      : "auto",
                }}
              >
                <div
                  className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm transition-shadow relative"
                  style={{
                    minWidth:
                      element.type === "textbox" || element.type === "inputbox"
                        ? "auto"
                        : "400px",
                  }}
                >
                  {element.type === "textbox" && (
                    <div className="flex items-start gap-3 relative">
                      {preview ? (
                        <div
                          className="flex-1 font-medium text-gray-700 px-2 py-1"
                          style={{ minHeight: "32px" }}
                        >
                          {element.properties.label ||
                            element.properties.placeholder ||
                            "Text Field"}
                        </div>
                      ) : (
                        <>
                          <textarea
                            id={`textarea-${element.id}`}
                            value={element.properties.label ?? ""}
                            onChange={(e) => {
                              handleLabelChange(element.id, e.target.value);
                              handleTextareaInput(element.id, e.currentTarget);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex-1 font-medium text-gray-700 bg-transparent border border-gray-300 focus:outline-none focus:border-blue-500 px-2 py-1 rounded resize-none overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                            placeholder={
                              element.properties.placeholder || "Text Field"
                            }
                            rows={1}
                            style={{ minHeight: "32px" }}
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleResizeStart(e, element.id);
                            }}
                            className="absolute -right-2 top-0 w-8 h-8 cursor-ew-resize hover:bg-blue-100 rounded flex items-center justify-center group bg-white border border-gray-300 shadow-sm"
                            title="Drag to resize width"
                          >
                            <svg
                              className="w-4 h-4 text-gray-500 group-hover:text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                transform="rotate(90 12 12)"
                              />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {element.type === "inputbox" && (
                    <div className="space-y-2 relative">
                      {preview ? (
                        <>
                          <div className="font-medium text-gray-700 mb-2">
                            {element.properties.label}
                          </div>
                          <textarea
                            id={`input-textarea-${element.id}`}
                            value={(element.properties as any).userInput ?? ""}
                            onChange={(e) => {
                              // Update user input in preview mode
                              setElements((prev) =>
                                prev.map((el) =>
                                  el.id === element.id
                                    ? {
                                        ...el,
                                        properties: {
                                          ...el.properties,
                                          userInput: e.target.value,
                                        } as any,
                                      }
                                    : el,
                                ),
                              );
                              handleTextareaInput(element.id, e.currentTarget);
                            }}
                            className="w-full text-gray-700 bg-white border border-gray-300 focus:outline-none focus:border-blue-500 px-3 py-2 rounded resize-none overflow-hidden"
                            placeholder={
                              element.properties.placeholder ||
                              "Enter text here..."
                            }
                            rows={1}
                            style={{ minHeight: "42px" }}
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={element.properties.label ?? ""}
                            onChange={(e) =>
                              handleLabelChange(element.id, e.target.value)
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full font-medium text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2 py-1"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Input Title"
                          />
                          <input
                            type="text"
                            value={element.properties.placeholder ?? ""}
                            onChange={(e) =>
                              handlePlaceholderChange(
                                element.id,
                                e.target.value,
                              )
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full text-sm text-gray-500 bg-gray-50 border border-gray-300 focus:outline-none focus:border-blue-500 px-3 py-2 rounded"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Placeholder text..."
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleResizeStart(e, element.id);
                            }}
                            className="absolute -right-2 top-0 w-8 h-8 cursor-ew-resize hover:bg-blue-100 rounded flex items-center justify-center group bg-white border border-gray-300 shadow-sm"
                            title="Drag to resize width"
                          >
                            <svg
                              className="w-4 h-4 text-gray-500 group-hover:text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                transform="rotate(90 12 12)"
                              />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {element.type === "checkbox" && (
                    <div className="flex items-center gap-3">
                      {preview ? (
                        <>
                          <input
                            key={`preview-checkbox-${element.id}`}
                            type="checkbox"
                            checked={
                              (element.properties as any).userInput ??
                              element.properties.defaultValue ??
                              false
                            }
                            onChange={(e) => {
                              setElements((prev) =>
                                prev.map((el) =>
                                  el.id === element.id
                                    ? {
                                        ...el,
                                        properties: {
                                          ...el.properties,
                                          userInput: e.target.checked,
                                        } as any,
                                      }
                                    : el,
                                ),
                              );
                            }}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 font-medium text-gray-700">
                            {element.properties.label}
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            key={`edit-checkbox-label-${element.id}`}
                            type="text"
                            value={element.properties.label ?? ""}
                            onChange={(e) =>
                              handleLabelChange(element.id, e.target.value)
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex-1 font-medium text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2 py-1"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Label"
                          />
                          <input
                            key={`edit-checkbox-${element.id}`}
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            readOnly
                          />
                        </>
                      )}
                    </div>
                  )}

                  {element.type === "dropdown" && (
                    <div className="space-y-2">
                      {preview ? (
                        <>
                          <div className="font-medium text-gray-700">
                            {element.properties.label}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              key={`preview-select-${element.id}`}
                              value={
                                (element.properties as any).userInput ??
                                element.properties.defaultValue ??
                                ""
                              }
                              onChange={(e) => {
                                setElements((prev) =>
                                  prev.map((el) =>
                                    el.id === element.id
                                      ? {
                                          ...el,
                                          properties: {
                                            ...el.properties,
                                            userInput: e.target.value,
                                          } as any,
                                        }
                                      : el,
                                  ),
                                );
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Select --</option>
                              {element.properties.options?.map(
                                (option, idx) => (
                                  <option key={idx} value={option}>
                                    {option}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            key={`edit-dropdown-label-${element.id}`}
                            type="text"
                            value={element.properties.label ?? ""}
                            onChange={(e) =>
                              handleLabelChange(element.id, e.target.value)
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full font-medium text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2 py-1"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Label"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              key={`edit-select-${element.id}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {element.properties.options?.map(
                                (option, idx) => (
                                  <option key={idx}>{option}</option>
                                ),
                              )}
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditDropdown(element.id);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md flex-shrink-0"
                              title="Edit options"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!preview && selectedElement === element.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElement(element.id);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                      title="Delete element"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dropdown Options Modal */}
      {showDropdownModal && (
        <DropdownOptionsModal
          isOpen={showDropdownModal}
          options={getCurrentDropdownOptions()}
          onClose={() => {
            setShowDropdownModal(false);
            setEditingDropdownId(null);
          }}
          onSave={handleSaveDropdownOptions}
        />
      )}
    </div>
  );
});

export default CertificateBuilder;
