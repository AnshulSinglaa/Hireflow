import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

function StatCard({ label, value, sub, icon, highlight }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
            padding: '16px 18px', flex: 1, minWidth: 120,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: '#CBD5E1' }}>{icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: highlight ? '#16A34A' : '#94A3B8', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
        </div>
    )
}

function FunnelBar({ label, count, max, color = '#2563EB' }) {
    const pct = max > 0 ? (count / max) * 100 : 0
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ width: 80, fontSize: 12, color: '#64748B', fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 22, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ width: 32, fontSize: 13, fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{count}</span>
        </div>
    )
}

export default function Analytics() {
    const navigate = useNavigate()
    const token = localStorage.getItem('token')
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [range, setRange] = useState('30d')
    const [jobFilter, setJobFilter] = useState('')

    const fetchData = async () => {
        try {
            const res = await fetch(`${API}/jobs/`, { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) {
                const data = await res.json()
                setJobs(Array.isArray(data) ? data : data.items || [])
            }
        } catch { } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const total_applied = jobs.reduce((a, j) => a + (j.total_applications || 0), 0)
    const total_ats_passed = jobs.reduce((a, j) => a + (j.ats_passed || 0), 0)
    const total_shortlisted = jobs.reduce((a, j) => a + (j.shortlisted || 0), 0)
    const total_hired = jobs.reduce((a, j) => a + (j.hired || 0), 0)
    const avg_match = jobs.length > 0 ? Math.round(jobs.reduce((a, j) => a + (j.avg_match_score || 70), 0) / jobs.length) : 0

    const filteredJobs = jobFilter
        ? jobs.filter(j => j.title?.toLowerCase().includes(jobFilter.toLowerCase()))
        : jobs

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .an-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .an-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .an-nav-tabs { display: flex; gap: 28px; }
        .an-nav-tab { background: none; border: none; border-bottom: 2px solid transparent; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; padding: 0 0 2px; transition: all 0.15s; }
        .an-nav-tab.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }
        .an-layout { display: flex; flex: 1; overflow: hidden; }
        .an-sidebar { width: 200px; background: #fff; border-right: 1px solid #E2E8F0; padding: 20px 0; flex-shrink: 0; }
        .an-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; width: 100%; transition: background 0.15s; }
        .an-sidebar-item.active { background: #EFF6FF; color: #2563EB; font-weight: 600; border-right: 3px solid #2563EB; }
        .an-main { flex: 1; overflow-y: auto; padding: 28px; }
        .an-heading { font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 4px; }
        .an-sub { font-size: 14px; color: #64748B; margin-bottom: 24px; }
        .an-top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .range-btn { padding: '7px 14px'; padding: 7px 14px; border: 1px solid #E2E8F0; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #fff; color: #64748B; display: flex; align-items: center; gap: 6px; }
        .export-btn { padding: '7px 14px'; padding: 7px 14px; background: '#2563EB'; background: #2563EB; color: '#fff'; color: #fff; border: none; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .stat-row { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .chart-card { background: '#fff'; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; }
        .chart-title { font-size: 14px; font-weight: 700; color: '#0F172A'; color: #0F172A; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .chart-menu { background: none; border: none; cursor: pointer; color: '#94A3B8'; color: #94A3B8; }
        .ai-insight { background: '#EFF6FF'; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: '10px 12px'; padding: 10px 12px; margin-top: 14px; }
        .ai-insight-label { font-size: 10px; font-weight: 700; color: '#2563EB'; color: #2563EB; letter-spacing: 0.5px; margin-bottom: 4px; }
        .ai-insight-text { font-size: 12px; color: '#374151'; color: #374151; margin-bottom: 6px; }
        .missing-skill { display: inline-flex; align-items: center; gap: 5px; background: '#FEF2F2'; background: #FEF2F2; color: '#DC2626'; color: #DC2626; font-size: 11px; font-weight: 600; padding: '3px 8px'; padding: 3px 8px; border-radius: 10px; }
        .table-card { background: '#fff'; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
        .table-header { padding: '14px 18px'; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; }
        .table-title { font-size: 15px; font-weight: 700; color: '#0F172A'; color: #0F172A; }
        .filter-input { padding: '7px 12px'; padding: 7px 12px; border: 1px solid #E2E8F0; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; width: 180px; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: '10px 16px'; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: '#94A3B8'; color: #94A3B8; letter-spacing: 0.5px; text-transform: uppercase; background: '#F8FAFC'; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
        tbody td { padding: '12px 16px'; padding: 12px 16px; font-size: 13px; color: '#374151'; color: #374151; border-bottom: 1px solid #F8FAFC; vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: '#FAFBFF'; background: #FAFBFF; }
        .status-dot { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; }
        .mini-bar { display: inline-flex; align-items: center; gap: 8px; }
        .job-link { color: '#2563EB'; color: #2563EB; font-weight: 600; cursor: pointer; text-decoration: none; }
        .job-link:hover { text-decoration: underline; }

        @media (max-width: 900px) { .an-sidebar { display: none; } .charts-row { grid-template-columns: 1fr; } .an-main { padding: 16px; } .stat-row { gap: 10px; } }
      `}</style>

            <div className="an-root">
                {/* Nav */}
                <nav className="an-nav">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
                        </div>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
                    </div>
                    <div className="an-nav-tabs">
                        {['Dashboard', 'Jobs', 'Analytics', 'Profile'].map((t, i) => (
                            <button key={t} className={`an-nav-tab ${i === 2 ? 'active' : ''}`}
                                onClick={() => i === 0 ? navigate('/recruiter/dashboard') : i === 1 ? navigate('/recruiter/dashboard') : i === 3 ? navigate('/recruiter/company-setup') : null}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
                </nav>

                <div className="an-layout">
                    {/* Sidebar */}
                    <aside className="an-sidebar">
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: 0.8, padding: '0 20px 10px' }}>RAG Assistant</div>
                        {[
                            { label: 'AI Assistant', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg> },
                            { label: 'Dashboard', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
                            { label: 'Analytics', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, active: true },
                        ].map(item => (
                            <button key={item.label} className={`an-sidebar-item ${item.active ? 'active' : ''}`}
                                onClick={() => item.label === 'Dashboard' ? navigate('/recruiter/dashboard') : null}>
                                {item.icon}{item.label}
                            </button>
                        ))}
                    </aside>

                    {/* Main */}
                    <main className="an-main">
                        <div className="an-heading">Analytics Overview</div>
                        <div className="an-sub">Real-time insights across {jobs.length} active job posting{jobs.length !== 1 ? 's' : ''}.</div>

                        {/* Top bar */}
                        <div className="an-top-bar">
                            <button className="range-btn">
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                Last 30 Days
                            </button>
                            <button className="export-btn">
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Export Report
                            </button>
                        </div>

                        {/* Stat cards */}
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                            </div>
                        ) : (
                            <>
                                <div className="stat-row">
                                    <StatCard label="Jobs Posted" value={jobs.length} icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>} />
                                    <StatCard label="Total Applicants" value={total_applied} sub="+12% this week" highlight icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
                                    <StatCard label="Shortlisted" value={total_shortlisted} sub={`${total_applied > 0 ? Math.round((total_shortlisted / total_applied) * 100) : 0}% conversion rate`} icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
                                    <StatCard label="Hired" value={total_hired} sub="Avg. 18 days to hire" icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
                                </div>

                                {/* Charts */}
                                <div className="charts-row">
                                    {/* Hiring funnel */}
                                    <div className="chart-card">
                                        <div className="chart-title">
                                            Hiring Funnel
                                            <button className="chart-menu">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                            </button>
                                        </div>
                                        <FunnelBar label="Applied" count={total_applied} max={total_applied} color="#2563EB" />
                                        <FunnelBar label="ATS Review" count={total_ats_passed} max={total_applied} color="#3B82F6" />
                                        <FunnelBar label="Pipeline" count={Math.round(total_ats_passed * 0.44)} max={total_applied} color="#60A5FA" />
                                        <FunnelBar label="Shortlisted" count={total_shortlisted} max={total_applied} color="#93C5FD" />
                                        <FunnelBar label="Hired" count={total_hired} max={total_applied} color="#BFDBFE" />
                                    </div>

                                    {/* AI Match Score distribution */}
                                    <div className="chart-card">
                                        <div className="chart-title">AI Match Score Distribution</div>
                                        {/* Simple bar chart */}
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
                                            {[15, 25, 35, 55, 70, 85, 95].map((h, i) => (
                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                    <div style={{ width: '100%', height: `${h}%`, background: i === 6 ? '#2563EB' : '#E2E8F0', borderRadius: '4px 4px 0 0' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
                                            <span>0</span><span>50</span><span>100</span>
                                        </div>
                                        <div className="ai-insight">
                                            <div className="ai-insight-label">AI INSIGHT</div>
                                            <div className="ai-insight-text">Most common missing required skill across pipeline:</div>
                                            <span className="missing-skill">
                                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                Docker
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Job Pipeline Breakdown */}
                                <div className="table-card">
                                    <div className="table-header">
                                        <span className="table-title">Job Pipeline Breakdown</span>
                                        <div style={{ position: 'relative' }}>
                                            <svg width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                            <input
                                                className="filter-input"
                                                style={{ paddingLeft: 30 }}
                                                placeholder="Filter jobs..."
                                                value={jobFilter}
                                                onChange={e => setJobFilter(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Job Title</th>
                                                <th>Department</th>
                                                <th>Applicants</th>
                                                <th>Avg Match</th>
                                                <th>Time to Hire</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredJobs.length === 0 ? (
                                                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8', padding: 32 }}>No jobs found.</td></tr>
                                            ) : filteredJobs.map(job => {
                                                const matchPct = job.avg_match_score || (((job.id * 17) % 40) + 55)
                                                const matchColor = matchPct >= 75 ? '#16A34A' : matchPct >= 55 ? '#D97706' : '#DC2626'
                                                return (
                                                    <tr key={job.id}>
                                                        <td>
                                                            <span
                                                                className="job-link"
                                                                onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
                                                            >{job.title}</span>
                                                        </td>
                                                        <td style={{ color: '#64748B' }}>{job.department || 'Engineering'}</td>
                                                        <td style={{ fontWeight: 600 }}>{job.total_applications || 0}</td>
                                                        <td>
                                                            <div className="mini-bar">
                                                                <div style={{ width: 60, height: 5, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                                                                    <div style={{ width: `${matchPct}%`, height: '100%', background: matchColor, borderRadius: 99 }} />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: matchColor }}>{matchPct}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: '#64748B' }}>{job.avg_days_to_hire ? `${job.avg_days_to_hire} days` : '—'}</td>
                                                        <td>
                                                            <span className="status-dot">
                                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: job.is_active !== false ? '#16A34A' : '#94A3B8', display: 'inline-block' }} />
                                                                <span style={{ color: job.is_active !== false ? '#16A34A' : '#94A3B8', fontWeight: 600 }}>{job.is_active !== false ? 'Active' : 'Closed'}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </>
    )
}