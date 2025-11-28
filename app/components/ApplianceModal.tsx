'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, collection, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import ContactSelectModal from './ContactSelectModal';

export interface Appliance {
    id?: string;
    // Appliance Info
    location: string;
    type: string;
    manufacturer: string;
    model: string;
    nominalOutput: number | '';
    fuelType: string;
    serialNumber: string;
    installDate: string;
    installedBy: string;

    // Technical Details
    defaultSweepingMethod: string;
    flueType: string;
    flueSize: number | '';
    cowlType: string;
    conditionOfStack: string;
    ventilationPresent: boolean;
    coAlarmPresent: boolean;

    // Service & Visits
    serviceFrequency: string;
    lastVisited: string;
    serviceCharge: string;

    // Notes
    notes: string;

    // Pictures
    imageUrls: string[];

    // Linked Landlord/Business
    linkedContactId?: string;
    linkedContactName?: string;
}

interface ApplianceModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactId: string;
    userId: string;
    applianceData?: Appliance;
    onSave: () => void;
}

export default function ApplianceModal({
    isOpen,
    onClose,
    contactId,
    userId,
    applianceData,
    onSave,
}: ApplianceModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('info');

    // Form State
    const [formData, setFormData] = useState<Appliance>({
        location: '',
        type: '',
        manufacturer: '',
        model: '',
        nominalOutput: '',
        fuelType: '',
        serialNumber: '',
        installDate: '',
        installedBy: '',
        defaultSweepingMethod: '',
        flueType: '',
        flueSize: '',
        cowlType: '',
        conditionOfStack: '',
        ventilationPresent: false,
        coAlarmPresent: false,
        serviceFrequency: '12',
        lastVisited: '',
        serviceCharge: '',
        notes: '',
        imageUrls: [],
    });

    // Image Upload State
    const [uploadingImage, setUploadingImage] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Contact Select Modal
    const [showContactSelect, setShowContactSelect] = useState(false);

    // Initialize form data when editing
    useEffect(() => {
        if (applianceData) {
            setFormData({
                ...applianceData,
                // Ensure defaults for missing fields
                imageUrls: applianceData.imageUrls || [],
                ventilationPresent: applianceData.ventilationPresent || false,
                coAlarmPresent: applianceData.coAlarmPresent || false,
            });
        } else {
            // Reset form
            setFormData({
                location: '',
                type: '',
                manufacturer: '',
                model: '',
                nominalOutput: '',
                fuelType: '',
                serialNumber: '',
                installDate: '',
                installedBy: '',
                defaultSweepingMethod: '',
                flueType: '',
                flueSize: '',
                cowlType: '',
                conditionOfStack: '',
                ventilationPresent: false,
                coAlarmPresent: false,
                serviceFrequency: '12',
                lastVisited: '',
                serviceCharge: '',
                notes: '',
                imageUrls: [],
            });
        }
    }, [applianceData, isOpen]);

    const handleChange = (field: keyof Appliance, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            await processImageFile(file);
        }
    };

    const processImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        setUploadingImage(true);
        setError('');

        try {
            // Upload to Firebase Storage
            // Path: users/{userId}/contacts/{contactId}/appliances/{timestamp}_{filename}
            const storageRef = ref(storage, `${userId}/contacts/${contactId}/appliances/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setFormData((prev) => ({
                ...prev,
                imageUrls: [...prev.imageUrls, downloadURL],
            }));
        } catch (err) {
            console.error('Error uploading image:', err);
            setError('Failed to upload image');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            await processImageFile(file);
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, i) => i !== index),
        }));
    };

    const handleContactSelect = (contact: any) => {
        setFormData((prev) => ({
            ...prev,
            linkedContactId: contact.id,
            linkedContactName: contact.name || contact.company,
        }));
        setShowContactSelect(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (applianceData?.id) {
                // Update existing
                const docRef = doc(db, 'USERS', userId, 'contacts', contactId, 'appliances', applianceData.id);
                await updateDoc(docRef, { ...formData });
            } else {
                // Create new
                const colRef = collection(db, 'USERS', userId, 'contacts', contactId, 'appliances');
                await addDoc(colRef, {
                    ...formData,
                    createdAt: new Date().toISOString(),
                });
            }
            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving appliance:', err);
            setError('Failed to save appliance');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {applianceData ? 'Edit Appliance' : 'Add New Appliance'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        className={`py-4 px-6 font-semibold border-b-2 transition-colors ${activeTab === 'info' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Appliance Info
                    </button>
                    <button
                        className={`py-4 px-6 font-semibold border-b-2 transition-colors ${activeTab === 'technical' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('technical')}
                    >
                        Technical Details
                    </button>
                    <button
                        className={`py-4 px-6 font-semibold border-b-2 transition-colors ${activeTab === 'service' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('service')}
                    >
                        Service & Visits
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                            {error}
                        </div>
                    )}

                    <form id="appliance-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Appliance Info Tab */}
                        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        placeholder="e.g. Living Room"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Stove">Stove</option>
                                        <option value="Open Fire">Open Fire</option>
                                        <option value="Boiler">Boiler</option>
                                        <option value="Cooker">Cooker</option>
                                        <option value="Pellet">Pellet</option>
                                        <option value="Gas">Gas</option>
                                        <option value="Oil">Oil</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                                    <input
                                        type="text"
                                        value={formData.manufacturer}
                                        onChange={(e) => handleChange('manufacturer', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                                    <input
                                        type="text"
                                        value={formData.model}
                                        onChange={(e) => handleChange('model', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Output (kW)</label>
                                    <input
                                        type="number"
                                        value={formData.nominalOutput}
                                        onChange={(e) => handleChange('nominalOutput', e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                                    <select
                                        value={formData.fuelType}
                                        onChange={(e) => handleChange('fuelType', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="">Select Fuel</option>
                                        <option value="Wood">Wood</option>
                                        <option value="Coal">Coal</option>
                                        <option value="Biomass">Biomass</option>
                                        <option value="S Fuel">S Fuel</option>
                                        <option value="Oil">Oil</option>
                                        <option value="Gas">Gas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                                    <input
                                        type="text"
                                        value={formData.serialNumber}
                                        onChange={(e) => handleChange('serialNumber', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Install Date</label>
                                    <input
                                        type="date"
                                        value={formData.installDate}
                                        onChange={(e) => handleChange('installDate', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Installed By</label>
                                    <input
                                        type="text"
                                        value={formData.installedBy}
                                        onChange={(e) => handleChange('installedBy', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Linked Landlord/Business */}
                            <div className="mt-8 border-t pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Linked Landlord / Business</h3>
                                <div className="flex items-center gap-4">
                                    {formData.linkedContactName ? (
                                        <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center">
                                            <span className="font-medium text-gray-900">{formData.linkedContactName}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, linkedContactId: undefined, linkedContactName: undefined }))}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 text-gray-500 italic">No linked contact selected</div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowContactSelect(true)}
                                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition-colors"
                                    >
                                        Select Contact
                                    </button>
                                </div>
                            </div>

                            {/* Pictures */}
                            <div className="mt-8 border-t pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pictures</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    {formData.imageUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={url} alt={`Appliance ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-gray-500 transition-all cursor-pointer ${dragOver
                                                ? 'border-green-500 bg-green-50 text-green-600'
                                                : uploadingImage
                                                    ? 'border-gray-300 bg-gray-50'
                                                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50 hover:text-green-600'
                                            }`}
                                    >
                                        {uploadingImage ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                                        ) : (
                                            <>
                                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span className="text-sm font-medium text-center px-2">
                                                    {dragOver ? 'Drop Photo' : 'Add Photo'}
                                                </span>
                                                {!dragOver && (
                                                    <span className="text-xs text-gray-400 mt-1">Drag & Drop</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Technical Details Tab */}
                        <div className={activeTab === 'technical' ? 'block' : 'hidden'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Sweeping Method</label>
                                    <select
                                        value={formData.defaultSweepingMethod}
                                        onChange={(e) => handleChange('defaultSweepingMethod', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="">Select Method</option>
                                        <option value="Brush & Rods">Brush & Rods</option>
                                        <option value="Line Weight">Line Weight</option>
                                        <option value="Rotary Power">Rotary Power</option>
                                        <option value="Viper Star">Viper Star</option>
                                        <option value="Not Swept">Not Swept</option>
                                        <option value="Pre-Install">Pre-Install</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Flue Type</label>
                                    <select
                                        value={formData.flueType}
                                        onChange={(e) => handleChange('flueType', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Masonry">Masonry</option>
                                        <option value="Flex liner">Flex liner</option>
                                        <option value="Twin wall">Twin wall</option>
                                        <option value="Pumice">Pumice</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Flue Size (mm)</label>
                                    <input
                                        type="number"
                                        value={formData.flueSize}
                                        onChange={(e) => handleChange('flueSize', e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cowl Type</label>
                                    <select
                                        value={formData.cowlType}
                                        onChange={(e) => handleChange('cowlType', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Standard pot">Standard pot</option>
                                        <option value="Bird guard">Bird guard</option>
                                        <option value="Anti-downdraught">Anti-downdraught</option>
                                        <option value="Rain cap">Rain cap</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition of Stack</label>
                                    <input
                                        type="text"
                                        value={formData.conditionOfStack}
                                        onChange={(e) => handleChange('conditionOfStack', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        placeholder="e.g. Good, Fair, Poor"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.ventilationPresent}
                                            onChange={(e) => handleChange('ventilationPresent', e.target.checked)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className="text-gray-700 font-medium">Ventilation Present</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.coAlarmPresent}
                                            onChange={(e) => handleChange('coAlarmPresent', e.target.checked)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className="text-gray-700 font-medium">CO Alarm Present</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Service & Visits Tab */}
                        <div className={activeTab === 'service' ? 'block' : 'hidden'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service / Sweep Frequency (Months)</label>
                                    <select
                                        value={formData.serviceFrequency}
                                        onChange={(e) => handleChange('serviceFrequency', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="3">3 Months</option>
                                        <option value="6">6 Months</option>
                                        <option value="12">12 Months</option>
                                        <option value="24">24 Months</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Visited</label>
                                    <input
                                        type="date"
                                        value={formData.lastVisited}
                                        onChange={(e) => handleChange('lastVisited', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500 font-medium">£</span>
                                        <input
                                            type="text"
                                            value={formData.serviceCharge}
                                            onChange={(e) => handleChange('serviceCharge', e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            placeholder="60.00"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
                                    <textarea
                                        rows={4}
                                        value={formData.notes}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        placeholder="Add any notes about this appliance..."
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="appliance-form"
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            'Save Appliance'
                        )}
                    </button>
                </div>
            </div>

            {/* Contact Select Modal */}
            <ContactSelectModal
                isOpen={showContactSelect}
                onClose={() => setShowContactSelect(false)}
                onSelect={handleContactSelect}
            />
        </div>
    );
}
