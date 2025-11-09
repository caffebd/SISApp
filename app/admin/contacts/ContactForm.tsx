'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CompanyLookupModal from '../../components/CompanyLookupModal';
import DirectorSelectModal from '../../components/DirectorSelectModal';
import { CompanySearchResult, Officer } from '../../../lib/companiesHouse';

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || '1snBR67qkJQfZ68FoDAcM4GY8Qw2';

interface Contact {
  id?: string;
  name: string;
  company: string;
  title: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  country: string;
  postcode: string;
  address_1: string;
  address_2: string;
  town: string;
  county: string;
  type: string;
  status: string;
  disableCommunication: boolean;
}

interface ContactFormProps {
  isEdit: boolean;
  contactData?: Contact;
}

export default function ContactForm({ isEdit, contactData }: ContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [appointmentIdToLink, setAppointmentIdToLink] = useState<string | null>(null);
  const [oldContactIdToUnlink, setOldContactIdToUnlink] = useState<string | null>(null);

  // Company lookup modals
  const [showCompanyLookup, setShowCompanyLookup] = useState(false);
  const [showDirectorSelect, setShowDirectorSelect] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);

  // Customer Status
  const [customerStatus, setCustomerStatus] = useState('Normal');
  
  // Contact Type (Customer/Supplier)
  const [isCustomer, setIsCustomer] = useState(true);
  const [isSupplier, setIsSupplier] = useState(false);

  // Contact Details
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Address
  const [country, setCountry] = useState('UNITED KINGDOM');
  const [postcode, setPostcode] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [town, setTown] = useState('');
  const [county, setCounty] = useState('');

  // Communication
  const [disableCommunication, setDisableCommunication] = useState(false);

  // Parse name and extract title
  const parseNameWithTitle = (fullName: string) => {
    const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
    const nameParts = fullName.trim().split(/\s+/);
    
    let extractedTitle = '';
    let firstName = '';
    let lastName = '';
    
    // Check if first part is a title
    if (nameParts.length > 0) {
      const firstPart = nameParts[0];
      const matchedTitle = titles.find(t => 
        firstPart.toLowerCase() === t.toLowerCase() || 
        firstPart.toLowerCase() === t.toLowerCase() + '.'
      );
      
      if (matchedTitle) {
        extractedTitle = matchedTitle;
        nameParts.shift(); // Remove title from array
      }
    }
    
    // Split remaining parts into first and last name
    if (nameParts.length === 1) {
      firstName = nameParts[0];
    } else if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }
    
    return { title: extractedTitle, firstName, lastName };
  };

  // Populate form from URL parameters (from appointment)
  const searchParams = useSearchParams();
  useEffect(() => {
    const fromAppointment = searchParams.get('fromAppointment');
    
    if (fromAppointment === 'true') {
      const name = searchParams.get('name');
      const address = searchParams.get('address');
      const postcode = searchParams.get('postcode');
      const email = searchParams.get('email');
      const phone = searchParams.get('phone');
      const appointmentId = searchParams.get('appointmentId');
      const oldContactId = searchParams.get('oldContactId');
      
      // Store appointment ID to link after creation
      if (appointmentId) {
        setAppointmentIdToLink(appointmentId);
      }
      
      // Store old contact ID to unlink
      if (oldContactId) {
        setOldContactIdToUnlink(oldContactId);
      }
      
      // Parse name with title
      if (name) {
        const { title: parsedTitle, firstName: parsedFirstName, lastName: parsedLastName } = parseNameWithTitle(name);
        setTitle(parsedTitle);
        setFirstName(parsedFirstName);
        setLastName(parsedLastName);
      }
      
      if (address) setAddress1(address);
      if (postcode) setPostcode(postcode);
      if (email) setEmail(email);
      if (phone) setMobile(phone);
      
      // Auto-select Customer type
      setIsCustomer(true);
      setIsSupplier(false);
    }
  }, [searchParams]);

  // Populate form if editing
  useEffect(() => {
    if (isEdit && contactData) {
      setCustomerStatus(contactData.status.charAt(0).toUpperCase() + contactData.status.slice(1));
      setIsCustomer(contactData.type === 'customer');
      setIsSupplier(contactData.type === 'supplier');
      setCompany(contactData.company || '');
      setTitle(contactData.title || '');
      setFirstName(contactData.firstName || '');
      setLastName(contactData.lastName || '');
      setMobile(contactData.mobile || '');
      setEmail(contactData.email || '');
      setCountry(contactData.country || 'UNITED KINGDOM');
      setPostcode(contactData.postcode || '');
      setAddress1(contactData.address_1 || '');
      setAddress2(contactData.address_2 || '');
      setTown(contactData.town || '');
      setCounty(contactData.county || '');
      setDisableCommunication(contactData.disableCommunication || false);
    }
  }, [isEdit, contactData]);

  const handleCustomerToggle = () => {
    if (!isCustomer) {
      setIsCustomer(true);
      setIsSupplier(false);
    }
  };

  const handleSupplierToggle = () => {
    if (!isSupplier) {
      setIsSupplier(true);
      setIsCustomer(false);
    }
  };

  const handleCompanyLookupClick = () => {
    setShowCompanyLookup(true);
  };

  const handleCompanySelect = (company: CompanySearchResult) => {
    setSelectedCompany(company);
    setCompany(company.title || '');
    
    // Set address from company
    if (company.registered_office_address) {
      const addr = company.registered_office_address;
      setAddress1(addr.address_line_1 || '');
      setAddress2(addr.address_line_2 || '');
      setTown(addr.locality || '');
      setPostcode(addr.postal_code || '');
      setCounty(addr.region || '');
      setCountry(addr.country || 'UNITED KINGDOM');
    }
    
    setShowCompanyLookup(false);
    setShowDirectorSelect(true);
  };

  const handleDirectorSelect = (officer: Officer) => {
    // Store company name before processing officer data
    const companyNameToKeep = selectedCompany?.title || company;
    console.log('🔍 Director selected:', officer.name);
    console.log('🏢 Company name to keep:', companyNameToKeep);
    console.log('📦 Selected company object:', selectedCompany);
    
    // Parse the director's name first
    if (officer.name) {
      const nameParts = officer.name.split(',').map(s => s.trim());
      
      if (nameParts.length >= 2) {
        // Format is usually "SURNAME, Firstname [Title]"
        const surname = nameParts[0];
        const firstNamePart = nameParts[1];
        
        // Extract title if present
        const titleMatch = firstNamePart.match(/\b(Mr|Mrs|Miss|Ms|Dr|Prof)\b/i);
        if (titleMatch) {
          setTitle(titleMatch[0]);
          setFirstName(firstNamePart.replace(titleMatch[0], '').trim());
        } else {
          setFirstName(firstNamePart);
        }
        
        setLastName(surname);
      } else {
        // Just set the full name
        setFirstName(officer.name);
      }

      // If director has a different address, update it
      if (officer.address) {
        const addr = officer.address;
        if (addr.address_line_1) setAddress1(addr.address_line_1);
        if (addr.address_line_2) setAddress2(addr.address_line_2 || '');
        if (addr.locality) setTown(addr.locality);
        if (addr.postal_code) setPostcode(addr.postal_code);
        if (addr.region) setCounty(addr.region || '');
        if (addr.country) setCountry(addr.country || 'UNITED KINGDOM');
      }
    }
    
    // CRITICAL: Set company name LAST to ensure it's not overwritten
    if (companyNameToKeep) {
      console.log('✅ Setting company name to:', companyNameToKeep);
      setCompany(companyNameToKeep);
    }
    
    setShowDirectorSelect(false);
  };

  const handleBackToCompanyList = () => {
    setShowDirectorSelect(false);
    setShowCompanyLookup(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Build the contact name
      const nameParts = [title, firstName, lastName].filter(Boolean);
      const fullName = nameParts.length > 0 ? nameParts.join(' ') : company;

      if (!fullName) {
        setError('Please provide at least a name or company name');
        setIsSubmitting(false);
        return;
      }

      // Prepare contact data
      const contactPayload = {
        name: fullName,
        company,
        title,
        firstName,
        lastName,
        mobile,
        email,
        country,
        postcode,
        address_1: address1,
        address_2: address2,
        town,
        county,
        type: isCustomer ? 'customer' : 'supplier',
        status: customerStatus.toLowerCase(),
        disableCommunication,
        updatedAt: new Date().toISOString(),
      };

      if (isEdit && contactData?.id) {
        // Update existing contact
        const contactRef = doc(db, 'USERS', USER_ID, 'contacts', contactData.id);
        await updateDoc(contactRef, contactPayload);
        
        // Redirect back to contacts page
        router.push('/admin/contacts');
      } else {
        // Add new contact
        const contactsRef = collection(db, 'USERS', USER_ID, 'contacts');
        const docRef = await addDoc(contactsRef, {
          ...contactPayload,
          createdAt: new Date().toISOString(),
          // Add appointment ID if coming from appointment
          ...(appointmentIdToLink ? { appointmentIds: [appointmentIdToLink] } : {}),
        });

        // If there was an old contact, remove the appointment from it
        if (oldContactIdToUnlink && appointmentIdToLink) {
          try {
            const oldContactRef = doc(db, 'USERS', USER_ID, 'contacts', oldContactIdToUnlink);
            await updateDoc(oldContactRef, {
              appointmentIds: arrayRemove(appointmentIdToLink),
              updatedAt: new Date().toISOString(),
            });
            console.log('Removed appointment from old contact:', oldContactIdToUnlink);
          } catch (err) {
            console.error('Error removing appointment from old contact:', err);
            // Continue anyway - the new contact is created
          }
        }

        // If created from appointment, redirect back to appointment details
        if (appointmentIdToLink) {
          router.push(`/admin/appointments/${appointmentIdToLink}`);
        } else {
          // Otherwise redirect to contacts page
          router.push('/admin/contacts');
        }
      }
    } catch (err) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/contacts"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contacts
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900">
            {isEdit ? 'Edit Contact' : 'Add New Contact'}
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Contact */}
            <div className="space-y-6">
              {/* Customer Status & Communication */}
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-green-600 mb-4">Customer Status</h2>
                    <select
                      value={customerStatus}
                      onChange={(e) => setCustomerStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Risky">Risky</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>

                  {/* Communication Section */}
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-green-600 mb-4">Communication</h2>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={disableCommunication}
                          onChange={(e) => setDisableCommunication(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                      </div>
                      <span className="text-sm text-gray-700">Disable all communication</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
                <h2 className="text-lg font-bold text-green-600 mb-4">Contact</h2>

                {/* Customer/Supplier Toggles */}
                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={handleCustomerToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      isCustomer
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isCustomer ? 'border-white bg-white' : 'border-gray-400'
                    }`}>
                      {isCustomer && (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    Customer
                  </button>

                  <button
                    type="button"
                    onClick={handleSupplierToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      isSupplier
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSupplier ? 'border-white bg-white' : 'border-gray-400'
                    }`}>
                      {isSupplier && (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    Supplier
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-600 mb-1">
                      Company (optional if Name is given) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCompanyLookupClick();
                          }
                        }}
                        placeholder="Type Here"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={handleCompanyLookupClick}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                        title="Search Companies House"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Title (e.g. Mr, Mrs, ...)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Type here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      First Name (optional) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Type Here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Last Name (optional) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Type Here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Mobile (SMS)
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Type Here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Type Here"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Address */}
            <div>
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
                <h2 className="text-lg font-bold text-green-600 mb-4">Address</h2>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-700">
                    Plots within an address can be used for caravan/chalet locations, building plots and flat numbers within a block etc.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    >
                      <option value="UNITED KINGDOM">UNITED KINGDOM</option>
                      <option value="Ireland">Ireland</option>
                      <option value="France">France</option>
                      <option value="Germany">Germany</option>
                      <option value="Spain">Spain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Postcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                        placeholder=""
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Address line 1
                    </label>
                    <input
                      type="text"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Address line 2
                    </label>
                    <input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Town/City
                    </label>
                    <input
                      type="text"
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end gap-4">
            <Link
              href="/admin/contacts"
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Contact' : 'Create Contact')}
            </button>
          </div>
        </form>

        {/* Company Lookup Modal */}
        <CompanyLookupModal
          isOpen={showCompanyLookup}
          onClose={() => setShowCompanyLookup(false)}
          onSelectCompany={handleCompanySelect}
          initialQuery={company}
        />

        {/* Director Select Modal */}
        <DirectorSelectModal
          isOpen={showDirectorSelect}
          onClose={() => setShowDirectorSelect(false)}
          onSelectDirector={handleDirectorSelect}
          company={selectedCompany}
          onBackToCompanyList={handleBackToCompanyList}
        />
      </div>
    </div>
  );
}
