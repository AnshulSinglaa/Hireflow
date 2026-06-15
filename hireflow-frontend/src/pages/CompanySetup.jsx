import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce', 'Media', 'Manufacturing', 'Consulting', 'Other']
const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

export default function CompanySetup() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [form, setForm] = useState({
    name: '', about: '', industry: '', size: '',
    headquarters: '', website: '', linkedin: '', tax_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [checks, setChecks] = useState({
    email_domain: false, website: false, linkedin: false, tax_id: false,
  })

  const fetchCompany = async () => {
    try {
      const res = await fetch(`${API}/companies/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setForm({
          name: data.name || '',
          about: data.about || '',
          industry: data.industry || '',
          size: data.size || '',
          headquarters: data.location || '',
          website: data.website || '',
          linkedin: data.linkedin_url || '',
          tax_id: data.gst_number || '',
        })
        setChecks({
          email_domain: !!data.domain_verified,
          website: !!data.website_verified,
          linkedin: !!data.linkedin_verified,
          tax_id: !!data.gst_number,
        })
      }
    } catch { }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchCompany()
  }, [])

  const handleSave = async () => {
    setError('')
    if (!form.name) { setError('Company name is required.'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        about: form.about,
        industry: form.industry,
        size: form.size,
        location: form.headquarters,
        website: form.website,
        linkedin_url: form.linkedin,
        gst_number: form.tax_id,
      }
      const res = await fetch(`${API}/companies/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Save failed.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Server unreachable.')
    } finally { setSaving(false) }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const S = {
    input: { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#0F172A', outline: 'none', background: '#fff', transition: 'border-color 0.15s' },
    label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
    field: { marginBottom: 16 },
    card: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        input:focus, textarea:focus, select:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        .cs-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        .cs-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .cs-body { display: flex; gap: 24px; padding: 28px 24px; max-width: 1000px; margin: 0 auto; }
        .cs-main { flex: 1; min-width: 0; }
        .cs-sidebar { width: 260px; flex-shrink: 0; }
        .cs-heading { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; margin-bottom: 4px; }
        .cs-subheading { font-size: 14px; color: #64748B; margin-bottom: 24px; }
        .icon-upload { width: 64px; height: 64px; border: 2px dashed #CBD5E1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; gap: 4px; transition: all 0.15s; }
        .icon-upload:hover { border-color: #2563EB; background: #EFF6FF; }
        .check-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .check-circle { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #CBD5E1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .check-circle.done { background: #2563EB; border-color: #2563EB; }
        .pending-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; }
        .pending-icon { width: 44px; height: 44px; background: #F1F5F9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
        .footer-bar { background: #fff; border-top: 1px solid #E2E8F0; padding: 16px 24px; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; }
        @media (max-width: 640px) {
          .cs-body { flex-direction: column; padding: 20px 16px; }
          .cs-sidebar { width: 100%; }
        }
      `}</style>

      <div className="cs-root">
        {/* Nav */}
        <nav className="cs-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Dashboard', action: () => navigate('/recruiter/dashboard') },
              { label: 'Jobs',      action: () => navigate('/recruiter/post-job') },
              { label: 'Alerts',   action: () => navigate('/notifications') },
              { label: 'Profile',  action: null, active: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action || undefined}
                style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: item.active ? 600 : 400, color: item.active ? '#2563EB' : '#64748B', cursor: 'pointer', borderBottom: item.active ? '2px solid #2563EB' : 'none', paddingBottom: 2 }}
              >{item.label}</button>
            ))}
            <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
          </div>
        </nav>

        <div className="cs-body">
          {/* Main */}
          <div className="cs-main">
            <div className="cs-heading">Company Profile Setup</div>
            <div className="cs-subheading">Complete your organization's details to establish trust and attract top candidates.</div>

            {/* Basic Info */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Basic Information</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Company Logo</div>
                  <label className="icon-upload" htmlFor="logo-upload">
                    <svg width="20" height="20" fill="none" stroke="#94A3B8" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Upload</span>
                    <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} />
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.field}>
                    <label style={S.label}>Company Name <span style={{ color: '#DC2626' }}>*</span></label>
                    <input style={S.input} placeholder="e.g. Acme Corp" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>About Company</label>
                <textarea
                  style={{ ...S.input, minHeight: 90, resize: 'vertical' }}
                  placeholder="Describe your company's mission and culture..."
                  value={form.about}
                  onChange={e => set('about', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={S.label}>Industry</label>
                  <select style={{ ...S.input, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2394A3B8' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }} value={form.industry} onChange={e => set('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Company Size</label>
                  <select style={{ ...S.input, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2394A3B8' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }} value={form.size} onChange={e => set('size', e.target.value)}>
                    <option value="">Select size</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>Headquarters Location</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <input style={{ ...S.input, paddingLeft: 34 }} placeholder="City, Country" value={form.headquarters} onChange={e => set('headquarters', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Verification Details */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Verification Details</div>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>These details are used to verify your company and generate a Trust Score for candidates.</p>

              {[
                { key: 'website', label: 'Website URL', placeholder: 'https://www.example.com', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
                { key: 'linkedin', label: 'LinkedIn Company Page', placeholder: 'linkedin.com/company/yourco', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> },
                { key: 'tax_id', label: 'Tax ID / GST Number', placeholder: 'XX-XXXXXXX', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key} style={S.field}>
                  <label style={S.label}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>{icon}</span>
                    <input style={{ ...S.input, paddingLeft: 34 }} placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', fontWeight: 500, marginBottom: 14 }}>{error}</div>
            )}
          </div>

          {/* Sidebar */}
          <div className="cs-sidebar">
            <div className="pending-card">
              <div className="pending-icon">
                <svg width="20" height="20" fill="none" stroke="#94A3B8" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Verification Pending</div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginBottom: 16 }}>Complete the form to generate your company Trust Score. Higher scores attract better talent.</div>
              <div>
                {[
                  { key: 'email_domain', label: 'Email domain match' },
                  { key: 'website',      label: 'Website live status' },
                  { key: 'linkedin',     label: 'LinkedIn existence' },
                  { key: 'tax_id',       label: 'Tax ID validation' },
                ].map(item => (
                  <div key={item.key} className="check-item">
                    <div className={`check-circle ${checks[item.key] ? 'done' : ''}`}>
                      {checks[item.key] && <svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: checks[item.key] ? '#0F172A' : '#64748B' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-bar">
          <button
            onClick={() => navigate('/recruiter/dashboard')}
            style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 28px', background: saved ? '#16A34A' : '#2563EB', color: '#fff',
              border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
            }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Company Profile'}
          </button>
        </div>
      </div>
    </>
  )
}
