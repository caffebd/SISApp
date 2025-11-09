'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsNavigation from '../../../components/SettingsNavigation';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface BusinessDetails {
  businessName: string;
  companyNumber: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
}

export default function BusinessSettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    businessName: '',
    companyNumber: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
  });

  const [editedDetails, setEditedDetails] = useState<BusinessDetails>({
    businessName: '',
    companyNumber: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
  });

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

  // Fetch business details from Firebase
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchBusinessDetails = async () => {
      try {
        const userDocRef = doc(db, 'USERS', USER_ID);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const details: BusinessDetails = {
            businessName: data.businessName || '',
            companyNumber: data.companyNumber || '',
            businessAddress: data.businessAddress || '',
            businessPhone: data.businessPhone || '',
            businessEmail: data.businessEmail || '',
          };
          setBusinessDetails(details);
          setEditedDetails(details);
        }
      } catch (err) {
        console.error('Error fetching business details:', err);
        setError('Failed to load business details');
      }
    };

    fetchBusinessDetails();
  }, [isAuthenticated]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedDetails(businessDetails);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDetails(businessDetails);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const userDocRef = doc(db, 'USERS', USER_ID);
      await setDoc(userDocRef, {
        businessName: editedDetails.businessName,
        companyNumber: editedDetails.companyNumber,
        businessAddress: editedDetails.businessAddress,
        businessPhone: editedDetails.businessPhone,
        businessEmail: editedDetails.businessEmail,
      }, { merge: true });

      setBusinessDetails(editedDetails);
      setIsEditing(false);
      setSuccess('Business details saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving business details:', err);
      setError('Failed to save business details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof BusinessDetails, value: string) => {
    setEditedDetails(prev => ({
      ...prev,
      [field]: value,
    }));
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
              {/* Header with Edit/Save Button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Business Details</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
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
                {/* Business Name */}
                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="businessName"
                      value={editedDetails.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter business name"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg py-2">
                      {businessDetails.businessName || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Company Number */}
                <div>
                  <label htmlFor="companyNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    Registered Company Number <span className="text-gray-500 font-normal">(if applicable)</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="companyNumber"
                      value={editedDetails.companyNumber}
                      onChange={(e) => handleInputChange('companyNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company number"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg py-2">
                      {businessDetails.companyNumber || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Business Address */}
                <div>
                  <label htmlFor="businessAddress" className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Address
                  </label>
                  {isEditing ? (
                    <textarea
                      id="businessAddress"
                      value={editedDetails.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter business address"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg py-2 whitespace-pre-line">
                      {businessDetails.businessAddress || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Business Phone */}
                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      id="businessPhone"
                      value={editedDetails.businessPhone}
                      onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg py-2">
                      {businessDetails.businessPhone || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Business Email */}
                <div>
                  <label htmlFor="businessEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      id="businessEmail"
                      value={editedDetails.businessEmail}
                      onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  ) : (
                    <p className="text-gray-900 text-lg py-2">
                      {businessDetails.businessEmail || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}