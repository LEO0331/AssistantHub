/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
import ContactModal from './ContactModal'; 
import QRCode from 'react-qr-code';
import React, { useState } from 'react';

function ProfileCards(props) {
  const {name, email, imageUrl, cell, country, likes, onLikeClick, onAddClick, isAdded, onInquirySubmit} = props;

  // State to manage the modal visibility
  const [isModalActive, setIsModalActive] = useState(false);

  const handleNameClick = () => {
    setIsModalActive(true);
  };

  const closeModal = () => {
    setIsModalActive(false);
  };

  const handleSubmit = (message) => {
    onInquirySubmit({ name, email, cell, message });
    closeModal();
  };

  return(
    <div className="card">
      <div className="card-content">
        <div className="media">
          <div className="media-left">
            <figure className="image is-72x72">
              <img alt="images" src={imageUrl} />
            </figure>
          </div>
          <div className="media-content">
            <p className="title is-2" onClick={handleNameClick} style={{ cursor: 'pointer' }}>
              {name}
            </p>
            <p className="subtitle">
              <QRCode value={cell} size={30} />
            </p>
            <p className="title is-4">
              <span className="icon mr-1" onClick={onLikeClick} style={{ cursor: 'pointer' }}>
                <i className="fa fa-thumbs-up" aria-hidden="true"></i> 
              </span>
              {likes} {likes === 0 ? 'Like' : likes === 1 ? 'Like' : 'Likes'}
            </p>
            <p className="subtitle">
              {country}
            </p>
          </div>
        </div>
        <div className="content">
          Contact me at <strong>{email}</strong> or <strong>{cell}</strong> !
        </div>
      </div>
      <footer className="card-footer">
        <button
          className="button is-link card-footer-item"
          onClick={onAddClick}
          disabled={isAdded}
        >
          {isAdded ? 'Added' : 'Add'}
        </button>
      </footer>
      <ContactModal
        isActive={isModalActive}
        onClose={closeModal}
        user={{ name, email, cell }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default ProfileCards;
