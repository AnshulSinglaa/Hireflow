import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function Register() {
  const [role, setRole] = useState('candidate')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async () => {
    setError('')
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Registration failed.')
        return
      }
      navigate('/login')
    } catch {
      setError('Server unreachable. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRegister()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100vh;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px 16px;
        }
        .reg-card {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          width: 100%;
          max-width: 360px;
          padding: 36px 32px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .reg-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .reg-logo-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .reg-logo-icon {
          width: 32px;
          height: 32px;
          background: #2563EB;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .reg-logo-icon span {
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          line-height: 1;
        }
        .reg-logo-name {
          font-size: 18px;
          font-weight: 700;
          color: #0F172A;
        }
        .reg-subtitle {
          font-size: 13px;
          color: #64748B;
          text-align: center;
          margin-bottom: 24px;
        }
        .role-toggle {
          display: flex;
          background: #F1F5F9;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 20px;
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
          margin-bottom: 14px;
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
          padding: 10px 38px 10px 38px;
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
        .eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .eye-btn:hover { color: #64748B; }
        .error-msg {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #DC2626;
          margin-bottom: 14px;
          font-weight: 500;
        }
        .create-btn {
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
          margin-bottom: 16px;
        }
        .create-btn:hover:not(:disabled) { background: #1D4ED8; }
        .create-btn:active:not(:disabled) { transform: scale(0.99); }
        .create-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }
        .divider span {
          font-size: 13px;
          color: #94A3B8;
        }
        .sso-btn {
          width: 100%;
          padding: 11px;
          background: #fff;
          color: #374151;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, border-color 0.15s;
          margin-bottom: 20px;
        }
        .sso-btn:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .card-footer {
          text-align: center;
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

      <div className="reg-root">
        <div className="reg-card">

          {/* Logo */}
          <div className="reg-logo">
            <div className="reg-logo-row">
              <div className="reg-logo-icon"><span>H</span></div>
              <span className="reg-logo-name">HireFlow</span>
            </div>
          </div>
          <p className="reg-subtitle">Create your account to get started.</p>

          {/* Role toggle */}
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

          {/* Full Name */}
          <div className="field">
            <label>Full Name</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="field">
            <label>Email Address</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 7l10 7 10-7"/>
                </svg>
              </span>
              <input
                type="email"
                placeholder="jane.doe@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
              />
              <button className="eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="field">
            <label>Confirm Password</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
              />
              <button className="eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {/* Create Account */}
          <button className="create-btn" onClick={handleRegister} disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Creating account…</>
            ) : (
              <>
                Create Account
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span>or</span>
            <div className="divider-line" />
          </div>

          {/* SSO */}
          <button className="sso-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Continue with SSO
          </button>

          <div className="card-footer">
            Already have an account? <Link to="/login">Login</Link>
          </div>

        </div>
      </div>
    </>
  )
}
