"use client";

interface SaveSuccessModalProps {
  isOpen: boolean;
  name?: string;
  onClose: () => void;
}

export default function SaveSuccessModal({ isOpen, name, onClose }: SaveSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Saved</h2>
          <p className="text-gray-700 mb-6">{name ? `Certificate "${name}" saved successfully.` : 'Certificate saved.'}</p>
          <div className="flex justify-center">
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
