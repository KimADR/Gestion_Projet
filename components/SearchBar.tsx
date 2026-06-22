'use client';

import { useState } from 'react';

interface SearchResult {
  id: string;
  type: 'page' | 'employee' | 'request';
  title: string;
  description?: string;
  icon: React.ReactNode;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const allResults: SearchResult[] = [
    {
      id: '1',
      type: 'page',
      title: 'Tableau de bord',
      description: 'Vue générale de l’activité',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-3m0 0l7-4 7 4M5 9v7a1 1 0 001 1h2m2-4h6m0 0v7a1 1 0 001 1h2m-6-4V5a1 1 0 00-1-1H9a1 1 0 00-1 1v4" />
        </svg>
      ),
    },
    {
      id: '2',
      type: 'page',
      title: 'Demandes',
      description: 'Suivi des congés',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: '3',
      type: 'page',
      title: 'Calendrier',
      description: 'Disponibilités du personnel',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: '4',
      type: 'page',
      title: 'Employés',
      description: 'Répertoire des collaborateurs',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3a6 6 0 016-6h6a6 6 0 016 6v0M9 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: '5',
      type: 'page',
      title: 'Approbations',
      description: 'Validation des demandes',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 0) {
      const filtered = allResults.filter(
        (result) =>
          result.title.toLowerCase().includes(value.toLowerCase()) ||
          result.description?.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-light"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un employé, une demande ou une page..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-light hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-50">
          <div className="max-h-80 overflow-y-auto">
            {results.map((result) => (
                  <button
                key={result.id}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-200 last:border-0 transition-colors flex items-center gap-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">{result.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{result.title}</p>
                  {result.description && (
                    <p className="text-xs text-slate-500">{result.description}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-8 text-center">
          <p className="text-sm text-slate-500">Aucun résultat pour &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
