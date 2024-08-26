/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
import ContactModal from './ContactModal'; 
import QRCode from 'react-qr-code';
import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import {Icon} from 'leaflet';

function ProfileCards(props) {
  const {name, email, imageUrl, cell, country, likes, onLikeClick, onAddClick, isAdded, onInquirySubmit, location} = props;

  // State to manage the modal visibility
  const [isModalActive, setIsModalActive] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

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

  const handleLocationClick = () => {
    setIsMapModalOpen(true);
  };

  const handleCloseMapModal = () => {
    setIsMapModalOpen(false);
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
              <span className="icon mr-1" onClick={handleLocationClick} style={{ cursor: 'pointer' }}>
                <i className="fa fa-map-marker" aria-hidden="true"></i> 
              </span>
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
      {/* Modal for Map - lat and long is random not match */}
      {isMapModalOpen && (
        <div className="modal is-active">
          <div className="modal-background" onClick={handleCloseMapModal}></div>
          <div className="modal-content">
            <div className="box">
              <h2 className="title">Location</h2>
              <MapContainer
                center={[location.coordinates.latitude, location.coordinates.longitude]}
                zoom={10}
                style={{ height: '300px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[location.coordinates.latitude, location.coordinates.longitude]} icon={new Icon({iconUrl: markerIconPng, iconSize: [25, 41], iconAnchor: [12, 41]})}>
                  <Popup>
                    Location: {country}
                  </Popup>
                </Marker>
              </MapContainer>
              <button className="button is-danger mt-3" onClick={handleCloseMapModal}>Close</button>
            </div>
          </div>
          <button className="modal-close is-large" aria-label="close" onClick={handleCloseMapModal}></button>
        </div>
      )}
    </div>
  )
}

export default ProfileCards;
