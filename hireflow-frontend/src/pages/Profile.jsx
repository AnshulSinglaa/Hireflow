import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

export default function Profile() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exists, setExists] = useState(false)
  const [completeness, setCompleteness] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [bio, setBio] = useState('')
  const [salaryExpectation, setSalaryExpectation] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [experience, setExperience] = useState([])
  const [education, setEducation] = useState([])
  const [photoPath, setPhotoPath] = useState(null)

  const [showExpForm, setShowExpForm] = useState(false)
  const [expForm, setExpForm] = useState({ role: '', company: '', start: '', end: '', description: '' })

  const [showEduForm, setShowEduForm] = useState(false)
  const [eduForm, setEduForm] = useState({ degree: '', institution: '', year: '' })

  const fileRef = useRef()
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    if (!token || role !== 'candidate') { navigate('/login'); return }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/candidates/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        navigate('/login')
        return
      }
      const data = await res.json()
      setExists(data.exists)
      setCompleteness(data.profile_complete || 0)
      if (data.exists && data.profile) {
        const p = data.profile
        setFullName(p.full_name || '')
        setBio(p.bio || '')
        setSalaryExpectation(p.salary_expectation || '')
        setGithubUrl(p.github_url || '')
        setLinkedinUrl(p.linkedin_url || '')
        setPortfolioUrl(p.portfolio_url || '')
        setSkills(p.skills || [])
        setExperience(p.experience || [])
        setEducation(p.education || [])
        setPhotoPath(p.photo_path || null)
      }
    } catch {
      setError('Failed to load profile. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    const payload = {
      full_name: fullName,
      bio,
      skills,
      experience,
      education,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      salary_expectation: salaryExpectation,
    }
    try {
      const res = await fetch(`${API}/candidates/profile`, {
        method: exists ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        localStorage.removeItem('token'); localStorage.removeItem('role')
        navigate('/login'); return
      }
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Save failed.'); return }
      setExists(true)
      setCompleteness(data.profile_complete)
      setSuccess('Profile saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Server unreachable.') }
    finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setPhotoUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch(`${API}/candidates/profile/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      if (res.status === 401) {
        localStorage.removeItem('token'); localStorage.removeItem('role')
        navigate('/login'); return
      }
      const data = await res.json()
      if (!res.ok) {
        if (data.detail?.includes('Create your profile first')) {
          setError('Save your profile first, then upload a photo.')
        } else {
          setError(data.detail || 'Upload failed.')
        }
        return
      }
      setCompleteness(data.profile_complete)
      setPhotoPath(data.photo_path)
      setSuccess('Photo updated!'); setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Upload failed.') }
    finally { setPhotoUploading(false) }
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }

  const addExperience = () => {
    if (!expForm.role || !expForm.company) return
    setExperience(prev => [...prev, { ...expForm }])
    setExpForm({ role: '', company: '', start: '', end: '', description: '' })
    setShowExpForm(false)
  }

  const addEducation = () => {
    if (!eduForm.degree || !eduForm.institution) return
    setEducation(prev => [...prev, { ...eduForm }])
    setEduForm({ degree: '', institution: '', year: '' })
    setShowEduForm(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: 80, fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input, textarea { font-family: inherit; }
        input:focus, textarea:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        button:hover { opacity: 0.88; }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {error && <div style={s.errorBox}>{error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        {/* ── HERO CARD ── */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <div
              style={s.avatar}
              onClick={() => fileRef.current.click()}
              title="Click to change photo"
            >
              {photoPath ? (
                <img src={`${API}/${photoPath}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span style={s.avatarInitial}>{fullName ? fullName[0].toUpperCase() : '?'}</span>
              )}
              {photoUploading && (
                <div style={s.photoOverlay}>
                  <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />

            {/* Name + title */}
            <div style={{ flex: 1 }}>
              <input
                style={{ ...s.ghostInput, fontSize: 20, fontWeight: 700, color: '#0F172A' }}
                placeholder="Your Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
              <input
                style={{ ...s.ghostInput, fontSize: 14, color: '#64748B', marginTop: 2 }}
                placeholder="Your Job Title"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>

            {/* Save button */}
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '…' : <>{`Save\nProfile`}</>}
            </button>
          </div>

          {/* Completeness */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Profile Completeness</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: completeness >= 80 ? '#16A34A' : completeness >= 50 ? '#D97706' : '#2563EB' }}>{completeness}%</span>
            </div>
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completeness}%`, background: completeness >= 80 ? '#16A34A' : completeness >= 50 ? '#D97706' : '#2563EB', borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>

        {/* ── BIO ── */}
        <div style={s.card}>
          <div style={s.sectionHeader}>
            <span style={s.sectionIcon}>👤</span>
            <h2 style={s.sectionTitle}>Bio</h2>
          </div>
          <textarea
            style={{ ...s.input, height: 96, resize: 'vertical' }}
            placeholder="Write a short professional summary..."
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
        </div>

        {/* ── WORK EXPERIENCE ── */}
        <div style={s.card}>
          <div style={{ ...s.sectionHeader, justifyContent: 'space-between' }}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>💼</span>
              <h2 style={s.sectionTitle}>Work Experience</h2>
            </div>
            <button style={s.addTextBtn} onClick={() => setShowExpForm(v => !v)}>
              {showExpForm ? 'Cancel' : '+ Add Role'}
            </button>
          </div>

          {showExpForm && (
            <div style={s.subForm}>
              <input style={s.input} placeholder="Job Title / Role" value={expForm.role} onChange={e => setExpForm(f => ({ ...f, role: e.target.value }))} />
              <input style={s.input} placeholder="Company Name" value={expForm.company} onChange={e => setExpForm(f => ({ ...f, company: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...s.input, flex: 1 }} placeholder="Start (e.g. Oct 2020)" value={expForm.start} onChange={e => setExpForm(f => ({ ...f, start: e.target.value }))} />
                <input style={{ ...s.input, flex: 1 }} placeholder="End (or Present)" value={expForm.end} onChange={e => setExpForm(f => ({ ...f, end: e.target.value }))} />
              </div>
              <textarea style={{ ...s.input, height: 72, resize: 'vertical' }} placeholder="Brief description of your role..." value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
              <button style={s.primaryBtn} onClick={addExperience}>Save Entry</button>
            </div>
          )}

          {experience.length === 0 && !showExpForm && (
            <p style={s.emptyHint}>No experience added yet. Click + Add Role.</p>
          )}

          {experience.map((ex, i) => (
            <div key={i} style={s.expItem}>
              <div style={s.expDot} />
              <div style={{ flex: 1 }}>
                <p style={s.expRole}>{ex.role}</p>
                <p style={s.expMeta}>{ex.company}{ex.start ? ` • ${ex.start} – ${ex.end || 'Present'}` : ''}</p>
                {ex.description && <p style={s.expDesc}>{ex.description}</p>}
              </div>
              <button style={s.removeBtn} onClick={() => setExperience(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>

        {/* ── EDUCATION ── */}
        <div style={s.card}>
          <div style={{ ...s.sectionHeader, justifyContent: 'space-between' }}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>🎓</span>
              <h2 style={s.sectionTitle}>Education</h2>
            </div>
            <button style={s.addTextBtn} onClick={() => setShowEduForm(v => !v)}>
              {showEduForm ? 'Cancel' : '+ Add Education'}
            </button>
          </div>

          {showEduForm && (
            <div style={s.subForm}>
              <input style={s.input} placeholder="Degree / Program (e.g. B.Tech CSE)" value={eduForm.degree} onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))} />
              <input style={s.input} placeholder="Institution" value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} />
              <input style={s.input} placeholder="Graduation Year (e.g. 2027)" value={eduForm.year} onChange={e => setEduForm(f => ({ ...f, year: e.target.value }))} />
              <button style={s.primaryBtn} onClick={addEducation}>Save Entry</button>
            </div>
          )}

          {education.length === 0 && !showEduForm && (
            <p style={s.emptyHint}>No education added yet.</p>
          )}

          {education.map((ed, i) => (
            <div key={i} style={s.eduItem}>
              <div style={s.eduIcon}>🏛</div>
              <div style={{ flex: 1 }}>
                <p style={s.expRole}>{ed.degree}</p>
                <p style={s.expMeta}>{ed.institution}{ed.year ? ` • ${ed.year}` : ''}</p>
              </div>
              <button style={s.removeBtn} onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>

        {/* ── SKILLS ── */}
        <div style={s.card}>
          <div style={s.sectionHeader}>
            <span style={s.sectionIcon}>🏷</span>
            <h2 style={s.sectionTitle}>Skills</h2>
          </div>

          <div style={s.tagWrap}>
            {skills.map(sk => (
              <span key={sk} style={s.tag}>
                {sk}
                <button style={s.tagX} onClick={() => setSkills(prev => prev.filter(s => s !== sk))}>×</button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: skills.length ? 10 : 0 }}>
            <input
              style={{ ...s.input, flex: 1, marginBottom: 0 }}
              placeholder="Add a skill..."
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
            />
            <button style={s.iconBtn} onClick={addSkill}>+</button>
          </div>
        </div>

        {/* ── EXTERNAL LINKS ── */}
        <div style={s.card}>
          <div style={s.sectionHeader}>
            <span style={s.sectionIcon}>🔗</span>
            <h2 style={s.sectionTitle}>External Links</h2>
          </div>

          {[
            { icon: '🌐', value: portfolioUrl, setter: setPortfolioUrl, placeholder: 'yourportfolio.dev' },
            { icon: '<>', value: githubUrl, setter: setGithubUrl, placeholder: 'github.com/username' },
            { icon: '💼', value: linkedinUrl, setter: setLinkedinUrl, placeholder: 'linkedin.com/in/username' },
          ].map(({ icon, value, setter, placeholder }) => (
            <div key={placeholder} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={s.linkIcon}>{icon}</span>
              <input
                style={{ ...s.input, flex: 1, marginBottom: 0 }}
                placeholder={placeholder}
                value={value}
                onChange={e => setter(e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* ── PREFERENCES ── */}
        <div style={s.card}>
          <div style={s.sectionHeader}>
            <span style={s.sectionIcon}>⚙️</span>
            <h2 style={s.sectionTitle}>Preferences</h2>
          </div>
          <label style={s.label}>Target Salary (Annual)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={s.inputPrefix}>$</span>
            <input
              style={{ ...s.input, borderRadius: '0 8px 8px 0', marginBottom: 0, borderLeft: 'none' }}
              placeholder="e.g. 8-12 LPA or 135,000"
              value={salaryExpectation}
              onChange={e => setSalaryExpectation(e.target.value)}
            />
          </div>
        </div>

        {/* ── BOTTOM SAVE ── */}
        <button style={{ ...s.saveBtn, width: '100%', marginTop: 8, padding: '14px', fontSize: 15, borderRadius: 10, whiteSpace: 'normal' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : exists ? '✓  Update Profile' : '✓  Create Profile'}
        </button>

      </div>
    </div>
  )
}

const s = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '18px 16px',
    border: '1px solid #E8EDF3',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    marginBottom: 14,
  },
  avatar: {
    width: 68, height: 68, borderRadius: '50%',
    background: '#EFF6FF', border: '2px solid #BFDBFE',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative',
  },
  avatarInitial: { fontSize: 26, fontWeight: 700, color: '#2563EB' },
  photoOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
  },
  ghostInput: {
    border: 'none', outline: 'none', background: 'transparent',
    width: '100%', padding: '2px 0', display: 'block',
  },
  saveBtn: {
    background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3,
    flexShrink: 0,
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 },
  input: {
    display: 'block', width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8,
    fontSize: 14, color: '#0F172A', background: '#fff',
    marginBottom: 10, fontFamily: 'inherit',
  },
  inputPrefix: {
    padding: '9px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: 14, color: '#64748B',
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  addTextBtn: {
    background: 'none', border: 'none', color: '#2563EB',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0,
  },
  primaryBtn: {
    background: '#2563EB', color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  subForm: {
    background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRadius: 8, padding: 14, marginBottom: 14,
  },
  expItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    paddingTop: 12, borderTop: '1px solid #F1F5F9',
  },
  expDot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#2563EB', marginTop: 5, flexShrink: 0,
  },
  expRole: { fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' },
  expMeta: { fontSize: 12, color: '#64748B', margin: '0 0 4px' },
  expDesc: { fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 },
  eduItem: { display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 12, borderTop: '1px solid #F1F5F9' },
  eduIcon: { fontSize: 20, marginTop: 2, flexShrink: 0 },
  tagWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#EFF6FF', color: '#2563EB',
    padding: '5px 10px', borderRadius: 99, fontSize: 13, fontWeight: 500,
  },
  tagX: { background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', fontSize: 14, padding: 0, lineHeight: 1 },
  iconBtn: {
    width: 38, height: 38, background: '#2563EB', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 300,
    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  linkIcon: { fontSize: 16, width: 28, textAlign: 'center', flexShrink: 0, color: '#64748B' },
  removeBtn: {
    background: 'none', border: 'none', color: '#CBD5E1',
    fontSize: 13, cursor: 'pointer', padding: '2px 4px', flexShrink: 0,
  },
  emptyHint: { fontSize: 13, color: '#94A3B8', margin: '4px 0 0' },
  errorBox: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 12 },
  successBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', color: '#16A34A', fontSize: 13, marginBottom: 12 },
}
