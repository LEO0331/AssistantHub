/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateWorkflowPanel from './CandidateWorkflowPanel';
import {
  fetchCandidateApplication, fetchApplicationAudit, postApplicationTransition
} from '../services/workflowApi';

jest.mock('../services/workflowApi', () => ({
  ...jest.requireActual('../services/workflowApi'),
  fetchCandidateApplication: jest.fn(),
  fetchApplicationAudit: jest.fn(),
  postApplicationTransition: jest.fn()
}));

const CAND = '00000000-0000-4000-8000-000000000001';
const APP = '00000000-0000-4000-8000-000000000101';
const ACTOR = '00000000-0000-4000-8000-000000000301';
const EVENT = '00000000-0000-4000-8000-000000000401';
const application = {
  id: APP, candidateId: CAND, status: 'New', version: 1,
  updatedAt: '2026-11-18T02:00:00.000Z'
};
const entry = {
  id: EVENT, applicationId: APP, actorId: ACTOR,
  fromStatus: 'New', toStatus: 'Contacted', reason: 'Reviewed',
  occurredAt: '2026-11-18T02:02:00.000Z', requestId: 'generated_request_123'
};
const emptyAudit = { items: [], page: 1, pageSize: 10, total: 0 };
const renderPanel = (role = 'viewer', overrides = {}) => {
  const onUnauthorized = jest.fn();
  const onClose = jest.fn();
  const result = render(<CandidateWorkflowPanel
    candidate={{ id: CAND, name: 'Demo Candidate 01' }}
    baseUrl="http://127.0.0.1:3100" accessToken="mock_login_token_12345"
    role={role} onClose={onClose} onUnauthorized={onUnauthorized}
    {...overrides} />);
  return { ...result, onClose, onUnauthorized };
};

describe('authenticated MySQL hiring workflow panel', () => {
  beforeEach(() => {
    fetchCandidateApplication.mockReset().mockResolvedValue(application);
    fetchApplicationAudit.mockReset().mockResolvedValue(emptyAudit);
    postApplicationTransition.mockReset();
  });

  test('Viewer sees authoritative status and audit but never a mutation form', async () => {
    const { onClose } = renderPanel();
    expect(await screen.findByText('New')).toBeInTheDocument();
    expect(screen.getByText(/Version:/)).toHaveTextContent('1');
    expect(screen.getByText(/Viewer access: read-only/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument();
    expect(screen.getByText('No recorded hiring transitions.')).toBeInTheDocument();
    expect(fetchCandidateApplication).toHaveBeenCalledWith(expect.objectContaining({
      candidateId: CAND, accessToken: 'mock_login_token_12345'
    }));
    fireEvent.click(screen.getByText('Close workflow'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Recruiter can submit version-checked transition; UI reloads server state and audit', async () => {
    const next = { ...application, status: 'Contacted', version: 2 };
    fetchCandidateApplication.mockResolvedValueOnce(application).mockResolvedValueOnce(next);
    fetchApplicationAudit.mockResolvedValueOnce(emptyAudit)
      .mockResolvedValueOnce({ items: [entry], page: 1, pageSize: 10, total: 1 });
    postApplicationTransition.mockResolvedValue({
      application: next, auditEventId: EVENT
    });
    renderPanel('recruiter');
    await screen.findByText('New');
    fireEvent.change(screen.getByLabelText('Next status'), { target: { value: 'Contacted' } });
    fireEvent.change(screen.getByLabelText(/Reason \(optional/), { target: { value: 'Reviewed' } });
    fireEvent.click(screen.getByText('Confirm server transition'));
    await waitFor(() => expect(postApplicationTransition).toHaveBeenCalledTimes(1));
    expect(postApplicationTransition).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: APP, toStatus: 'Contacted', expectedVersion: 1, reason: 'Reviewed'
    }));
    await waitFor(() => expect(screen.getByText('New → Contacted')).toBeInTheDocument());
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText(/Version:/)).toHaveTextContent('2');
    expect(screen.getByText(/Actor ID:/)).toHaveTextContent(ACTOR);
    expect(screen.getByText(/Request ID:/)).toHaveTextContent('generated_request_123');
  });

  test('409 conflict freezes further writes and never auto-replays; explicit refresh resolves state', async () => {
    fetchCandidateApplication.mockResolvedValueOnce(application)
      .mockResolvedValueOnce({ ...application, status: 'Contacted', version: 2 });
    postApplicationTransition.mockRejectedValue(
      Object.assign(new Error('Another user updated this application. Refresh server state.'), { status: 409 })
    );
    renderPanel('admin');
    await screen.findByText('New');
    fireEvent.change(screen.getByLabelText('Next status'), { target: { value: 'Contacted' } });
    fireEvent.click(screen.getByText('Confirm server transition'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Another user updated/);
    expect(screen.getByText('Confirm server transition')).toBeDisabled();
    expect(postApplicationTransition).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Refresh server state'));
    await waitFor(() => expect(screen.getByText('Contacted')).toBeInTheDocument());
    expect(screen.getByText(/Version:/)).toHaveTextContent('2');
    expect(screen.getByLabelText('Next status')).toHaveValue('');
    expect(postApplicationTransition).toHaveBeenCalledTimes(1);
  });

  test('unknown network outcome blocks a second write until server refresh', async () => {
    postApplicationTransition.mockRejectedValue(
      new Error('Cannot confirm the server outcome. Refresh application state before retrying.')
    );
    renderPanel('recruiter');
    await screen.findByText('New');
    fireEvent.change(screen.getByLabelText('Next status'), { target: { value: 'Rejected' } });
    fireEvent.click(screen.getByText('Confirm server transition'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Cannot confirm the server outcome/);
    expect(screen.getByText('Confirm server transition')).toBeDisabled();
    expect(postApplicationTransition).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Refresh server state'));
    await waitFor(() => expect(fetchCandidateApplication).toHaveBeenCalledTimes(2));
    expect(postApplicationTransition).toHaveBeenCalledTimes(1);
  });

  test('401 or changed permissions revoke in-memory session through parent callback', async () => {
    fetchCandidateApplication.mockRejectedValueOnce(
      Object.assign(new Error('expired'), { status: 401 })
    );
    const { onUnauthorized, unmount } = renderPanel();
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
    unmount();
    fetchCandidateApplication.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { status: 403 })
    );
    const next = renderPanel('admin');
    await waitFor(() => expect(next.onUnauthorized).toHaveBeenCalledWith(
      expect.stringMatching(/role or access/)
    ));
  });

  test('terminal status has no workflow form even for Admin', async () => {
    fetchCandidateApplication.mockResolvedValue({ ...application, status: 'Hired', version: 3 });
    renderPanel('admin');
    await screen.findByText('Hired');
    expect(screen.getByText(/terminal state/)).toBeInTheDocument();
    expect(screen.queryByText('Confirm server transition')).not.toBeInTheDocument();
  });

  test('audit pagination is retrieved from the API rather than browser-generated events', async () => {
    const first = Array.from({ length: 10 }, (_, i) => ({
      ...entry,
      id: '00000000-0000-4000-8000-' + String(401 + i).padStart(12, '0')
    }));
    fetchApplicationAudit.mockImplementation(async ({ page, pageSize }) => ({
      items: page === 1 ? first : [{ ...entry, id: '00000000-0000-4000-8000-000000000499' }],
      page, pageSize, total: 11
    }));
    renderPanel('viewer');
    await screen.findByText('History page 1/2 · 11 events');
    fireEvent.click(screen.getByText('Next audit page'));
    await screen.findByText('History page 2/2 · 11 events');
    expect(fetchApplicationAudit).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 10 }));
    expect(screen.getAllByText('New → Contacted')).toHaveLength(1);
  });

  test('unmount aborts an in-flight state request and cannot make a hidden write', async () => {
    let requestSignal;
    fetchCandidateApplication.mockImplementation(({ signal }) => {
      requestSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = renderPanel('admin');
    await waitFor(() => expect(fetchCandidateApplication).toHaveBeenCalledTimes(1));
    expect(requestSignal.aborted).toBe(false);
    await act(async () => unmount());
    expect(requestSignal.aborted).toBe(true);
    expect(postApplicationTransition).not.toHaveBeenCalled();
  });
});
