'use client';

import { useState, useEffect } from 'react';

export default function TestLogoPage() {
  const userId = '1snBR67qkJQfZ68FoDAcM4GY8Qw2';
  const [logoUrl, setLogoUrl] = useState(`/api/logo?userId=${userId}`);

  useEffect(() => {
    // Set timestamp on client side only to avoid hydration mismatch
    setLogoUrl(`/api/logo?userId=${userId}&t=${Date.now()}`);
  }, [userId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Logo Test Page</h1>
      <p className="mb-4">Testing logo URL: {logoUrl}</p>
      
      <div className="border-2 border-gray-300 p-4 inline-block">
        <img
          src={logoUrl}
          alt="Test Logo"
          className="w-48 h-48 object-contain"
          onLoad={() => console.log('✅ Logo loaded successfully')}
          onError={(e) => {
            console.error('❌ Error loading logo');
            console.error('Error event:', e);
          }}
        />
      </div>

      <div className="mt-4">
        <a 
          href={logoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Open logo URL directly
        </a>
      </div>
    </div>
  );
}