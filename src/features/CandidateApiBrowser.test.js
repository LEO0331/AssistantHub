/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateApiBrowser from './CandidateApiBrowser';
import { fetchCandidatePage, loginCandidateApi } from '../services/candidateApi';

jest.mock('../services/candidateApi', () => ({
  fetchCandidatePage: jest.fn(),
  loginCandidateApi: jest.fn()
}));
const demo = (id, role = 'Project Coordinator') => ({
  id, name: 'Demo Candidate ' + id, role,
  availability: 'Available now', skills: ['Scheduling'], hourlyRateUsd: 45
});
const session = {
  accessToken: 'jwt_test_token_from_login',
  tokenType: 'Bearer', expiresIn: 900,
  user: { id: 'user123', email: 'viewer@example.test', role: 'viewer' }
};

async function login() {
  fireEvent.change(screen.getByLabelText('API email'), { target: { value: 'viewer@example.test' } });
  fireEvent.change(screen.getByLabelText('API password'), { target: { value: 'test-only-secret' } });
  fireEvent.click(screen.getByText('Sign in to API'));
  await waitFor(() => expect(loginCandidateApi).toHaveBeenCalledTimes(1));
}

describe('read-only API candidate browser with authentication', () => {
  beforeEach(() => {
    loginCandidateApi.mockReset().mockResolvedValue(session);
    fetchCandidatePage.mockReset();
    localStorage.clear();
  });

  test('missing API configuration shows an error and does not attempt login', async () => {
    const onBack = jest.fn();
    render(<CandidateApiBrowser baseUrl="" onBack={onBack} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not configured/);
    expect(loginCandidateApi).not.toHaveBeenCalled();
    expect(fetchCandidatePage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Return to local demo'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('only loads server pages after successful login; filters, paging, no local shortlist', async () => {
    fetchCandidatePage.mockImplementation(async ({ page, pageSize }) => ({
      items: page === 1 ? [demo('1')] : [demo('2')], page, pageSize, total: 25
    }));
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    expect(fetchCandidatePage).not.toHaveBeenCalled();
    await login();
    await waitFor(() => expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument());
    expect(screen.queryByText('Shortlist')).not.toBeInTheDocument();
    expect(screen.getByText(/25 candidates/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next API page'));
    await waitFor(() => expect(screen.getByText('Demo Candidate 2')).toBeInTheDocument());
    expect(fetchCandidatePage).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 2, pageSize: 12, accessToken: session.accessToken
    }));
    fireEvent.change(screen.getByLabelText('API role'), { target: { value: 'Project Coordinator' } });
    await waitFor(() => expect(fetchCandidatePage).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: 'Project Coordinator', page: 1 })
    ));
    expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  test('retry is available for server failures without fabricating fallback records', async () => {
    fetchCandidatePage.mockRejectedValueOnce(new Error('Candidate API returned HTTP 503.'))
      .mockResolvedValueOnce({ items: [demo('1')], page: 1, pageSize: 12, total: 1 });
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    await login();
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503');
    expect(screen.queryByText('Demo Candidate 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry API request'));
    await waitFor(() => expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument());
  });

  test('401 revokes in-memory session and prompts reauthentication', async () => {
    fetchCandidatePage.mockRejectedValueOnce(Object.assign(new Error('Expired'), { status: 401 }))
      .mockResolvedValueOnce({ items: [demo('1')], page: 1, pageSize: 12, total: 1 });
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    await login();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Session expired/);
    expect(screen.getByText('Sign in to API')).toBeInTheDocument();
    expect(fetchCandidatePage).toHaveBeenCalledTimes(1);
    await login();
    await waitFor(() => expect(screen.getByText('Demo Candidate 1')).toBeInTheDocument());
  });

  test('ignores old responses after filters change, signs out and clears token', async () => {
    let resolveOld;
    fetchCandidatePage.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ items: [demo('NEW')], page: 1, pageSize: 12, total: 1 });
    render(<CandidateApiBrowser baseUrl="http://127.0.0.1:3100" onBack={() => {}} />);
    await login();
    await waitFor(() => expect(fetchCandidatePage).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('API role'), { target: { value: 'Project Coordinator' } });
    await waitFor(() => expect(screen.getByText('Demo Candidate NEW')).toBeInTheDocument());
    await act(async () => {
      resolveOld({ items: [demo('STALE')], page: 1, pageSize: 12, total: 1 });
    });
    expect(screen.queryByText('Demo Candidate STALE')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Sign out of API'));
    expect(screen.getByText('Sign in to API')).toBeInTheDocument();
    expect(screen.queryByText('Demo Candidate NEW')).not.toBeInTheDocument();
  });
});
