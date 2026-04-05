/* eslint-disable no-undef */
/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts with default talent pool size', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(6 generated\)/)).toBeInTheDocument();
    });
  });

  test('runs one-click demo scenario preset', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Run Demo Scenario'));

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(500 generated\)/)).toBeInTheDocument();
      expect(screen.getByLabelText('Deterministic seed')).toHaveValue(424242);
      expect(screen.getByLabelText('Data source')).toHaveValue('mock-api');
      expect(screen.getByText(/Demo scenario loaded/i)).toBeInTheDocument();
    });
  });

  test('applies URL preset when demo=true', async () => {
    window.history.pushState({}, '', '/?demo=true');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(500 generated\)/)).toBeInTheDocument();
      expect(screen.getByLabelText('Deterministic seed')).toHaveValue(424242);
      expect(screen.getByLabelText('Data source')).toHaveValue('mock-api');
      expect(screen.getByText('Demo scenario loaded from URL preset.')).toBeInTheDocument();
    });

    window.history.pushState({}, '', '/');
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

  test('handles large pool mode with pagination summary', async () => {
    jest.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByText('Load 500'));

    act(() => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText(/Showing 24 of 500 talents/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText(/page 2\/21/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Results per page'), { target: { value: '48' } });
    await waitFor(() => {
      expect(screen.getByText(/Showing 48 of 500 talents/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Jump to page'), { target: { value: '3' } });
    await waitFor(() => {
      expect(screen.getByText(/page 3\/11/)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('supports 5000 stress load and list mode', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Load 5000'));

    await waitFor(() => {
      expect(screen.getByText(/Showing 24 of 5000 talents/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('List Mode'));

    expect(screen.getAllByRole('table').length).toBeGreaterThan(1);
    expect(screen.getByText('Card Mode')).toBeInTheDocument();
  });

  test('opens help modal with usage instructions', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Help'));

    expect(screen.getByRole('dialog', { name: 'How this works' })).toBeInTheDocument();
    expect(screen.getByText(/deterministic faker data/i)).toBeInTheDocument();
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

  test('shows import error for invalid json', async () => {
    render(<App />);

    const fileInput = document.querySelector('input[accept="application/json"]');
    const file = new File(['{invalid-json'], 'broken.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Import failed:/i)).toBeInTheDocument();
    });
  });

  test('rejects invalid import schema', async () => {
    render(<App />);

    const fileInput = document.querySelector('input[accept="application/json"]');
    const file = new File([JSON.stringify({ shortlist: 'bad-shape' })], 'bad-schema.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Import failed: shortlist must be an array/i)).toBeInTheDocument();
    });
  });

  test('rejects oversized import file', async () => {
    render(<App />);

    const fileInput = document.querySelector('input[accept="application/json"]');
    const hugeJson = new File(['[]'], 'huge.json', { type: 'application/json' });
    Object.defineProperty(hugeJson, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [hugeJson] } });

    await waitFor(() => {
      expect(screen.getByText(/Import failed: File exceeds/i)).toBeInTheDocument();
    });
  });

  test('exports json demo payload', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);

    fireEvent.click(screen.getByText('Export JSON'));

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Demo data exported.')).toBeInTheDocument();
  });

  test('uses stepped add/minus behavior for large counts', async () => {
    render(<App />);

    const input = screen.getByRole('spinbutton', { name: /Talent Pool Size/i });
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(145 generated\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove card' }));
    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(120 generated\)/)).toBeInTheDocument();
    });
  });

  test('resets demo state and clears local persisted data', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Shortlist').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Shortlist')[0]);
    fireEvent.change(screen.getByLabelText('Deterministic seed'), { target: { value: '54321' } });
    fireEvent.click(screen.getAllByText('Executive Assistant')[0]);
    fireEvent.click(screen.getByText('Reset Demo Data'));

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(6 generated\)/)).toBeInTheDocument();
      expect(screen.getByLabelText('Deterministic seed')).toHaveValue(7331);
      expect(screen.getByText('All roles')).toHaveClass('active');
    });

    fireEvent.click(screen.getByText('View Shortlist'));
    expect(screen.getByText('No talent shortlisted yet.')).toBeInTheDocument();
  });

  test('supports switching data source adapter', async () => {
    jest.useFakeTimers();
    render(<App />);

    fireEvent.change(screen.getByLabelText('Data source'), { target: { value: 'mock-api' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Talent Pool Size/i }), { target: { value: '20' } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(screen.getByText(/Showing 20 of 20 talents/)).toBeInTheDocument();
    });
    jest.useRealTimers();
  });
});
