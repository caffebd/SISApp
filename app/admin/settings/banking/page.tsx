'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { loadBankDetails as loadBankDetailsFn, saveBankDetails as saveBankDetailsFn, type BankDetails } from '../../../../lib/bankingClient';
// Using Cloud Functions for encryption/decryption; no key on client
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsNavigation from '../../../components/SettingsNavigation';

export default function BankingSettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
  });
  const [editedDetails, setEditedDetails] = useState<BankDetails>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
  });
  const [detailsLoading, setDetailsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });
  return () => unsubscribe();
  }, [router]);

  // Fetch bank details via Cloud Function (server decrypts)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBankDetails = async () => {
      setDetailsLoading(true);
      try {
        const res = await loadBankDetailsFn();
        if (res.ok && res.bankDetails) {
          setBankDetails(res.bankDetails);
          setEditedDetails(res.bankDetails);
        } else {
          setBankDetails({ bankName: '', accountName: '', accountNumber: '', sortCode: '' });
          setEditedDetails({ bankName: '', accountName: '', accountNumber: '', sortCode: '' });
        }
      } catch (err) {
        console.error('Error fetching bank details:', err);
        setError('Failed to load bank details');
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchBankDetails();
  }, [isAuthenticated]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedDetails(bankDetails);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDetails(bankDetails);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveBankDetailsFn(editedDetails);
      setBankDetails(editedDetails);
      setIsEditing(false);
      setSuccess('Bank details saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving bank details:', err);
      setError('Failed to save bank details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Format sort code as XX-XX-XX, only allow numbers, auto-insert hyphens
  const handleSortCodeChange = (value: string) => {
    // Remove all non-digits
    let digits = value.replace(/\D/g, '');
    // Limit to 6 digits
    digits = digits.slice(0, 6);
    // Insert hyphens after every 2 digits
    let formatted = '';
    for (let i = 0; i < digits.length; i += 2) {
      if (i > 0) formatted += '-';
      formatted += digits.slice(i, i + 2);
    }
    setEditedDetails(prev => ({ ...prev, sortCode: formatted }));
  };

  // Only allow numbers for account number
  const handleAccountNumberChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    setEditedDetails(prev => ({ ...prev, accountNumber: digits }));
  };

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    if (field === 'sortCode') {
      handleSortCodeChange(value);
    } else if (field === 'accountNumber') {
      handleAccountNumberChange(value);
    } else {
      setEditedDetails(prev => ({ ...prev, [field]: value }));
    }
  };

  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and system preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <SettingsNavigation />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Banking Information</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    disabled={detailsLoading}
                    className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 ${detailsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Success Message */}
              {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Bank Name */}
                <div>
                  <label htmlFor="bankName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="bankName"
                      value={editedDetails.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  ) : (
                    detailsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-gray-400">Loading…</span>
                      </div>
                    ) : (
                      <p className="text-gray-900 text-lg py-2">
                        {bankDetails.bankName || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )
                  )}
                </div>

                {/* Account Name */}
                <div>
                  <label htmlFor="accountName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="accountName"
                      value={editedDetails.accountName}
                      onChange={(e) => handleInputChange('accountName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter account name"
                    />
                  ) : (
                    detailsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-gray-400">Loading…</span>
                      </div>
                    ) : (
                      <p className="text-gray-900 text-lg py-2">
                        {bankDetails.accountName || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="accountNumber"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editedDetails.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter account number"
                      autoComplete="off"
                    />
                  ) : (
                    detailsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-gray-400">Loading…</span>
                      </div>
                    ) : (
                      <p className="text-gray-900 text-lg py-2">
                        {bankDetails.accountNumber || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )
                  )}
                </div>

                {/* Sort Code */}
                <div>
                  <label htmlFor="sortCode" className="block text-sm font-semibold text-gray-700 mb-2">
                    Sort Code
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="sortCode"
                      inputMode="numeric"
                      pattern="[0-9-]*"
                      value={editedDetails.sortCode}
                      onChange={(e) => handleInputChange('sortCode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 20-53-30"
                      autoComplete="off"
                      maxLength={8}
                    />
                  ) : (
                    detailsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-gray-400">Loading…</span>
                      </div>
                    ) : (
                      <p className="text-gray-900 text-lg py-2">
                        {bankDetails.sortCode || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )
                  )}
                </div>
              </div>
            {/* Encryption Info */}
            <div className="flex items-center gap-2 mt-8 text-xs text-gray-500">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c.597 0 1.136.26 1.5.675m2.486 1.547A6.002 6.002 0 0012 6a6 6 0 00-6 6v3a2 2 0 002 2h1m6 0h1a2 2 0 002-2v-1.5M12 11v2m0 4h.01"/>
              </svg>
              <span>Your bank details are encrypted. Encrypting your bank details prevents us from reading this information on our servers.</span>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}