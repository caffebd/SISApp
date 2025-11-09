import { NextRequest, NextResponse } from 'next/server';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  console.log('Logo API called for userId:', userId);

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const logoRef = ref(storage, `${userId}/logo`);
    const url = await getDownloadURL(logoRef);
    
    console.log('Firebase Storage URL:', url);
    
    // Fetch the image from Firebase Storage
    const response = await fetch(url);
    
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Image fetched, size:', buffer.length, 'bytes');
    
    // Return the image with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error fetching logo:', error.message);
    return NextResponse.json({ error: 'Logo not found', details: error.message }, { status: 404 });
  }
}