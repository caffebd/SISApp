"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../../../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import CertificateFormRenderer from "../../../../../components/CertificateFormRenderer";
import type { FormElement } from "../../../../../components/CertificateBuilderTypes";
import ApplianceModal, {
  Appliance,
} from "../../../../../components/ApplianceModal";
import SignatureModal from "../../../../../components/SignatureModal";
import standardCertificates from "../../../../../../data/certificates/standard";

const USER_ID =
  process.env.NEXT_PUBLIC_USER_ID || "1snBR67qkJQfZ68FoDAcM4GY8Qw2";

interface CertificateTemplate {
  id: string;
  name: string;
  elements: FormElement[];
  isStandard?: boolean;
}

interface Contact {
  id: string;
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
}

interface CertificateData {
  customerName: string;
  customerAddress: string;
  customerPostcode: string;
  customerTelephone: string;
  customerEmail: string;
  selectedApplianceId: string;
  selectedApplianceData: Appliance | null;
  applianceLocation: string;
  applianceType: string;
  applianceManufacturer: string;
  applianceModel: string;
  applianceFuelType: string;
}

function IssueCertificatePageContent() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    CertificateTemplate[]
  >([]);
  const [standardTemplates, setStandardTemplates] = useState<
    CertificateTemplate[]
  >([]);
  const [userTemplates, setUserTemplates] = useState<CertificateTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<CertificateTemplate | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [showApplianceModal, setShowApplianceModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<
    "engineer" | "customer" | null
  >(null);
  const [engineerSignature, setEngineerSignature] = useState<{
    data: string;
    type: "drawn" | "typed";
  } | null>(null);
  const [customerSignature, setCustomerSignature] = useState<{
    data: string;
    type: "drawn" | "typed";
  } | null>(null);

  // Certificate data
  const [certificateData, setCertificateData] = useState<CertificateData>({
    customerName: "",
    customerAddress: "",
    customerPostcode: "",
    customerTelephone: "",
    customerEmail: "",
    selectedApplianceId: "",
    selectedApplianceData: null,
    applianceLocation: "",
    applianceType: "",
    applianceManufacturer: "",
    applianceModel: "",
    applianceFuelType: "",
  });

  // Certificate form field values
  const [certificateFields, setCertificateFields] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        await Promise.all([
          fetchTemplates(user.uid),
          fetchContact(),
          fetchAppliances(),
        ]);
      } else {
        router.push("/admin");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, contactId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
      // Split templates into standard and user-created
      setStandardTemplates(templates.filter((t) => t.isStandard === true));
      setUserTemplates(templates.filter((t) => !t.isStandard));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(term),
      );
      setFilteredTemplates(filtered);
      // Split filtered templates
      setStandardTemplates(filtered.filter((t) => t.isStandard === true));
      setUserTemplates(filtered.filter((t) => !t.isStandard));
    }
  }, [searchTerm, templates]);

  // Auto-populate customer details when contact is loaded
  useEffect(() => {
    if (contact) {
      const addressParts = [
        contact.address_1,
        contact.address_2,
        contact.town,
        contact.county,
      ].filter(Boolean);

      setCertificateData((prev) => ({
        ...prev,
        customerName: contact.name || "",
        customerAddress: addressParts.join(", "),
        customerPostcode: contact.postcode || "",
        customerTelephone: contact.mobile || "",
        customerEmail: contact.email || "",
      }));
    }
  }, [contact]);

  const fetchContact = async () => {
    if (!contactId) return;
    try {
      const contactRef = doc(db, "USERS", USER_ID, "contacts", contactId);
      const contactDoc = await getDoc(contactRef);
      if (contactDoc.exists()) {
        setContact({
          id: contactDoc.id,
          ...contactDoc.data(),
        } as Contact);
      }
    } catch (error) {
      console.error("Error fetching contact:", error);
    }
  };

  const fetchAppliances = async () => {
    if (!contactId) return;
    try {
      const appliancesRef = collection(
        db,
        "USERS",
        USER_ID,
        "contacts",
        contactId,
        "appliances",
      );
      const q = query(appliancesRef);
      const snapshot = await getDocs(q);
      const loadedAppliances = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Appliance,
      );
      setAppliances(loadedAppliances);
    } catch (err) {
      console.error("Error fetching appliances:", err);
    }
  };

  const fetchTemplates = async (uid: string) => {
    try {
      // Load user templates from Firebase
      const templatesRef = collection(db, "USERS", uid, "Certificates");
      const q = query(templatesRef, orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      const userTemplatesList: CertificateTemplate[] = snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          name: doc.data().name || "Untitled",
          elements: doc.data().elements || [],
          isStandard: false,
        }),
      );

      // Combine standard certificates with user templates
      const allTemplates = [
        ...standardCertificates.map((cert) => ({
          id: cert.id,
          name: cert.name,
          elements: cert.elements as FormElement[],
          isStandard: true,
        })),
        ...userTemplatesList,
      ];

      setTemplates(allTemplates);
      setFilteredTemplates(allTemplates);
    } catch (error) {
      console.error("Error fetching certificate templates:", error);
    }
  };

  const handleApplianceSelect = (applianceId: string) => {
    const appliance = appliances.find((a) => a.id === applianceId);
    if (appliance) {
      setCertificateData((prev) => ({
        ...prev,
        selectedApplianceId: applianceId,
        selectedApplianceData: appliance, // Store complete appliance object
        applianceLocation: appliance.location || "",
        applianceType: appliance.type || "",
        applianceManufacturer: appliance.manufacturer || "",
        applianceModel: appliance.model || "",
        applianceFuelType: appliance.fuelType || "",
      }));
    } else {
      setCertificateData((prev) => ({
        ...prev,
        selectedApplianceId: "",
        selectedApplianceData: null,
        applianceLocation: "",
        applianceType: "",
        applianceManufacturer: "",
        applianceModel: "",
        applianceFuelType: "",
      }));
    }
  };

  const handleApplianceSaved = () => {
    fetchAppliances();
  };

  const handleSignatureSave = (
    signatureData: string,
    signatureType: "drawn" | "typed",
  ) => {
    if (signatureTarget === "engineer") {
      setEngineerSignature({ data: signatureData, type: signatureType });
    } else if (signatureTarget === "customer") {
      setCustomerSignature({ data: signatureData, type: signatureType });
    }
    setShowSignatureModal(false);
    setSignatureTarget(null);
  };

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const generateCertificateName = (): string => {
    if (!selectedTemplate) return "";

    const templateName = selectedTemplate.name;
    const today = formatDate(new Date());

    if (certificateData.selectedApplianceId) {
      const appliance = appliances.find(
        (a) => a.id === certificateData.selectedApplianceId,
      );
      if (appliance) {
        const applianceDetails = `${appliance.location} - ${appliance.type} (${appliance.manufacturer} ${appliance.model})`;
        return `${templateName} ${applianceDetails} - ${today}`;
      }
    }

    return `${templateName} - ${today}`;
  };

  const handleSaveCertificate = async () => {
    if (!selectedTemplate || !userId || !contactId) {
      alert("Missing required information");
      return;
    }

    // Validate customer details
    if (!certificateData.customerName.trim()) {
      alert("Please enter a customer name");
      return;
    }

    setSaving(true);

    try {
      const certificateName = generateCertificateName();

      // Convert certificateFields object to array format matching template elements
      const fieldsArray = selectedTemplate.elements.map((element) => ({
        ...element,
        value: certificateFields[element.id] || "",
      }));

      // Prepare the certificate data to save
      const certificateToSave = {
        name: certificateName,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        contactId: contactId,

        // Customer Details (preserved as entered)
        customer: {
          name: certificateData.customerName,
          address: certificateData.customerAddress,
          postcode: certificateData.customerPostcode,
          telephone: certificateData.customerTelephone,
          email: certificateData.customerEmail,
        },

        // Appliance Details (ALL fields preserved as they were at time of issuance)
        // This includes any editable fields that were modified, plus all original data
        appliance: certificateData.selectedApplianceData
          ? {
              // Save the COMPLETE appliance object with all fields
              ...certificateData.selectedApplianceData,
              // Override with any edited fields from the form
              location: certificateData.applianceLocation,
              type: certificateData.applianceType,
              fuelType: certificateData.applianceFuelType,
              // Note: manufacturer and model are read-only, so they stay as-is from selectedApplianceData
            }
          : null,

        // Track which appliance fields were visible during certificate creation
        // Only these fields should be displayed on the printed certificate
        visibleApplianceFields: certificateData.selectedApplianceData
          ? selectedTemplate.elements
              .filter(
                (el) =>
                  el.id === "appliance-location" ||
                  el.id === "appliance-type" ||
                  el.id === "appliance-manufacturer" ||
                  el.id === "appliance-model" ||
                  el.id === "fuel-type",
              )
              .map((el) => {
                // Map element IDs to appliance object property names
                if (el.id === "appliance-location") return "location";
                if (el.id === "appliance-type") return "type";
                if (el.id === "appliance-manufacturer") return "manufacturer";
                if (el.id === "appliance-model") return "model";
                if (el.id === "fuel-type") return "fuelType";
                return "";
              })
              .filter((field) => field !== "")
          : [],

        // Certificate form fields (with user's answers)
        fields: fieldsArray,

        // Signatures
        signatures: {
          engineer: engineerSignature,
          customer: customerSignature,
        },

        // Metadata
        status: "issued",
        issuedDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        createdBy: userId,
      };

      // Save to Firestore under the contact's issuedCertificates collection
      const issuedCertificatesRef = collection(
        db,
        "USERS",
        userId,
        "contacts",
        contactId,
        "issuedCertificates",
      );

      const docRef = await addDoc(issuedCertificatesRef, certificateToSave);

      // Navigate back to contact page with success
      router.push(`/admin/contacts/${contactId}?certificateSaved=true`);
    } catch (error) {
      console.error("Error saving certificate:", error);
      alert("Failed to save certificate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="py-8">
      <div className="max-w-[1800px] mx-auto px-4">
        <div className="mb-8">
          <Link
            href={`/admin/contacts/${contactId}`}
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Contact
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Issue Certificate
          </h1>
          <p className="text-gray-600">
            Select a certificate template and fill it out
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Templates */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-4">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  Certificate Templates
                </h2>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">
                    No templates found
                  </p>
                ) : (
                  <div>
                    {/* Standard Certificates Section */}
                    {standardTemplates.length > 0 && (
                      <div className="border-b">
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Standard Certificates
                          </h3>
                        </div>
                        <div className="divide-y">
                          {standardTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setSelectedTemplate(template)}
                              className={`w-full text-left p-4 hover:bg-green-50 transition-colors ${
                                selectedTemplate?.id === template.id
                                  ? "bg-green-50 border-l-4 border-green-600"
                                  : ""
                              }`}
                            >
                              <div className="font-medium text-gray-900">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {template.elements.length} field
                                {template.elements.length !== 1 ? "s" : ""}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* My Certificates Section */}
                    {userTemplates.length > 0 && (
                      <div>
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            My Certificates
                          </h3>
                        </div>
                        <div className="divide-y">
                          {userTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setSelectedTemplate(template)}
                              className={`w-full text-left p-4 hover:bg-green-50 transition-colors ${
                                selectedTemplate?.id === template.id
                                  ? "bg-green-50 border-l-4 border-green-600"
                                  : ""
                              }`}
                            >
                              <div className="font-medium text-gray-900">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {template.elements.length} field
                                {template.elements.length !== 1 ? "s" : ""}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Certificate Preview */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {selectedTemplate &&
              selectedTemplate.elements &&
              selectedTemplate.elements.length > 0 ? (
                <div className="space-y-6">
                  {/* Certificate Preview Header */}
                  <div className="p-6 border-b bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fill out the certificate fields below
                    </p>
                  </div>

                  {/* Customer Details Section */}
                  <div className="px-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Customer Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={certificateData.customerName}
                            onChange={(e) =>
                              setCertificateData((prev) => ({
                                ...prev,
                                customerName: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telephone
                          </label>
                          <input
                            type="text"
                            value={certificateData.customerTelephone}
                            onChange={(e) =>
                              setCertificateData((prev) => ({
                                ...prev,
                                customerTelephone: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={certificateData.customerAddress}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postcode
                          </label>
                          <input
                            type="text"
                            value={certificateData.customerPostcode}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={certificateData.customerEmail}
                            onChange={(e) =>
                              setCertificateData((prev) => ({
                                ...prev,
                                customerEmail: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appliance Details Section - Only show if certificate has appliance fields */}
                  {selectedTemplate.elements.some(
                    (el) =>
                      el.id.includes("appliance") ||
                      el.id.includes("fuel-type"),
                  ) && (
                    <div className="px-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                              />
                            </svg>
                            Appliance Details
                          </h3>
                          <button
                            onClick={() => setShowApplianceModal(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Add Appliance
                          </button>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Appliance
                          </label>
                          <select
                            value={certificateData.selectedApplianceId}
                            onChange={(e) =>
                              handleApplianceSelect(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">-- Select an appliance --</option>
                            {appliances.map((appliance) => (
                              <option key={appliance.id} value={appliance.id}>
                                {appliance.location} - {appliance.type} (
                                {appliance.manufacturer} {appliance.model})
                              </option>
                            ))}
                          </select>
                        </div>

                        {certificateData.selectedApplianceId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-green-300">
                            {selectedTemplate.elements.find(
                              (el) => el.id === "appliance-location",
                            ) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Appliance Location
                                </label>
                                <input
                                  type="text"
                                  value={certificateData.applianceLocation}
                                  onChange={(e) =>
                                    setCertificateData((prev) => ({
                                      ...prev,
                                      applianceLocation: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            )}
                            {selectedTemplate.elements.find(
                              (el) => el.id === "appliance-type",
                            ) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Appliance Type
                                </label>
                                <input
                                  type="text"
                                  value={certificateData.applianceType}
                                  onChange={(e) =>
                                    setCertificateData((prev) => ({
                                      ...prev,
                                      applianceType: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            )}
                            {selectedTemplate.elements.find(
                              (el) => el.id === "appliance-manufacturer",
                            ) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Manufacturer
                                </label>
                                <input
                                  type="text"
                                  value={certificateData.applianceManufacturer}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                              </div>
                            )}
                            {selectedTemplate.elements.find(
                              (el) => el.id === "appliance-model",
                            ) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Model
                                </label>
                                <input
                                  type="text"
                                  value={certificateData.applianceModel}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                              </div>
                            )}
                            {selectedTemplate.elements.find(
                              (el) => el.id === "fuel-type",
                            ) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Fuel Type
                                </label>
                                <input
                                  type="text"
                                  value={certificateData.applianceFuelType}
                                  onChange={(e) =>
                                    setCertificateData((prev) => ({
                                      ...prev,
                                      applianceFuelType: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certificate Form Fields - Filter out customer and appliance sections */}
                  <div className="px-6 pb-6">
                    <CertificateFormRenderer
                      elements={selectedTemplate.elements.filter((el) => {
                        // Filter out customer detail fields (Section A)
                        if (
                          el.id === "customer-name" ||
                          el.id === "customer-address" ||
                          el.id === "customer-postcode" ||
                          el.id === "customer-telephone" ||
                          el.id === "customer-email" ||
                          (el.id === "section-customer" &&
                            el.type === "text-header")
                        ) {
                          return false;
                        }
                        // Filter out appliance detail fields (Section B)
                        if (
                          el.id === "appliance-location" ||
                          el.id === "appliance-type" ||
                          el.id === "appliance-manufacturer" ||
                          el.id === "appliance-model" ||
                          el.id === "fuel-type" ||
                          (el.id === "section-appliance" &&
                            el.type === "text-header")
                        ) {
                          return false;
                        }
                        return true;
                      })}
                      values={certificateFields}
                      onChange={(elementId, value) => {
                        setCertificateFields((prev) => ({
                          ...prev,
                          [elementId]: value,
                        }));
                      }}
                    />

                    {/* Signature Section */}
                    <div className="mt-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Digital Signatures
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Engineer Signature */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Engineer Signature
                          </label>
                          {engineerSignature ? (
                            <div className="border-2 border-green-300 bg-white rounded-md p-4 relative">
                              {engineerSignature.type === "drawn" ? (
                                <img
                                  src={engineerSignature.data}
                                  alt="Engineer signature"
                                  className="max-h-24 mx-auto"
                                />
                              ) : (
                                <p
                                  className="text-2xl text-center"
                                  style={{ fontFamily: "cursive" }}
                                >
                                  {engineerSignature.data}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  setSignatureTarget("engineer");
                                  setShowSignatureModal(true);
                                }}
                                className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-700"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSignatureTarget("engineer");
                                setShowSignatureModal(true);
                              }}
                              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                            >
                              + Add Engineer Signature
                            </button>
                          )}
                        </div>

                        {/* Customer Signature */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Signature
                          </label>
                          {customerSignature ? (
                            <div className="border-2 border-green-300 bg-white rounded-md p-4 relative">
                              {customerSignature.type === "drawn" ? (
                                <img
                                  src={customerSignature.data}
                                  alt="Customer signature"
                                  className="max-h-24 mx-auto"
                                />
                              ) : (
                                <p
                                  className="text-2xl text-center"
                                  style={{ fontFamily: "cursive" }}
                                >
                                  {customerSignature.data}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  setSignatureTarget("customer");
                                  setShowSignatureModal(true);
                                }}
                                className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-700"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSignatureTarget("customer");
                                setShowSignatureModal(true);
                              }}
                              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                            >
                              + Add Customer Signature
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() =>
                          router.push(`/admin/contacts/${contactId}`)
                        }
                        className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCertificate}
                        disabled={saving}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Saving..." : "Save Certificate"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 text-gray-500">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-xl font-medium mb-2">
                    Select a Certificate Template
                  </p>
                  <p className="text-sm">
                    Choose a template from the left to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appliance Modal */}
      <ApplianceModal
        isOpen={showApplianceModal}
        onClose={() => setShowApplianceModal(false)}
        contactId={contactId}
        userId={userId}
        onSave={handleApplianceSaved}
      />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setSignatureTarget(null);
        }}
        onSave={handleSignatureSave}
      />
    </div>
  );
}

export default function IssueCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      }
    >
      <IssueCertificatePageContent />
    </Suspense>
  );
}
