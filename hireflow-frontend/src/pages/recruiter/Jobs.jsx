import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

const TRUST_BADGE = {
  verified:   { label: 'VERIFIED',   bg: '#DCFCE7', color: '#16A34A', dot: '#16A34A' },
  partial:    { label: 'PARTIAL',    bg: '#FEF9C3', color: '#D97706', dot: '#D97706' },
  unverified: { label: 'UNVERIFIED', bg: '#FEE2E2', color: '#DC2626', dot: '#DC2626' },
}

function TrustBadge({ level }) {
  const b = TRUST_BADGE[level] || TRUST_BADGE.unverified
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: b.bg, color: b.color,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      padding: '3px 8px', borderRadius: 20,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.dot, display: 'inline-block' }} />
      {b.label}
    </span>
  )
}

function JobCard({ job, onApply, isApplied }) {
  const trust = job.trust_level || 'unverified'
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 10, padding: '16px 16px 12px', marginBottom: 12,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {/* Company icon placeholder */}
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: '#F1F5F9',
            border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" fill="none" stroke="#94A3B8" strokeWidth="1.6" viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', lineHeight: 1.3 }}>{job.title}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{job.company_name || 'Company'}</div>
          </div>
        </div>
        <TrustBadge level={trust} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {job.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {job.location}
          </span>
        )}
        {job.work_mode && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            {job.work_mode}
          </span>
        )}
        {job.salary_range && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            {job.salary_range}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </button>
        <button
          onClick={isApplied ? undefined : () => onApply(job.id)}
          disabled={isApplied}
          style={{
            background: isApplied ? '#10B981' : '#2563EB', color: '#fff', border: 'none',
            borderRadius: 7, padding: '8px 20px',
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
            cursor: isApplied ? 'default' : 'pointer', transition: 'background 0.15s',
          }}
          onMouseOver={isApplied ? undefined : e => e.target.style.background = '#1D4ED8'}
          onMouseOut={isApplied ? undefined : e => e.target.style.background = '#2563EB'}
        >
          {isApplied ? 'Applied' : 'Apply'}
        </button>
      </div>
    </div>
  )
}

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [filters] = useState({ job_type: '', work_mode: '', company: '' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const limit = 10

  const fetchAppliedJobs = async () => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (token && role === 'candidate') {
      try {
        const res = await fetch(`${API}/candidates/applications/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const ids = new Set((data.applications || []).map(app => app.job_id))
          setAppliedJobIds(ids)
        }
      } catch (err) {
        console.error('Failed to fetch applied jobs:', err)
      }
    }
  }

  const fetchJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.append('skip', (page - 1) * limit)
      params.append('limit', limit)
      if (search) params.append('search', search)
      if (filters.job_type) params.append('job_type', filters.job_type)
      if (filters.work_mode) params.append('work_mode', filters.work_mode)
      if (filters.company) params.append('company', filters.company)

      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/jobs/?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      // backend returns list or {items, total}
      if (Array.isArray(data)) {
        setJobs(data)
        setTotalPages(1)
      } else {
        setJobs(data.jobs || [])
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch {
      setError('Could not load jobs. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    fetchAppliedJobs()
  }, [page, filters])

  const handleSearch = (e) => {
    if (e.key === 'Enter') { setPage(1); fetchJobs() }
  }

  const handleApply = (jobId) => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    navigate(`/jobs/${jobId}/apply`)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const activeFilters = [
    { key: 'job_type', label: filters.job_type || 'Job Type' },
    { key: 'work_mode', label: filters.work_mode || 'Work Mode' },
    { key: 'company',  label: filters.company  || 'Company'  },
    { key: null,       label: 'Salary' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F1F5F9; font-family: 'DM Sans', sans-serif; }

        .jobs-root {
          min-height: 100vh;
          background: #F1F5F9;
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 80px;
        }

        /* ── Top navbar ── */
        .jobs-nav {
          background: #fff;
          border-bottom: 1px solid #E2E8F0;
          padding: 0 16px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .nav-logo-icon {
          width: 28px; height: 28px;
          background: #2563EB; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-logo-icon span { color: #fff; font-size: 15px; font-weight: 700; }
        .nav-logo-name { font-size: 16px; font-weight: 700; color: #0F172A; }
        .nav-right { display: flex; align-items: center; gap: 14px; }
        .notif-btn {
          position: relative; background: none; border: none;
          cursor: pointer; color: #64748B; display: flex;
        }
        .notif-dot {
          position: absolute; top: -2px; right: -2px;
          width: 8px; height: 8px; background: #DC2626;
          border-radius: 50%; border: 1.5px solid #fff;
        }
        .logout-btn {
          background: none; border: 1px solid #E2E8F0;
          border-radius: 7px; padding: 5px 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          color: #64748B; cursor: pointer;
          transition: all 0.15s;
        }
        .logout-btn:hover { border-color: #CBD5E1; color: #374151; }

        /* ── Search ── */
        .search-wrap {
          padding: 14px 16px 0;
          position: relative;
        }
        .search-icon {
          position: absolute; left: 28px; top: 50%;
          transform: translateY(-50%); color: #94A3B8;
          display: flex; pointer-events: none;
          margin-top: 7px;
        }
        .search-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #0F172A;
          background: #fff; outline: none;
          transition: border-color 0.15s;
        }
        .search-input::placeholder { color: #CBD5E1; }
        .search-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }

        /* ── Filter chips ── */
        .filter-row {
          display: flex; gap: 8px;
          padding: 12px 16px 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .filter-row::-webkit-scrollbar { display: none; }
        .filter-chip {
          white-space: nowrap;
          padding: 6px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          color: #374151; cursor: pointer;
          transition: all 0.15s;
        }
        .filter-chip:hover { border-color: #2563EB; color: #2563EB; }
        .filter-chip.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }

        /* ── Job list ── */
        .job-list {
          padding: 14px 16px 0;
        }

        /* ── States ── */
        .state-box {
          text-align: center; padding: 48px 24px;
          color: #94A3B8; font-size: 14px;
        }
        .state-box .icon { font-size: 36px; margin-bottom: 10px; }

        /* ── Pagination ── */
        .pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; padding: 16px;
        }
        .page-btn {
          width: 32px; height: 32px;
          background: #fff; border: 1px solid #E2E8F0;
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #374151; transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { border-color: #2563EB; color: #2563EB; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-label { font-size: 13px; font-weight: 500; color: #64748B; }

        /* ── Bottom nav ── */
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-top: 1px solid #E2E8F0;
          display: flex; height: 64px;
          max-width: 430px; margin: 0 auto;
        }
        .bnav-item {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px; cursor: pointer; border: none;
          background: none; font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 500; color: #94A3B8;
          transition: color 0.15s;
        }
        .bnav-item.active { color: #2563EB; }
        .bnav-item:hover { color: #2563EB; }
      `}</style>

      <div className="jobs-root">

        {/* Navbar */}
        <nav className="jobs-nav">
          <div className="nav-logo">
            <div className="nav-logo-icon"><span>H</span></div>
            <span className="nav-logo-name">HireFlow</span>
          </div>
          <div className="nav-right">
            <button className="notif-btn" onClick={() => navigate('/notifications')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="notif-dot" />
            </button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            className="search-input"
            placeholder="Search jobs, skills, companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Filter chips */}
        <div className="filter-row">
          {activeFilters.map(f => (
            <button
              key={f.label}
              className={`filter-chip ${f.key && filters[f.key] ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="job-list">
          {loading ? (
            <div className="state-box">
              <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              Loading jobs…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div className="state-box">
              <div className="icon">⚠️</div>
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="state-box">
              <div className="icon">🔍</div>
              No jobs found. Try a different search.
            </div>
          ) : (
            jobs.map(job => (
              <JobCard key={job.id} job={job} onApply={handleApply} isApplied={appliedJobIds.has(job.id)} />
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && jobs.length > 0 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="page-label">{page} of {totalPages}</span>
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}

      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="bnav-item" onClick={() => navigate('/dashboard')}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
        <button className="bnav-item active">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          Jobs
        </button>
        <button className="bnav-item" onClick={() => navigate('/notifications')}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Alerts
        </button>
        <button className="bnav-item" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </button>
      </nav>
    </>
  )
}
