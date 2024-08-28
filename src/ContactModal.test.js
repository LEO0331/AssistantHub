/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; 
import ContactModal from './ContactModal';

describe('ContactModal', () => {
  const user = { name: 'John Doe', email: 'john@example.com', cell: '123-456-7890' };
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the modal with user information', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    expect(screen.getByText('Contact John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  test('calls onClose when the close button is clicked', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    fireEvent.click(screen.getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('submits the form with inquiry and calls onSubmit', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    const textarea = screen.getByPlaceholderText('Please write your inquiry here...');
    fireEvent.change(textarea, { target: { value: 'This is an inquiry.' } });

    fireEvent.click(screen.getByText('Send'));

    expect(onSubmit).toHaveBeenCalledWith('This is an inquiry.');
    expect(onClose).toHaveBeenCalled();
    expect(textarea.value).toBe('');
  });

  test('calls onClose when the Cancel button is clicked', () => {
    render(<ContactModal isActive={true} onClose={onClose} onSubmit={onSubmit} user={user} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
