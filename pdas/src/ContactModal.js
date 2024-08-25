/* eslint-disable react/prop-types */
import React, { useState } from 'react';

const ContactModal = ({ isActive, onClose, user }) => {
  const [inquiry, setInquiry] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Inquiry sent to ${user.name}: ${inquiry}`);
    setInquiry('');
    onClose(); // Close the modal after sending the inquiry
  };

  return (
    <div className={`modal ${isActive ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Contact {user.name}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.cell}</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Your Inquiry</label>
              <div className="control">
                <textarea
                  className="textarea"
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  placeholder="Please write your inquiry here..."
                  required
                ></textarea>
              </div>
            </div>
            <footer className="modal-card-foot">
              <button type="submit" className="button is-success mr-1">Send</button>
              <button type="button" className="button" onClick={onClose}>Cancel</button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ContactModal;
