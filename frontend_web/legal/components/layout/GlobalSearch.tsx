import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Folder, Loader2, Search, ShieldQuestion } from 'lucide-react';
import { ApiError, SearchResult, searchRequest } from '../../services/api';

const ENTITY_ICON = { case: Folder, document: FileText, evidence: ShieldQuestion } as const;
const ENTITY_LABEL = { case: 'Case', document: 'Document', evidence: 'Evidence' } as const;

// A single omnibox: debounced natural-language query fanned out across
// cases, filed documents and evidence, with results routed to the page
// that already shows that entity rather than a dedicated results page.
export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchRequest(query);
        setResults(rows);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const goTo = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    if (result.entityType === 'case') navigate(`/case/${result.caseId}/home`);
    else if (result.entityType === 'document') navigate(`/case/${result.caseId}/files`);
    else navigate(`/case/${result.caseId}/evidence`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search cases, documents, evidence…"
          className="w-full pl-9 pr-3 py-2 border border-line-300 rounded-sm bg-paper-50 text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 focus:bg-white transition-colors"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 animate-spin" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-line-200 rounded-sm shadow-lg max-h-96 overflow-y-auto z-50 animate-fade-in">
          {error ? (
            <p className="px-4 py-3 text-sm text-status-urgent">{error}</p>
          ) : loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-500">No matches for "{query}".</p>
          ) : (
            results.map((r) => {
              const Icon = ENTITY_ICON[r.entityType];
              return (
                <button
                  key={`${r.entityType}-${r.id}`}
                  onClick={() => goTo(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-paper-50 border-b border-line-200 last:border-0 flex items-start gap-2.5"
                >
                  <Icon size={15} className="text-navy-700 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-saffron-700 uppercase tracking-wide">{ENTITY_LABEL[r.entityType]}</span>
                      <span className="text-xs text-ink-400">{r.subtitle}</span>
                    </div>
                    <p className="text-sm font-medium text-navy-900 truncate">{r.title}</p>
                    {r.snippet && <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{r.snippet}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
