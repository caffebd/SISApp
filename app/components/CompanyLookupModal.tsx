'use client';

import { useState, useEffect } from 'react';
import { searchCompanies, CompanySearchResult } from '../../lib/companiesHouse';

interface CompanyLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (company: CompanySearchResult) => void;
  initialQuery?: string;
}

export default function CompanyLookupModal({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectCompany,
}: CompanyLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [companies, setCompanies] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search when modal opens with initial query
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      setSearchQuery(initialQuery);
      // Trigger search automatically
      performSearch(initialQuery);
    } else if (isOpen && !initialQuery) {
      // Reset state when opening without initial query
      setSearchQuery('');
      setCompanies([]);
      setError('');
      setHasSearched(false);
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setError('Please enter a company name or number');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await searchCompanies(query);
      setCompanies(response.items || []);
      setTotalResults(response.total_results || 0);

      if (response.items.length === 0) {
        setError('No companies found. Please try a different search.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      const errorMessage = err?.message || 'Failed to search companies';
      
      if (errorMessage.includes('API key')) {
        setError('Failed to search companies. Please check your API key in .env.local and restart the server.');
      } else {
        setError(`Failed to search companies: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-2xl font-bold">Company Lookup</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Computers Are Free For Everyone Limited"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-4 mt-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Show Companies House results</span>
            </button>
          </div>
        </div>

        {/* Info/Error Message */}
        {hasSearched && totalResults > 20 && !error && (
          <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              Too many results in list. Please narrow your search criteria
            </p>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : companies.length > 0 ? (
            <div className="space-y-3">
              {companies.map((company, index) => (
                <button
                  key={`${company.company_number}-${index}`}
                  onClick={() => onSelectCompany(company)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-600 group-hover:text-blue-700 mb-1">
                          {company.title}
                        </h3>
                        {company.address_snippet && (
                          <div className="flex items-start gap-1 text-sm text-gray-600 mb-1">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{company.address_snippet}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Company No: {company.company_number}</span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No results found</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Enter a company name to search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
