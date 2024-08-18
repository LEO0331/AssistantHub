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
    <div className="App">
      <div className="header">
        <h1>Digital Assistants</h1>
      </div>
      <div>
        <label htmlFor="numCards">Please enter numbers of profile cards you would like to generate (Max 10): </label>
        <input
          type="number"
          id="numCards"
          value={numberOfCards}
          onChange={handleInputChange}
          min="0"
          max="10"
        />
      </div>
      <div>
        {users.length > 0 ? (
          users.map((user, index) => (
            <ProfileCards
              key={index} // Unique key for each element
              name={`${user.name.first} ${user.name.last}`}
              email={user.email}
              phone={user.phone}
            />
          ))
        ) : (
          <p>No profile cards to display</p>
        )}
      </div>
    </div>
  );
}

export default App;
