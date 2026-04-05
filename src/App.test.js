/* eslint-disable no-undef */
/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('react-chatbot-kit', () => ({
  __esModule: true,
  default: () => <div>Chatbot</div>,
  createChatBotMessage: (text) => ({ message: text }),
}));
jest.mock('react-qr-code', () => () => <div>QRCode</div>);
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>MapContainer {children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: ({ children }) => <div>Marker {children}</div>,
  Popup: ({ children }) => <div>Popup {children}</div>,
}));
jest.mock('react-csv', () => ({
  CSVLink: ({ children, ...props }) => (
    <a href="#csv" {...props}>
      {children}
    </a>
  ),
}));

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('keeps deterministic first assistant for same card count', () => {
    render(<App />);

    const initialName = screen
      .getAllByRole('button', { name: /Open contact form for/i })[0]
      .textContent;

    const countInput = screen.getByRole('spinbutton');
    fireEvent.change(countInput, { target: { value: '0' } });
    expect(screen.getByText('No profile cards to display.')).toBeInTheDocument();

    fireEvent.change(countInput, { target: { value: '1' } });

    const nextName = screen
      .getAllByRole('button', { name: /Open contact form for/i })[0]
      .textContent;

    expect(nextName).toBe(initialName);
  });

  test('supports add flow and preserves added users when card count becomes 0', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Add'));

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('View Added Info'));

    expect(screen.queryByText('No assistant added.')).not.toBeInTheDocument();
  });

  test('supports search filtering and inquiry submission', () => {
    render(<App />);

    const nameButtons = screen.getAllByRole('button', { name: /Open contact form for/i });
    const firstName = nameButtons[0].textContent;

    fireEvent.change(screen.getByLabelText('Search assistants by name'), {
      target: { value: 'unlikely-name-filter' },
    });
    expect(screen.getByText('No profile cards to display.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search assistants by name'), {
      target: { value: firstName.split(' ')[0] },
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Open contact form for/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Please write your inquiry here...'), {
      target: { value: 'Need assistance' },
    });
    fireEvent.click(screen.getByText('Send'));

    fireEvent.click(screen.getByText('View Inquiry Sent'));
    expect(screen.getByText(/Need assistance/)).toBeInTheDocument();
  });

  test('sorts by likes high/low after interaction', () => {
    render(<App />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });

    const likeButtons = screen.getAllByRole('button', { name: /Like /i });
    fireEvent.click(likeButtons[1]);
    fireEvent.click(likeButtons[1]);

    const select = screen.getByLabelText('Sort by likes');
    fireEvent.change(select, { target: { value: 'highToLow' } });
    const topHigh = screen.getAllByRole('button', { name: /Open contact form for/i })[0].textContent;

    fireEvent.change(select, { target: { value: 'lowToHigh' } });
    const topLow = screen.getAllByRole('button', { name: /Open contact form for/i })[0].textContent;

    expect(topHigh).not.toBe(topLow);
  });
});
