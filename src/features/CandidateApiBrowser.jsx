/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { AVAILABILITY_OPTIONS, TALENT_ROLES } from '../data/assistantFactory';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { fetchCandidatePage } from '../services/candidateApi';

const PAGE_SIZES = [12, 24, 48, 96];
const EMPTY = { items: [], total: 0, page: 1, pageSize: 12 };

export default function CandidateApiBrowser({ baseUrl, onBack }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [availability, setAvailability] = useState('');
  const [rate, setRate] = useState('all');
  const [sort, setSort] = useState('nameAsc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 180);
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  useEffect(() => {
    if (!baseUrl) {
      setError('Candidate API is not configured. Use the local demo or configure a backend URL.');
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    fetchCandidatePage({
      baseUrl, q: debouncedQuery, role, availability, rate, sort,
      page, pageSize, signal: controller.signal
    }).then(data => {
      if (active) { setResult(data); setLoading(false); }
    }).catch(err => {
      if (!active || err?.name === 'AbortError') return;
      setResult(EMPTY);
      setError(err.message);
      setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, [baseUrl, debouncedQuery, role, availability, rate, sort, page, pageSize, retry]);

  const change = (setter) => event => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <p className="hero-title">AssistantHub · Database Candidate Browser</p>
        <p className="hero-subtitle">
          Read-only synthetic records from MySQL. No real contacts, hiring decisions, or persistent shortlist actions.
        </p>
      </header>
      <main className="content-shell">
        <section className="controls-panel" aria-label="API candidate search controls">
          <div className="api-browser-actions">
            <button type="button" className="ui-button secondary" onClick={onBack}>Return to local demo</button>
            <span className="json-status">Data source: Express/MySQL API (read-only)</span>
          </div>
          <div className="api-browser-filters">
            <label>
              Search name, role or skill
              <input className="input-control" aria-label="Search API candidates" maxLength={100}
                value={query} onChange={change(setQuery)} />
            </label>
            <label>
              Role
              <select className="select-control" aria-label="API role" value={role} onChange={change(setRole)}>
                <option value="">All roles</option>
                {TALENT_ROLES.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Availability
              <select className="select-control" aria-label="API availability" value={availability} onChange={change(setAvailability)}>
                <option value="">All availability</option>
                {AVAILABILITY_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Rate
              <select className="select-control" aria-label="API rate" value={rate} onChange={change(setRate)}>
                <option value="all">All rates</option>
                <option value="under40">Under $40/hr</option>
                <option value="40to60">$40–$60/hr</option>
                <option value="over60">Over $60/hr</option>
              </select>
            </label>
            <label>
              Sort
              <select className="select-control" aria-label="API sort" value={sort} onChange={change(setSort)}>
                <option value="nameAsc">Name A–Z</option>
                <option value="rateDesc">Rate high to low</option>
                <option value="rateAsc">Rate low to high</option>
              </select>
            </label>
            <label>
              Page size
              <select className="select-control" aria-label="API page size" value={pageSize}
                onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
                {PAGE_SIZES.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </section>
        <section className="cards-section" aria-label="API candidate results">
          {loading && <p className="loading-state" role="status">Loading candidate results...</p>}
          {error && <div role="alert"><p>{error}</p>
            {baseUrl && <button type="button" className="ui-button secondary" onClick={() => setRetry(x => x + 1)}>Retry API request</button>}
          </div>}
          {!loading && !error && <>
            <p className="result-summary">
              {result.total} candidates · page {result.page}/{totalPages} · {result.items.length} shown
            </p>
            {result.items.length === 0 ? <p className="empty-state">No matching database candidates.</p> :
              <div className="api-candidate-grid">
                {result.items.map(candidate =>
                  <article className="api-candidate" key={candidate.id}>
                    <h2>{candidate.name}</h2>
                    <p><strong>{candidate.role}</strong></p>
                    <p>{candidate.availability} · <span>$</span>{candidate.hourlyRateUsd}/hr</p>
                    <p>Skills: {candidate.skills.join(', ')}</p>
                  </article>
                )}
              </div>
            }
            {result.total > pageSize && <nav className="pagination-bar" aria-label="API pagination">
              <button type="button" className="ui-button secondary" disabled={page === 1}
                onClick={() => setPage(x => Math.max(1, x - 1))}>Previous API page</button>
              <button type="button" className="ui-button secondary" disabled={page >= totalPages}
                onClick={() => setPage(x => Math.min(totalPages, x + 1))}>Next API page</button>
            </nav>}
          </>}
        </section>
      </main>
    </div>
  );
}
