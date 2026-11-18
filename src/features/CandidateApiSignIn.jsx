/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import { loginCandidateApi } from '../services/candidateApi';

export default function CandidateApiSignIn({ baseUrl, onBack, onSuccess, notice = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = async event => {
    event.preventDefault();
    if (pending || !baseUrl) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError('');
    try {
      const session = await loginCandidateApi({
        baseUrl, email, password, signal: controller.signal
      });
      if (!controller.signal.aborted) {
        setPassword('');
        onSuccess(session);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <p className="hero-title">AssistantHub · Secure Candidate API</p>
        <p className="hero-subtitle">Sign in to browse synthetic candidate records. Accounts are provisioned by an operator.</p>
      </header>
      <main className="content-shell">
        <section className="controls-panel" aria-label="API sign-in">
          <div className="api-browser-actions">
            <button type="button" className="ui-button secondary" onClick={onBack}>Return to local demo</button>
            <span className="json-status">Tokens stay in memory and are cleared when you leave this browser.</span>
          </div>
          {!baseUrl ? <p role="alert">Candidate API is not configured. Use the local demo or configure a backend URL.</p> : (
            <form onSubmit={submit} className="api-signin-form">
              <label htmlFor="apiLoginEmail">Email</label>
              <input id="apiLoginEmail" className="input-control" aria-label="API email" type="email"
                required autoComplete="username" maxLength={254} value={email}
                onChange={event => setEmail(event.target.value)} />
              <label htmlFor="apiLoginPassword">Password</label>
              <input id="apiLoginPassword" className="input-control" aria-label="API password"
                type="password" required autoComplete="current-password" value={password}
                onChange={event => setPassword(event.target.value)} />
              <button type="submit" className="ui-button dark" disabled={pending}>
                {pending ? 'Signing in...' : 'Sign in to API'}
              </button>
              {(error || notice) && <p role="alert">{error || notice}</p>}
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
