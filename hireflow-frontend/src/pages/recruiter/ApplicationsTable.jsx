import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

// Backend returns: application_id, candidate_id, name, email, skills,
//                 experience_years, status, ats_score, ats_result,
//                 pipeline_score, created_at

const STATUS_STYLE = {
  shortlisted:   { bg: '#EFF6FF', color: '#2563EB', label: '★ Shortlisted' },
  ats_passed:    { bg: '#F0FDF4', color: '#16A34A', label: '✓ ATS Passed'  },
  ats_failed:    { bg: '#FEF2F2', color: '#DC2626', label: '✕ Failed ATS'  },
  maybe:         { bg: '#FEF9C3', color: '#D97706', label: '◐ Maybe'        },
  rejected:      { bg: '#FEF2F2', color: '#DC2626', label: '✕ Rejected'    },
  duplicate:     { bg: '#F1F5F9', color: '#94A3B8', label: '⊘ Duplicate'   },
  pending:       { bg: '#F1F5F9', color: '#64748B', label: '→ Pending'     },
}

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
  const color = score >= 80 ? '#16A34A' : score >= 60 ? '#D97706' : '#DC2626'
  const bg    = score >= 80 ? '#F0FDF4'  : score >= 60 ? '#FEF9C3'  : '#FEF2F2'
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: bg, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color, flexShrink: 0,
    }}>{score}</div>
  )
}

function StatusBadge({ status }) {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'pending'
  const s = STATUS_STYLE[key] || STATUS_STYLE.pending
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

const TABS = ['All', 'Passed ATS', 'Failed ATS', 'Shortlisted']

export default function ApplicationsTable() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [applications, setApplications] = useState([])
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [blindMode, setBlindMode] = useState(true)
  const [page, setPage] = useState(1)
  const perPage = 10
  const [renderTimestamp] = useState(() => Date.now())

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    let active = true
    const fetchData = async () => {
      try {
        const [jobRes, appsRes] = await Promise.all([
          fetch(`${API}/jobs/${jobId}`,              { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/jobs/${jobId}/applications`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (!active) return
        if (jobRes.ok) {
          const jobData = await jobRes.json()
          setJob(jobData)
        }
        if (appsRes.ok) {
          const data = await appsRes.json()
          setApplications(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [jobId, token, navigate])

  const filtered = applications.filter(a => {
    if (activeTab === 'All')        return true
    if (activeTab === 'Passed ATS') return a.status === 'ats_passed'
    if (activeTab === 'Failed ATS') return a.status === 'ats_failed'
    if (activeTab === 'Shortlisted') return a.status === 'shortlisted'
    return true
  })

  const tabCount = (tab) => {
    if (tab === 'All')        return applications.length
    if (tab === 'Passed ATS') return applications.filter(a => a.status === 'ats_passed').length
    if (tab === 'Failed ATS') return applications.filter(a => a.status === 'ats_failed').length
    if (tab === 'Shortlisted') return applications.filter(a => a.status === 'shortlisted').length
    return 0
  }

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))

  // Backend returns `name` field; blind mode shows generic label
  const displayName = (app) => blindMode
    ? `Candidate #${String(app.application_id || app.candidate_id || '??').slice(-3)}`
    : (app.name || `Candidate #${app.application_id}`)

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—'
    const diff = renderTimestamp - new Date(dateStr).getTime()
    const hrs  = Math.floor(diff / 3600000)
    const days = Math.floor(hrs / 24)
    return days > 0 ? `${days}d ago` : `${hrs}h ago`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .at-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .at-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .at-layout { display: flex; flex: 1; overflow: hidden; }
        .at-sidebar { width: 200px; background: #fff; border-right: 1px solid #E2E8F0; padding: 20px 0; flex-shrink: 0; }
        .at-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; width: 100%; transition: background 0.15s; }
        .at-sidebar-item.active { background: #EFF6FF; color: #2563EB; font-weight: 600; border-right: 3px solid #2563EB; }
        .at-sidebar-heading { font-size: 11px; font-weight: 700; color: #2563EB; letter-spacing: 0.8px; padding: 0 20px 10px; }
        .at-main { flex: 1; overflow-y: auto; padding: 28px; }
        .at-heading { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; margin-bottom: 4px; }
        .blind-banner { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .tab-row { display: flex; gap: 0; border-bottom: 1px solid #E2E8F0; margin-bottom: 20px; overflow-x: auto; }
        .tab-btn { padding: 10px 16px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #64748B; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .tab-btn.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }
        .table-wrap { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.5px; text-transform: uppercase; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
        tbody td { padding: 13px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #F8FAFC; vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #FAFBFF; }
        .skill-pill { display: inline-block; background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px; margin: 2px 2px 2px 0; }
        .view-btn { background: none; border: 1px solid #E2E8F0; border-radius: 6px; padding: 5px 12px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #2563EB; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .view-btn:hover { background: #EFF6FF; border-color: #2563EB; }
        .pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #fff; border-top: 1px solid #E2E8F0; }
        .page-info { font-size: 13px; color: #64748B; }
        .pg-btn { width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.15s; }
        .pg-btn:hover:not(:disabled) { border-color: #2563EB; color: #2563EB; }
        .pg-btn.active { background: #2563EB; border-color: #2563EB; color: #fff; }
        .pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .export-btn { display: flex; align-items: center; gap: 7px; background: #2563EB; color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
        .filter-btn { display: flex; align-items: center; gap: 7px; background: #fff; color: #374151; border: 1px solid #E2E8F0; border-radius: 8px; padding: 9px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; }
        @media (max-width: 900px) { .at-sidebar { display: none; } .at-main { padding: 16px; } }
      `}</style>

      <div className="at-root">
        <nav className="at-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        <div className="at-layout">
          <aside className="at-sidebar">
            <div className="at-sidebar-heading">RECRUITER</div>
            {[
              { label: 'Dashboard',    path: '/recruiter/dashboard',    active: true },
              { label: 'Post Job',     path: '/recruiter/post-job'                   },
              { label: 'Alerts',       path: '/notifications'                         },
              { label: 'Company',      path: '/recruiter/company-setup'               },
            ].map(item => (
              <button key={item.label} className={`at-sidebar-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                {item.label}
              </button>
            ))}
          </aside>

          <main className="at-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button onClick={() => navigate('/recruiter/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back
              </button>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{job?.title || '…'}</span>
            </div>

            <div className="at-heading">Applications</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
              {job?.company && `${job.company} · `}{applications.length} total applicants
            </div>

            {/* Blind mode banner */}
            <div className="blind-banner">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <span style={{ fontSize: 13, color: '#374151' }}>
                  <strong style={{ color: '#2563EB' }}>Blind hiring is {blindMode ? 'ON' : 'OFF'}</strong>
                  {blindMode ? ' — names are masked to reduce unconscious bias.' : ' — candidate names are visible.'}
                </span>
              </div>
              <button onClick={() => setBlindMode(b => !b)} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2563EB', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {blindMode ? 'Reveal Names' : 'Hide Names'}
              </button>
            </div>

            {/* Top bar */}
            <div className="top-bar">
              <div />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="filter-btn">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  Filters
                </button>
                <button className="export-btn" onClick={() => navigate(`/recruiter/jobs/${jobId}/download`)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export ZIP
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-row">
              {TABS.map(tab => (
                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setPage(1) }}>
                  {tab} ({tabCount(tab)})
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                Loading applications…
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 14 }}>No applications in this category.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>ATS Score</th>
                      <th>Top Skills</th>
                      <th>Experience</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(app => (
                      <tr key={app.application_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
                              {displayName(app).slice(-2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{displayName(app)}</span>
                          </div>
                        </td>
                        <td><ScoreBadge score={app.ats_score} /></td>
                        <td>
                          {(app.skills || []).slice(0, 3).map(s => (
                            <span key={s} className="skill-pill">{s}</span>
                          ))}
                        </td>
                        <td style={{ color: '#64748B', fontSize: 13 }}>{app.experience_years ? `${app.experience_years} yrs` : '—'}</td>
                        <td><StatusBadge status={app.status} /></td>
                        <td style={{ color: '#94A3B8', fontSize: 12 }}>{timeAgo(app.created_at)}</td>
                        <td>
                          <button className="view-btn" onClick={() => navigate(`/interview/${app.application_id}`)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pagination">
                  <span className="page-info">
                    Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="pg-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                    <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      return start + i
                    }).filter(p => p >= 1 && p <= totalPages).map(p => (
                      <button key={p} className={`pg-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                    <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
