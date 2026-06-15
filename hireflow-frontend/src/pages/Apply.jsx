import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

export default function Apply() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [job, setJob] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const fetchJob = async () => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setJob(await res.json())
    } catch { } finally { setFetching(false) }
  }

  useEffect(() => { fetchJob() }, [])

  const handleSubmit = async () => {
    setError('')
    if (!resumeFile) { setError('Please upload your resume.'); return }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', resumeFile)
      if (coverLetter) form.append('cover_letter', coverLetter)
      const res = await fetch(`${API}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Application failed.'); return }
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch {
      setError('Server unreachable. Is the backend running?')
    } finally { setLoading(false) }
  }

  if (fetching) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .apply-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 40px; }
        .apply-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; gap: 14px; }
        .back-btn { background: none; border: none; cursor: pointer; color: #64748B; display: flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; }
        .back-btn:hover { color: #0F172A; }
        .nav-logo { display: flex; align-items: center; gap: 7px; }
        .nav-logo-icon { width: 28px; height: 28px; background: #2563EB; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
        .nav-logo-icon span { color: #fff; font-size: 15px; font-weight: 700; }
        .apply-body { padding: 24px 20px 0; max-width: 540px; margin: 0 auto; }
        .apply-job-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin-bottom: 20px; }
        .apply-job-title { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .apply-job-meta { font-size: 13px; color: #64748B; display: flex; gap: 14px; flex-wrap: wrap; }
        .apply-job-meta span { display: flex; align-items: center; gap: 4px; }
        .section-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
        .section-label { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .upload-zone { border: 2px dashed #CBD5E1; border-radius: 10px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #F8FAFC; }
        .upload-zone:hover { border-color: #2563EB; background: #EFF6FF; }
        .upload-zone.has-file { border-color: #16A34A; background: #F0FDF4; border-style: solid; }
        .upload-icon { color: #94A3B8; margin-bottom: 10px; }
        .upload-text { font-size: 14px; color: #64748B; font-weight: 500; }
        .upload-hint { font-size: 12px; color: #94A3B8; margin-top: 4px; }
        .file-name { font-size: 13px; color: #16A34A; font-weight: 600; margin-top: 8px; }
        textarea { width: 100%; padding: 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0F172A; outline: none; resize: vertical; min-height: 120px; transition: border-color 0.15s; }
        textarea:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        textarea::placeholder { color: #CBD5E1; }
        .error-msg { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #DC2626; font-weight: 500; margin-bottom: 14px; }
        .submit-btn { width: 100%; padding: 13px; background: #2563EB; color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .success-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 28px 20px; text-align: center; animation: fadeIn 0.4s ease; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="apply-root">
        <nav className="apply-nav">
          <button className="back-btn" onClick={() => navigate('/jobs')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div className="nav-logo">
            <div className="nav-logo-icon"><span>H</span></div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
        </nav>

        <div className="apply-body">
          {success ? (
            <div className="success-card">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16A34A', marginBottom: 6 }}>Application Submitted!</div>
              <div style={{ fontSize: 14, color: '#64748B' }}>Redirecting to your dashboard…</div>
            </div>
          ) : (
            <>
              {/* Job info */}
              {job && (
                <div className="apply-job-card">
                  <div className="apply-job-title">{job.title}</div>
                  <div className="apply-job-meta">
                    {job.company_name && <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>{job.company_name}</span>}
                    {job.location && <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{job.location}</span>}
                    {job.work_mode && <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>{job.work_mode}</span>}
                  </div>
                </div>
              )}

              {/* Resume upload */}
              <div className="section-card">
                <div className="section-label">
                  <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Resume / CV <span style={{ color: '#DC2626' }}>*</span>
                </div>
                <label
                  className={`upload-zone ${resumeFile ? 'has-file' : ''}`}
                  htmlFor="resume-input"
                >
                  {resumeFile ? (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div className="file-name">{resumeFile.name}</div>
                      <div className="upload-hint" style={{ marginTop: 6 }}>Click to replace</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <div className="upload-text">Click to upload your resume</div>
                      <div className="upload-hint">PDF, DOC, DOCX up to 10MB</div>
                    </>
                  )}
                  <input
                    id="resume-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => setResumeFile(e.target.files[0] || null)}
                  />
                </label>
              </div>

              {/* Cover letter */}
              <div className="section-card">
                <div className="section-label">
                  <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Cover Letter <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  placeholder="Tell the recruiter why you're the perfect fit for this role..."
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Submitting…</>
                ) : (
                  <>Submit Application <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
