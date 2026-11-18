/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateApiBrowser from './CandidateApiBrowser';
import { fetchCandidatePage } from '../services/candidateApi';

jest.mock('../services/candidateApi', () => ({ fetchCandidatePage: jest.fn() }));
const demo = (id, role = 'Project Coordinator') => ({
  id, name: 'Demo Candidate ' + id, role,
  availability: 'Available now', skills: ['Scheduling'],
  hourlyRateUsd: 45
});

describe('read-only API candidate browser', () => {
  beforeEach(() => fetchCandidatePage.mockReset());

  test('shows explicit configuration error without silently loading mock data', async () => {
    const onBack = jest.fn();
    render(<CandidateApiBrowser baseUrl="" onBack={onBack} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not configured/);
    expect(fetchCandidatePage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Return to local demo'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('queries server with filters, paging and a read-only result', async () => {
    fetchCandidatePage.mockImplementation(async ({ page, pageSize }) => ({
      items: page === 1 ? [demo('1')] : [demo('2')], page, pageSize, total: 25
    }));
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument());
    expect(screen.queryByText('Shortlist')).not.toBeInTheDocument();
    expect(screen.getByText(/25 candidates/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next API page'));
    await waitFor(() => expect(screen.getByText('Demo Candidate 2')).toBeInTheDocument());
    expect(fetchCandidatePage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 12 }));
    fireEvent.change(screen.getByLabelText('API role'), { target: { value: 'Project Coordinator' } });
    await waitFor(() => expect(fetchCandidatePage).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: 'Project Coordinator', page: 1 })
    ));
    expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument();
  });

  test('offers retry after a backend error without fabricated fallback records', async () => {
    fetchCandidatePage.mockRejectedValueOnce(new Error('Candidate API returned HTTP 503.'))
      .mockResolvedValueOnce({ items: [demo('1')], page: 1, pageSize: 12, total: 1 });
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503');
    expect(screen.queryByText('Demo Candidate 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry API request'));
    await waitFor(() => expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument());
  });

  test('ignores an old response after filters change', async () => {
    let resolveOld;
    fetchCandidatePage.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ items: [demo('NEW')], page: 1, pageSize: 12, total: 1 });
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    await waitFor(() => expect(fetchCandidatePage).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('API role'), { target: { value: 'Project Coordinator' } });
    await waitFor(() => expect(screen.getByText('Demo Candidate NEW')).toBeInTheDocument());
    await act(async () => {
      resolveOld({ items: [demo('STALE')], page: 1, pageSize: 12, total: 1 });
    });
    expect(screen.getByText('Demo Candidate NEW')).toBeInTheDocument();
    expect(screen.queryByText('Demo Candidate STALE')).not.toBeInTheDocument();
  });
});
