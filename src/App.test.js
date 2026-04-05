/* eslint-disable no-undef */
/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('react-chatbot-kit', () => ({
  __esModule: true,
  default: () => <div>Chatbot</div>,
  createChatBotMessage: (text) => ({ message: text }),
}));
jest.mock('react-qr-code', () => () => <div>QRCode</div>);
jest.mock('react-copy-to-clipboard', () => ({
  CopyToClipboard: ({ children, onCopy }) => <div onClick={onCopy}>{children}</div>,
}));
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

  test('starts with default talent pool size', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(6 generated\)/)).toBeInTheDocument();
    });
  });

  test('supports deterministic seed control scenarios', async () => {
    render(<App />);

    const countInput = screen.getByRole('spinbutton', { name: /Talent Pool Size/i });
    fireEvent.change(countInput, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open contact form for/i }).length).toBe(1);
    });

    const initialName = screen.getAllByRole('button', { name: /Open contact form for/i })[0].textContent;

    const seedInput = screen.getByLabelText('Deterministic seed');
    fireEvent.change(seedInput, { target: { value: '9001' } });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open contact form for/i }).length).toBe(1);
    });

    const nextName = screen.getAllByRole('button', { name: /Open contact form for/i })[0].textContent;
    expect(nextName).not.toBe(initialName);
  });

  test('filters by role chips', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open contact form for/i }).length).toBeGreaterThan(1);
    });

    fireEvent.click(screen.getAllByText('Executive Assistant')[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open contact form for/i }).length).toBe(1);
    });
  });

  test('supports shortlist status pipeline', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Shortlist').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Shortlist')[0]);
    fireEvent.click(screen.getByText('View Shortlist'));

    await waitFor(() => {
      expect(screen.getByText('Status: New')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status: New'));

    expect(screen.getByText('Status: Contacted')).toBeInTheDocument();
  });

  test('opens and closes talent detail drawer', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('View Details').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('View Details')[0]);
    expect(screen.getByRole('dialog', { name: 'Talent detail drawer' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Talent detail drawer' })).not.toBeInTheDocument();
    });
  });

  test('imports demo json data', async () => {
    render(<App />);

    const fileInput = document.querySelector('input[accept="application/json"]');
    const payload = {
      seed: 1234,
      shortlist: [
        {
          id: 'imported-1',
          name: 'Imported Talent',
          role: 'Executive Assistant',
          email: 'imported@example.com',
          phone: '123-123',
          country: 'USA',
          hourlyRateUsd: 50,
          hireStatus: 'Interview',
        },
      ],
      inquiries: [],
    };

    const file = new File([JSON.stringify(payload)], 'demo.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Demo data imported.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Shortlist'));
    expect(screen.getByText(/Imported Talent/)).toBeInTheDocument();
    expect(screen.getByText('Status: Interview')).toBeInTheDocument();
  });
});
