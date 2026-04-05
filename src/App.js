import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CSVLink } from 'react-csv';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import ProfileCards from './ProfileCards';
import SearchBar from './SearchBar';
import config from './ChatbotConfig';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { AVAILABILITY_OPTIONS, BASE_SEED, TALENT_ROLES } from './data/assistantFactory';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { usePersistentState } from './hooks/usePersistentState';
import { initialUiState, RATE_FILTERS, SORT_OPTIONS, uiReducer } from './state/uiReducer';
import { loadTalentPool, TALENT_SOURCES } from './services/talentAdapter';
import './App.css';

const MAX_CARDS = 5000;
const DEFAULT_CARDS = 6;
const DEFAULT_PAGE_SIZE = 24;
const SHORTLIST_STORAGE_KEY = 'talentShortlist';
const TALENT_SEED_KEY = 'talentSeed';
const TALENT_SOURCE_KEY = 'talentSource';
export const HIRE_STATUSES = ['New', 'Contacted', 'Interview', 'Hired'];
export const DEFAULT_IMPORT_MAX_BYTES = 1024 * 1024 * 2;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const TABLE_ROW_HEIGHT = 54;
const TABLE_VIEWPORT_HEIGHT = 432;
const DEMO_SCENARIO_SEED = 424242;
const DEMO_SCENARIO_COUNT = 500;

const RATE_CHIPS = [
  { value: RATE_FILTERS.ALL, label: 'All rates' },
  { value: RATE_FILTERS.UNDER_40, label: 'Under $40/hr' },
  { value: RATE_FILTERS.BETWEEN_40_60, label: '$40-$60/hr' },
  { value: RATE_FILTERS.OVER_60, label: '$60+/hr' },
];

export const isRateMatch = (rate, filter) => {
  if (filter === RATE_FILTERS.UNDER_40) {
    return rate < 40;
  }
  if (filter === RATE_FILTERS.BETWEEN_40_60) {
    return rate >= 40 && rate <= 60;
  }
  if (filter === RATE_FILTERS.OVER_60) {
    return rate > 60;
  }
  return true;
};

export const getNextStatus = (currentStatus) => {
  const index = HIRE_STATUSES.indexOf(currentStatus);
  if (index < 0 || index === HIRE_STATUSES.length - 1) {
    return HIRE_STATUSES[0];
  }
  return HIRE_STATUSES[index + 1];
};

export const readJsonFile = (file) => {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const normalizeText = (value, max = 300) => String(value || '').trim().slice(0, max);

const asSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const validateDemoImportFile = (file, maxBytes = DEFAULT_IMPORT_MAX_BYTES) => {
  if (!file) {
    return { ok: false, error: 'No file selected.' };
  }

  const isJsonFile = file.type === 'application/json' || file.name?.toLowerCase().endsWith('.json');
  if (!isJsonFile) {
    return { ok: false, error: 'Please import a JSON file.' };
  }

  if (file.size > maxBytes) {
    return { ok: false, error: `File exceeds ${(maxBytes / (1024 * 1024)).toFixed(1)}MB limit.` };
  }

  return { ok: true };
};

export const validateImportedDemoData = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Top-level JSON must be an object.' };
  }

  if (parsed.shortlist !== undefined && !Array.isArray(parsed.shortlist)) {
    return { ok: false, error: 'shortlist must be an array.' };
  }
  if (parsed.inquiries !== undefined && !Array.isArray(parsed.inquiries)) {
    return { ok: false, error: 'inquiries must be an array.' };
  }

  const shortlist = (parsed.shortlist || []).map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`shortlist[${index}] must be an object.`);
    }

    const id = normalizeText(item.id, 80);
    const name = normalizeText(item.name, 80);
    const role = normalizeText(item.role, 80);
    const email = normalizeText(item.email, 120);

    if (!id || !name || !role || !email) {
      throw new Error(`shortlist[${index}] is missing required fields.`);
    }

    const hireStatus = HIRE_STATUSES.includes(item.hireStatus) ? item.hireStatus : HIRE_STATUSES[0];

    return {
      id,
      name,
      role,
      email,
      phone: normalizeText(item.phone, 40),
      country: normalizeText(item.country, 64),
      hourlyRateUsd: Math.max(0, Math.round(asSafeNumber(item.hourlyRateUsd, 0))),
      hireStatus,
    };
  });

  const inquiries = (parsed.inquiries || []).map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`inquiries[${index}] must be an object.`);
    }
    return {
      name: normalizeText(item.name, 80),
      email: normalizeText(item.email, 120),
      phone: normalizeText(item.phone, 40),
      message: normalizeText(item.message, 600),
    };
  });

  const nextSeed = Number(parsed.seed);
  const seed = Number.isFinite(nextSeed) ? Math.trunc(nextSeed) : BASE_SEED;

  return {
    ok: true,
    value: {
      seed,
      shortlist,
      inquiries,
    },
  };
};

function App() {
  const [assistants, setAssistants] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(DEFAULT_CARDS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [uiState, dispatchUi] = useReducer(uiReducer, initialUiState);
  const [shortlistedTalent, setShortlistedTalent] = usePersistentState(SHORTLIST_STORAGE_KEY, []);
  const [seed, setSeed] = usePersistentState(TALENT_SEED_KEY, BASE_SEED);
  const [talentSource, setTalentSource] = usePersistentState(TALENT_SOURCE_KEY, TALENT_SOURCES.LOCAL);
  const [sentInquiries, setSentInquiries] = useState([]);
  const [jsonStatus, setJsonStatus] = useState('');
  const [controlStatus, setControlStatus] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [demoProgress, setDemoProgress] = useState({ viewedDetail: false, exportedData: false });
  const importInputRef = useRef(null);
  const tableViewportRef = useRef(null);
  const didApplyUrlDemoRef = useRef(false);
  const debouncedSearchTerm = useDebouncedValue(uiState.searchTerm.trim().toLowerCase(), 180);

  useEffect(() => {
    let isMounted = true;
    dispatchUi({ type: 'setLoading', payload: true });

    const timer = setTimeout(
      () => {
        if (!isMounted) {
          return;
        }
        loadTalentPool({ count: numberOfCards, seed, source: talentSource }).then((data) => {
          if (!isMounted) {
            return;
          }
          setAssistants(data);
          dispatchUi({ type: 'setLoading', payload: false });
        });
      },
      numberOfCards >= 7 ? 120 : 0
    );

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [numberOfCards, seed, talentSource]);

  useEffect(() => {
    if (!uiState.selectedTalentId) {
      return;
    }

    const exists = assistants.some((assistant) => assistant.id === uiState.selectedTalentId);
    if (!exists) {
      dispatchUi({ type: 'closeDrawer' });
    }
  }, [assistants, uiState.selectedTalentId]);

  const searchIndex = useMemo(
    () =>
      assistants.map((assistant) => ({
        id: assistant.id,
        text: `${assistant.name} ${assistant.role} ${assistant.skills.join(' ')}`.toLowerCase(),
      })),
    [assistants]
  );

  const matchedSearchIds = useMemo(() => {
    if (!debouncedSearchTerm) {
      return null;
    }
    const ids = new Set();
    for (let index = 0; index < searchIndex.length; index += 1) {
      if (searchIndex[index].text.includes(debouncedSearchTerm)) {
        ids.add(searchIndex[index].id);
      }
    }
    return ids;
  }, [searchIndex, debouncedSearchTerm]);

  const visibleAssistants = useMemo(() => {
    const filtered = assistants.filter((assistant) => {
      const roleMatch = uiState.selectedRole === 'all' || assistant.role === uiState.selectedRole;
      const availabilityMatch =
        uiState.selectedAvailability === 'all' || assistant.availability === uiState.selectedAvailability;
      const rateMatch = isRateMatch(assistant.hourlyRateUsd, uiState.selectedRate);
      const searchMatch = !matchedSearchIds || matchedSearchIds.has(assistant.id);

      return searchMatch && roleMatch && availabilityMatch && rateMatch;
    });

    return filtered.sort((a, b) => {
      if (uiState.sortOrder === SORT_OPTIONS.HIGH_TO_LOW) {
        return b.likes - a.likes;
      }
      return a.likes - b.likes;
    });
  }, [
    assistants,
    uiState.selectedRole,
    uiState.selectedAvailability,
    uiState.selectedRate,
    uiState.sortOrder,
    matchedSearchIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleAssistants.length / pageSize));

  const pagedAssistants = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return visibleAssistants.slice(start, start + pageSize);
  }, [visibleAssistants, currentPage, totalPages, pageSize]);

  const selectedTalent = useMemo(
    () => assistants.find((assistant) => assistant.id === uiState.selectedTalentId) || null,
    [assistants, uiState.selectedTalentId]
  );

  const handleInputChange = (event) => {
    const rawValue = event.target.value;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) && rawValue !== '') {
      setControlStatus('Card count must be a number.');
      return;
    }
    const next = Math.min(Math.max(parsed || 0, 0), MAX_CARDS);
    setNumberOfCards(next);
    setCurrentPage(1);
    setControlStatus('');
  };

  const handleAddCard = () => {
    setNumberOfCards((previous) => Math.min(previous + (previous >= 100 ? 25 : 1), MAX_CARDS));
    setCurrentPage(1);
  };

  const handleMinusCard = () => {
    setNumberOfCards((previous) => Math.max(previous - (previous > 100 ? 25 : 1), 0));
    setCurrentPage(1);
  };

  const handleLikeClick = (id) => {
    setAssistants((previous) =>
      previous.map((assistant) =>
        assistant.id === id ? { ...assistant, likes: assistant.likes + 1 } : assistant
      )
    );
  };

  const handleAddUser = (assistant) => {
    setShortlistedTalent((previous) => {
      if (previous.some((stored) => stored.id === assistant.id)) {
        return previous;
      }

      return [
        ...previous,
        {
          id: assistant.id,
          name: assistant.name,
          role: assistant.role,
          email: assistant.email,
          phone: assistant.phone,
          country: assistant.country,
          hourlyRateUsd: assistant.hourlyRateUsd,
          hireStatus: HIRE_STATUSES[0],
        },
      ];
    });
  };

  const handleAdvanceHireStatus = (id) => {
    setShortlistedTalent((previous) =>
      previous.map((talent) =>
        talent.id === id ? { ...talent, hireStatus: getNextStatus(talent.hireStatus || HIRE_STATUSES[0]) } : talent
      )
    );
  };

  const getTalentHireStatus = (id) => {
    const match = shortlistedTalent.find((talent) => talent.id === id);
    return match?.hireStatus || HIRE_STATUSES[0];
  };

  const handleInquirySubmit = (inquiry) => {
    setSentInquiries((previous) => [...previous, inquiry]);
  };

  const handleSeedChange = (event) => {
    const nextSeed = Number(event.target.value);
    if (Number.isFinite(nextSeed)) {
      setSeed(Math.trunc(nextSeed));
      setCurrentPage(1);
      setControlStatus('');
    } else if (event.target.value !== '') {
      setControlStatus('Seed must be a valid number.');
    }
  };

  useEffect(() => {
      setCurrentPage(1);
      setTableScrollTop(0);
  }, [
    uiState.searchTerm,
    uiState.selectedRole,
    uiState.selectedAvailability,
    uiState.selectedRate,
    uiState.sortOrder,
    pageSize,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleExportJson = () => {
    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      seed,
      shortlist: shortlistedTalent,
      inquiries: sentInquiries,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'assistanthub-demo-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setJsonStatus('Demo data exported.');
    setDemoProgress((previous) => ({ ...previous, exportedData: true }));
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const fileValidation = validateDemoImportFile(file);
      if (!fileValidation.ok) {
        setJsonStatus(`Import failed: ${fileValidation.error}`);
        return;
      }

      const text = await readJsonFile(file);
      const parsed = JSON.parse(text);
      const validated = validateImportedDemoData(parsed);
      if (!validated.ok) {
        setJsonStatus(`Import failed: ${validated.error}`);
        return;
      }
      setShortlistedTalent(validated.value.shortlist);
      setSentInquiries(validated.value.inquiries);
      setSeed(validated.value.seed);
      setJsonStatus('Demo data imported.');
    } catch (error) {
      setJsonStatus(`Import failed: ${error.message || 'invalid JSON format.'}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleResetDemoData = () => {
    setShortlistedTalent([]);
    setSentInquiries([]);
    setSeed(BASE_SEED);
    setTalentSource(TALENT_SOURCES.LOCAL);
    setNumberOfCards(DEFAULT_CARDS);
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setViewMode('cards');
    setTableScrollTop(0);
    setDemoProgress({ viewedDetail: false, exportedData: false });
    setJsonStatus('Demo data reset to defaults.');
    setControlStatus('');
    dispatchUi({ type: 'resetFilters' });
  };

  const runDemoScenario = (fromUrl = false) => {
    setShortlistedTalent([]);
    setSentInquiries([]);
    setSeed(DEMO_SCENARIO_SEED);
    setTalentSource(TALENT_SOURCES.MOCK_API);
    setNumberOfCards(DEMO_SCENARIO_COUNT);
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setViewMode('cards');
    setTableScrollTop(0);
    setDemoProgress({ viewedDetail: false, exportedData: false });
    dispatchUi({ type: 'resetFilters' });
    setControlStatus(
      fromUrl
        ? 'Demo scenario loaded from URL preset.'
        : 'Demo scenario loaded. Try: filter -> shortlist -> advance status -> export.'
    );
  };

  useEffect(() => {
    if (didApplyUrlDemoRef.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      didApplyUrlDemoRef.current = true;
      runDemoScenario(true);
    }
  }, []);

  const tableVirtualRows = useMemo(() => {
    const source = visibleAssistants;
    const totalHeight = source.length * TABLE_ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(tableScrollTop / TABLE_ROW_HEIGHT) - 5);
    const endIndex = Math.min(
      source.length,
      Math.ceil((tableScrollTop + TABLE_VIEWPORT_HEIGHT) / TABLE_ROW_HEIGHT) + 5
    );
    return {
      totalHeight,
      startIndex,
      endIndex,
      items: source.slice(startIndex, endIndex),
    };
  }, [visibleAssistants, tableScrollTop]);

  const renderEmptyState = () => {
    if (numberOfCards === 0) {
      return <p className="empty-state">Talent list is empty. Increase card count to load candidates.</p>;
    }
    if (
      debouncedSearchTerm ||
      uiState.selectedRole !== 'all' ||
      uiState.selectedAvailability !== 'all' ||
      uiState.selectedRate !== RATE_FILTERS.ALL
    ) {
      return <p className="empty-state">No matching talent found. Try another skill, role, or rate filter.</p>;
    }
    return <p className="empty-state">No profile cards to display.</p>;
  };

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <p className="hero-title">AssistantHub Talent Pool</p>
        <p className="hero-subtitle">
          Discover, shortlist, and contact assistant talent in minutes. Built for quick hiring demos.
        </p>
      </header>

      <main className="content-shell">
        <section className="controls-panel" aria-label="Talent pool controls">
          <label htmlFor="numCards" className="panel-label">
            Talent Pool Size ({numberOfCards} generated)
          </label>
          <div className="controls-grid">
            <input
              className="input-control"
              type="number"
              id="numCards"
              value={numberOfCards}
              onChange={handleInputChange}
              min="0"
              max={MAX_CARDS}
            />

            <div className="button-row">
              <button className="ui-button secondary" onClick={handleAddCard} aria-label="Add card">
                +
              </button>
              <button className="ui-button secondary" onClick={handleMinusCard} aria-label="Remove card">
                -
              </button>
            </div>

            <button className="ui-button dark" onClick={() => { setNumberOfCards(500); setCurrentPage(1); }}>
              Load 500
            </button>
            <button className="ui-button dark" onClick={() => { setNumberOfCards(2000); setCurrentPage(1); }}>
              Load 2000
            </button>
            <button className="ui-button dark" onClick={() => { setNumberOfCards(5000); setCurrentPage(1); }}>
              Load 5000
            </button>

            <SearchBar
              value={uiState.searchTerm}
              onChange={(event) => dispatchUi({ type: 'setSearch', payload: event.target.value })}
              onClear={() => dispatchUi({ type: 'setSearch', payload: '' })}
              isSearching={uiState.searchTerm.trim().toLowerCase() !== debouncedSearchTerm}
            />

            <select
              className="select-control"
              value={uiState.sortOrder}
              onChange={(event) => dispatchUi({ type: 'setSort', payload: event.target.value })}
              aria-label="Sort by likes"
            >
              <option value={SORT_OPTIONS.HIGH_TO_LOW}>Likes: High to Low</option>
              <option value={SORT_OPTIONS.LOW_TO_HIGH}>Likes: Low to High</option>
            </select>

            <div className="seed-control">
              <label htmlFor="seedInput" className="panel-label">
                Seed
              </label>
              <input
                id="seedInput"
                type="number"
                className="input-control"
                value={seed}
                onChange={handleSeedChange}
                aria-label="Deterministic seed"
              />
            </div>

            <div className="seed-control">
              <label htmlFor="sourceSelect" className="panel-label">
                Data source
              </label>
              <select
                id="sourceSelect"
                className="select-control"
                value={talentSource}
                onChange={(event) => setTalentSource(event.target.value)}
                aria-label="Data source"
              >
                <option value={TALENT_SOURCES.LOCAL}>Local generator</option>
                <option value={TALENT_SOURCES.MOCK_API}>Mock API adapter</option>
              </select>
            </div>

            <button className="ui-button dark" onClick={() => dispatchUi({ type: 'toggleInquiryModal' })}>
              View Hiring Inquiries
            </button>
            <button className="ui-button dark" onClick={() => dispatchUi({ type: 'toggleAddedModal' })}>
              View Shortlist
            </button>

            <CSVLink
              data={shortlistedTalent}
              filename="shortlisted_talent.csv"
              className="ui-button terracotta csv-link"
            >
              Export Shortlist CSV
            </CSVLink>
            <button className="ui-button terracotta" onClick={handleExportJson}>
              Export JSON
            </button>
            <button className="ui-button secondary" onClick={() => importInputRef.current?.click()}>
              Import JSON
            </button>
            <button className="ui-button secondary" onClick={() => dispatchUi({ type: 'toggleHelpModal' })}>
              Help
            </button>
            <button className="ui-button terracotta" onClick={() => runDemoScenario(false)}>
              Run Demo Scenario
            </button>
            <button className="ui-button secondary" onClick={handleResetDemoData}>
              Reset Demo Data
            </button>
            <button
              className="ui-button secondary"
              onClick={() => setViewMode((previous) => (previous === 'cards' ? 'table' : 'cards'))}
            >
              {viewMode === 'cards' ? 'List Mode' : 'Card Mode'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              hidden
              aria-label="Import JSON"
            />
          </div>

          <div className="chip-section">
            <p className="chip-label">Role</p>
            <div className="chip-group">
              <button
                className={`chip ${uiState.selectedRole === 'all' ? 'active' : ''}`}
                onClick={() => dispatchUi({ type: 'setRoleFilter', payload: 'all' })}
              >
                All roles
              </button>
              {TALENT_ROLES.map((role) => (
                <button
                  key={role}
                  className={`chip ${uiState.selectedRole === role ? 'active' : ''}`}
                  onClick={() => dispatchUi({ type: 'setRoleFilter', payload: role })}
                >
                  {role}
                </button>
              ))}
            </div>

            <p className="chip-label">Availability</p>
            <div className="chip-group">
              <button
                className={`chip ${uiState.selectedAvailability === 'all' ? 'active' : ''}`}
                onClick={() => dispatchUi({ type: 'setAvailabilityFilter', payload: 'all' })}
              >
                All availability
              </button>
              {AVAILABILITY_OPTIONS.map((availability) => (
                <button
                  key={availability}
                  className={`chip ${uiState.selectedAvailability === availability ? 'active' : ''}`}
                  onClick={() => dispatchUi({ type: 'setAvailabilityFilter', payload: availability })}
                >
                  {availability}
                </button>
              ))}
            </div>

            <p className="chip-label">Rate range</p>
            <div className="chip-group">
              {RATE_CHIPS.map((rateChip) => (
                <button
                  key={rateChip.value}
                  className={`chip ${uiState.selectedRate === rateChip.value ? 'active' : ''}`}
                  onClick={() => dispatchUi({ type: 'setRateFilter', payload: rateChip.value })}
                >
                  {rateChip.label}
                </button>
              ))}
            </div>
          </div>
          {jsonStatus && <p className="json-status">{jsonStatus}</p>}
          {controlStatus && <p className="json-status">{controlStatus}</p>}
        </section>

        <section className="cards-section" aria-label="Talent profiles">
          <section className="demo-checklist" aria-label="Presenter checklist">
            <p className="chip-label">Demo Checklist</p>
            <div className="checklist-row">
              <span className={numberOfCards >= DEMO_SCENARIO_COUNT ? 'done' : ''}>
                {numberOfCards >= DEMO_SCENARIO_COUNT ? '✓' : '○'} Load 500+
              </span>
              <span
                className={
                  uiState.searchTerm.trim() ||
                  uiState.selectedRole !== 'all' ||
                  uiState.selectedAvailability !== 'all' ||
                  uiState.selectedRate !== RATE_FILTERS.ALL
                    ? 'done'
                    : ''
                }
              >
                {uiState.searchTerm.trim() ||
                uiState.selectedRole !== 'all' ||
                uiState.selectedAvailability !== 'all' ||
                uiState.selectedRate !== RATE_FILTERS.ALL
                  ? '✓'
                  : '○'}{' '}
                Filter/Search
              </span>
              <span className={shortlistedTalent.length > 0 ? 'done' : ''}>
                {shortlistedTalent.length > 0 ? '✓' : '○'} Shortlist Talent
              </span>
              <span
                className={
                  shortlistedTalent.some((talent) => (talent.hireStatus || HIRE_STATUSES[0]) !== HIRE_STATUSES[0])
                    ? 'done'
                    : ''
                }
              >
                {shortlistedTalent.some((talent) => (talent.hireStatus || HIRE_STATUSES[0]) !== HIRE_STATUSES[0])
                  ? '✓'
                  : '○'}{' '}
                Move Hire Status
              </span>
              <span className={demoProgress.viewedDetail ? 'done' : ''}>
                {demoProgress.viewedDetail ? '✓' : '○'} Open Detail Drawer
              </span>
              <span className={demoProgress.exportedData ? 'done' : ''}>
                {demoProgress.exportedData ? '✓' : '○'} Export Data
              </span>
            </div>
          </section>
          {!uiState.isLoading && visibleAssistants.length > 0 && (
            <div className="result-summary">
              {viewMode === 'cards'
                ? `Showing ${pagedAssistants.length} of ${visibleAssistants.length} talents (page ${currentPage}/${totalPages})`
                : `Showing ${visibleAssistants.length} talents in virtualized list mode`}
            </div>
          )}
          {uiState.isLoading ? (
            <p className="loading-state">Refreshing talent pool...</p>
          ) : pagedAssistants.length > 0 ? (
            viewMode === 'cards' ? (
              <div className="cards-grid">
                {pagedAssistants.map((assistant, index) => (
                  <ProfileCards
                    key={assistant.id}
                    assistant={assistant}
                    onLikeClick={() => handleLikeClick(assistant.id)}
                    onAddClick={() => handleAddUser(assistant)}
                    onViewDetails={() => {
                      dispatchUi({ type: 'openDrawer', payload: assistant.id });
                      setDemoProgress((previous) => ({ ...previous, viewedDetail: true }));
                    }}
                    isAdded={shortlistedTalent.some((user) => user.id === assistant.id)}
                    hireStatus={getTalentHireStatus(assistant.id)}
                    onInquirySubmit={handleInquirySubmit}
                    animationDelay={index * 40}
                  />
                ))}
              </div>
            ) : (
              <div className="table-shell">
                <table className="talent-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Availability</th>
                      <th>Rate</th>
                      <th>Likes</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                </table>
                <div
                  className="table-viewport"
                  ref={tableViewportRef}
                  style={{ maxHeight: `${TABLE_VIEWPORT_HEIGHT}px`, overflowY: 'auto' }}
                  onScroll={(event) => setTableScrollTop(event.currentTarget.scrollTop)}
                >
                  <div style={{ height: `${tableVirtualRows.totalHeight}px`, position: 'relative' }}>
                    <table className="talent-table">
                      <tbody>
                        {tableVirtualRows.items.map((assistant, rowIndex) => (
                          <tr
                            key={assistant.id}
                            style={{
                              position: 'absolute',
                              top: `${(tableVirtualRows.startIndex + rowIndex) * TABLE_ROW_HEIGHT}px`,
                              left: 0,
                              right: 0,
                              width: '100%',
                              display: 'table',
                              tableLayout: 'fixed',
                              height: `${TABLE_ROW_HEIGHT}px`,
                            }}
                          >
                            <td>{assistant.name}</td>
                            <td>{assistant.role}</td>
                            <td>{assistant.availability}</td>
                            <td>${assistant.hourlyRateUsd}/hr</td>
                            <td>{assistant.likes}</td>
                            <td>{getTalentHireStatus(assistant.id)}</td>
                            <td className="table-actions">
                              <button className="ui-button secondary small" onClick={() => handleLikeClick(assistant.id)}>
                                Like
                              </button>
                              <button className="ui-button secondary small" onClick={() => handleAddUser(assistant)}>
                                {shortlistedTalent.some((user) => user.id === assistant.id) ? 'Shortlisted' : 'Shortlist'}
                              </button>
                              <button
                                className="ui-button secondary small"
                                onClick={() => {
                                  dispatchUi({ type: 'openDrawer', payload: assistant.id });
                                  setDemoProgress((previous) => ({ ...previous, viewedDetail: true }));
                                }}
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            renderEmptyState()
          )}
          {!uiState.isLoading && viewMode === 'cards' && visibleAssistants.length > pageSize && (
            <div className="pagination-bar">
              <button
                className="ui-button secondary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                className="ui-button secondary"
                onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button
                className="ui-button secondary"
                onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                className="ui-button secondary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
              <div className="page-size-control">
                <label htmlFor="pageSizeSelect" className="panel-label">
                  Per page
                </label>
                <select
                  id="pageSizeSelect"
                  className="select-control"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  aria-label="Results per page"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="page-jump-control">
                <label htmlFor="pageJumpInput" className="panel-label">
                  Jump to
                </label>
                <input
                  id="pageJumpInput"
                  className="input-control"
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed) && event.target.value !== '') {
                      setControlStatus('Page must be a number.');
                      return;
                    }
                    const nextPage = Math.min(Math.max(parsed || 1, 1), totalPages);
                    setCurrentPage(nextPage);
                    setControlStatus('');
                  }}
                  aria-label="Jump to page"
                />
              </div>
            </div>
          )}
        </section>
      </main>

      {uiState.isDrawerOpen && selectedTalent && (
        <>
          <div className="drawer-backdrop" onClick={() => dispatchUi({ type: 'closeDrawer' })}></div>
          <aside className="detail-drawer" role="dialog" aria-label="Talent detail drawer">
            <h2>{selectedTalent.name}</h2>
            <p>
              <strong>Role:</strong> {selectedTalent.role}
            </p>
            <p>
              <strong>Availability:</strong> {selectedTalent.availability}
            </p>
            <p>
              <strong>Rate:</strong> ${selectedTalent.hourlyRateUsd}/hr
            </p>
            <p>
              <strong>Experience:</strong> {selectedTalent.yearsExperience} years
            </p>
            <p>
              <strong>Projects:</strong> {selectedTalent.projectsCompleted}
            </p>
            <p>
              <strong>Avg Response:</strong> {selectedTalent.responseTimeHours} hours
            </p>
            <p>
              <strong>Timezone:</strong> {selectedTalent.timezone}
            </p>
            <p>
              <strong>Skills:</strong> {selectedTalent.skills.join(', ')}
            </p>
            <p>
              <strong>Languages:</strong> {selectedTalent.languages.join(', ')}
            </p>
            <p>
              <strong>Hire Status:</strong> {getTalentHireStatus(selectedTalent.id)}
            </p>
            <div className="drawer-actions">
              <button className="ui-button terracotta" onClick={() => handleAddUser(selectedTalent)}>
                {shortlistedTalent.some((talent) => talent.id === selectedTalent.id) ? 'Already Shortlisted' : 'Shortlist'}
              </button>
              <button
                className="ui-button dark"
                onClick={() => handleAdvanceHireStatus(selectedTalent.id)}
                disabled={!shortlistedTalent.some((talent) => talent.id === selectedTalent.id)}
              >
                Advance Hire Status
              </button>
              <button className="ui-button secondary" onClick={() => dispatchUi({ type: 'closeDrawer' })}>
                Close
              </button>
            </div>
          </aside>
        </>
      )}

      {uiState.isAddedModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="Shortlisted talent">
          <div className="modal-background" onClick={() => dispatchUi({ type: 'toggleAddedModal' })}></div>
          <div className="modal-content modal-box">
            <h2>Shortlisted Talent</h2>
            <div className="modal-scroll">
              {shortlistedTalent.length > 0 ? (
                shortlistedTalent.map((user) => (
                  <div className="shortlist-row" key={user.id}>
                    <p>
                      {user.name} ({user.role}) - {user.email}, {user.phone}, {user.country}, ${user.hourlyRateUsd}/hr
                    </p>
                    <button className="ui-button secondary small" onClick={() => handleAdvanceHireStatus(user.id)}>
                      Status: {user.hireStatus || HIRE_STATUSES[0]}
                    </button>
                  </div>
                ))
              ) : (
                <p>No talent shortlisted yet.</p>
              )}
            </div>
            <button className="ui-button secondary" onClick={() => dispatchUi({ type: 'toggleAddedModal' })}>
              Close
            </button>
          </div>
        </div>
      )}

      {uiState.isInquiryModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="Hiring inquiries">
          <div className="modal-background" onClick={() => dispatchUi({ type: 'toggleInquiryModal' })}></div>
          <div className="modal-content modal-box">
            <h2>Hiring Inquiries</h2>
            <div className="modal-scroll">
              {sentInquiries.length > 0 ? (
                sentInquiries.map((inquiry, index) => (
                  <p key={`${inquiry.email}-${index}`}>
                    <strong>Name:</strong> {inquiry.name}, <strong>Email:</strong> {inquiry.email},{' '}
                    <strong>Mobile:</strong> {inquiry.phone}, <strong>Message:</strong> {inquiry.message}
                  </p>
                ))
              ) : (
                <p>No inquiries sent.</p>
              )}
            </div>
            <button className="ui-button secondary" onClick={() => dispatchUi({ type: 'toggleInquiryModal' })}>
              Close
            </button>
          </div>
        </div>
      )}

      {uiState.isHelpModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="How this works">
          <div className="modal-background" onClick={() => dispatchUi({ type: 'toggleHelpModal' })}></div>
          <div className="modal-content modal-box">
            <h2>How This Works</h2>
            <div className="modal-scroll">
              <p>
                This portal uses deterministic faker data to simulate a real talent marketplace. Change the seed to regenerate a different but stable dataset.
              </p>
              <p>
                Use role/availability/rate chips and search to narrow candidates, then shortlist talent and move them through the hire-status pipeline: New, Contacted, Interview, Hired.
              </p>
              <p>
                Large pool mode (500, 2000, 5000) is optimized through pagination and optional list view so the app can mimic high-volume scenarios without a backend.
              </p>
              <p>
                All shortlist and seed data persist in localStorage. You can export/import JSON for demo portability.
              </p>
            </div>
            <button className="ui-button secondary" onClick={() => dispatchUi({ type: 'toggleHelpModal' })}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className={`chatbot-panel ${uiState.isChatbotVisible ? 'active' : ''}`}>
        {uiState.isChatbotVisible && (
          <Chatbot config={config} messageParser={MessageParser} actionProvider={ActionProvider} />
        )}
      </div>

      <button
        className="chatbot-icon"
        onClick={() => dispatchUi({ type: 'toggleChatbot' })}
        aria-label="Toggle chatbot"
      >
        <i className="fas fa-comment-dots" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default App;
