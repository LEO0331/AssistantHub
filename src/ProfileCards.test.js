/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
/* eslint-disable no-undef */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileCards from './ProfileCards';
import ContactModal from './ContactModal';

jest.mock('./ContactModal', () => jest.fn(() => <div>ContactModal</div>));
jest.mock('react-qr-code', () => () => <div>QRCode</div>);
jest.mock('react-copy-to-clipboard', () => ({
  CopyToClipboard: ({ children, onCopy }) => <div onClick={onCopy}>{children}</div>,
}));
jest.mock('react-leaflet', () => ({
  MapContainer: jest.fn(({ children }) => <div>MapContainer {children}</div>),
  TileLayer: jest.fn(() => <div>TileLayer</div>),
  Marker: jest.fn(({ children }) => <div>Marker {children}</div>),
  Popup: jest.fn(({ children }) => <div>Popup {children}</div>),
}));

describe('ProfileCards', () => {
  const defaultProps = {
    assistant: {
      id: 'assistant-1',
      name: 'John Doe',
      role: 'Executive Assistant',
      skills: ['Calendar Management', 'Inbox Triage'],
      availability: 'Available now',
      hourlyRateUsd: 45,
      email: 'john@example.com',
      phone: '123-456-7890',
      avatarUrl: 'http://example.com/image.jpg',
      country: 'USA',
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
      likes: 5,
    },
    onLikeClick: jest.fn(),
    onAddClick: jest.fn(),
    onViewDetails: jest.fn(),
    isAdded: false,
    hireStatus: 'New',
    onInquirySubmit: jest.fn(),
    animationDelay: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders assistant information', () => {
    render(<ProfileCards {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Executive Assistant')).toBeInTheDocument();
    expect(screen.getByText(/\$45\/hr/)).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('QRCode')).toBeInTheDocument();
    expect(screen.getByText('5 Likes')).toBeInTheDocument();
    expect(screen.getByText('Shortlist')).toBeInTheDocument();
    expect(screen.getByText('Hire Status: New')).toBeInTheDocument();
  });

  test('opens ContactModal when name button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open contact form for John Doe' }));

    expect(ContactModal).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      expect.anything()
    );
  });

  test('disables shortlist button when already added', () => {
    render(<ProfileCards {...defaultProps} isAdded={true} />);

    expect(screen.getByText('Shortlisted')).toBeDisabled();
  });

  test('calls onLikeClick when like button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Like John Doe' }));

    expect(defaultProps.onLikeClick).toHaveBeenCalledTimes(1);
  });

  test('calls onViewDetails when detail button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByText('View Details'));

    expect(defaultProps.onViewDetails).toHaveBeenCalledTimes(1);
  });

  test('opens map modal when location button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show location for John Doe' }));

    expect(screen.getByText(/MapContainer/)).toBeInTheDocument();
  });

  test('shows copied status for email copy action', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getAllByText('Copy').length).toBeGreaterThan(0);
  });
});
