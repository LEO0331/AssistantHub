import 'bulma/css/bulma.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProfileCards from './ProfileCards';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './SearchBar';
import { CSVLink } from "react-csv";

function App() {
  const [users, setUsers] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(1); // Default to 1 card
  const [likes, setLikes] = useState([]); // Array to keep track of likes for each card
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [sortOrder, setSortOrder] = useState('highToLow'); // Default sort order
  const [addedUsers, setAddedUsers] = useState([]); // Array to store added users
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
  const [sentInquiries, setSentInquiries] = useState([]);
  const [isInquiryModalActive, setIsInquiryModalActive] = useState(false);

  // Fetch random users based on the number of cards
  const fetchUsers = async (num) => {
    if (num === 0) {
      setUsers([]); // Clear the users array if input is 0
      setLikes([]); // Clear likes array
      setAddedUsers([]); // Clear added users array
      return;
    }
    try {
      const response = await axios.get(`https://randomuser.me/api/?results=${num}`);
      setUsers(response.data.results);
      setLikes(new Array(num).fill(0)); // Initialize likes array with zeros
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers(numberOfCards);
  }, [numberOfCards]);

  const handleInputChange = (e) => {
    const num = Math.min(Number(e.target.value), 10); // Cap the number of cards to 10
    setNumberOfCards(num);
    fetchUsers(num); // Fetch new users when the number changes
  };

  const handleAddCard = () => {
    if (numberOfCards < 10) {
      setNumberOfCards(numberOfCards + 1);
    }
  };

  const handleMinusCard = () => {
    if (numberOfCards > 0) {
      setNumberOfCards(numberOfCards - 1);
    }
  };

  const handleLikeClick = (index) => {
    const newLikes = [...likes];
    newLikes[index] += 1;
    setLikes(newLikes);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    `${user.name.first} ${user.name.last}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const likeA = likes[users.indexOf(a)];
    const likeB = likes[users.indexOf(b)];
    return sortOrder === 'highToLow' ? likeB - likeA : likeA - likeB;
  });

  const handleAddUser = (user) => {
    const userIdentifier = user.email; // Using email as a unique identifier
    if (!addedUsers.some((u) => u.email === userIdentifier)) {
      const newUser = {
        name: `${user.name.first} ${user.name.last}`,
        email: user.email,
        cell: user.cell,
        country: user.location.country,
      };

      setAddedUsers([...addedUsers, newUser]);
    }
  };

  const handleViewAddedUsers = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInquirySubmit = (inquiry) => {
    setSentInquiries((prevInquiries) => [...prevInquiries, inquiry]);
  };

  const toggleInquiryModal = () => {
    setIsInquiryModalActive(!isInquiryModalActive);
  };

  return (
    <div>
      <section className="hero is-link">
        <div className="hero-body">
          <p className="title">AssistantHub</p>
          <p className="subtitle">Your next personal Assistants!</p>
          <p className="subtitle">todo: unit testing, caching, easy chatbot right down corner, copy to clipboard in inquiry modal</p>
        </div>
      </section>
      <br />
      <div className="field is-grouped">
        <div className="control ml-1">
          <label htmlFor="numCards" className="tag is-info is-large">
            Find Incredible Assistants
          </label>
        </div>
        <div className="control is-expanded">
          <input
            className="input is-info"
            type="number"
            id="numCards"
            value={numberOfCards}
            onChange={handleInputChange}
            min="0"
            max="10"
          />
        </div>
        <div className="control">
          <button className="button is-info is-light mr-1" onClick={handleAddCard}>
            <span className="icon">
              <i className="fas fa-plus"></i>
            </span>
          </button>
          <button className="button is-danger is-light" onClick={handleMinusCard}>
            <span className="icon">
              <i className="fas fa-minus"></i>
            </span>
          </button>
        </div>
        <div className="control">
          <SearchBar value={searchTerm} onChange={handleSearchChange} />
        </div>
        <div className="control select is-info">
          <select value={sortOrder} onChange={handleSortChange}>
              <option value="highToLow">Likes: High to Low</option>
              <option value="lowToHigh">Likes: Low to High</option>
          </select>
        </div>
        <div className="control">
          <button className="button is-warning" onClick={toggleInquiryModal}>
            View Inquiry Sent
          </button>
        </div>
        <div className="control">
          <button className="button is-primary" onClick={handleViewAddedUsers}>
            View Added Info
          </button>
        </div>
        <div className="control mr-1">
          <CSVLink
            data={addedUsers}
            filename={"added_users.csv"}
            className="button is-info"
          >
            Export Added Info
          </CSVLink>
        </div>
      </div>
      <div className="container">
        <section className="section">
          <div className="columns is-multiline">
            {sortedUsers.length > 0 ? (
              sortedUsers.map((user, index) => (
                <div className="column is-half" key={index}>
                  <ProfileCards
                    name={`${user.name.first} ${user.name.last}`}
                    email={user.email}
                    imageUrl={user.picture.large}
                    cell={user.cell}
                    country={user.location.country}
                    likes={likes[users.indexOf(user)]}
                    onLikeClick={() => handleLikeClick(users.indexOf(user))}
                    onAddClick={() => handleAddUser(user)}
                    isAdded={addedUsers.some((u) => u.email === user.email)}
                    onInquirySubmit={handleInquirySubmit}
                    location={{
                      coordinates: {
                        latitude: user.location.coordinates.latitude,
                        longitude: user.location.coordinates.longitude,
                      },
                    }}
                  />
                </div>
              ))
            ) : (
              <p>No profile cards to display</p>
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="modal is-active">
          <div className="modal-background"></div>
          <div className="modal-content">
            <div className="box">
              <h2 className="title">Added Assistants</h2>
              <div className="content">
                {addedUsers.length > 0 ? addedUsers.map((user, index) => (
                  <p key={index}>
                    {user.name}, {user.email}, {user.cell}, {user.country}
                  </p>
                )) : <p>No assistant added.</p>}
              </div>
              <button className="button" onClick={handleCloseModal}>Close</button>
            </div>
          </div>
          <button className="modal-close is-large" aria-label="close" onClick={handleCloseModal}></button>
        </div>
      )}

      {/* Modal for viewing sent inquiries */}
      {isInquiryModalActive && (
        <div className={`modal ${isInquiryModalActive ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={toggleInquiryModal}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Sent Inquiries</p>
              <button className="delete" aria-label="close" onClick={toggleInquiryModal}></button>
            </header>
            <section className="modal-card-body">
              {sentInquiries.length > 0 ? (
                sentInquiries.map((inquiry, index) => (
                  <p key={index}>
                    <strong>Name:</strong> {inquiry.name}, <strong>Email:</strong> {inquiry.email}, <strong>Mobile:</strong> {inquiry.cell}, <strong>Message:</strong> {inquiry.message}
                  </p>
                ))
              ) : (
                <p>No inquiries sent.</p>
              )}
            </section>
            <footer className="modal-card-foot">
              <button className="button" onClick={toggleInquiryModal}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
