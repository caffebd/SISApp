// Companies House API utilities
// API Documentation: https://developer.company-information.service.gov.uk/get-started
// Using Next.js API routes to proxy requests and avoid CORS issues

export interface CompanySearchResult {
  company_number: string;
  title: string; // This is what the API actually returns
  company_name?: string; // Optional alias for consistency
  company_status: string;
  company_type?: string;
  address_snippet?: string;
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
    region?: string;
  };
}

export interface Officer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  occupation?: string;
  nationality?: string;
  country_of_residence?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
    region?: string;
  };
  date_of_birth?: {
    month: number;
    year: number;
  };
}

export interface CompanySearchResponse {
  items: CompanySearchResult[];
  total_results: number;
  items_per_page: number;
}

export interface OfficersResponse {
  items: Officer[];
  total_results: number;
  items_per_page: number;
}

/**
 * Search for companies by name or number
 * @param query Company name or number
 * @param itemsPerPage Number of results per page (default 20)
 */
export async function searchCompanies(
  query: string,
  itemsPerPage: number = 20
): Promise<CompanySearchResponse> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `/api/companies-house/search?q=${encodedQuery}&items_per_page=${itemsPerPage}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching companies:', error);
    throw error;
  }
}

/**
 * Get company officers (directors) by company number
 * @param companyNumber The company number
 * @param itemsPerPage Number of results per page (default 50)
 */
export async function getCompanyOfficers(
  companyNumber: string,
  itemsPerPage: number = 50
): Promise<OfficersResponse> {
  try {
    const url = `/api/companies-house/officers/${companyNumber}?items_per_page=${itemsPerPage}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching company officers:', error);
    throw error;
  }
}

/**
 * Get detailed company information
 * @param companyNumber The company number
 */
export async function getCompanyProfile(companyNumber: string) {
  try {
    const url = `/api/companies-house/company/${companyNumber}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching company profile:', error);
    throw error;
  }
}
