import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';

const AuthView = () => {
  const { login, register } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (!isLogin && !username)) {
      setError('Please fill in all fields.');
      return;
    }

    if (email.indexOf('@') === -1) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (isLogin) {
        login(email, password);
      } else {
        register(username, email, password);
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    }
  };

  const handleQuickLogin = () => {
    login('user@goalmate.com', 'password');
  };

  return (
    <div className="auth-overlay">
      <div className="auth-container glass-panel animate-scale-up">
        <div className="auth-logo">
          <Sparkles className="logo-sparkle animate-pulse" size={32} />
          <h1>Goal<span className="gradient-text">Mate</span></h1>
          <p className="auth-subtitle">Elevate productivity with shared consistency</p>
        </div>

        <div className="auth-toggle-bar">
          <button 
            className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error glass-panel">
            <ShieldAlert size={16} className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label htmlFor="auth-username">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input 
                  id="auth-username"
                  type="text" 
                  placeholder="choose_a_username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input 
                id="auth-email"
                type="email" 
                placeholder="your.email@domain.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input 
                id="auth-password"
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit-btn">
            <span>{isLogin ? 'Enter Workspace' : 'Create Account'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-divider">
          <span>OR QUICK ACCESS</span>
        </div>

        <button 
          type="button" 
          onClick={handleQuickLogin} 
          className="btn-secondary quick-login-btn"
        >
          <span className="avatar-preview">🏆</span>
          <div className="quick-login-info">
            <strong>Demo Profile (Prudhvi)</strong>
            <span>user@goalmate.com</span>
          </div>
        </button>
      </div>

      <style>{`
        .auth-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, rgba(3, 7, 18, 0.98) 80%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .auth-container {
          width: 100%;
          max-width: 440px;
          padding: 40px 32px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .auth-logo {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-sparkle {
          color: var(--accent-secondary);
          margin-bottom: 12px;
          filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.5));
        }

        .auth-logo h1 {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 8px;
        }

        .auth-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .auth-toggle-bar {
          display: flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .auth-toggle-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 8px;
          transition: var(--transition-smooth);
        }

        .auth-toggle-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 20px;
        }

        .error-icon {
          flex-shrink: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
          transition: var(--transition-smooth);
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 0.95rem;
          transition: var(--transition-smooth);
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: var(--accent-primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .input-wrapper input:focus + .input-icon {
          color: var(--accent-primary);
        }

        .auth-submit-btn {
          margin-top: 8px;
          width: 100%;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 1rem;
          font-weight: 700;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--glass-border);
        }

        .auth-divider::before {
          margin-right: 12px;
        }

        .auth-divider::after {
          margin-left: 12px;
        }

        .quick-login-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          background: rgba(var(--accent-primary-rgb), 0.05);
          border: 1px dashed rgba(var(--accent-primary-rgb), 0.3);
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .quick-login-btn:hover {
          background: rgba(var(--accent-primary-rgb), 0.1);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .avatar-preview {
          font-size: 24px;
        }

        .quick-login-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .quick-login-info strong {
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .quick-login-info span {
          color: var(--accent-primary);
          font-size: 0.75rem;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .auth-overlay {
            align-items: flex-start;
            overflow-y: auto;
            padding: 24px 16px;
          }

          .auth-container {
            padding: 24px 20px;
            border-radius: 16px;
          }

          .auth-logo h1 {
            font-size: 1.8rem;
          }

          .auth-logo {
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthView;
