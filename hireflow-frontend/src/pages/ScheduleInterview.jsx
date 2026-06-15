import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

const FORMATS = [
  { val: 'google_meet', label: 'Google Meet', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
  { val: 'zoom',        label: 'Zoom',        icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { val: 'in_person',   label: 'In-person',   icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

const DURATIONS = [
  { label: '30 min', val: '30' },
  { label: '45 min', val: '45' },
  { label: '60 min', val: '60' },
  { label: '90 min', val: '90' },
]

export default function ScheduleInterview() {
  const { jobId, candidateId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [candidate, setCandidate] = useState(null)
  const [job, setJob] = useState(null)
  const [form, setForm] = useState({
    date: '', time: '10:30', duration: '60',
    format: 'google_meet', notes: '',
  })
  const [meetingLink] = useState('meet.google.com/xqz-vbwj-pnc')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      const jobRes = await fetch(`${API}/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (jobRes.ok) setJob(await jobRes.json())

      // Try to get candidate info from applications
      const appsRes = await fetch(`${API}/jobs/${jobId}/applications`, { headers: { Authorization: `Bearer ${token}` } })
      if (appsRes.ok) {
        const apps = await appsRes.json()
        const app = (Array.isArray(apps) ? apps : []).find(
          a => String(a.application_id) === String(candidateId) ||
               String(a.candidate_id)   === String(candidateId)
        )
        if (app) {
          setCandidate({
            name:        app.name || `Candidate #${app.application_id}`,
            ats_score:   app.ats_score,
            stage:       app.status || 'Applied',
            initials:    (app.name || 'CA').slice(0, 2).toUpperCase(),
          })
        }
      }
    } catch { }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchData()
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.date || !form.time) { setError('Please set a date and time.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/jobs/${jobId}/candidates/${candidateId}/schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          duration: Number(form.duration),
          format: form.format,
          notes: form.notes,
          meeting_link: meetingLink,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => navigate(`/recruiter/jobs/${jobId}/results`), 2000)
      } else {
        const d = await res.json()
        setError(d.detail || 'Failed to schedule.')
      }
    } catch { setError('Server unreachable.') }
    finally { setSubmitting(false) }
  }

  const S = {
    input: { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#0F172A', outline: 'none', background: '#fff', transition: 'border-color 0.15s' },
    label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
    card: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 22, marginBottom: 16 },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        input:focus, textarea:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .si-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .si-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .si-layout { display: flex; gap: 24px; padding: 28px 24px; max-width: 900px; margin: 0 auto; width: 100%; }
        .si-main { flex: 1; min-width: 0; }
        .si-sidebar { width: 240px; flex-shrink: 0; }
        .si-heading { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; margin-bottom: 4px; }
        .si-sub { font-size: 14px; color: #64748B; margin-bottom: 20px; }
        .dur-pill { padding: 7px 16px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #fff; color: #64748B; transition: all 0.15s; }
        .dur-pill.active { background: #2563EB; border-color: #2563EB; color: #fff; font-weight: 600; }
        .format-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .fmt-card { border: 2px solid #E2E8F0; border-radius: 10px; padding: 14px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.15s; background: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #374151; position: relative; }
        .fmt-card.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }
        .fmt-check { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; background: #2563EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .cand-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .cand-avatar { width: 40px; height: 40px; background: #2563EB; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; font-weight: 700; }
        .intel-card { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 16px; }
        .footer-bar { background: #fff; border-top: 1px solid #E2E8F0; padding: 14px 24px; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; }
        .success-banner { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 40px 24px; text-align: center; animation: fadeIn 0.4s ease; }
        @media (max-width: 700px) { .si-layout { flex-direction: column; } .si-sidebar { width: 100%; } }
      `}</style>

      <div className="si-root">
        <nav className="si-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        {submitted ? (
          <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px' }}>
            <div className="success-banner">
              <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Interview Scheduled!</div>
              <div style={{ fontSize: 14, color: '#64748B' }}>Calendar invite sent to all parties. Redirecting…</div>
            </div>
          </div>
        ) : (
          <>
            <div className="si-layout">
              <div className="si-main">
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>
                  <span style={{ cursor: 'pointer', color: '#2563EB' }} onClick={() => navigate(`/recruiter/jobs/${jobId}/results`)}>Results</span>
                  <span style={{ margin: '0 6px' }}>›</span>
                  <span>{candidate?.name || 'Candidate'}</span>
                  <span style={{ margin: '0 6px' }}>›</span>
                  <span>Schedule</span>
                </div>
                <div className="si-heading">Schedule Interview</div>
                <div className="si-sub">
                  {candidate?.name ? `${candidate.name} · ` : ''}{job?.title || 'Job'}
                </div>

                {/* When */}
                <div style={S.card}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>When</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={S.label}>Date</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </span>
                        <input style={{ ...S.input, paddingLeft: 34 }} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ ...S.label, marginBottom: 0 }}>Time</label>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>IST</span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </span>
                        <input style={{ ...S.input, paddingLeft: 34 }} type="time" value={form.time} onChange={e => set('time', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <label style={S.label}>Duration</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DURATIONS.map(d => (
                      <button key={d.val} className={`dur-pill ${form.duration === d.val ? 'active' : ''}`} onClick={() => set('duration', d.val)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div style={S.card}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Format</div>
                  <div className="format-grid">
                    {FORMATS.map(f => (
                      <button key={f.val} className={`fmt-card ${form.format === f.val ? 'active' : ''}`} onClick={() => set('format', f.val)}>
                        {form.format === f.val && (
                          <span className="fmt-check">
                            <svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        )}
                        {f.icon}{f.label}
                      </button>
                    ))}
                  </div>
                  {form.format !== 'in_person' && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Meeting Link (auto-generated)</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input style={{ ...S.input, background: '#F8FAFC', color: '#64748B', flex: 1 }} value={meetingLink} readOnly />
                        <button onClick={() => navigator.clipboard.writeText(meetingLink)} style={{ width: 34, height: 38, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={S.card}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Notes for Candidate</div>
                  <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Included in the calendar invite sent to the candidate.</div>
                  <textarea
                    style={{ ...S.input, minHeight: 90, resize: 'vertical' }}
                    placeholder="e.g. Please review the attached technical assessment before the call…"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </div>

                {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14 }}>{error}</div>}
              </div>

              {/* Sidebar */}
              <div className="si-sidebar">
                {candidate && (
                  <div className="cand-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div className="cand-avatar">{candidate.initials}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{candidate.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{candidate.stage}</div>
                      </div>
                    </div>
                    {candidate.ats_score != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>ATS Score</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{candidate.ats_score}</span>
                          <div style={{ width: 60, height: 5, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${candidate.ats_score}%`, height: '100%', background: '#2563EB', borderRadius: 99 }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="intel-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#2563EB', marginBottom: 8 }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    Scheduling Intelligence
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                    Morning slots <strong>(9 AM–11 AM IST)</strong> typically see faster acceptance rates.
                  </p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                    Best panel availability: <strong>Thu/Fri mornings</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="footer-bar">
              <button onClick={() => navigate(-1)} style={{ padding: '10px 22px', background: '#fff', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ padding: '10px 22px', background: submitting ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                onMouseOver={e => { if (!submitting) e.currentTarget.style.background = '#1D4ED8' }}
                onMouseOut={e => { if (!submitting) e.currentTarget.style.background = '#2563EB' }}
              >
                {submitting ? 'Sending…' : <><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Send Invite</>}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
