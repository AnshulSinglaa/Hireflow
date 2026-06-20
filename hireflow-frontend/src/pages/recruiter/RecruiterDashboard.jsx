import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function JobCard({ job, onRunPipeline, onViewApps }) {
  const passed = job.ats_passed || 0
  const failed = job.ats_failed || 0
  const total = job.total_applications || 0
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 12, padding: 20, marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 5 }}>{job.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              {job.company}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Posted {timeAgo(job.created_at)}
            </span>
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'APPLIED',     value: total,               color: '#2563EB' },
          { label: 'ATS PASSED',  value: passed,              color: '#16A34A' },
          { label: 'FAILED',      value: failed,              color: '#DC2626' },
          { label: 'DUPLICATES',  value: job.duplicates || 0, color: '#64748B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pass rate bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 6, background: '#FEE2E2', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${passRate}%`, height: '100%', background: '#16A34A', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, display: 'flex', gap: 10 }}>
        <button
          onClick={() => onRunPipeline(job.id)}
          style={{
            flex: 1, padding: '10px 0', background: '#2563EB', color: '#fff',
            border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#1D4ED8'}
          onMouseOut={e => e.currentTarget.style.background = '#2563EB'}
        >
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Run Pipeline
        </button>
        <button
          onClick={() => onViewApps(job.id)}
          style={{
            flex: 1, padding: '10px 0', background: '#fff', color: '#374151',
            border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#CBD5E1'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
        >
          View Apps
        </button>
      </div>
    </div>
  )
}

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Chatbot State
  const [showChatbot, setShowChatbot] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [selectedJobForChat, setSelectedJobForChat] = useState('')

  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API}/jobs/?recruiter_only=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { localStorage.clear(); navigate('/login'); return }
      if (res.ok) {
        const data = await res.json()
        setJobs(Array.isArray(data) ? data : (data.jobs || []))
      }
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchJobs()
  }, [])

  const handleRunPipeline = (jobId) => navigate(`/recruiter/jobs/${jobId}/pipeline`)
  const handleViewApps   = (jobId) => navigate(`/recruiter/jobs/${jobId}/applications`)
  const handleLogout     = () => { localStorage.clear(); navigate('/login') }

  const askQuestion = async () => {
    if (!question || !selectedJobForChat) return
    setAskLoading(true)
    setAnswer('')
    try {
      const res = await fetch(`${API}/jobs/${selectedJobForChat}/ask/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAnswer(prev => prev + decoder.decode(value))
      }
    } catch {
      setAnswer('Failed to get answer. Check connection.')
    } finally {
      setAskLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .rd-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 100px; }
        .rd-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .rd-nav-logo { display: flex; align-items: center; gap: 8px; }
        .rd-nav-logo-icon { width: 30px; height: 30px; background: #2563EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .rd-nav-logo-icon span { color: #fff; font-size: 16px; font-weight: 700; }
        .rd-nav-right { display: flex; align-items: center; gap: 14px; }
        .rd-notif-btn { background: none; border: none; cursor: pointer; color: #64748B; display: flex; position: relative; }
        .rd-avatar { width: 34px; height: 34px; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563EB; font-weight: 700; font-size: 14px; cursor: pointer; border: 2px solid #BFDBFE; }
        .rd-body { padding: 24px 20px 0; }
        .rd-heading { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 18px; }
        .fab { position: fixed; bottom: 84px; right: 20px; width: 52px; height: 52px; background: #2563EB; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 16px rgba(37,99,235,0.35); transition: background 0.15s, transform 0.1s; }
        .fab:hover { background: #1D4ED8; transform: scale(1.05); }
        .fab-chat { position: fixed; bottom: 146px; right: 20px; width: 52px; height: 52px; background: #8B5CF6; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 16px rgba(139,92,246,0.35); transition: background 0.15s, transform 0.1s; }
        .chat-panel { position: fixed; bottom: 84px; right: 84px; width: 340px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 20px; z-index: 50; display: flex; flex-direction: column; gap: 12px; }
        .empty-state { text-align: center; padding: 60px 20px; color: #94A3B8; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; background: #fff; border-top: 1px solid #E2E8F0; display: flex; height: 64px; }
        .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #94A3B8; }
        .bnav-item.active { color: #2563EB; }
      `}</style>

      <div className="rd-root">
        <nav className="rd-nav">
          <div className="rd-nav-logo">
            <div className="rd-nav-logo-icon"><span>H</span></div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <div className="rd-nav-right">
            <button className="rd-notif-btn" onClick={() => navigate('/notifications')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <div className="rd-avatar" onClick={handleLogout} title="Logout">R</div>
          </div>
        </nav>

        <div className="rd-body">
          <div className="rd-heading">Jobs Overview</div>

          {loading ? (
            <div className="empty-state">
              <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              Loading jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              No jobs posted yet.<br />
              <span style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/recruiter/post-job')}>Post your first job →</span>
            </div>
          ) : (
            jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onRunPipeline={handleRunPipeline}
                onViewApps={handleViewApps}
              />
            ))
          )}
        </div>

        {/* FAB — post new job */}
        <button className="fab" onClick={() => navigate('/recruiter/post-job')} title="Post new job">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* FAB — chatbot */}
        <button className="fab-chat" onClick={() => setShowChatbot(!showChatbot)} title="Ask AI Assistant">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Chatbot Panel */}
        {showChatbot && (
          <div className="chat-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>🤖 AI Assistant</div>
              <button onClick={() => setShowChatbot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B' }}>×</button>
            </div>
            
            <select
              value={selectedJobForChat}
              onChange={e => setSelectedJobForChat(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, width: '100%' }}
            >
              <option value="">Select a job...</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askQuestion()}
                placeholder="Ask about candidates..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              />
              <button
                onClick={askQuestion}
                disabled={askLoading}
                style={{ background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              >
                {askLoading ? '...' : 'Ask'}
              </button>
            </div>
            
            {answer && (
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                {answer}
                {askLoading && <span style={{ animation: 'pulse 1s infinite' }}>▊</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { label: 'Dashboard', path: '/recruiter/dashboard', active: true, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: 'Jobs',      path: '/recruiter/post-job', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
          { label: 'Alerts',   path: '/notifications', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { label: 'Profile',  path: '/recruiter/company-setup', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(item => (
          <button key={item.label} className={`bnav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
    </>
  )
}
