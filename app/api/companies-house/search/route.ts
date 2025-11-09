import { NextRequest, NextResponse } from 'next/server';

const COMPANIES_HOUSE_API_KEY = process.env.NEXT_PUBLIC_COMPANIES_HOUSE_API_KEY || '';
const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const itemsPerPage = searchParams.get('items_per_page') || '20';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  if (!COMPANIES_HOUSE_API_KEY) {
    return NextResponse.json(
      { error: 'Companies House API key not configured' },
      { status: 500 }
    );
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${API_BASE_URL}/search/companies?q=${encodedQuery}&items_per_page=${itemsPerPage}`;
    
    // Create Basic Auth header (API key as username, empty password)
    const credentials = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Companies House API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Companies House API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching companies:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
