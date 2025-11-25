'use client';

import { useState, useRef, useEffect } from 'react';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureData: string, signatureType: 'drawn' | 'typed') => void;
}

export default function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
    const [mode, setMode] = useState<'draw' | 'type'>('draw');
    const [typedName, setTypedName] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            setHasDrawn(true);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setHasDrawn(false);
        }
    };

    const handleSave = () => {
        if (mode === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas || !hasDrawn) return;
            const dataUrl = canvas.toDataURL('image/png');
            onSave(dataUrl, 'drawn');
        } else {
            if (!typedName.trim()) return;
            onSave(typedName, 'typed');
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Signature</h2>

                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setMode('draw')}
                                className={`flex-1 px-4 py-2 rounded-md font-medium ${mode === 'draw'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                Draw Signature
                            </button>
                            <button
                                onClick={() => setMode('type')}
                                className={`flex-1 px-4 py-2 rounded-md font-medium ${mode === 'type'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                Type Name
                            </button>
                        </div>

                        {mode === 'draw' ? (
                            <div>
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={200}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    className="border-2 border-gray-300 rounded-md cursor-crosshair w-full"
                                    style={{ touchAction: 'none' }}
                                />
                                <button
                                    onClick={clearCanvas}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    value={typedName}
                                    onChange={(e) => setTypedName(e.target.value)}
                                    placeholder="Type your name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-signature"
                                    style={{ fontFamily: 'cursive' }}
                                />
                            </div>
                        )}

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={mode === 'draw' ? !hasDrawn : !typedName.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Signature
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
