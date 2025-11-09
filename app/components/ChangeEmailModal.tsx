"use client";

import { useState } from 'react';
import { auth } from '../../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
  currentEmail: string;
}

export default function ChangeEmailModal({ isOpen, onClose, onSuccess, currentEmail }: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!auth.currentUser) return;
    if (!newEmail || newEmail === currentEmail) {
      setError('Enter a different email');
      return;
    }
    try {
      setBusy(true);
      const cred = EmailAuthProvider.credential(currentEmail, password);
      await reauthenticateWithCredential(auth.currentUser, cred);
      // Send verification link to the new email; update completes after user confirms via email.
      const actionCodeSettings = {
        // Redirect back to the account settings page after verification
        url: typeof window !== 'undefined' ? `${window.location.origin}/admin/settings/account` : undefined,
        handleCodeInApp: false,
      } as const;
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail, actionCodeSettings);
      onSuccess(newEmail);
      setNewEmail('');
      setPassword('');
      onClose();
    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        setError('Your project requires email verification before changing email. A verification email will be sent.');
      } else if (e.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (e.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (e.code === 'auth/requires-recent-login') {
        setError('Please sign out and back in, then retry');
      } else {
        setError(e.message || 'Failed to update email');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Change Email</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="text-sm text-gray-600">Current email: <span className="font-medium">{currentEmail}</span></div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex flex-col gap-1">
            <label htmlFor="newEmail" className="text-sm font-medium text-gray-700">New Email</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="new@example.com"
              required
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              disabled={busy}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={busy}
            >Cancel</button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              disabled={busy}
            >{busy ? 'Updating…' : 'Update Email'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
