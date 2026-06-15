import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

const EDUCATION_LEVELS = ["Any", "High School", "Associate's", "Bachelor's", "Master's", "PhD"]
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"]
const WORK_MODES = ["Remote", "On-site", "Hybrid"]

export default function PostJob() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [form, setForm] = useState({
    title: '', description: '', company: '',
    job_type: 'Full-time', work_mode: 'Remote',
    location: '', salary_min: '', salary_max: '',
    deadline: '', min_experience: '', max_experience: '',
    education: '', skills: [],
    screening_mode: 'score_threshold',
    min_match_score: 75, blind_hiring: true,
  })
  const [skillInput, setSkillInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchCompany = async () => {
    try {
      const res = await fetch(`${API}/companies/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setForm(f => ({ ...f, company: d.name || '' })) }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchCompany()
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) setForm(f => ({ ...f, skills: [...f.skills, s] }))
    setSkillInput('')
  }
  const removeSkill = (s) => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))

  const buildPayload = () => ({
    title: form.title,
    description: form.description,
    company: form.company,
    job_type: form.job_type,
    work_mode: form.work_mode,
    location: form.location,
    salary_range: form.salary_min && form.salary_max
      ? `${form.salary_min}-${form.salary_max}`
      : form.salary_min || form.salary_max || null,
    deadline: form.deadline || null,
    experience_min: form.min_experience ? Number(form.min_experience) : null,
    experience_max: form.max_experience ? Number(form.max_experience) : null,
    education_requirement: form.education || null,
    required_skills: form.skills,
    ats_threshold: form.min_match_score,
    blind_hiring: form.blind_hiring,
    ats_mode: form.screening_mode === 'top_n' ? 'top_n' : 'threshold',
  })

  const handlePost = async () => {
    setError('')
    if (!form.title || !form.description) { setError('Job title and description are required.'); return }
    if (!form.company) { setError('Company name is missing. Please complete your Company Profile first.'); return }
    setPosting(true)
    try {
      const res = await fetch(`${API}/jobs/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Failed to post job.'); return }
      navigate('/recruiter/dashboard')
    } catch {
      setError('Server unreachable.')
    } finally { setPosting(false) }
  }

  const handleDraft = async () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1000)
  }

  const S = {
    input: { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#0F172A', outline: 'none', background: '#fff', transition: 'border-color 0.15s' },
    label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
    field: { marginBottom: 18 },
    card: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 22, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        input:focus, textarea:focus, select:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        .pj-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .pj-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .pj-layout { display: flex; flex: 1; overflow: hidden; }
        .pj-sidebar { width: 220px; background: #fff; border-right: 1px solid #E2E8F0; padding: 24px 0; flex-shrink: 0; }
        .pj-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; width: 100%; transition: background 0.15s; }
        .pj-sidebar-item:hover { background: #F8FAFC; color: #0F172A; }
        .pj-sidebar-item.active { background: #EFF6FF; color: #2563EB; font-weight: 600; border-right: 3px solid #2563EB; }
        .pj-sidebar-heading { font-size: 11px; font-weight: 700; color: #2563EB; letter-spacing: 0.8px; padding: 0 20px 8px; }
        .pj-main { flex: 1; overflow-y: auto; padding: 28px 28px 100px; }
        .pj-right { width: 280px; background: #fff; border-left: 1px solid #E2E8F0; padding: 24px; overflow-y: auto; flex-shrink: 0; }
        .pj-heading { font-size: 26px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 4px; }
        .pj-sub { font-size: 14px; color: #64748B; margin-bottom: 24px; }
        .sys-status { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 14px; }
        .footer-bar { background: #fff; border-top: 1px solid #E2E8F0; padding: 14px 28px; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; }
        .mode-btn { flex: 1; padding: 9px 0; border: 1px solid #E2E8F0; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #fff; color: #64748B; transition: all 0.15s; }
        .mode-btn.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; font-weight: 600; }
        .skill-tag { display: inline-flex; align-items: center; gap: 6px; background: #2563EB; color: #fff; font-size: 13px; font-weight: 500; padding: 4px 10px; border-radius: 20px; }
        .skill-tag button { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1; padding: 0; }
        .skill-tag button:hover { color: #fff; }
        @media (max-width: 900px) {
          .pj-sidebar { display: none; }
          .pj-right { display: none; }
          .pj-main { padding: 20px 16px 100px; }
        }
      `}</style>

      <div className="pj-root">
        {/* Nav */}
        <nav className="pj-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        <div className="pj-layout">
          {/* Left sidebar */}
          <aside className="pj-sidebar">
            <div className="pj-sidebar-heading">RECRUITER</div>
            {[
              { label: 'Dashboard', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, path: '/recruiter/dashboard' },
              { label: 'Post Job',  icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>, path: '/recruiter/post-job', active: true },
              { label: 'Alerts',   icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, path: '/notifications' },
              { label: 'Company',  icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, path: '/recruiter/company-setup' },
            ].map(item => (
              <button
                key={item.label}
                className={`pj-sidebar-item ${item.active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}{item.label}
              </button>
            ))}
            <div style={{ padding: '24px 16px 0' }}>
              <div className="sys-status">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <svg width="13" height="13" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>System Status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#D97706' }}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Fraud Scan: <strong>Pending</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>Continuous monitoring is active.</div>
              </div>
            </div>
          </aside>

          {/* Main form */}
          <main className="pj-main">
            <div className="pj-heading">Post a New Job</div>
            <div className="pj-sub">Configure job details and AI screening parameters.</div>

            <div style={S.card}>
              <div style={S.cardTitle}>Job Details</div>

              <div style={S.field}>
                <label style={S.label}>Job Title <span style={{ color: '#DC2626' }}>*</span></label>
                <input style={S.input} placeholder="e.g. Senior Machine Learning Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>

              <div style={S.field}>
                <label style={S.label}>Company</label>
                <input style={{ ...S.input, background: '#F8FAFC', color: '#64748B' }} value={form.company || 'Loading from company profile…'} readOnly />
              </div>

              <div style={S.field}>
                <label style={S.label}>Job Description <span style={{ color: '#DC2626' }}>*</span></label>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '8px 12px', display: 'flex', gap: 12 }}>
                    {['B', 'I'].map(f => (
                      <button key={f} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: f === 'B' ? 700 : 400, fontStyle: f === 'I' ? 'italic' : 'normal', fontSize: 13, color: '#374151', padding: '2px 6px' }}>{f}</button>
                    ))}
                    <div style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151' }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </button>
                  </div>
                  <textarea
                    style={{ ...S.input, border: 'none', borderRadius: 0, minHeight: 180, resize: 'vertical' }}
                    placeholder="Enter detailed job description, responsibilities, and requirements..."
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                </div>
              </div>

              {/* Skills */}
              <div style={S.field}>
                <label style={S.label}>Required Skills</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, minHeight: 44, alignItems: 'center' }}>
                  {form.skills.map(sk => (
                    <span key={sk} className="skill-tag">
                      {sk}
                      <button onClick={() => removeSkill(sk)}>×</button>
                    </span>
                  ))}
                  <input
                    style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: "'DM Sans', sans-serif", flex: 1, minWidth: 120, color: '#0F172A' }}
                    placeholder="Type a skill and press Enter"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                </div>
              </div>

              {/* Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={S.label}>Min Experience (Years)</label>
                  <input style={S.input} type="number" min="0" placeholder="e.g. 3" value={form.min_experience} onChange={e => set('min_experience', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Max Experience (Years)</label>
                  <input style={S.input} type="number" min="0" placeholder="e.g. 5" value={form.max_experience} onChange={e => set('max_experience', e.target.value)} />
                </div>
              </div>

              {/* Education */}
              <div style={S.field}>
                <label style={S.label}>Minimum Education</label>
                <select style={{ ...S.input, appearance: 'none' }} value={form.education} onChange={e => set('education', e.target.value)}>
                  <option value="">Select level</option>
                  {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', fontWeight: 500, marginBottom: 14 }}>{error}</div>
            )}
          </main>

          {/* Right panel */}
          <aside className="pj-right">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>Logistics</div>

              <div style={S.field}>
                <label style={S.label}>Job Type</label>
                <select style={{ ...S.input, appearance: 'none' }} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Work Mode</label>
                <select style={{ ...S.input, appearance: 'none' }} value={form.work_mode} onChange={e => set('work_mode', e.target.value)}>
                  {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Location</label>
                <input style={S.input} placeholder="City, Country or 'Anywhere'" value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                <div>
                  <label style={S.label}>Salary Min ($)</label>
                  <input style={S.input} type="number" placeholder="120000" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Salary Max ($)</label>
                  <input style={S.input} type="number" placeholder="160000" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Application Deadline</label>
                <input style={S.input} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              </div>
            </div>

            {/* AI Screening */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>AI Screening Setup</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Screening Mode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { val: 'score_threshold', label: 'Score Threshold' },
                    { val: 'top_n', label: 'Top N' },
                  ].map(m => (
                    <button key={m.val} className={`mode-btn ${form.screening_mode === m.val ? 'active' : ''}`} onClick={() => set('screening_mode', m.val)}>{m.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Min Match Score (%)</label>
                <input style={S.input} type="number" min="0" max="100" value={form.min_match_score} onChange={e => set('min_match_score', Number(e.target.value))} />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Candidates below this score are auto-archived.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Blind Hiring</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Hide names & demographics</div>
                </div>
                <div
                  onClick={() => set('blind_hiring', !form.blind_hiring)}
                  style={{ width: 36, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s', background: form.blind_hiring ? '#2563EB' : '#CBD5E1', display: 'flex', alignItems: 'center', padding: '2px 3px', justifyContent: form.blind_hiring ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <div className="footer-bar">
          <button onClick={handleDraft} disabled={saving} style={{ padding: '10px 22px', background: '#fff', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save as Draft'}
          </button>
          <button
            onClick={handlePost}
            disabled={posting}
            style={{ padding: '10px 24px', background: posting ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: posting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
            onMouseOver={e => { if (!posting) e.currentTarget.style.background = '#1D4ED8' }}
            onMouseOut={e => { if (!posting) e.currentTarget.style.background = '#2563EB' }}
          >
            {posting
              ? 'Posting…'
              : <><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Post Job</>
            }
          </button>
        </div>
      </div>
    </>
  )
}
