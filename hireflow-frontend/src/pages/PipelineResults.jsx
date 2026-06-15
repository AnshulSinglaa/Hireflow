import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

function ScoreBar({ label, pct }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#2563EB', borderRadius: 99 }} />
      </div>
    </div>
  )
}

function CandidateCard({ candidate, rank, onDecision, currentDecision }) {
  const scores = candidate.breakdown || candidate.scores || {}

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>RANK #{rank}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              Blind Mode
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.3 }}>
            {candidate.candidate_name || `Candidate #${candidate.application_id || candidate.id}`}
          </div>
        </div>
        <div style={{ textAlign: 'center', background: '#EFF6FF', border: '2px solid #2563EB', borderRadius: 12, padding: '10px 14px', minWidth: 64 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>
            {candidate.total_score || candidate.pipeline_score || candidate.match_score || 0}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', letterSpacing: 0.5 }}>MATCH</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <ScoreBar label="Skills"     pct={scores.skills_match     || scores.skills     || 0} />
        <ScoreBar label="Experience" pct={scores.experience_match || scores.experience || 0} />
        <ScoreBar label="Education"  pct={scores.education_match  || scores.education  || 0} />
        <ScoreBar label="Fit"        pct={scores.overall_fit      || scores.fit        || 0} />
      </div>

      {candidate.recommendation && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', gap: 10 }}>
          <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>AI Recommendation</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{candidate.recommendation}</div>
          </div>
        </div>
      )}

      {/* Decision buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { val: 'shortlisted', label: 'Approve',  bg: '#2563EB', color: '#fff',    border: 'none'              },
          { val: 'maybe',       label: 'Maybe',    bg: '#fff',    color: '#374151', border: '1px solid #E2E8F0' },
          { val: 'rejected',    label: 'Reject',   bg: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
        ].map(btn => (
          <button
            key={btn.val}
            onClick={() => onDecision(candidate.application_id || candidate.id, btn.val)}
            style={{
              flex: 1, padding: '9px 0',
              background: currentDecision === btn.val ? (btn.val === 'shortlisted' ? '#1D4ED8' : btn.val === 'maybe' ? '#FEF9C3' : '#FECACA') : btn.bg,
              color: btn.color, border: btn.border, borderRadius: 8,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
              outline: currentDecision === btn.val ? `2px solid ${btn.val === 'shortlisted' ? '#2563EB' : btn.val === 'maybe' ? '#D97706' : '#DC2626'}` : 'none',
              transition: 'all 0.15s',
            }}
          >{btn.label}</button>
        ))}
      </div>
    </div>
  )
}

const TABS = ['Shortlisted', 'Maybe', 'Rejected']

export default function PipelineResults() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [job, setJob] = useState(null)
  const [candidates, setCandidates] = useState([])   // from pipeline run
  const [decisions, setDecisions] = useState({})      // applicationId → decision
  const [activeTab, setActiveTab] = useState('Shortlisted')
  const [loading, setLoading] = useState(true)
  const [jdHealth] = useState(null)

  const fetchData = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs/${jobId}`,              { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/jobs/${jobId}/applications`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (jobRes.ok) setJob(await jobRes.json())
      if (appsRes.ok) {
        const data = await appsRes.json()
        const list = Array.isArray(data) ? data : []
        // Sort by pipeline_score or ats_score descending
        list.sort((a, b) => (b.pipeline_score || b.ats_score || 0) - (a.pipeline_score || a.ats_score || 0))
        // Seed existing decisions from status
        const existing = {}
        list.forEach(app => {
          if (['shortlisted','maybe','rejected'].includes(app.status)) {
            existing[app.application_id] = app.status
          }
        })
        setCandidates(list)
        setDecisions(existing)
      }
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchData()
  }, [])

  // Backend: POST /jobs/{job_id}/candidates/{application_id}/decision?decision=shortlisted
  const handleDecision = async (applicationId, decision) => {
    setDecisions(d => ({ ...d, [applicationId]: decision }))
    try {
      await fetch(`${API}/jobs/${jobId}/candidates/${applicationId}/decision?decision=${decision}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { }
  }

  const getDecision = (app) => decisions[app.application_id] || app.status

  const categorized = {
    Shortlisted: candidates.filter(c => getDecision(c) === 'shortlisted'),
    Maybe:       candidates.filter(c => getDecision(c) === 'maybe'),
    Rejected:    candidates.filter(c => getDecision(c) === 'rejected'),
  }
  const undecided = candidates.filter(c => !['shortlisted','maybe','rejected'].includes(getDecision(c)))

  const summary = {
    total:       candidates.length,
    shortlisted: categorized.Shortlisted.length,
    maybe:       categorized.Maybe.length,
    rejected:    categorized.Rejected.length,
  }

  // Show undecided candidates in Shortlisted tab (so recruiter can act on them)
  const displayList = activeTab === 'Shortlisted'
    ? [...undecided, ...categorized.Shortlisted]
    : categorized[activeTab]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pr-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 80px; }
        .pr-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .pr-body { padding: 24px 20px 0; max-width: 520px; margin: 0 auto; }
        .pr-title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 16px; }
        .summary-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
        .tab-row { display: flex; border-bottom: 1px solid #E2E8F0; margin-bottom: 16px; }
        .tab-btn { flex: 1; padding: 10px 0; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #64748B; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
        .tab-btn.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }
        .jd-health-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 16px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; background: #fff; border-top: 1px solid #E2E8F0; display: flex; height: 64px; }
        .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #94A3B8; }
        .bnav-item.active { color: #2563EB; }
      `}</style>

      <div className="pr-root">
        <nav className="pr-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>
              Applications Table
            </button>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div className="pr-body">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Pipeline Results</div>
            <div className="pr-title">{job?.title || 'Job'}</div>

            {/* Summary */}
            <div className="summary-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                <svg width="16" height="16" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                {summary.total} Processed
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Shortlisted', count: summary.shortlisted, dot: '#2563EB' },
                  { label: 'Maybe',       count: summary.maybe,       dot: '#D97706' },
                  { label: 'Rejected',    count: summary.rejected,    dot: '#DC2626' },
                  { label: 'Pending',     count: undecided.length,    dot: '#94A3B8' },
                ].map(s => (
                  <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, background: s.dot, borderRadius: '50%', display: 'inline-block' }} />
                    {s.count} {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-row">
              {TABS.map(tab => (
                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab} ({(tab === 'Shortlisted' ? undecided.length + categorized.Shortlisted.length : categorized[tab].length)})
                </button>
              ))}
            </div>

            {displayList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>No candidates in this category.</div>
            ) : (
              displayList.map((c, i) => (
                <CandidateCard
                  key={c.application_id || c.id}
                  candidate={c}
                  rank={i + 1}
                  onDecision={handleDecision}
                  jobId={jobId}
                  currentDecision={getDecision(c)}
                />
              ))
            )}

            {jdHealth && (
              <div className="jd-health-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    <svg width="16" height="16" fill="none" stroke="#D97706" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    JD Health Score
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#D97706' }}>{jdHealth.score || 82}/100</span>
                </div>
                {jdHealth.bottleneck && (
                  <div style={{ background: '#FEF2F2', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', letterSpacing: 0.5, marginBottom: 4 }}>BOTTLENECK</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{jdHealth.bottleneck}</div>
                  </div>
                )}
                {jdHealth.suggestion && (
                  <div style={{ background: '#EFF6FF', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: 0.5, marginBottom: 4 }}>AI SUGGESTION</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{jdHealth.suggestion}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { label: 'Dashboard', path: '/recruiter/dashboard',   active: false },
          { label: 'Jobs',      path: '/recruiter/dashboard',   active: true  },
          { label: 'Alerts',    path: '/notifications',         active: false },
          { label: 'Profile',   path: '/recruiter/company-setup', active: false },
        ].map(item => (
          <button key={item.label} className={`bnav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  )
}
