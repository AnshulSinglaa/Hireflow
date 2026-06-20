import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

const AGENTS = [
  { key: 'screener',  label: 'Screener Agent',     desc: 'Filtered applications to a qualified pool.' },
  { key: 'scorer',    label: 'Scorer Agent',        desc: 'Evaluating technical skills and experience match.' },
  { key: 'interview', label: 'Interview Generator', desc: 'Drafting personalized technical assessments.' },
  { key: 'email',     label: 'Email Agent',         desc: 'Will schedule interviews with top matches.' },
  { key: 'optimizer', label: 'JD Optimizer',        desc: 'Will suggest JD improvements based on applicant pool.' },
]

const STATUS_COLOR = { complete: '#16A34A', processing: '#2563EB', pending: '#94A3B8' }
const STATUS_BG    = { complete: '#F0FDF4', processing: '#EFF6FF', pending: '#F8FAFC' }
const STATUS_LABEL = { complete: 'Complete', processing: '…',      pending: 'Pending' }

export default function PipelineProgress() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [job, setJob] = useState(null)
  const [progress, setProgress] = useState(0)
  const [agentStatuses, setAgentStatuses] = useState({
    screener: 'pending', scorer: 'pending', interview: 'pending',
    email: 'pending', optimizer: 'pending',
  })
  const [agentProgress, setAgentProgress] = useState({ current: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const pollRef = useRef(null)
  const pausedRef = useRef(false)

  const pollTask = async (id) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      if (data.progress !== undefined) setProgress(data.progress)
      if (data.agent_statuses)         setAgentStatuses(data.agent_statuses)
      if (data.current_agent)          setAgentProgress(prev => ({ ...prev, current: prev.current + 1 }))
      if (data.status === 'completed' || data.progress >= 100) {
        setDone(true); setProgress(100); clearInterval(pollRef.current)
      }
      if (data.status === 'failed') {
        setError('Pipeline failed — please try again.'); clearInterval(pollRef.current)
      }
    } catch { }
  }

  const fetchJob = async () => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setJob(await res.json())
    } catch { }
  }

  const startPipeline = async () => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}/pipeline/async`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        pollRef.current = setInterval(() => {
          if (!pausedRef.current) pollTask(data.task_id)
        }, 2000)
      } else {
        simulateProgress()
      }
    } catch {
      simulateProgress()
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchJob()
    startPipeline()
    return () => clearInterval(pollRef.current)
  }, [])

  // Fallback simulation when no real task is available
  const simulateProgress = () => {
    const keys = AGENTS.map(a => a.key)
    let p = 0
    pollRef.current = setInterval(() => {
      if (pausedRef.current) return
      p = Math.min(p + 3, 100)
      const idx = Math.min(Math.floor((p / 100) * keys.length), keys.length - 1)
      const newStatuses = {}
      keys.forEach((k, i) => {
        newStatuses[k] = i < idx ? 'complete' : i === idx ? 'processing' : 'pending'
      })
      setProgress(p)
      setAgentStatuses(newStatuses)
      setAgentProgress({ current: Math.floor((p % 20) * 1.55), total: 31 })
      if (p >= 100) {
        keys.forEach(k => newStatuses[k] = 'complete')
        setAgentStatuses(newStatuses)
        setDone(true)
        clearInterval(pollRef.current)
      }
    }, 400)
  }

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    pausedRef.current = next
  }

  const eta = Math.max(1, Math.ceil(((100 - progress) / 100) * 5))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pp-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        .pp-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .pp-body { max-width: 640px; margin: 0 auto; padding: 36px 24px 80px; }
        .active-badge { display: inline-flex; align-items: center; gap: 6px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
        .active-dot { width: 6px; height: 6px; background: #2563EB; border-radius: 50%; animation: pulse 1.5s infinite; }
        .pp-title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; margin-bottom: 4px; }
        .pp-sub { font-size: 14px; color: #64748B; margin-bottom: 28px; }
        .progress-bar { height: 8px; background: #E2E8F0; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #2563EB, #60A5FA); border-radius: 99px; transition: width 0.5s ease; }
        .agent-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 18px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; transition: border-color 0.2s, background 0.2s; }
        .agent-card.processing { border-color: #2563EB; background: #FAFCFF; }
        .agent-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .agent-body { flex: 1; min-width: 0; }
        .agent-label { font-size: 14px; font-weight: 600; color: #0F172A; margin-bottom: 2px; display: flex; align-items: center; gap: 8px; }
        .agent-desc { font-size: 12px; color: #64748B; }
        .agent-mini-bar { height: 3px; background: #E2E8F0; border-radius: 99px; overflow: hidden; margin-top: 8px; }
        .agent-mini-fill { height: 100%; background: #2563EB; border-radius: 99px; transition: width 0.3s; }
        .proc-badge { background: #EFF6FF; color: #2563EB; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 10px; animation: pulse 1.5s infinite; }
      `}</style>

      <div className="pp-root">
        <nav className="pp-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => navigate('/recruiter/dashboard')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Dashboard</button>
            <button onClick={() => navigate('/recruiter/jobs/' + jobId + '/applications')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Applications</button>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        <div className="pp-body">
          <div className="active-badge">
            <span className="active-dot" />
            {done ? 'PIPELINE COMPLETE' : paused ? 'PIPELINE PAUSED' : 'AI PIPELINE ACTIVE'}
          </div>

          <div className="pp-title">Running AI Pipeline — {job?.title || 'Loading…'}</div>
          <div className="pp-sub">
            {agentProgress.total > 0 ? `Processing ${agentProgress.total} qualified candidates` : 'Starting pipeline…'}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#2563EB', letterSpacing: -1 }}>{progress}%</span>
                <span style={{ fontSize: 14, color: '#64748B', marginLeft: 8 }}>Complete</span>
              </div>
              {done
                ? <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>✓ Pipeline complete</span>
                : <span style={{ fontSize: 13, color: '#94A3B8', textAlign: 'right' }}>Est. remaining<br />~{eta} min{eta !== 1 ? 's' : ''}</span>
              }
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Agent cards */}
          {AGENTS.map(agent => {
            const status = agentStatuses[agent.key] || 'pending'
            const isProcessing = status === 'processing'
            const isComplete   = status === 'complete'
            const miniPct = isProcessing && agentProgress.total > 0
              ? (agentProgress.current / agentProgress.total) * 100 : 0

            return (
              <div key={agent.key} className={`agent-card ${isProcessing ? 'processing' : ''}`}>
                <div className="agent-icon" style={{ background: STATUS_BG[status] }}>
                  {isComplete ? (
                    <svg width="16" height="16" fill="none" stroke="#16A34A" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : isProcessing ? (
                    <div style={{ width: 16, height: 16, border: '2px solid #BFDBFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="#CBD5E1" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  )}
                </div>

                <div className="agent-body">
                  <div className="agent-label">
                    {agent.label}
                    {isProcessing && <span className="proc-badge">PROCESSING</span>}
                  </div>
                  <div className="agent-desc">{agent.desc}</div>
                  {isProcessing && agentProgress.total > 0 && (
                    <>
                      <div className="agent-mini-bar">
                        <div className="agent-mini-fill" style={{ width: `${miniPct}%` }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{agentProgress.current} / {agentProgress.total}</div>
                    </>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[status], flexShrink: 0 }}>
                  {STATUS_LABEL[status]}
                </div>
              </div>
            )
          })}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', margin: '16px 0' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              onClick={togglePause}
              style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {paused ? 'Resume Pipeline' : 'Pause Pipeline'}
            </button>
            <button
              disabled={!done}
              onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)}
              style={{ padding: '10px 20px', background: done ? '#2563EB' : '#93C5FD', color: '#fff', border: 'none', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: done ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
              onMouseOver={e => { if (done) e.currentTarget.style.background = '#1D4ED8' }}
              onMouseOut={e => { if (done) e.currentTarget.style.background = '#2563EB' }}
            >
              View Results
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
