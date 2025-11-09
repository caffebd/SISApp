'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../../../../lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsNavigation from '../../../components/SettingsNavigation';
import ChangeEmailModal from '../../../components/ChangeEmailModal';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import EditNameModal from '../../../components/EditNameModal';
import LogoUploadModal from '../../../components/LogoUploadModal';

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  subscriptionEnd?: string; // assume stored as ISO date string
  email?: string; // mirror field (optional)
}

function formatSubscriptionEnd(raw?: unknown): string {
  if (!raw) return '—';
  // Support Firestore Timestamp, ms epoch, or ISO string
  try {
    let date: Date;
    if (raw instanceof Timestamp) {
      date = raw.toDate();
    } else if (typeof raw === 'number') {
      date = new Date(raw);
    } else if (typeof raw === 'string') {
      date = new Date(raw);
    } else {
      return '—';
    }
  if (isNaN(date.getTime())) return String(raw);
    // Format like 1st November 2026
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    const suffix = (n: number) => {
      if (n % 10 === 1 && n % 100 !== 11) return 'st';
      if (n % 10 === 2 && n % 100 !== 12) return 'nd';
      if (n % 10 === 3 && n % 100 !== 13) return 'rd';
      return 'th';
    };
    return `${day}${suffix(day)} ${month} ${year}`;
  } catch {
    return '—';
  }
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [isPasswordProvider, setIsPasswordProvider] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setEmail(user.email || '');
        setUserId(user.uid);
        setIsPasswordProvider(user.providerData.some(p => p.providerId === 'password'));
        try {
          const docRef = doc(db, 'USERS', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfileData;
            setProfile(data);
          }
        } catch (e: any) {
          setError(e.message || 'Failed to load profile');
        }
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch logo from Firebase Storage
  useEffect(() => {
    console.log('Logo fetch effect triggered, userId:', userId);
    if (!userId) {
      console.log('No userId, skipping logo fetch');
      return;
    }

    const fetchLogo = async () => {
      setLogoLoading(true);
      try {
        const logoRef = ref(storage, `${userId}/logo`);
        const downloadUrl = await getDownloadURL(logoRef);
        console.log('Firebase download URL obtained:', downloadUrl);
        // Use the direct Firebase Storage URL instead of proxying
        console.log('Setting logo URL to:', downloadUrl);
        setLogoUrl(downloadUrl);
      } catch (err: any) {
        // Logo doesn't exist or error fetching
        console.log('Logo fetch error:', err.code, err.message);
        setLogoUrl(null);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchLogo();
  }, [userId]);

  const handleLogoSuccess = (url: string) => {
    // Force refresh by updating state with the new direct URL
    setLogoUrl(null);
    setTimeout(() => {
      setLogoUrl(url);
      setMessage('Logo uploaded successfully');
      setTimeout(() => setMessage(null), 3000);
    }, 100);
  };

  if (loading || !isAuthenticated) return null;

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
            <div className="bg-white rounded-xl shadow-md p-8 space-y-8 relative">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Settings</h2>
                
                {/* Logo Section - Below Title on Left */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowLogoModal(true)}
                    className="group relative"
                    title="Click to upload logo"
                    type="button"
                    style={{ display: 'block' }}
                  >
                    <div className="w-24 h-24 rounded-lg border-2 border-gray-300 group-hover:border-blue-500 transition-colors overflow-hidden flex items-center justify-center p-2" style={{ backgroundColor: '#ffffff' }}>
                      {logoLoading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      ) : logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company Logo"
                          style={{ 
                            display: 'block',
                            objectFit: 'contain',
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            opacity: 1,
                            visibility: 'visible',
                            filter: 'none',
                            transform: 'none'
                          }}
                          onLoad={(e) => {
                            console.log('✅ Logo loaded successfully');
                            console.log('Image src:', e.currentTarget.src);
                            console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                            console.log('Image computed width/height:', e.currentTarget.width, 'x', e.currentTarget.height);
                            console.log('Image opacity:', window.getComputedStyle(e.currentTarget).opacity);
                            console.log('Image visibility:', window.getComputedStyle(e.currentTarget).visibility);
                            console.log('Image filter:', window.getComputedStyle(e.currentTarget).filter);
                          }}
                          onError={(e) => {
                            console.error('❌ Error loading logo');
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs font-medium text-gray-600">No Logo</p>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <span>Name</span>
                      <button
                        type="button"
                        onClick={() => setShowNameModal(true)}
                        className="inline-flex items-center p-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1"
                        aria-label="Edit name"
                        title="Edit name"
                        style={{ lineHeight: 0 }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </dt>
                    <dd className="mt-1 text-gray-900">{profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || '—' : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <span>Username / Email</span>
                      <button
                        type="button"
                        onClick={() => setShowEmailModal(true)}
                        className="inline-flex items-center p-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1"
                        aria-label="Edit email"
                        title="Edit email"
                        style={{ lineHeight: 0 }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </dt>
                    <dd className="mt-1 text-gray-900">{email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Subscription Ends</dt>
                    <dd className="mt-1 text-gray-900">{formatSubscriptionEnd(profile?.subscriptionEnd)}</dd>
                  </div>
                </dl>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
              {message && <div className="text-sm text-green-600">{message}</div>}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  disabled={!isPasswordProvider}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-40"
                  title={isPasswordProvider ? 'Reset your password' : 'Password reset not available for social login accounts'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c.597 0 1.136.26 1.5.675m2.486 1.547A6.002 6.002 0 0012 6a6 6 0 00-6 6v3a2 2 0 002 2h1m6 0h1a2 2 0 002-2v-1.5M12 11v2m0 4h.01"/></svg>
                  Reset Password
                </button>
              </div>
              {showNameModal && profile && (
                <EditNameModal
                  isOpen={showNameModal}
                  currentFirstName={profile.firstName || ''}
                  currentLastName={profile.lastName || ''}
                  onClose={() => setShowNameModal(false)}
                  onSuccess={(first, last) => {
                    setProfile((p) => p ? { ...p, firstName: first, lastName: last } : p);
                    setMessage('Name updated successfully');
                  }}
                />
              )}
              {showEmailModal && (
                <ChangeEmailModal
                  isOpen={showEmailModal}
                  currentEmail={email}
                  onClose={() => setShowEmailModal(false)}
                  onSuccess={(requestedNewEmail) => {
                    setMessage(`Verification email sent to ${requestedNewEmail}. Please click the link to complete the change.`);
                  }}
                />
              )}
              {showPasswordModal && (
                <ChangePasswordModal
                  isOpen={showPasswordModal}
                  onClose={() => setShowPasswordModal(false)}
                  onSuccess={() => {
                    setMessage('Password updated successfully');
                  }}
                />
              )}
              {showLogoModal && userId && (
                <LogoUploadModal
                  isOpen={showLogoModal}
                  userId={userId}
                  onClose={() => setShowLogoModal(false)}
                  onSuccess={handleLogoSuccess}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}