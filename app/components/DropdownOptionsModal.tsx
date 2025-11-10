'use client';

import { useState, useEffect } from 'react';

interface DropdownOptionsModalProps {
  isOpen: boolean;
  options: string[];
  onClose: () => void;
  onSave: (options: string[]) => void;
}

export default function DropdownOptionsModal({ isOpen, options, onClose, onSave }: DropdownOptionsModalProps) {
  const [localOptions, setLocalOptions] = useState<string[]>(options);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const handleAddOption = () => {
    if (newOption.trim()) {
      setLocalOptions([...localOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleDeleteOption = (index: number) => {
    setLocalOptions(localOptions.filter((_, idx) => idx !== index));
  };

  const handleEditOption = (index: number, value: string) => {
    setLocalOptions(localOptions.map((opt, idx) => idx === index ? value : opt));
  };

  const handleSave = () => {
    onSave(localOptions.filter(opt => opt.trim()));
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newOptions = [...localOptions];
      [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
      setLocalOptions(newOptions);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < localOptions.length - 1) {
      const newOptions = [...localOptions];
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
      setLocalOptions(newOptions);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Dropdown Options</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Add New Option */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Option
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                placeholder="Enter option text..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Options
            </label>
            {localOptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No options yet. Add your first option above.
              </p>
            ) : (
              localOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === localOptions.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleEditOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleDeleteOption(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete option"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Save Options
          </button>
        </div>
      </div>
    </div>
  );
}