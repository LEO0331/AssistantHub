/* eslint-disable react/display-name */
/* eslint-disable no-undef */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileCards from './ProfileCards';
import ContactModal from './ContactModal';

jest.mock('./ContactModal', () => jest.fn(() => <div>ContactModal</div>));
jest.mock('react-qr-code', () => () => <div>QRCode</div>);
jest.mock('react-leaflet', () => ({
  MapContainer: jest.fn(({ children }) => <div>MapContainer {children}</div>),
  TileLayer: jest.fn(() => <div>TileLayer</div>),
  Marker: jest.fn(() => <div>Marker</div>),
  Popup: jest.fn(() => <div>Popup</div>),
}));

describe('ProfileCards', () => {
  const defaultProps = {
    assistant: {
      id: 'assistant-1',
      name: 'John Doe',
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
    isAdded: false,
    onInquirySubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders assistant information', () => {
    render(<ProfileCards {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('QRCode')).toBeInTheDocument();
    expect(screen.getByText('5 Likes')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  test('opens ContactModal when name button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open contact form for John Doe' }));

    expect(ContactModal).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      expect.anything()
    );
  });

  test('disables add button when isAdded is true', () => {
    render(<ProfileCards {...defaultProps} isAdded={true} />);

    expect(screen.getByText('Added')).toBeDisabled();
  });

  test('calls onLikeClick when like button is clicked', () => {
    render(<ProfileCards {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Like John Doe' }));

    expect(defaultProps.onLikeClick).toHaveBeenCalledTimes(1);
  });
});
