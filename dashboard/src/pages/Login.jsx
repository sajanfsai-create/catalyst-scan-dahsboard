import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logocryst from "../assets/logocryst.png";

/* ── Inline styles & keyframes injected once ── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #04080f;
    --panel:     #080f1e;
    --border:    rgba(56, 139, 253, 0.18);
    --sky:       #3b82f6;
    --blue-glow:  rgba(59, 130, 246, 0.35);
    --cyan:      #22d3ee;
    --text:      #e2e8f0;
    --muted:     #64748b;
    --error-bg:  rgba(239,68,68,0.08);
    --error:     #f87171;
  }

  .cs-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    font-family: 'Exo 2', sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* ── Grid background ── */
  .cs-grid {
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Ambient glow blobs ── */
  .cs-glow {
    position: fixed; border-radius: 50%; filter: blur(100px);
    pointer-events: none; z-index: 0; animation: pulse 8s ease-in-out infinite;
  }
  .cs-glow-1 {
    width: 500px; height: 500px;
    top: -150px; left: -100px;
    background: radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%);
    animation-delay: 0s;
  }
  .cs-glow-2 {
    width: 400px; height: 400px;
    bottom: -100px; right: -80px;
    background: radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%);
    animation-delay: 3s;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }

  /* ── Card ── */
  .cs-card {
    position: relative; z-index: 10;
    width: 100%; max-width: 440px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 44px 40px 36px;
    box-shadow:
      0 0 0 1px rgba(59,130,246,0.08),
      0 8px 40px rgba(0,0,0,0.6),
      0 0 80px var(--blue-glow);
    animation: slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
    margin: 24px;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Corner accents ── */
  .cs-card::before, .cs-card::after {
    content: ''; position: absolute;
    width: 18px; height: 18px;
    border-color: var(--sky); border-style: solid;
  }
  .cs-card::before {
    top: -1px; left: -1px;
    border-width: 2px 0 0 2px;
    border-radius: 4px 0 0 0;
  }
  .cs-card::after {
    bottom: -1px; right: -1px;
    border-width: 0 2px 2px 0;
    border-radius: 0 0 4px 0;
  }

  /* ── Logo area ── */
  .cs-logo-wrap {
    display: flex; flex-direction: column; align-items: center;
    margin-bottom: 32px; gap: 10px;
    animation: slideUp 0.5s 0.08s cubic-bezier(0.22,1,0.36,1) both;
  }
  .cs-logo-ring {
    width: 76px; height: 76px;
    border-radius: 20px;
    padding: 3px;
    background: linear-gradient(135deg, var(--sky), var(--cyan));
    box-shadow: 0 0 28px var(--blue-glow);
    animation: logoGlow 4s ease-in-out infinite alternate;
  }
  @keyframes logoGlow {
    from { box-shadow: 0 0 18px var(--blue-glow); }
    to   { box-shadow: 0 0 36px rgba(34,211,238,0.4); }
  }
  .cs-logo-ring img {
    width: 100%; height: 100%;
    border-radius: 17px; object-fit: cover;
    display: block;
  }
  .cs-app-name {
    font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
    color: var(--text);
    line-height: 1;
  }
  .cs-app-name span { color: var(--sky); }
  .cs-tagline {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; letter-spacing: 2.5px;
    color: var(--muted); text-transform: uppercase;
  }

  /* ── Divider ── */
  .cs-divider {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 24px;
  }
  .cs-divider-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
  }
  .cs-divider-text {
    font-size: 11px; font-weight: 600; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Form ── */
  .cs-field { margin-bottom: 18px; }
  .cs-label {
    display: block;
    font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase;
    margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;
  }
  .cs-input-wrap { position: relative; }
  .cs-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--muted); pointer-events: none;
  }
  .cs-input {
    width: 100%;
    padding: 13px 14px 13px 40px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-family: 'Exo 2', sans-serif;
    font-size: 14px; font-weight: 500;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cs-input::placeholder { color: var(--muted); font-weight: 400; }
  .cs-input:focus {
    border-color: var(--sky);
    background: rgba(59,130,246,0.05);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  }

  /* ── Error ── */
  .cs-error {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px;
    background: var(--error-bg);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 10px;
    color: var(--error);
    font-size: 13px; font-weight: 500;
    margin-bottom: 18px;
    animation: shake 0.4s ease;
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    60%      { transform: translateX(6px); }
  }

  /* ── Button ── */
  .cs-btn {
    width: 100%; margin-top: 4px;
    padding: 14px;
    background: linear-gradient(135deg, var(--sky) 0%, #2563eb 100%);
    border: none; border-radius: 10px;
    color: #fff; cursor: pointer;
    font-family: 'Exo 2', sans-serif;
    font-size: 15px; font-weight: 700; letter-spacing: 0.5px;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 20px rgba(59,130,246,0.4);
  }
  .cs-btn::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
    opacity: 0; transition: opacity 0.2s;
  }
  .cs-btn:hover:not(:disabled)::before { opacity: 1; }
  .cs-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(59,130,246,0.5);
  }
  .cs-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .cs-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Loader dots ── */
  .cs-dots { display: inline-flex; gap: 4px; align-items: center; }
  .cs-dots span {
    width: 5px; height: 5px; border-radius: 50%; background: #fff;
    animation: bounce 1s infinite;
  }
  .cs-dots span:nth-child(2) { animation-delay: 0.15s; }
  .cs-dots span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%,80%,100% { transform: scale(0.6); opacity: 0.5; }
    40%          { transform: scale(1);   opacity: 1; }
  }

  /* ── Footer ── */
  .cs-footer {
    text-align: center; margin-top: 24px;
    font-size: 11px; letter-spacing: 0.5px; color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Scan line overlay ── */
  .cs-scanline {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
  }

  @media (max-width: 480px) {
    .cs-card { padding: 36px 24px 28px; }
  }
`;

/* ── SVG Icons ── */
const UserIcon = () => (
  <svg className="cs-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const LockIcon = () => (
  <svg className="cs-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Replace with real API call:
    // const result = await postJSON('/api/auth/login', { username, password });
    const result = {
      token: "dummy-token-123456",
      user: { name: "Test User", email: "test@example.com" }
    };

    if (result?.token) {
      login(result.token, result.user);
      navigate('/');
    } else {
      setError('Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="cs-root">
      <style>{STYLES}</style>

      {/* Background layers */}
      <div className="cs-grid" />
      <div className="cs-glow cs-glow-1" />
      <div className="cs-glow cs-glow-2" />
      <div className="cs-scanline" />

      {/* Card */}
      <div className="cs-card">

        {/* Logo */}
        <div className="cs-logo-wrap">
          <div className="cs-logo-ring">
            <img src={logocryst} alt="CatalystSuite Logo" />
          </div>
          <div className="cs-app-name">
            <span>Catalyst</span>Scan
          </div>
          <div className="cs-tagline">Fleet Monitoring Dashboard</div>
        </div>

        {/* Divider */}
        <div className="cs-divider">
          <div className="cs-divider-line" />
          <div className="cs-divider-text">Sign In</div>
          <div className="cs-divider-line" />
        </div>

        {/* Error */}
        {error && (
          <div className="cs-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="cs-field">
            <label className="cs-label">Username</label>
            <div className="cs-input-wrap">
              <UserIcon />
              <input
                className="cs-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="cs-field">
            <label className="cs-label">Password</label>
            <div className="cs-input-wrap">
              <LockIcon />
              <input
                className="cs-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="cs-btn" disabled={loading}>
            {loading ? (
              <span className="cs-dots">
                <span /><span /><span />
              </span>
            ) : 'Sign In →'}
          </button>
        </form>

        {/* Footer */}
        <div className="cs-footer">
          © {new Date().getFullYear()} CatalystSuite · Boston Tech India
        </div>
      </div>
    </div>
  );
};

export default Login;
