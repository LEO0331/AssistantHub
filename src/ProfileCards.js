/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import ContactModal from './ContactModal';
import QRCode from 'react-qr-code';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';

const markerIcon = new Icon({
  iconUrl: markerIconPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ProfileCards({
  assistant,
  onLikeClick,
  onAddClick,
  isAdded,
  onInquirySubmit,
  onViewDetails,
  hireStatus,
  animationDelay = 0,
}) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState({ email: false, phone: false });

  const handleSubmit = (message) => {
    onInquirySubmit({
      name: assistant.name,
      email: assistant.email,
      phone: assistant.phone,
      message,
    });
    setIsContactModalOpen(false);
  };

  const handleCopy = (type) => {
    setCopyStatus((previous) => ({ ...previous, [type]: true }));
    setTimeout(() => {
      setCopyStatus((previous) => ({ ...previous, [type]: false }));
    }, 2000);
  };

  return (
    <article className="profile-card" style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="card-head">
        <img
          alt={`${assistant.name} avatar`}
          src={assistant.avatarUrl}
          className="avatar"
          width="72"
          height="72"
          loading="lazy"
          decoding="async"
        />
        <div>
          <button
            type="button"
            className="name-button"
            onClick={() => setIsContactModalOpen(true)}
            aria-label={`Open contact form for ${assistant.name}`}
          >
            {assistant.name}
          </button>
          <p className="talent-role">{assistant.role}</p>
          <p className="talent-meta">
            {assistant.availability} at ${assistant.hourlyRateUsd}/hr
          </p>
          <p className="status-chip">Hire Status: {hireStatus}</p>
          <p className="talent-meta">
            {assistant.yearsExperience} yrs exp | {assistant.projectsCompleted} projects
          </p>
          <div className="qr-row">
            <QRCode value={assistant.phone} size={34} />
          </div>
        </div>
      </div>

      <p className="talent-skills">Skills: {assistant.skills.join(', ')}</p>
      <p className="talent-skills">
        Languages: {assistant.languages.join(', ')} | TZ: {assistant.timezone} | Avg reply: {assistant.responseTimeHours}h
      </p>

      <div className="stat-row">
        <button
          type="button"
          className="icon-button"
          onClick={onLikeClick}
          aria-label={`Like ${assistant.name}`}
        >
          <i className="fa fa-thumbs-up" aria-hidden="true"></i>
        </button>
        <span>{assistant.likes} Likes</span>
      </div>

      <div className="stat-row">
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsMapModalOpen(true)}
          aria-label={`Show location for ${assistant.name}`}
        >
          <i className="fa fa-map-marker" aria-hidden="true"></i>
        </button>
        <span>{assistant.country}</span>
      </div>

      <div className="contact-copy">
        <p>Reach out anytime:</p>
        <div className="copy-row">
          <strong>{assistant.email}</strong>
          <CopyToClipboard text={assistant.email} onCopy={() => handleCopy('email')}>
            <button type="button" className="ui-button secondary small" aria-label="Copy email">
              {copyStatus.email ? 'Copied!' : 'Copy'}
            </button>
          </CopyToClipboard>
        </div>
        <div className="copy-row">
          <strong>{assistant.phone}</strong>
          <CopyToClipboard text={assistant.phone} onCopy={() => handleCopy('phone')}>
            <button type="button" className="ui-button secondary small" aria-label="Copy phone">
              {copyStatus.phone ? 'Copied!' : 'Copy'}
            </button>
          </CopyToClipboard>
        </div>
      </div>

      <div className="card-action-row">
        <button type="button" className="ui-button terracotta add-button" onClick={onAddClick} disabled={isAdded}>
          {isAdded ? 'Shortlisted' : 'Shortlist'}
        </button>
        <button type="button" className="ui-button dark" onClick={onViewDetails}>
          View Details
        </button>
      </div>

      <ContactModal
        isActive={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        user={{ name: assistant.name, email: assistant.email, phone: assistant.phone }}
        onSubmit={handleSubmit}
      />

      {isMapModalOpen && (
        <div className="modal is-active" role="dialog" aria-modal="true" aria-label="Assistant location">
          <div className="modal-background" onClick={() => setIsMapModalOpen(false)}></div>
          <div className="modal-content modal-box">
            <h2>Location</h2>
            <MapContainer
              center={[Number(assistant.coordinates.lat), Number(assistant.coordinates.lng)]}
              zoom={5}
              style={{ height: '320px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[Number(assistant.coordinates.lat), Number(assistant.coordinates.lng)]} icon={markerIcon}>
                <Popup>{assistant.country}</Popup>
              </Marker>
            </MapContainer>
            <button type="button" className="ui-button secondary" onClick={() => setIsMapModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default ProfileCards;
