import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

const PIPELINE_STEPS = ['Applied', 'ATS', 'Screening', 'Shortlisted', 'Interview']

function stepIndex(status) {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s.includes('interview')) return 4
  if (s.includes('shortlist')) return 3
  if (s.includes('screen') || s.includes('pipeline')) return 2
  if (s.includes('ats')) return 1
  return 0
}

const STATUS_BADGE = {
  shortlisted:         { label: 'SHORTLISTED', bg: '#DBEAFE', color: '#1D4ED8' },
  interview_scheduled: { label: 'INTERVIEW',   bg: '#FEF3C7', color: '#D97706' },
  rejected:            { label: 'REJECTED',    bg: '#FEE2E2', color: '#DC2626' },
  ats_passed:          { label: 'ATS PASSED',  bg: '#D1FAE5', color: '#059669' },
  ats_failed:          { label: 'FAILED',      bg: '#FEE2E2', color: '#DC2626' },
  pending:             { label: 'PENDING',     bg: '#F1F5F9', color: '#64748B' },
  maybe:               { label: 'MAYBE',       bg: '#FEF9C3', color: '#D97706' },
}

function StatusBadge({ status }) {
  const key = (status || 'pending').toLowerCase()
  const s = STATUS_BADGE[key] || STATUS_BADGE.pending
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function ApplicationCard({ app }) {
  const navigate = useNavigate()
  const step = stepIndex(app.status)
  const isInterview = app.status?.toLowerCase().includes('interview')
  const isRejected = app.status?.toLowerCase().includes('reject')

  return (
    <div
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 16px', marginBottom: 12, cursor: isInterview ? 'pointer' : 'default' }}
      onClick={() => isInterview && app.interview && navigate('/interview/' + app.application_id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{app.job_title}</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {app.company}{app.work_mode ? ' \u2022 ' + app.work_mode : ''}
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {!isRejected && !isInterview && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {PIPELINE_STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#2563EB' : active ? 'transparent' : '#E2E8F0', border: active ? '2px solid #2563EB' : done ? 'none' : '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <div style={{ width: 6, height: 6, background: '#2563EB', borderRadius: '50%' }} />}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#2563EB' : done ? '#2563EB' : '#94A3B8', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? '#2563EB' : '#E2E8F0', margin: '0 2px', marginBottom: 14, transition: 'background 0.3s' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {isInterview && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 5, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: '75%', height: '100%', background: '#D97706', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#94A3B8' }}>
              Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </span>
            <span style={{ color: '#D97706', fontWeight: 600 }}>Next: Interview</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(API + '/candidates/applications/my', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const summary = data?.summary || {}
  const applications = data?.applications || []

  const STAT_CARDS = [
    { label: 'Applied',    value: summary.total_applied || 0,          icon: 'arrow', highlight: false },
    { label: 'Shortlisted', value: summary.shortlisted || 0,           icon: 'star',  highlight: true  },
    { label: 'Interviews', value: summary.interview_scheduled || 0,    icon: 'chat',  highlight: false },
    { label: 'Rejected',   value: summary.rejected || 0,               icon: 'x',     highlight: false },
  ]

  const IconMap = {
    arrow: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    star:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    chat:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    x:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cd-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 80px; }
        .cd-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .cd-body { padding: 24px 16px 0; max-width: 480px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .stat-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 16px; }
        .stat-card.hl { background: #EFF6FF; border-color: #BFDBFE; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; background: #fff; border-top: 1px solid #E2E8F0; display: flex; height: 64px; }
        .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #94A3B8; }
        .bnav-item.active { color: #2563EB; }
      `}</style>

      <div className="cd-root">
        <nav className="cd-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 28, height: 28, background: '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        <div className="cd-body">
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Here is an overview of your current applications.</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
            </div>
          ) : (
            <>
              <div className="stats-grid">
                {STAT_CARDS.map(card => (
                  <div key={card.label} className={'stat-card' + (card.highlight ? ' hl' : '')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>{card.label}</span>
                      <span style={{ color: card.highlight ? '#2563EB' : '#CBD5E1' }}>{IconMap[card.icon]}</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: -1, lineHeight: 1 }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>My Applications</div>
              {applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                  No applications yet.<br />
                  <span style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/')}>Browse jobs →</span>
                </div>
              ) : (
                applications.map(app => <ApplicationCard key={app.application_id} app={app} />)
              )}
            </>
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { label: 'Dashboard', path: '/dashboard', active: true, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: 'Jobs',  path: '/', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
          { label: 'Alerts', path: '/notifications', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { label: 'Profile', path: '/profile', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(item => (
          <button key={item.label} className={'bnav-item' + (item.active ? ' active' : '')} onClick={() => navigate(item.path)}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
    </>
  )
}
