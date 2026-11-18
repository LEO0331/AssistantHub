/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import {
  allowedNextStatuses, createIdempotencyKey, fetchCandidateApplication,
  fetchApplicationAudit, postApplicationTransition
} from '../services/workflowApi';

const EMPTY_AUDIT = { items: [], page: 1, pageSize: 10, total: 0 };
const PAGE_SIZE = 10;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

export default function CandidateWorkflowPanel({
  candidate, baseUrl, accessToken, role, onClose, onUnauthorized
}) {
  const [application, setApplication] = useState(null);
  const [audit, setAudit] = useState(EMPTY_AUDIT);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [writeNotice, setWriteNotice] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(null);
  const pendingAttemptRef = useRef(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const submitRef = useRef(null);
  const canWrite = role === 'recruiter' || role === 'admin';
  const options = application ? allowedNextStatuses(application.status) : [];
  const totalPages = Math.max(1, Math.ceil(audit.total / PAGE_SIZE));

  useEffect(() => () => submitRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const current = await fetchCandidateApplication({
          baseUrl, candidateId: candidate.id, accessToken, signal: controller.signal
        });
        const history = await fetchApplicationAudit({
          baseUrl, applicationId: current.id, accessToken,
          page, pageSize: PAGE_SIZE, signal: controller.signal
        });
        if (!active) return;
        setApplication(current);
        setAudit(history);
        setTarget('');
        setReason('');
        // A GET showing unchanged version does not prove a previous POST
        // stopped: it may still be committing. Keep its SAME key retryable.
        const pending = pendingAttemptRef.current;
        const stillUnknown = pending && current.id === pending.applicationId &&
          current.version === pending.expectedVersion;
        if (!stillUnknown) {
          pendingAttemptRef.current = null;
          setRetryAttempt(null);
          setWriteNotice('');
        } else {
          setWriteNotice('This request may still be in flight. Only retry the exact same key and payload.');
        }
        setNeedsRefresh(Boolean(stillUnknown));
        setLoading(false);
      } catch (error) {
        if (!active || error?.name === 'AbortError') return;
        if (error?.status === 401) {
          onUnauthorized();
          return;
        }
        if (error?.status === 403) {
          onUnauthorized('Your role or access was changed. Sign in again.');
          return;
        }
        setLoadError(error.message || 'Could not load workflow state.');
        setNeedsRefresh(true);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [candidate.id, baseUrl, accessToken, page, reload, onUnauthorized]);

  const refresh = () => {
    if (saving) return;
    setReload(value => value + 1);
  };


  const executeAttempt = async attempt => {
    if (saving || submitRef.current || loading) return;
    const controller = new AbortController();
    submitRef.current = controller;
    setSaving(true);
    setWriteNotice('');
    try {
      const response = await postApplicationTransition({
        baseUrl, applicationId: attempt.applicationId, accessToken,
        toStatus: attempt.toStatus, expectedVersion: attempt.expectedVersion,
        reason: attempt.reason, idempotencyKey: attempt.idempotencyKey,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      // A successful replay is the same committed DB operation, not a new
      // transition. Always re-read server status and audit after confirmation.
      pendingAttemptRef.current = null;
      setRetryAttempt(null);
      setApplication(response.application);
      setNeedsRefresh(true);
      setWriteNotice(response.replayed ?
        'Original committed result was safely replayed. Reloading status and audit history.' :
        'Transition committed. Reloading authoritative status and audit history.');
      setPage(1);
      setReload(value => value + 1);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error?.status === 401) {
        onUnauthorized();
        return;
      }
      if (error?.status === 403) {
        onUnauthorized('Your role or access was changed. Sign in again.');
        return;
      }
      // Network/5xx/invalid response outcome may be unknown. Preserve the
      // exact key+payload and allow an explicit safe replay with that key.
      // 409 or 422 is definitive; don't retry it, refresh state instead.
      const ambiguous = error?.status == null || error.status >= 500;
      if (ambiguous) {
        pendingAttemptRef.current = attempt;
        setRetryAttempt(attempt);
      } else {
        pendingAttemptRef.current = null;
        setRetryAttempt(null);
      }
      setNeedsRefresh(true);
      setWriteNotice(error.message || 'Refresh the server before attempting any new transition.');
    } finally {
      if (submitRef.current === controller) submitRef.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  const submit = event => {
    event.preventDefault();
    if (!canWrite || !application || saving || loading || needsRefresh ||
      !options.includes(target) || reason.length > 500) return;
    let idempotencyKey;
    try {
      idempotencyKey = createIdempotencyKey();
    } catch (error) {
      setNeedsRefresh(true);
      setWriteNotice(error.message);
      return;
    }
    const attempt = {
      applicationId: application.id,
      toStatus: target,
      expectedVersion: application.version,
      reason,
      idempotencyKey
    };
    executeAttempt(attempt);
  };

  return (
    <section className="api-workflow-panel" aria-label="Candidate hiring workflow">
      <div className="api-workflow-heading">
        <div>
          <h2>Hiring workflow — {candidate.name}</h2>
          <p className="api-muted">MySQL is authoritative. This panel does not use browser demo hiring state.</p>
        </div>
        <button type="button" className="ui-button secondary" onClick={onClose}>Close workflow</button>
      </div>

      {loading && <p role="status">Loading server application and audit history...</p>}
      {loadError && <div className="api-workflow-warning" role="alert">
        <p>{loadError}</p>
        <button type="button" className="ui-button secondary" onClick={refresh}
          disabled={saving}>Refresh server state</button>
      </div>}
      {!loading && !loadError && application && <>
        <div className="api-workflow-status">
          <span>Current status: <strong>{application.status}</strong></span>
          <span>Version: <strong>{application.version}</strong></span>
          <span>Last updated: {formatDate(application.updatedAt)}</span>
        </div>

        {!canWrite ? (
          <p className="api-muted" role="status">Viewer access: read-only. Only Recruiter and Admin can change hiring status.</p>
        ) : options.length === 0 ? (
          <p className="api-muted">This application is in a terminal state. No further transitions are permitted.</p>
        ) : (
          <form onSubmit={submit} className="api-workflow-form" aria-label="Change hiring status">
            <label htmlFor="workflowNextStatus">Next status</label>
            <select id="workflowNextStatus" className="select-control"
              value={target} onChange={event => setTarget(event.target.value)}
              disabled={saving || loading || needsRefresh} required>
              <option value="">Choose allowed transition</option>
              {options.map(value => <option value={value} key={value}>{value}</option>)}
            </select>
            <label htmlFor="workflowReason">Reason (optional, maximum 500 characters)</label>
            <textarea id="workflowReason" className="input-control" maxLength={500}
              value={reason} onChange={event => setReason(event.target.value)}
              disabled={saving || loading || needsRefresh} rows={3} />
            <button type="submit" className="ui-button dark"
              disabled={!target || saving || loading || needsRefresh}>
              {saving ? 'Saving on server...' : 'Confirm server transition'}
            </button>
            <p className="api-muted">Changing to Hired or Rejected is final. If a request fails or times out, inspect server status before retrying.</p>
          </form>
        )}

        <div className="api-workflow-audit">
          <h3>Audit timeline</h3>
          <p className="api-muted">Server-generated changes, actors and timestamps; no client-side history or invented events.</p>
          {audit.items.length === 0 ? (
            <p>No recorded hiring transitions.</p>
          ) : (
            <ol className="api-audit-list">
              {audit.items.map(entry => (
                <li key={entry.id}>
                  <strong>{entry.fromStatus} → {entry.toStatus}</strong>
                  <span>{formatDate(entry.occurredAt)} · Actor ID: {entry.actorId}</span>
                  {entry.reason && <span>Reason: {entry.reason}</span>}
                  <span className="api-audit-request">Request ID: {entry.requestId}</span>
                </li>
              ))}
            </ol>
          )}
          <nav className="api-audit-nav" aria-label="Audit history pages">
            <span>History page {audit.page}/{totalPages} · {audit.total} events</span>
            <button type="button" className="ui-button secondary" disabled={page <= 1 || saving}
              onClick={() => setPage(value => Math.max(1, value - 1))}>Previous audit page</button>
            <button type="button" className="ui-button secondary"
              disabled={page >= totalPages || saving}
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next audit page</button>
          </nav>
        </div>
      </>}

      {needsRefresh && !loading && !loadError && (
        <div className="api-workflow-warning" role="alert">
          <p>{writeNotice || 'Refresh server state and audit history before another action.'}</p>
          <button type="button" className="ui-button secondary" onClick={refresh}
            disabled={saving}>Refresh server state</button>
          {retryAttempt && <button type="button" className="ui-button secondary"
            onClick={() => executeAttempt(retryAttempt)} disabled={saving || loading}>
            Retry same request safely
          </button>}
        </div>
      )}
    </section>
  );
}
