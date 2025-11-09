'use client';

import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsNavigation from '../../../components/SettingsNavigation';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

const DEFAULT_ROLES = ['Manager', 'HR', 'Engineer', 'Other'] as const;
type DefaultRole = typeof DEFAULT_ROLES[number];

interface StaffMember {
  id: string;
  name: string;
  address: string;
  mobile: string;
  email: string;
  role: string;
  customRole?: string;
}

export default function StaffSettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [showSaveRolePrompt, setShowSaveRolePrompt] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  const [formData, setFormData] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    address: '',
    mobile: '',
    email: '',
    role: 'Manager',
    customRole: '',
  });

  // All available roles (default + custom)
  const allRoles = useMemo(() => {
    return [...DEFAULT_ROLES.filter(r => r !== 'Other'), ...customRoles, 'Other'];
  }, [customRoles]);

  // Filtered staff members based on search and role filter
  const filteredStaffMembers = useMemo(() => {
    let filtered = staffMembers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => {
        const displayRole = member.role === 'Other' && member.customRole ? member.customRole : member.role;
        return (
          member.name.toLowerCase().includes(query) ||
          member.address.toLowerCase().includes(query) ||
          member.mobile.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          displayRole.toLowerCase().includes(query)
        );
      });
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => {
        const displayRole = member.role === 'Other' && member.customRole ? member.customRole : member.role;
        return displayRole === roleFilter;
      });
    }

    return filtered;
  }, [staffMembers, searchQuery, roleFilter]);

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

  // Fetch staff members and custom roles from Firebase
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        // Fetch staff members
        const staffRef = collection(db, 'USERS', USER_ID, 'staff');
        const querySnapshot = await getDocs(staffRef);
        
        const members: StaffMember[] = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          members.push({
            id: docSnapshot.id,
            name: data.name || '',
            address: data.address || '',
            mobile: data.mobile || '',
            email: data.email || '',
            role: data.role || 'Manager',
            customRole: data.customRole || '',
          });
        });
        
        setStaffMembers(members);

        // Fetch custom roles
        const settingsDocRef = doc(db, 'USERS', USER_ID, 'settings', 'customRoles');
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setCustomRoles(data.roles || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load staff data');
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      mobile: '',
      email: '',
      role: 'Manager',
      customRole: '',
    });
    setError('');
    setSuccess('');
  };

  const handleEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setIsAdding(false);
    setFormData({
      name: member.name,
      address: member.address,
      mobile: member.mobile,
      email: member.email,
      role: member.role,
      customRole: member.customRole || '',
    });
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      mobile: '',
      email: '',
      role: 'Manager',
      customRole: '',
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (formData.role === 'Other' && !formData.customRole?.trim()) {
      setError('Please specify the role');
      return;
    }

    // Check if this is a new custom role
    const isNewCustomRole = formData.role === 'Other' && 
                           formData.customRole && 
                           !customRoles.includes(formData.customRole);

    if (isNewCustomRole) {
      // Show prompt to save custom role
      setPendingSaveData({ formData, editingId });
      setShowSaveRolePrompt(true);
      return;
    }

    // Proceed with normal save
    await performSave(formData, editingId, false);
  };

  const performSave = async (data: typeof formData, docId: string | null, saveCustomRole: boolean) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const staffRef = collection(db, 'USERS', USER_ID, 'staff');
      const staffDocId = docId || doc(staffRef).id;
      const staffDocRef = doc(db, 'USERS', USER_ID, 'staff', staffDocId);

      const staffData = {
        name: data.name,
        address: data.address,
        mobile: data.mobile,
        email: data.email,
        role: data.role,
        customRole: data.role === 'Other' ? data.customRole : '',
      };

      await setDoc(staffDocRef, staffData);

      // Save custom role if requested
      if (saveCustomRole && data.role === 'Other' && data.customRole) {
        const newCustomRoles = [...customRoles, data.customRole];
        const settingsDocRef = doc(db, 'USERS', USER_ID, 'settings', 'customRoles');
        await setDoc(settingsDocRef, { roles: newCustomRoles });
        setCustomRoles(newCustomRoles);
      }

      // If role is Engineer, also save to engineers collection
      if (data.role === 'Engineer') {
        const engineerDocRef = doc(db, 'USERS', USER_ID, 'engineers', staffDocId);
        await setDoc(engineerDocRef, {
          name: data.name,
          active: true,
          maxTravelKm: 50, // Default value
        });
      }

      // Update local state
      if (docId) {
        setStaffMembers(prev =>
          prev.map(member =>
            member.id === docId
              ? { id: docId, ...data }
              : member
          )
        );
        setSuccess('Staff member updated successfully');
      } else {
        setStaffMembers(prev => [...prev, { id: staffDocId, ...data }]);
        setSuccess('Staff member added successfully');
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        mobile: '',
        email: '',
        role: 'Manager',
        customRole: '',
      });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving staff member:', err);
      setError('Failed to save staff member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoleYes = async () => {
    setShowSaveRolePrompt(false);
    if (pendingSaveData) {
      await performSave(pendingSaveData.formData, pendingSaveData.editingId, true);
      setPendingSaveData(null);
    }
  };

  const handleSaveRoleNo = async () => {
    setShowSaveRolePrompt(false);
    if (pendingSaveData) {
      await performSave(pendingSaveData.formData, pendingSaveData.editingId, false);
      setPendingSaveData(null);
    }
  };

  const handleDeleteClick = (member: StaffMember) => {
    setMemberToDelete(member);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    try {
      const staffDocRef = doc(db, 'USERS', USER_ID, 'staff', memberToDelete.id);
      await deleteDoc(staffDocRef);

      // If the member was an engineer, also delete from engineers collection
      if (memberToDelete.role === 'Engineer') {
        const engineerDocRef = doc(db, 'USERS', USER_ID, 'engineers', memberToDelete.id);
        await deleteDoc(engineerDocRef);
      }

      setStaffMembers(prev => prev.filter(member => member.id !== memberToDelete.id));
      setSuccess('Staff member deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting staff member:', err);
      setError('Failed to delete staff member. Please try again.');
    } finally {
      setDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const handleInputChange = (field: keyof Omit<StaffMember, 'id'>, value: string) => {
    setFormData(prev => ({
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
              {/* Header with Add Button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
                {!isAdding && !editingId && (
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Staff Member
                  </button>
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

              {/* Add/Edit Form */}
              {(isAdding || editingId) && (
                <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter name"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter address"
                      />
                    </div>

                    {/* Mobile */}
                    <div>
                      <label htmlFor="mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                        Mobile
                      </label>
                      <input
                        type="tel"
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => handleInputChange('mobile', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter mobile number"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {allRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Role (shown when Other is selected) */}
                    {formData.role === 'Other' && (
                      <div>
                        <label htmlFor="customRole" className="block text-sm font-semibold text-gray-700 mb-2">
                          Specify Role <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="customRole"
                          value={formData.customRole}
                          onChange={(e) => handleInputChange('customRole', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter custom role"
                        />
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-2 mt-6">
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
                </div>
              )}

              {/* Search and Filter */}
              {!isAdding && !editingId && staffMembers.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search Field */}
                  <div>
                    <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search by name, email, phone, address, role..."
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label htmlFor="roleFilter" className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Role
                    </label>
                    <select
                      id="roleFilter"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Roles</option>
                      {allRoles.filter((r) => r !== 'Other').map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Staff Members List */}
              {filteredStaffMembers.length === 0 && !isAdding && !editingId && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {staffMembers.length === 0 ? 'No staff members yet' : 'No matching staff members'}
                  </h3>
                  <p className="text-gray-600">
                    {staffMembers.length === 0 
                      ? 'Click "Add Staff Member" to get started'
                      : 'Try adjusting your search or filter criteria'}
                  </p>
                </div>
              )}
              
              {!isAdding && !editingId && filteredStaffMembers.length > 0 && (
                <div className="space-y-4">
                  {filteredStaffMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              {member.role === 'Other' && member.customRole ? member.customRole : member.role}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {member.email && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-700">{member.email}</span>
                              </div>
                            )}
                            
                            {member.mobile && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-gray-700">{member.mobile}</span>
                              </div>
                            )}
                            
                            {member.address && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-gray-700">{member.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(member)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        message={`Are you sure you want to delete ${memberToDelete?.name}?`}
      />

      {/* Save Custom Role Prompt Modal */}
      {showSaveRolePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Save Custom Role?</h2>
            </div>

            <p className="text-gray-700 mb-8 text-lg">
              Would you like to save "{pendingSaveData?.formData.customRole}" as a custom role for future use?
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleSaveRoleNo}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors text-lg disabled:opacity-50"
              >
                NO
              </button>
              <button
                onClick={handleSaveRoleYes}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg disabled:opacity-50"
              >
                {saving ? 'SAVING...' : 'YES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}