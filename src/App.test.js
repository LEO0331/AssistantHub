/* eslint-disable no-undef */
/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

    fireEvent.click(screen.getByText('Load Sample Demo'));

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(500 generated\)/)).toBeInTheDocument();
      expect(screen.getByLabelText('Deterministic seed')).toHaveValue(424242);
      expect(screen.getByLabelText('Data source')).toHaveValue('mock-api');
      expect(screen.getByText(/Sample demo loaded/i)).toBeInTheDocument();
    });
  });

  test('sample demo is optional and warns that it clears local demo records', async () => {
    render(<App />);
    const button = screen.getByRole('button', { name: 'Load Sample Demo' });
    expect(button).toHaveAttribute('title', expect.stringMatching(/clears your current local shortlist and inquiries/i));
    expect(screen.getByText(/Talent Pool Size \(6 generated\)/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Shortlist').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Shortlist')[0]);
    expect(JSON.parse(localStorage.getItem('talentShortlist'))).toHaveLength(1);

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/Sample demo loaded: 500 fictional profiles/i)).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('talentShortlist'))).toHaveLength(0);
      expect(screen.getByLabelText('Data source')).toHaveValue('mock-api');
    });
  });

  test('applies URL preset when demo=true', async () => {
    window.history.pushState({}, '', '/?demo=true');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(500 generated\)/)).toBeInTheDocument();
      expect(screen.getByLabelText('Deterministic seed')).toHaveValue(424242);
      expect(screen.getByLabelText('Data source')).toHaveValue('mock-api');
      expect(screen.getByText('Sample demo loaded from URL preset.')).toBeInTheDocument();
    });

    window.history.pushState({}, '', '/');
  });

  test('does not show presenter checklist while demo controls remain functional', async () => {
    render(<App />);
    expect(screen.queryByText('Demo Checklist')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Presenter checklist' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Load Sample Demo'));
    await waitFor(() => {
      expect(screen.getByText(/Talent Pool Size \(500 generated\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Demo Checklist')).not.toBeInTheDocument();
    expect(screen.getByText('View Shortlist')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
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

    // One semantic table keeps the sticky headers and virtual rows aligned.
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    const groups = screen.getAllByRole('group', { name: /^Actions for / });
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.length).toBeLessThan(25);
    for (const group of groups) {
      expect(within(group).getByRole('button', { name: 'Like' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: 'Shortlist' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: 'Detail' })).toBeInTheDocument();
    }
    expect(screen.getByText('Card Mode')).toBeInTheDocument();
  });

  test('list mode aligns actions inside rows and preserves like, shortlist and detail controls', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Showing 6 of 6 talents/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'List Mode' }));

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'Name', 'Role', 'Availability', 'Rate', 'Likes', 'Status', 'Actions',
    ]);
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(7); // header + six data rows; no duplicate table header
    const first = rows[1];
    expect(within(first).getAllByRole('cell')).toHaveLength(7);
    const actions = within(first).getByRole('group', { name: /^Actions for / });
    expect(actions.parentElement.tagName).toBe('TD');
    expect(actions.parentElement).toBe(within(first).getAllByRole('cell')[6]);

    const firstLikes = within(first).getAllByRole('cell')[4].textContent;
    fireEvent.click(within(actions).getByRole('button', { name: 'Like' }));
    expect(within(first).getAllByRole('cell')[4]).toHaveTextContent(String(Number(firstLikes) + 1));

    fireEvent.click(within(actions).getByRole('button', { name: 'Shortlist' }));
    expect(within(actions).getByRole('button', { name: 'Shortlisted' })).toBeInTheDocument();
    fireEvent.click(within(actions).getByRole('button', { name: 'Detail' }));
    expect(screen.getByRole('dialog', { name: 'Talent detail drawer' })).toBeInTheDocument();
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

  test('advances directly from an unshortlisted drawer through Hired and persists state', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('View Details').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('View Details')[0]);
    const drawer = screen.getByRole('dialog', { name: 'Talent detail drawer' });
    const advance = within(drawer).getByRole('button', { name: 'Advance Hire Status' });
    const status = within(drawer).getByText('Hire Status:').parentElement;
    expect(status).toHaveTextContent('Hire Status: New');
    expect(advance).toBeEnabled();

    fireEvent.click(advance);
    expect(status).toHaveTextContent('Hire Status: Contacted');
    expect(within(drawer).getByRole('button', { name: 'Already Shortlisted' })).toBeInTheDocument();
    fireEvent.click(advance);
    expect(status).toHaveTextContent('Hire Status: Interview');
    fireEvent.click(advance);
    expect(status).toHaveTextContent('Hire Status: Hired');
    expect(within(drawer).getByRole('button', { name: 'Hired (Final)' })).toBeDisabled();

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('talentShortlist') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].hireStatus).toBe('Hired');
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByText('View Shortlist'));
    expect(screen.getByText('Status: Hired')).toBeDisabled();
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

  test('switches to configured server candidate browser and returns to local demo', async () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'assistanthub-api-base-url');
    meta.setAttribute('content', 'http://127.0.0.1:3100');
    document.head.appendChild(meta);
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(url => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => url.includes('/api/auth/login') ?
        {
          accessToken: 'test_api_token_from_login',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: { id: 'viewer1', email: 'viewer@example.test', role: 'viewer' }
        } : {
          items: [{
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Demo Candidate 01',
            role: 'Project Coordinator',
            availability: 'Available now',
            skills: ['Scheduling'],
            hourlyRateUsd: 40
          }],
          page: 1, pageSize: 12, total: 1
        }
    }));
    try {
      render(<App />);
      fireEvent.change(screen.getByLabelText('Data source'), { target: { value: 'api' } });
      expect(screen.getByText('Sign in to API')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('API email'), { target: { value: 'viewer@example.test' } });
      fireEvent.change(screen.getByLabelText('API password'), { target: { value: 'test-password' } });
      fireEvent.click(screen.getByText('Sign in to API'));
      await waitFor(() => expect(screen.getByText('Demo Candidate 01')).toBeInTheDocument());
      expect(screen.getByText(/Synthetic MySQL candidates with authenticated hiring workflow/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText('Return to local demo'));
      await waitFor(() => expect(screen.getByLabelText('Data source')).toHaveValue('local'));
    } finally {
      meta.remove();
      global.fetch = originalFetch;
    }
  });

});
