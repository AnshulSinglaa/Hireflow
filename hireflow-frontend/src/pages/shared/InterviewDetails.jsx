import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

export default function InterviewDetails() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDetails = async () => {
    try {
      const res = await fetch(`${API}/applications/${applicationId}/parsed`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setData(await res.json())
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { fetchDetails() }, [])

  const interview = data?.interview_details || {}
  const job = data?.job || {}

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .int-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 80px; }
        .int-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .back-btn { background: none; border: none; cursor: pointer; color: #2563EB; display: flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; }
        .int-body { padding: 0 20px; max-width: 480px; margin: 0 auto; }
        .status-chip { display: inline-flex; align-items: center; gap: 6px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: '4px 10px'; border-radius: 20px; margin: 20px 0 10px; padding: 4px 12px; }
        .int-title { font-size: 22px; font-weight: 800; color: '#0F172A'; color: #0F172A; letter-spacing: -0.4px; margin-bottom: 4px; }
        .int-company { font-size: 14px; color: #64748B; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }
        .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .detail-row { display: flex; gap: 24px; margin-bottom: 14px; flex-wrap: wrap; }
        .detail-item label { font-size: 11px; font-weight: 600; color: #94A3B8; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .detail-item value, .detail-item .val { font-size: 15px; font-weight: 600; color: #0F172A; }
        .join-btn { width: 100%; padding: 13px; background: #2563EB; color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; transition: background 0.15s; }
        .join-btn:hover { background: #1D4ED8; }
        .notes-text { font-size: 14px; color: #374151; line-height: 1.7; }
        .recruiter-chip { display: flex; align-items: center; gap: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin-top: 14px; }
        .recruiter-avatar { width: 34px; height: 34px; background: #EFF6FF; border-radius: '50%'; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px; margin: 0 auto; background: #fff; border-top: 1px solid #E2E8F0; display: flex; height: 64px; }
        .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #94A3B8; }
        .bnav-item.active { color: #2563EB; }
      `}</style>

      <div className="int-root">
        <nav className="int-nav">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            HireFlow
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </nav>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div className="int-body">
            <div className="status-chip">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Interview Scheduled
            </div>
            <div className="int-title">{job.title || 'Senior Frontend Developer'}</div>
            <div className="int-company">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              {job.company_name || 'Acme Corporation'}
            </div>

            {/* Interview details */}
            <div className="card">
              <div className="card-title">
                <svg width="15" height="15" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Interview Details
              </div>
              <div className="detail-row">
                <div className="detail-item">
                  <label>Date</label>
                  <div className="val">{interview.date || '2 June 2026'}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item">
                  <label>Time</label>
                  <div className="val">{interview.time || '3:00 PM IST'}</div>
                </div>
                <div className="detail-item">
                  <label>Duration</label>
                  <div className="val">{interview.duration || '45m'}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item">
                  <label>Format</label>
                  <div className="val">{interview.format || 'Google Meet'}</div>
                </div>
              </div>
              {interview.meeting_link && (
                <a href={interview.meeting_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="join-btn">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    Join Meeting
                  </button>
                </a>
              )}
              {!interview.meeting_link && (
                <button className="join-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Join Meeting
                </button>
              )}
            </div>

            {/* Recruiter notes */}
            <div className="card">
              <div className="card-title">
                <svg width="15" height="15" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Recruiter Notes
              </div>
              <p className="notes-text">
                {interview.notes || "Hi there! We are excited to speak with you regarding this role. This will be a technical discussion. Please come prepared to discuss past projects and architectural decisions."}
              </p>
              {interview.recruiter_name && (
                <div className="recruiter-chip">
                  <div className="recruiter-avatar">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{interview.recruiter_name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{interview.recruiter_email || ''}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { label: 'Dashboard', path: '/dashboard', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: 'Jobs', path: '/jobs', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
          { label: 'Alerts', path: '/notifications', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { label: 'Profile', path: '/profile', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(item => (
          <button key={item.label} className={`bnav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
    </>
  )
}
