/* eslint-disable no-undef */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactModal from './ContactModal';

describe('ContactModal', () => {
  const user = { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' };
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with user information', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    expect(screen.getByText('Contact John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  test('calls onSubmit and onClose on send', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Please write your inquiry here...'), {
      target: { value: 'This is an inquiry.' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(onSubmit).toHaveBeenCalledWith('This is an inquiry.');
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when cancel clicked', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
