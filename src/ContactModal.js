/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';

const ContactModal = ({ isActive, onClose, onSubmit, user }) => {
  const [inquiry, setInquiry] = useState('');
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setInquiry('');
      setIsSent(false);
    }
  }, [isActive]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(inquiry);
    setInquiry('');
    setIsSent(true);
    onClose();
  };

  return (
    <div className={`modal ${isActive ? 'is-active' : ''}`} role="dialog" aria-modal="true" aria-label="Contact modal">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-content modal-box">
        <h2>Contact {user.name}</h2>
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Phone:</strong> {user.phone}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="inquiry" className="panel-label">
            Inquiry
          </label>
          <textarea
            id="inquiry"
            className="text-area"
            value={inquiry}
            onChange={(event) => setInquiry(event.target.value)}
            placeholder="Please write your inquiry here..."
            required
          ></textarea>

          <div className="modal-actions">
            <button type="submit" className="ui-button terracotta">
              Send
            </button>
            <button type="button" className="ui-button secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
        {isSent && <p className="success-note">Inquiry sent successfully.</p>}
      </div>
    </div>
  );
};

export default ContactModal;
