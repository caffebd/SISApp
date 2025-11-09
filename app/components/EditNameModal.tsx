"use client";

import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface EditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (firstName: string, lastName: string) => void;
  currentFirstName: string;
  currentLastName: string;
}

export default function EditNameModal({ isOpen, onClose, onSuccess, currentFirstName, currentLastName }: EditNameModalProps) {
  const [firstName, setFirstName] = useState(currentFirstName || '');
  const [lastName, setLastName] = useState(currentLastName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      setError('Not signed in.');
      return;
    }
    if (!firstName.trim() && !lastName.trim()) {
      setError('Please enter at least one name.');
      return;
    }
    try {
      setBusy(true);
      const ref = doc(db, 'USERS', user.uid);
      await updateDoc(ref, { firstName: firstName.trim(), lastName: lastName.trim() });
      onSuccess(firstName.trim(), lastName.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update name');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Name</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex flex-col gap-1">
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First Name"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last Name"
              disabled={busy}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled={busy}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
