import React, { useState } from 'react';
import './AuthScreen.css';

interface AuthScreenProps {
  onSuccess: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const api = (window as any).aerosphere;
      if (!api) throw new Error('AeroSphere API not found');

      if (isSignUp) {
        if (username.trim().length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        await api.signUp(email, password, username.trim());
      } else {
        await api.signIn(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-wrapper">
      <div className="auth-glow-orb orb-1"></div>
      <div className="auth-glow-orb orb-2"></div>

      <div className="glass-panel auth-card animate-zoom-in">
        <div className="auth-card__header">
          <h1 className="logo-text">AeroSphere <span>Studio</span></h1>
          <p className="subtitle">Pilot Credentials Required</p>
        </div>

        <div className="auth-card__tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(null); }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-body">
          {isSignUp && (
            <div className="auth-input-group">
              <label>Callsign (Username)</label>
              <input
                type="text"
                placeholder="Maverick"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="pilot@aerosphere.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary auth-submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            <span className="btn-text">
              {loading ? 'Authenticating...' : isSignUp ? 'Create Pilot Account' : 'Sign In to Cockpit'}
            </span>
            <span className="spinner"></span>
          </button>
        </form>
      </div>
    </div>
  );
}
