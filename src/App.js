import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CSVLink } from 'react-csv';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import ProfileCards from './ProfileCards';
import SearchBar from './SearchBar';
import config from './ChatbotConfig';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { AVAILABILITY_OPTIONS, BASE_SEED, generateAssistants, TALENT_ROLES } from './data/assistantFactory';
import { usePersistentState } from './hooks/usePersistentState';
import { initialUiState, RATE_FILTERS, SORT_OPTIONS, uiReducer } from './state/uiReducer';
import './App.css';

const MAX_CARDS = 5000;
const DEFAULT_CARDS = 6;
const DEFAULT_PAGE_SIZE = 24;
const SHORTLIST_STORAGE_KEY = 'talentShortlist';
const TALENT_SEED_KEY = 'talentSeed';
const HIRE_STATUSES = ['New', 'Contacted', 'Interview', 'Hired'];

const RATE_CHIPS = [
  { value: RATE_FILTERS.ALL, label: 'All rates' },
  { value: RATE_FILTERS.UNDER_40, label: 'Under $40/hr' },
  { value: RATE_FILTERS.BETWEEN_40_60, label: '$40-$60/hr' },
  { value: RATE_FILTERS.OVER_60, label: '$60+/hr' },
];

const isRateMatch = (rate, filter) => {
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

const getNextStatus = (currentStatus) => {
  const index = HIRE_STATUSES.indexOf(currentStatus);
  if (index < 0 || index === HIRE_STATUSES.length - 1) {
    return HIRE_STATUSES[0];
  }
  return HIRE_STATUSES[index + 1];
};

const readJsonFile = (file) => {
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

function App() {
  const [assistants, setAssistants] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(DEFAULT_CARDS);
  const [currentPage, setCurrentPage] = useState(1);
  const [uiState, dispatchUi] = useReducer(uiReducer, initialUiState);
  const [shortlistedTalent, setShortlistedTalent] = usePersistentState(SHORTLIST_STORAGE_KEY, []);
  const [seed, setSeed] = usePersistentState(TALENT_SEED_KEY, BASE_SEED);
  const [sentInquiries, setSentInquiries] = useState([]);
  const [jsonStatus, setJsonStatus] = useState('');
  const importInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    dispatchUi({ type: 'setLoading', payload: true });

    const timer = setTimeout(
      () => {
        if (!isMounted) {
          return;
        }
        setAssistants(generateAssistants(numberOfCards, { seed }));
        dispatchUi({ type: 'setLoading', payload: false });
      },
      numberOfCards >= 7 ? 180 : 0
    );

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [numberOfCards, seed]);

  useEffect(() => {
    if (!uiState.selectedTalentId) {
      return;
    }

    const exists = assistants.some((assistant) => assistant.id === uiState.selectedTalentId);
    if (!exists) {
      dispatchUi({ type: 'closeDrawer' });
    }
  }, [assistants, uiState.selectedTalentId]);

  const normalizedSearch = uiState.searchTerm.trim().toLowerCase();

  const visibleAssistants = useMemo(() => {
    const filtered = assistants.filter((assistant) => {
      const keyword = `${assistant.name} ${assistant.role} ${assistant.skills.join(' ')}`.toLowerCase();
      const roleMatch = uiState.selectedRole === 'all' || assistant.role === uiState.selectedRole;
      const availabilityMatch =
        uiState.selectedAvailability === 'all' || assistant.availability === uiState.selectedAvailability;
      const rateMatch = isRateMatch(assistant.hourlyRateUsd, uiState.selectedRate);

      return keyword.includes(normalizedSearch) && roleMatch && availabilityMatch && rateMatch;
    });

    return filtered.sort((a, b) => {
      if (uiState.sortOrder === SORT_OPTIONS.HIGH_TO_LOW) {
        return b.likes - a.likes;
      }
      return a.likes - b.likes;
    });
  }, [
    assistants,
    normalizedSearch,
    uiState.selectedRole,
    uiState.selectedAvailability,
    uiState.selectedRate,
    uiState.sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleAssistants.length / DEFAULT_PAGE_SIZE));

  const pagedAssistants = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * DEFAULT_PAGE_SIZE;
    return visibleAssistants.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [visibleAssistants, currentPage, totalPages]);

  const selectedTalent = useMemo(
    () => assistants.find((assistant) => assistant.id === uiState.selectedTalentId) || null,
    [assistants, uiState.selectedTalentId]
  );

  const handleInputChange = (event) => {
    const next = Math.min(Math.max(Number(event.target.value) || 0, 0), MAX_CARDS);
    setNumberOfCards(next);
    setCurrentPage(1);
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
      setSeed(nextSeed);
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [uiState.searchTerm, uiState.selectedRole, uiState.selectedAvailability, uiState.selectedRate, uiState.sortOrder]);

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
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await readJsonFile(file);
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.shortlist)) {
        setShortlistedTalent(parsed.shortlist);
      }
      if (Array.isArray(parsed.inquiries)) {
        setSentInquiries(parsed.inquiries);
      }
      if (Number.isFinite(Number(parsed.seed))) {
        setSeed(Number(parsed.seed));
      }
      setJsonStatus('Demo data imported.');
    } catch {
      setJsonStatus('Import failed: invalid JSON format.');
    } finally {
      event.target.value = '';
    }
  };

  const renderEmptyState = () => {
    if (numberOfCards === 0) {
      return <p className="empty-state">Talent list is empty. Increase card count to load candidates.</p>;
    }
    if (normalizedSearch || uiState.selectedRole !== 'all' || uiState.selectedAvailability !== 'all' || uiState.selectedRate !== RATE_FILTERS.ALL) {
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

            <SearchBar
              value={uiState.searchTerm}
              onChange={(event) => dispatchUi({ type: 'setSearch', payload: event.target.value })}
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
        </section>

        <section className="cards-section" aria-label="Talent profiles">
          {!uiState.isLoading && visibleAssistants.length > 0 && (
            <div className="result-summary">
              Showing {pagedAssistants.length} of {visibleAssistants.length} talents (page {currentPage}/{totalPages})
            </div>
          )}
          {uiState.isLoading ? (
            <p className="loading-state">Refreshing talent pool...</p>
          ) : pagedAssistants.length > 0 ? (
            <div className="cards-grid">
              {pagedAssistants.map((assistant, index) => (
                <ProfileCards
                  key={assistant.id}
                  assistant={assistant}
                  onLikeClick={() => handleLikeClick(assistant.id)}
                  onAddClick={() => handleAddUser(assistant)}
                  onViewDetails={() => dispatchUi({ type: 'openDrawer', payload: assistant.id })}
                  isAdded={shortlistedTalent.some((user) => user.id === assistant.id)}
                  hireStatus={getTalentHireStatus(assistant.id)}
                  onInquirySubmit={handleInquirySubmit}
                  animationDelay={index * 40}
                />
              ))}
            </div>
          ) : (
            renderEmptyState()
          )}
          {!uiState.isLoading && visibleAssistants.length > DEFAULT_PAGE_SIZE && (
            <div className="pagination-bar">
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
              <strong>Skills:</strong> {selectedTalent.skills.join(', ')}
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
