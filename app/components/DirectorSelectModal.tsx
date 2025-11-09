'use client';

import { useState, useEffect } from 'react';
import { getCompanyOfficers, Officer, CompanySearchResult } from '../../lib/companiesHouse';

interface DirectorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDirector: (officer: Officer) => void;
  company: CompanySearchResult | null;
  onBackToCompanyList: () => void;
}

export default function DirectorSelectModal({
  isOpen,
  onClose,
  onSelectDirector,
  company,
  onBackToCompanyList,
}: DirectorSelectModalProps) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && company) {
      fetchOfficers();
    }
  }, [isOpen, company]);

  const fetchOfficers = async () => {
    if (!company) {
      console.error('No company selected');
      return;
    }

    if (!company.company_number) {
      console.error('Company number is missing:', company);
      setError('Company number is missing. Please try selecting the company again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Fetching officers for company:', company.company_number);
      const response = await getCompanyOfficers(company.company_number);
      setOfficers(response.items || []);

      if (response.items.length === 0) {
        setError('No directors found for this company.');
      }
    } catch (err: any) {
      console.error('Error fetching officers:', err);
      setError(err?.message || 'Failed to load directors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Main Contact</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Company Info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{company.title}</h3>
              {company.address_snippet && (
                <div className="flex items-start gap-1 text-sm text-gray-600 mt-1">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>{company.address_snippet}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Directors List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : officers.length > 0 ? (
            <div className="space-y-3">
              {/* None of below option */}
              <button
                onClick={() => onSelectDirector({} as Officer)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-blue-600 group-hover:text-blue-700">
                    None of below
                  </h3>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Directors */}
              {officers.map((officer, index) => (
                <button
                  key={`${officer.name}-${index}`}
                  onClick={() => onSelectDirector(officer)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-600 group-hover:text-blue-700 mb-1">
                        {officer.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {officer.officer_role || 'Director'}
                      </p>
                      {officer.address && (
                        <div className="text-sm text-gray-500">
                          {officer.address.address_line_1 && <p>{officer.address.address_line_1}</p>}
                          {officer.address.address_line_2 && <p>{officer.address.address_line_2}</p>}
                          {officer.address.locality && <p>{officer.address.locality}</p>}
                          {officer.address.postal_code && <p className="font-medium">{officer.address.postal_code}</p>}
                        </div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No directors found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex gap-3">
            <button
              onClick={onBackToCompanyList}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to company list
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
