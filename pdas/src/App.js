import 'bulma/css/bulma.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProfileCards from './ProfileCards';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './SearchBar';

function App() {
  const [users, setUsers] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(1); // Default to 1 card
  const [likes, setLikes] = useState([]); // Array to keep track of likes for each card
  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  // Fetch random users based on the number of cards
  const fetchUsers = async (num) => {
    if (num === 0) {
      setUsers([]); // Clear the users array if input is 0
      setLikes([]); // Clear likes array
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

  return (
    <div>
      <section className="hero is-link">
        <div className="hero-body">
          <p className="title">Assistants</p>
          <p className="subtitle">Welcome to Virtual Assistants!</p>
        </div>
      </section>
      <br />
      <div className="field is-grouped">
        <div className="control" style={{ marginLeft: '0.5rem' }}>
          <label htmlFor="numCards" className="tag is-info is-large">
            Find your next incredible assistants
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
        <div className="control" style={{ marginRight: '0.5rem' }}>
          <button className="button is-info is-light" onClick={handleAddCard} style={{ marginRight: '0.5rem' }}>
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
        <div className="control" style={{ marginRight: '0.5rem' }}>
          <SearchBar value={searchTerm} onChange={handleSearchChange} />
        </div>
      </div>
      
      <div className="container">
        <section className="section">
          <div className="columns is-multiline">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <div className="column is-half" key={index}>
                  <ProfileCards
                    name={`${user.name.first} ${user.name.last}`}
                    email={user.email}
                    imageUrl={user.picture.large}
                    cell={user.cell}
                    description={user.location.timezone.description}
                    id={user.id.name}
                    likes={likes[index]}
                    onLikeClick={() => handleLikeClick(index)}
                  />
                </div>
              ))
            ) : (
              <p>No profile cards to display</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
