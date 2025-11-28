'use client';

import { useState, useEffect, useCallback } from 'react';

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
}

export default function ImageGalleryModal({
    isOpen,
    onClose,
    images,
    initialIndex = 0,
}: ImageGalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        }
    }, [isOpen, initialIndex]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowLeft':
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case 'Escape':
                    onClose();
                    break;
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                case '_':
                    handleZoomOut();
                    break;
                case '0':
                    handleResetZoom();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, zoom]); // Dependencies for closure values

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
        handleResetZoom();
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        handleResetZoom();
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.5, 5));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.5, 1));
        if (zoom <= 1.5) {
            setOffset({ x: 0, y: 0 }); // Reset offset if zooming out to near original size
        }
    };

    const handleResetZoom = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            e.preventDefault();
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header / Controls */}
            <div className="flex items-center justify-between p-4 text-white bg-black bg-opacity-50 absolute top-0 left-0 right-0 z-10">
                <div className="text-sm font-medium">
                    {currentIndex + 1} / {images.length}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                            title="Zoom Out (-)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                            title="Zoom In (+)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <button
                            onClick={handleResetZoom}
                            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                            title="Reset Zoom (0)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                        title="Close (Esc)"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Image Area */}
            <div
                className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    src={images[currentIndex]}
                    alt={`Gallery image ${currentIndex + 1}`}
                    className="max-h-full max-w-full object-contain transition-transform duration-100 ease-out select-none"
                    style={{
                        transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                    }}
                    draggable={false}
                />
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full transition-all z-10"
                        title="Previous (Left Arrow)"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full transition-all z-10"
                        title="Next (Right Arrow)"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Thumbnails (Optional, simple dots for now) */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 p-4">
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setCurrentIndex(idx); handleResetZoom(); }}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
