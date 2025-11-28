"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../../../lib/firebase";
import Link from "next/link";
import type { FormElement } from "../../../../../components/CertificateBuilderTypes";
import { Appliance } from "../../../../../components/ApplianceModal";

const USER_ID =
  process.env.NEXT_PUBLIC_USER_ID || "1snBR67qkJQfZ68FoDAcM4GY8Qw2";

interface BusinessDetails {
  businessName: string;
  companyNumber: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  logoUrl?: string;
}

interface CertificateData {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  contactId: string;
  customer: {
    name: string;
    address: string;
    postcode: string;
    telephone: string;
    email: string;
  };
  appliance: Appliance | null;
  visibleApplianceFields?: string[]; // Track which appliance fields to display
  fields: FormElement[];
  signatures?: {
    engineer?: {
      data: string;
      type: "drawn" | "typed";
    } | null;
    customer?: {
      data: string;
      type: "drawn" | "typed";
    } | null;
  };
  status: string;
  issuedDate: string;
  createdAt: any;
  createdBy: string;
  isStandard?: boolean;
}

export default function CertificateViewerPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  const certificateId = params.certificateId as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [businessDetails, setBusinessDetails] =
    useState<BusinessDetails | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        await Promise.all([
          fetchCertificate(user.uid),
          fetchBusinessDetails(user.uid),
        ]);
      } else {
        router.push("/admin");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, contactId, certificateId]);

  const fetchCertificate = async (uid: string) => {
    try {
      const certRef = doc(
        db,
        "USERS",
        uid,
        "contacts",
        contactId,
        "issuedCertificates",
        certificateId,
      );
      const certSnap = await getDoc(certRef);

      if (certSnap.exists()) {
        setCertificate({
          id: certSnap.id,
          ...certSnap.data(),
        } as CertificateData);
      } else {
        console.error("Certificate not found");
      }
    } catch (error) {
      console.error("Error fetching certificate:", error);
    }
  };

  const fetchBusinessDetails = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "USERS", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBusinessDetails({
          businessName: data.businessName || "",
          companyNumber: data.companyNumber || "",
          businessAddress: data.businessAddress || "",
          businessPhone: data.businessPhone || "",
          businessEmail: data.businessEmail || "",
          logoUrl: data.logoUrl || "", // Logo URL from Firestore
        });
      }
    } catch (error) {
      console.error("Error fetching business details:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!userId || !contactId || !certificateId || !certificate) {
      alert("Missing required information");
      return;
    }

    setDownloading(true);
    try {
      // Call Cloud Function
      const generatePDF = httpsCallable(functions, "generateCertificatePDF");
      const result = await generatePDF({
        userId,
        contactId,
        certificateId,
      });

      const data = result.data as {
        success: boolean;
        pdf: string;
        filename: string;
      };

      if (data.success && data.pdf) {
        // Convert base64 to blob
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.filename || "certificate.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = () => {
    // TODO: Wire up email functionality
    alert("Email functionality coming soon!");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderFieldValue = (field: FormElement) => {
    const props = field.properties as any;

    switch (field.type) {
      // Legacy types from Certificate Builder
      case "textbox":
        return props.label || "";
      case "inputbox":
        return props.userInput || props.defaultValue || field.value || "";

      // Standard certificate types
      case "text-header":
        return null; // Headers are rendered separately
      case "text-input":
      case "text-area":
      case "date-input":
        return field.value || "";

      case "checkbox":
        const isChecked =
          props.userInput ?? props.defaultValue ?? field.value ?? false;
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 border-2 border-gray-700 ${isChecked ? "bg-gray-700" : "bg-white"}`}
            >
              {isChecked && (
                <svg
                  className="w-full h-full text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <span>{props.label}</span>
          </div>
        );
      case "dropdown":
        return props.userInput || props.defaultValue || field.value || "";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Certificate Not Found
          </h1>
          <Link
            href={`/admin/contacts/${contactId}`}
            className="text-green-600 hover:text-green-700 font-semibold"
          >
            Back to Contact
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Screen-only navigation and controls */}
      <div className="print:hidden bg-gray-100 py-4 px-6 border-b">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link
            href={`/admin/contacts/${contactId}`}
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
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

          <div className="flex gap-3">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
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
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className={`px-4 py-2 ${
                downloading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-semibold rounded-lg transition-colors flex items-center gap-2`}
            >
              {downloading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download
                </>
              )}
            </button>

            {/* Email Button */}
            <button
              onClick={handleEmail}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email
            </button>
          </div>
        </div>
      </div>

      {/* A4 Landscape Certificate */}
      <div className="print:p-0 bg-gray-100 min-h-screen py-8">
        <div className="certificate-page mx-auto bg-white shadow-lg print:shadow-none">
          {/* Certificate Content */}
          <div className="p-4 print:p-4">
            {/* Header - Certificate Type */}
            <div className="text-center mb-2 pb-1 border-b-2 border-gray-800">
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                {certificate.templateName}
              </h1>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Certificate Reference: {certificate.name} | Issue Date:{" "}
                {formatDate(certificate.issuedDate)}
              </p>
            </div>

            {/* Business, Customer & Appliance in compact layout */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Business Details */}
              <div className="border border-gray-300 rounded p-2">
                <h2 className="text-[11px] font-bold text-gray-900 mb-1 border-b border-gray-200 pb-0.5">
                  Business Details
                </h2>
                {businessDetails?.logoUrl && (
                  <div className="mb-1">
                    <img
                      src={businessDetails.logoUrl}
                      alt="Business Logo"
                      className="h-8 object-contain"
                    />
                  </div>
                )}
                <div className="space-y-0.5 text-[10px]">
                  <p className="font-bold text-gray-900">
                    {businessDetails?.businessName}
                  </p>
                  {businessDetails?.companyNumber && (
                    <p className="text-gray-700">
                      Company No: {businessDetails.companyNumber}
                    </p>
                  )}
                  <p className="text-gray-700 whitespace-pre-line">
                    {businessDetails?.businessAddress}
                  </p>
                  <p className="text-gray-700">
                    {businessDetails?.businessPhone}
                  </p>
                  <p className="text-gray-700">
                    {businessDetails?.businessEmail}
                  </p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="border border-gray-300 rounded p-2">
                <h2 className="text-[11px] font-bold text-gray-900 mb-1 border-b border-gray-200 pb-0.5">
                  Customer Details
                </h2>
                <div className="space-y-0.5 text-[10px]">
                  <div>
                    <span className="font-semibold text-gray-700">Name:</span>
                    <p className="text-gray-900">{certificate.customer.name}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Address:
                    </span>
                    <p className="text-gray-900">
                      {certificate.customer.address}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Postcode:
                    </span>
                    <p className="text-gray-900">
                      {certificate.customer.postcode}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Telephone:
                    </span>
                    <p className="text-gray-900">
                      {certificate.customer.telephone}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Email:</span>
                    <p className="text-gray-900">
                      {certificate.customer.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Appliance Details */}
              {certificate.appliance && (
                <div className="border border-gray-300 rounded p-2">
                  <h2 className="text-[11px] font-bold text-gray-900 mb-1 border-b border-gray-200 pb-0.5">
                    Appliance Details
                  </h2>
                  <div className="space-y-0.5 text-[10px]">
                    {/* Only show fields that were visible during certificate creation */}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "location",
                      )) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Location:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.location}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes("type")) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Type:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.type}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "manufacturer",
                      )) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Manufacturer:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.manufacturer}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes("model")) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Model:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.model}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "fuelType",
                      )) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Fuel Type:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.fuelType}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "serialNumber",
                      )) &&
                      certificate.appliance.serialNumber && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Serial Number:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.serialNumber}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "nominalOutput",
                      )) &&
                      certificate.appliance.nominalOutput && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Nominal Output:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.nominalOutput} kW
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "installDate",
                      )) &&
                      certificate.appliance.installDate && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Install Date:
                          </span>
                          <p className="text-gray-900">
                            {formatDate(certificate.appliance.installDate)}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "installedBy",
                      )) &&
                      certificate.appliance.installedBy && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Installed By:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.installedBy}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "flueType",
                      )) &&
                      certificate.appliance.flueType && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Flue Type:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.flueType}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "flueSize",
                      )) &&
                      certificate.appliance.flueSize && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Flue Size:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.flueSize} mm
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "cowlType",
                      )) &&
                      certificate.appliance.cowlType && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Cowl Type:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.cowlType}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "conditionOfStack",
                      )) &&
                      certificate.appliance.conditionOfStack && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Condition of Stack:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.conditionOfStack}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "defaultSweepingMethod",
                      )) &&
                      certificate.appliance.defaultSweepingMethod && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Sweeping Method:
                          </span>
                          <p className="text-gray-900">
                            {certificate.appliance.defaultSweepingMethod}
                          </p>
                        </div>
                      )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "ventilationPresent",
                      )) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Ventilation Present:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.ventilationPresent
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>
                    )}
                    {(!certificate.visibleApplianceFields ||
                      certificate.visibleApplianceFields.includes(
                        "coAlarmPresent",
                      )) && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          CO Alarm Present:
                        </span>
                        <p className="text-gray-900">
                          {certificate.appliance.coAlarmPresent ? "Yes" : "No"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Certificate Fields - Conditional Layout Based on Certificate Type */}
            {certificate.templateId?.startsWith("standard-") ||
            certificate.isStandard ? (
              /* Standard Certificate: Two Column Layout */
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="border border-gray-300 rounded p-2 space-y-1">
                  {certificate.fields
                    .filter((field) => {
                      // Filter out main title
                      if (
                        field.id === "header-title" &&
                        field.type === "text-header"
                      ) {
                        return false;
                      }

                      // Filter out Section A, B, and G
                      if (
                        field.id === "section-customer" ||
                        field.id === "customer-name" ||
                        field.id === "customer-address" ||
                        field.id === "customer-postcode" ||
                        field.id === "customer-telephone" ||
                        field.id === "customer-email" ||
                        field.id === "section-appliance" ||
                        field.id === "appliance-location" ||
                        field.id === "appliance-type" ||
                        field.id === "appliance-manufacturer" ||
                        field.id === "appliance-model" ||
                        field.id === "fuel-type" ||
                        field.id === "section-signoff" ||
                        field.id === "engineer-name" ||
                        field.id === "business-name" ||
                        field.id === "certificate-date" ||
                        field.id === "certificate-number" ||
                        field.id === "customer-signature-name"
                      ) {
                        return false;
                      }

                      // Left column: section C (sweeping) and F (resweep)
                      if (
                        field.id.includes("sweeping") ||
                        field.id.includes("fuels-used") ||
                        field.id.includes("sweeping-method") ||
                        field.id.includes("deposits") ||
                        field.id.includes("additional") ||
                        field.id === "section-sweeping" ||
                        field.id === "section-resweep" ||
                        field.id === "resweep-interval"
                      ) {
                        return true;
                      }

                      return false;
                    })
                    .map((field) => {
                      // Handle section headers separately
                      if (field.type === "text-header") {
                        const text = field.properties.text || "";
                        const isSectionHeader = /^[A-Z]\.\s/.test(text);

                        if (isSectionHeader) {
                          // Remove the letter prefix (e.g., "C. " from "C. Sweeping Information")
                          const textWithoutPrefix = text.replace(
                            /^[A-Z]\.\s/,
                            "",
                          );
                          return (
                            <div
                              key={field.id}
                              className="mt-2 mb-1 pt-1.5 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0"
                            >
                              <h3 className="text-[11px] font-bold text-gray-900">
                                {textWithoutPrefix}
                              </h3>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={field.id}
                              className="text-[10px] font-medium text-gray-700 mb-0.5"
                            >
                              {text}
                            </div>
                          );
                        }
                      }

                      const value = renderFieldValue(field);
                      if (!value) return null;

                      return (
                        <div key={field.id} className="text-[10px]">
                          {field.type === "textbox" ? (
                            <p className="text-gray-900 font-medium">{value}</p>
                          ) : field.type === "checkbox" ? (
                            <div className="flex items-start">{value}</div>
                          ) : (
                            <div>
                              {field.properties.label && (
                                <span className="font-semibold text-gray-700">
                                  {field.properties.label}:
                                </span>
                              )}
                              <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">
                                {value}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="border border-gray-300 rounded p-2 space-y-1">
                  {certificate.fields
                    .filter((field) => {
                      // Filter out main title
                      if (
                        field.id === "header-title" &&
                        field.type === "text-header"
                      ) {
                        return false;
                      }

                      // Filter out Section A, B, and G
                      if (
                        field.id === "section-customer" ||
                        field.id === "customer-name" ||
                        field.id === "customer-address" ||
                        field.id === "customer-postcode" ||
                        field.id === "customer-telephone" ||
                        field.id === "customer-email" ||
                        field.id === "section-appliance" ||
                        field.id === "appliance-location" ||
                        field.id === "appliance-type" ||
                        field.id === "appliance-manufacturer" ||
                        field.id === "appliance-model" ||
                        field.id === "fuel-type" ||
                        field.id === "section-signoff" ||
                        field.id === "engineer-name" ||
                        field.id === "business-name" ||
                        field.id === "certificate-date" ||
                        field.id === "certificate-number" ||
                        field.id === "customer-signature-name"
                      ) {
                        return false;
                      }

                      // Right column: sections D, E (checks, co alarm)
                      if (
                        field.id.includes("terminal") ||
                        field.id.includes("chimney") ||
                        field.id.includes("obstruction") ||
                        field.id.includes("smoke") ||
                        field.id.includes("ventilation") ||
                        field.id.includes("co-alarm") ||
                        field.id.includes("fire-safety") ||
                        field.id.includes("general-appliance") ||
                        field.id === "section-checks" ||
                        field.id === "section-co-alarm" ||
                        field.id === "co-alarm-comments"
                      ) {
                        return true;
                      }

                      return false;
                    })
                    .map((field) => {
                      // Handle section headers separately
                      if (field.type === "text-header") {
                        const text = field.properties.text || "";
                        const isSectionHeader = /^[A-Z]\.\s/.test(text);

                        if (isSectionHeader) {
                          // Remove the letter prefix
                          const textWithoutPrefix = text.replace(
                            /^[A-Z]\.\s/,
                            "",
                          );

                          // Check if this is Visual/Condition Checks section
                          const isChecksSection = field.id === "section-checks";

                          if (isChecksSection) {
                            // Get the condition check fields
                            const checkFields = certificate.fields.filter(
                              (f) =>
                                f.id === "terminal-condition" ||
                                f.id === "chimney-pot-condition" ||
                                f.id === "obstructions-found" ||
                                f.id === "smoke-evacuation" ||
                                f.id === "ventilation-adequate" ||
                                f.id === "co-alarm-installed" ||
                                f.id === "fire-safety-concerns" ||
                                f.id === "general-appliance-condition",
                            );

                            // Split into two columns
                            const leftChecks = checkFields.slice(0, 4);
                            const rightChecks = checkFields.slice(4);

                            return (
                              <div key={field.id}>
                                <div className="mt-2 mb-1 pt-1.5 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0">
                                  <h3 className="text-[11px] font-bold text-gray-900">
                                    {textWithoutPrefix}
                                  </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    {leftChecks.map((checkField) => {
                                      const value =
                                        renderFieldValue(checkField);
                                      if (!value) return null;
                                      return (
                                        <div
                                          key={checkField.id}
                                          className="text-[10px]"
                                        >
                                          <span className="font-semibold text-gray-700">
                                            {checkField.properties.label}:
                                          </span>
                                          <p className="text-gray-900 mt-0.5">
                                            {value}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="space-y-1">
                                    {rightChecks.map((checkField) => {
                                      const value =
                                        renderFieldValue(checkField);
                                      if (!value) return null;
                                      return (
                                        <div
                                          key={checkField.id}
                                          className="text-[10px]"
                                        >
                                          <span className="font-semibold text-gray-700">
                                            {checkField.properties.label}:
                                          </span>
                                          <p className="text-gray-900 mt-0.5">
                                            {value}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={field.id}
                              className="mt-2 mb-1 pt-1.5 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0"
                            >
                              <h3 className="text-[11px] font-bold text-gray-900">
                                {textWithoutPrefix}
                              </h3>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={field.id}
                              className="text-[10px] font-medium text-gray-700 mb-0.5"
                            >
                              {text}
                            </div>
                          );
                        }
                      }

                      // Skip individual condition check fields as they're rendered in the section header
                      if (
                        field.id === "terminal-condition" ||
                        field.id === "chimney-pot-condition" ||
                        field.id === "obstructions-found" ||
                        field.id === "smoke-evacuation" ||
                        field.id === "ventilation-adequate" ||
                        field.id === "co-alarm-installed" ||
                        field.id === "fire-safety-concerns" ||
                        field.id === "general-appliance-condition"
                      ) {
                        return null;
                      }

                      const value = renderFieldValue(field);
                      if (!value) return null;

                      return (
                        <div key={field.id} className="text-[10px]">
                          {field.type === "textbox" ? (
                            <p className="text-gray-900 font-medium">{value}</p>
                          ) : field.type === "checkbox" ? (
                            <div className="flex items-start">{value}</div>
                          ) : (
                            <div>
                              {field.properties.label && (
                                <span className="font-semibold text-gray-700">
                                  {field.properties.label}:
                                </span>
                              )}
                              <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">
                                {value}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* User-Created Certificate: Simple Single Column Layout */
              <div className="border border-gray-300 rounded p-3 mb-2">
                <div className="space-y-2">
                  {certificate.fields.map((field) => {
                    const value = renderFieldValue(field);
                    if (!value) return null;

                    return (
                      <div key={field.id} className="text-xs">
                        {field.type === "textbox" ? (
                          <p className="text-gray-900 font-medium text-sm">
                            {value}
                          </p>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-start">{value}</div>
                        ) : (
                          <div>
                            {field.properties?.label && (
                              <span className="font-semibold text-gray-700">
                                {field.properties.label}:
                              </span>
                            )}
                            <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">
                              {value}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Engineer & Customer Sign-Off Section */}
            <div className="border border-gray-300 rounded p-2 mb-2">
              <div className="grid grid-cols-3 gap-2 mb-2 text-[10px]">
                {/* Business Name */}
                {certificate.fields
                  .filter((f) => f.id === "business-name")
                  .map((field) => (
                    <div key={field.id}>
                      <span className="font-semibold text-gray-700">
                        Business Name:
                      </span>
                      <p className="text-gray-900">{field.value}</p>
                    </div>
                  ))}

                {/* Engineer Name */}
                {certificate.fields
                  .filter((f) => f.id === "engineer-name")
                  .map((field) => (
                    <div key={field.id}>
                      <span className="font-semibold text-gray-700">
                        Engineer Name:
                      </span>
                      <p className="text-gray-900">{field.value}</p>
                    </div>
                  ))}

                {/* Certificate Number */}
                {certificate.fields
                  .filter((f) => f.id === "certificate-number")
                  .map((field) => (
                    <div key={field.id}>
                      <span className="font-semibold text-gray-700">
                        Certificate Number:
                      </span>
                      <p className="text-gray-900">{field.value}</p>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2 text-[10px]">
                {/* Customer Name */}
                {certificate.fields
                  .filter((f) => f.id === "customer-signature-name")
                  .map((field) => (
                    <div key={field.id}>
                      <span className="font-semibold text-gray-700">
                        Customer Name:
                      </span>
                      <p className="text-gray-900">{field.value}</p>
                    </div>
                  ))}

                {/* Empty column for alignment */}
                <div></div>

                {/* Date */}
                {certificate.fields
                  .filter((f) => f.id === "certificate-date")
                  .map((field) => (
                    <div key={field.id}>
                      <span className="font-semibold text-gray-700">Date:</span>
                      <p className="text-gray-900">{field.value}</p>
                    </div>
                  ))}
              </div>

              {/* Signatures */}
              {certificate.signatures &&
                (certificate.signatures.engineer ||
                  certificate.signatures.customer) && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                    {/* Engineer Signature */}
                    {certificate.signatures.engineer && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-700 mb-1">
                          Engineer Signature:
                        </p>
                        <div className="border border-gray-300 rounded p-1 bg-white min-h-10 flex items-center justify-center">
                          {certificate.signatures.engineer.type === "drawn" ? (
                            <img
                              src={certificate.signatures.engineer.data}
                              alt="Engineer signature"
                              className="max-h-8"
                            />
                          ) : (
                            <p
                              className="text-base"
                              style={{ fontFamily: "cursive" }}
                            >
                              {certificate.signatures.engineer.data}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer Signature */}
                    {certificate.signatures.customer && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-700 mb-1">
                          Customer Signature:
                        </p>
                        <div className="border border-gray-300 rounded p-1 bg-white min-h-10 flex items-center justify-center">
                          {certificate.signatures.customer.type === "drawn" ? (
                            <img
                              src={certificate.signatures.customer.data}
                              alt="Customer signature"
                              className="max-h-8"
                            />
                          ) : (
                            <p
                              className="text-base"
                              style={{ fontFamily: "cursive" }}
                            >
                              {certificate.signatures.customer.data}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-2 pt-1.5 border-t border-gray-300 text-center">
              <p className="text-[10px] text-gray-600">
                This certificate was issued on{" "}
                {formatDate(certificate.issuedDate)} and is valid as of the date
                of inspection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide all elements by default */
          body * {
            visibility: hidden;
          }

          /* Show only certificate content */
          .certificate-page,
          .certificate-page * {
            visibility: visible;
          }

          /* Position certificate at top-left of page */
          .certificate-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 0;
            page-break-after: always;
            box-shadow: none !important;
            overflow: hidden;
          }

          /* Reset body for print */
          body {
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Hide navigation, sidebars, and all other UI */
          header,
          nav,
          aside,
          .sidebar,
          .navigation,
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }

          /* Page setup */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          /* Ensure content fits */
          .certificate-page > div {
            transform: scale(0.98);
            transform-origin: top left;
          }
        }

        @media screen {
          .certificate-page {
            width: 297mm;
            min-height: 210mm;
          }
        }
      `}</style>
    </>
  );
}
