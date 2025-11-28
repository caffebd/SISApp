"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../lib/firebase";

interface LogoUploadModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: (logoUrl: string) => void;
}

// Helper function to create image from file
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

// Helper function to get cropped image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileType: string = "image/png",
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Clear canvas with transparency for PNG
  if (fileType === "image/png") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  // Convert canvas to blob - use PNG to preserve transparency
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      fileType,
      fileType === "image/jpeg" ? 0.95 : 1.0,
    );
  });
}

export default function LogoUploadModal({
  isOpen,
  userId,
  onClose,
  onSuccess,
}: LogoUploadModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileType, setFileType] = useState<string>("image/png");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    // Store the file type to preserve it during cropping
    setFileType(file.type);

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setError("");
    });
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError("");

    try {
      // Get cropped image blob, preserving the original file type
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        fileType,
      );

      // Upload to Firebase Storage
      const storageRef = ref(storage, `${userId}/logo`);
      await uploadBytes(storageRef, croppedBlob, {
        contentType: fileType,
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save logoUrl to Firestore
      const userDocRef = doc(db, "USERS", userId);
      await updateDoc(userDocRef, {
        logoUrl: downloadURL,
      });

      onSuccess(downloadURL);
      handleClose();
    } catch (err) {
      console.error("Error uploading logo:", err);
      setError("Failed to upload logo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError("");
    setFileType("image/png");
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Logo</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* File Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!imageSrc ? (
            // Upload Area
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectImage}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <svg
                className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                  isDragging ? "text-blue-500" : "text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3
                className={`text-lg font-semibold mb-2 transition-colors ${
                  isDragging ? "text-blue-600" : "text-gray-900"
                }`}
              >
                {isDragging ? "Drop image here" : "Select an image"}
              </h3>
              <p className="text-gray-600 mb-4">
                {isDragging
                  ? "Release to upload"
                  : "Drag & Drop or click to browse"}
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG or GIF (max. 5MB)
              </p>
            </div>
          ) : (
            // Crop Area
            <div>
              <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden mb-4">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Zoom Slider */}
              <div className="mb-6">
                <label
                  htmlFor="zoom"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Zoom
                </label>
                <input
                  id="zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Change Image Button */}
              <button
                onClick={handleSelectImage}
                disabled={uploading}
                className="w-full mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Choose Different Image
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!imageSrc || uploading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading...
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload Logo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
