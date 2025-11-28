"use client";

import React from "react";
import type { FormElement } from "./CertificateBuilderTypes";

interface CertificateFormRendererProps {
  elements: FormElement[];
  values: Record<string, any>;
  onChange: (elementId: string, value: any) => void;
}

// Preset options for CO Alarm Comments
const CO_ALARM_PRESETS = [
  "Customer advised",
  "Fit as per manual",
  "Alarm out of date",
  "Rental property law 2015",
  "Button test only",
  "Alarm must be fitted before use",
];

export default function CertificateFormRenderer({
  elements,
  values,
  onChange,
}: CertificateFormRendererProps) {
  const renderElement = (element: FormElement) => {
    const value = values[element.id] || "";

    switch (element.type) {
      case "text-header":
        const fontSize = element.properties.fontSize || 16;
        const alignment = element.properties.alignment || "left";
        const isBold = element.properties.bold;

        // Determine if this is a main section header (starts with letter + period)
        const text = element.properties.text || "";
        const isSectionHeader = /^[A-Z]\.\s/.test(text);

        return (
          <div
            key={element.id}
            className={`${isSectionHeader ? "mt-8 mb-4 pt-6 border-t-2 border-gray-200" : "mb-3"}`}
            style={{
              fontSize: `${fontSize}px`,
              textAlign: alignment as "left" | "center" | "right",
              fontWeight: isBold ? "bold" : "normal",
            }}
          >
            {isSectionHeader ? (
              <h2 className="text-xl font-bold text-gray-900">{text}</h2>
            ) : (
              <span className="text-gray-700">{text}</span>
            )}
          </div>
        );

      case "inputbox": // Legacy type from CertificateBuilder
      case "text-input":
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {element.properties.label}
              {element.properties.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(element.id, e.target.value)}
              placeholder={element.properties.placeholder}
              required={element.properties.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        );

      case "textbox": // Legacy type from CertificateBuilder
        // If textbox has no placeholder or default placeholder, it's static text (like a header)
        // If it has a meaningful placeholder, it's an editable text area
        const hasPlaceholder =
          element.properties.placeholder &&
          element.properties.placeholder.trim() !== "" &&
          element.properties.placeholder !== "Text Field";

        if (!hasPlaceholder) {
          return (
            <div
              key={element.id}
              className="mb-3 font-medium text-gray-700 px-2 py-1"
            >
              {element.properties.label || ""}
            </div>
          );
        }
        // Fall through to text-area rendering if it has a meaningful placeholder
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {element.properties.label}
              {element.properties.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(element.id, e.target.value)}
              placeholder={element.properties.placeholder}
              required={element.properties.required}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
            />
          </div>
        );

      case "text-area":
        // Check if this is the CO Alarm Comments field
        const isCoAlarmComments = element.id === "co-alarm-comments";

        const handlePresetClick = (preset: string) => {
          const currentValue = value || "";
          const formattedPreset =
            preset.charAt(0).toUpperCase() + preset.slice(1) + ". ";

          // Add the preset as a new sentence
          const newValue = currentValue
            ? currentValue.trim() + " " + formattedPreset
            : formattedPreset;

          onChange(element.id, newValue);
        };

        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {element.properties.label}
              {element.properties.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>

            {isCoAlarmComments && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Quick Options (click to add):
                </p>
                <div className="flex flex-wrap gap-2">
                  {CO_ALARM_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className="px-3 py-1.5 text-sm bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={value}
              onChange={(e) => onChange(element.id, e.target.value)}
              placeholder={element.properties.placeholder}
              required={element.properties.required}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
            />
          </div>
        );

      case "date-input":
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {element.properties.label}
              {element.properties.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => onChange(element.id, e.target.value)}
              required={element.properties.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        );

      case "dropdown":
        const options = element.properties.options || [];
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {element.properties.label}
              {element.properties.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <select
              value={value}
              onChange={(e) => onChange(element.id, e.target.value)}
              required={element.properties.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select --</option>
              {options.map((option: string, index: number) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case "checkbox":
        return (
          <div key={element.id} className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === true || value === "true"}
                onChange={(e) => onChange(element.id, e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {element.properties.label}
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  // Group elements by their Y position to create rows
  const groupedElements = elements.reduce(
    (groups, element) => {
      const yPos = element.position.y;
      const tolerance = 10; // Elements within 10px vertically are considered on same row

      // Find existing group within tolerance
      const existingGroup = groups.find(
        (group) => Math.abs(group.y - yPos) < tolerance,
      );

      if (existingGroup) {
        existingGroup.elements.push(element);
      } else {
        groups.push({ y: yPos, elements: [element] });
      }

      return groups;
    },
    [] as Array<{ y: number; elements: FormElement[] }>,
  );

  // Sort groups by Y position
  groupedElements.sort((a, b) => a.y - b.y);

  // Sort elements within each group by X position
  groupedElements.forEach((group) => {
    group.elements.sort((a, b) => a.position.x - b.position.x);
  });

  return (
    <div className="space-y-2">
      {groupedElements.map((group, groupIndex) => {
        const hasMultipleElements = group.elements.length > 1;
        const allAreInputs = group.elements.every(
          (el) =>
            el.type === "text-input" ||
            el.type === "inputbox" ||
            el.type === "date-input" ||
            el.type === "dropdown",
        );

        // If multiple input fields are on the same row, display them side by side
        if (hasMultipleElements && allAreInputs) {
          return (
            <div key={`group-${groupIndex}`} className="grid grid-cols-2 gap-4">
              {group.elements.map((element) => (
                <div key={element.id}>{renderElement(element)}</div>
              ))}
            </div>
          );
        }

        // Otherwise, render each element in the group sequentially
        return (
          <div key={`group-${groupIndex}`}>
            {group.elements.map((element) => renderElement(element))}
          </div>
        );
      })}
    </div>
  );
}
