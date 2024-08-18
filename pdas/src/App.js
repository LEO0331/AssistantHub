import 'bulma/css/bulma.css';
import ProfileCards from "./ProfileCards";
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [users, setUsers] = useState([]);
  const [numberOfCards, setNumberOfCards] = useState(1); // Default to 1 card

  // Fetch random users based on the number of cards
  const fetchUsers = async (num) => {
    if (num === 0) {
        setUsers([]); // Clear the users array if input is 0
        return;
      }
    try {
      const response = await axios.get(`https://randomuser.me/api/?results=${num}`);
      setUsers(response.data.results);
    } catch (error) {
      console.error("Error fetching users:", error);
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

  return (
    <div>
      <section className="hero is-link">
        <div className="hero-body">
            <p className="title">Assistants</p>
            <p className="subtitle">Welcome to Virtual Assistants!</p>
        </div>
      </section>
      <br />
      <div>
        <label htmlFor="numCards" className="tag is-info is-large">Find your next incredible assistant(s): </label>
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
      <div className="container"> 
        <section className="section">
            <div className="columns is-multiline">
            {users.length > 0 ? (
            users.map((user, index) => ( 
              <div className="column is-half" key={index}>
                <ProfileCards
                  name={`${user.name.first} ${user.name.last}`}
                  email={user.email}
                  phone={user.phone}
                  imageUrl={user.picture.large}
                  cell={user.cell}
                  description={user.location.timezone.description}
                  id={user.id.name}
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
