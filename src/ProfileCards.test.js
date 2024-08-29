/* eslint-disable react/display-name */
/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileCards from './ProfileCards';
import ContactModal from './ContactModal';

// Mock dependencies
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
    name: 'John Doe',
    email: 'john@example.com',
    cell: '123-456-7890',
    imageUrl: 'http://example.com/image.jpg',
    country: 'USA',
    likes: 5,
    onLikeClick: jest.fn(),
    onAddClick: jest.fn(),
    isAdded: false,
    onInquirySubmit: jest.fn(),
    location: {
      coordinates: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders ProfileCards with all the information', () => {
    render(<ProfileCards {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('QRCode')).toBeInTheDocument();
    expect(screen.getByText('5 Likes')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  test('opens ContactModal when name is clicked', () => {
    render(<ProfileCards {...defaultProps} />);
    
    fireEvent.click(screen.getByText('John Doe'));
    
    expect(ContactModal).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      expect.anything()
    );
  });

  test('disables the add button when isAdded is true', () => {
    render(<ProfileCards {...defaultProps} isAdded={true} />);
    
    const addButton = screen.getByText('Added');
    expect(addButton).toBeDisabled();
  });
})