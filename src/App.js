import React, { useEffect, useMemo, useState } from 'react';
import { CSVLink } from 'react-csv';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import ProfileCards from './ProfileCards';
import SearchBar from './SearchBar';
import config from './ChatbotConfig';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { generateAssistants } from './data/assistantFactory';
import './App.css';

const MAX_CARDS = 10;
const STORAGE_KEY = 'addedUsers';

const parseStoredUsers = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function App() {
  const [assistants, setAssistants] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('highToLow');
  const [addedUsers, setAddedUsers] = useState(parseStoredUsers);
  const [isAddedModalOpen, setIsAddedModalOpen] = useState(false);
  const [sentInquiries, setSentInquiries] = useState([]);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isChatbotVisible, setIsChatbotVisible] = useState(false);

  useEffect(() => {
    setAssistants(generateAssistants(numberOfCards));
  }, [numberOfCards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addedUsers));
  }, [addedUsers]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleAssistants = useMemo(() => {
    const filtered = assistants.filter((assistant) =>
      assistant.name.toLowerCase().includes(normalizedSearch)
    );

    return filtered.sort((a, b) => {
      if (sortOrder === 'highToLow') {
        return b.likes - a.likes;
      }
      return a.likes - b.likes;
    });
  }, [assistants, normalizedSearch, sortOrder]);

  const handleInputChange = (event) => {
    const next = Math.min(Math.max(Number(event.target.value) || 0, 0), MAX_CARDS);
    setNumberOfCards(next);
  };

  const handleAddCard = () => {
    setNumberOfCards((previous) => Math.min(previous + 1, MAX_CARDS));
  };

  const handleMinusCard = () => {
    setNumberOfCards((previous) => Math.max(previous - 1, 0));
  };

  const handleLikeClick = (id) => {
    setAssistants((previous) =>
      previous.map((assistant) =>
        assistant.id === id ? { ...assistant, likes: assistant.likes + 1 } : assistant
      )
    );
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleAddUser = (assistant) => {
    setAddedUsers((previous) => {
      if (previous.some((stored) => stored.id === assistant.id)) {
        return previous;
      }

      return [
        ...previous,
        {
          id: assistant.id,
          name: assistant.name,
          email: assistant.email,
          phone: assistant.phone,
          country: assistant.country,
        },
      ];
    });
  };

  const handleInquirySubmit = (inquiry) => {
    setSentInquiries((previous) => [...previous, inquiry]);
  };

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <p className="hero-title">AssistantHub</p>
        <p className="hero-subtitle">Your thoughtful assistant directory.</p>
      </header>

      <main className="content-shell">
        <section className="controls-panel" aria-label="Assistant controls">
          <label htmlFor="numCards" className="panel-label">
            Find Incredible Assistants
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

            <SearchBar value={searchTerm} onChange={handleSearchChange} />

            <select
              className="select-control"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort by likes"
            >
              <option value="highToLow">Likes: High to Low</option>
              <option value="lowToHigh">Likes: Low to High</option>
            </select>

            <button className="ui-button dark" onClick={() => setIsInquiryModalOpen(true)}>
              View Inquiry Sent
            </button>
            <button className="ui-button dark" onClick={() => setIsAddedModalOpen(true)}>
              View Added Info
            </button>

            <CSVLink data={addedUsers} filename="added_users.csv" className="ui-button terracotta csv-link">
              Export Added Info
            </CSVLink>
          </div>
        </section>

        <section className="cards-section" aria-label="Assistant profiles">
          {visibleAssistants.length > 0 ? (
            <div className="cards-grid">
              {visibleAssistants.map((assistant) => (
                <ProfileCards
                  key={assistant.id}
                  assistant={assistant}
                  onLikeClick={() => handleLikeClick(assistant.id)}
                  onAddClick={() => handleAddUser(assistant)}
                  isAdded={addedUsers.some((user) => user.id === assistant.id)}
                  onInquirySubmit={handleInquirySubmit}
                />
              ))}
            </div>
          ) : (
            <p className="empty-state">No profile cards to display.</p>
          )}
        </section>
      </main>

      {isAddedModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="Added assistants">
          <div className="modal-background" onClick={() => setIsAddedModalOpen(false)}></div>
          <div className="modal-content modal-box">
            <h2>Added Assistants</h2>
            <div className="modal-scroll">
              {addedUsers.length > 0 ? (
                addedUsers.map((user) => (
                  <p key={user.id}>
                    {user.name}, {user.email}, {user.phone}, {user.country}
                  </p>
                ))
              ) : (
                <p>No assistant added.</p>
              )}
            </div>
            <button className="ui-button secondary" onClick={() => setIsAddedModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {isInquiryModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="Sent inquiries">
          <div className="modal-background" onClick={() => setIsInquiryModalOpen(false)}></div>
          <div className="modal-content modal-box">
            <h2>Sent Inquiries</h2>
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
            <button className="ui-button secondary" onClick={() => setIsInquiryModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className={`chatbot-panel ${isChatbotVisible ? 'active' : ''}`}>
        {isChatbotVisible && (
          <Chatbot config={config} messageParser={MessageParser} actionProvider={ActionProvider} />
        )}
      </div>

      <button
        className="chatbot-icon"
        onClick={() => setIsChatbotVisible((previous) => !previous)}
        aria-label="Toggle chatbot"
      >
        <i className="fas fa-comment-dots" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default App;
