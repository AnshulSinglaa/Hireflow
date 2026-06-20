import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

export default function Login() {
  const [role, setRole] = useState('candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Invalid credentials.')
        return
      }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role || role)
      navigate('/dashboard')
    } catch {
      setError('Server unreachable. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px 16px;
        }
        .login-card {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          width: 100%;
          max-width: 360px;
          padding: 40px 32px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .logo-icon {
          width: 52px;
          height: 52px;
          background: #2563EB;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-icon span {
          color: #fff;
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
        }
        .logo-name {
          font-size: 20px;
          font-weight: 700;
          color: #0F172A;
        }
        .heading {
          text-align: center;
          margin-bottom: 24px;
        }
        .heading h1 {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .heading p {
          font-size: 14px;
          color: #64748B;
        }
        .role-toggle {
          display: flex;
          background: #F1F5F9;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 24px;
        }
        .role-btn {
          flex: 1;
          padding: 8px 0;
          border: none;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          color: #64748B;
          transition: all 0.18s ease;
        }
        .role-btn.active {
          background: #ffffff;
          color: #2563EB;
          font-weight: 600;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10);
        }
        .field {
          margin-bottom: 16px;
        }
        .field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #94A3B8;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .input-wrap input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #0F172A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-wrap input::placeholder { color: #CBD5E1; }
        .input-wrap input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
        }
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 24px;
        }
        .forgot-row a {
          font-size: 13px;
          color: #2563EB;
          text-decoration: none;
          font-weight: 500;
        }
        .forgot-row a:hover { text-decoration: underline; }
        .error-msg {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #DC2626;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .login-btn {
          width: 100%;
          padding: 12px;
          background: #2563EB;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s;
        }
        .login-btn:hover:not(:disabled) { background: #1D4ED8; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .card-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          color: #64748B;
        }
        .card-footer a {
          color: #2563EB;
          font-weight: 600;
          text-decoration: none;
        }
        .card-footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          <div className="logo-wrap">
            <div className="logo-icon"><span>H</span></div>
            <span className="logo-name">HireFlow</span>
          </div>

          <div className="heading">
            <h1>Welcome back</h1>
            <p>Log in to your account</p>
          </div>

          <div className="role-toggle">
            <button
              className={`role-btn ${role === 'candidate' ? 'active' : ''}`}
              onClick={() => setRole('candidate')}
            >
              Candidate
            </button>
            <button
              className={`role-btn ${role === 'recruiter' ? 'active' : ''}`}
              onClick={() => setRole('recruiter')}
            >
              Recruiter
            </button>
          </div>

          <div className="field">
            <label>Email Address</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 7 10-7" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="forgot-row">
            <a href="#">Forgot password?</a>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Logging in…</>
            ) : (
              <>
                Login
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>

          <div className="card-footer">
            Don't have an account?&nbsp;<Link to="/register">Register</Link>
          </div>

        </div>
      </div>
    </>
  )
}
