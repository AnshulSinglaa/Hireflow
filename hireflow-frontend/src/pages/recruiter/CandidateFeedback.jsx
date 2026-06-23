import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

const STATUS_STYLE = {
  shortlisted: { bg: '#EFF6FF', color: '#2563EB', label: 'Shortlisted' },
  maybe:       { bg: '#FEF9C3', color: '#D97706', label: 'Maybe' },
  rejected:    { bg: '#FEF2F2', color: '#DC2626', label: 'Rejected' },
  ats_passed:  { bg: '#F0FDF4', color: '#16A34A', label: 'ATS Passed' },
  ats_failed:  { bg: '#FEF2F2', color: '#DC2626', label: 'Failed ATS' },
  pending:     { bg: '#F1F5F9', color: '#64748B', label: 'Pending' },
}

function ScoreBar({ label, value }) {
  const v = value ?? 0
  const color = v >= 70 ? '#16A34A' : v >= 50 ? '#D97706' : '#DC2626'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{v}/100</span>
      </div>
      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function CandidateFeedback() {
  const { jobId, applicationId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${API}/jobs/${jobId}/candidates/${applicationId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (res.status === 401) { localStorage.clear(); navigate('/login'); return }
        if (!res.ok) { setError('Could not load candidate feedback.'); return }
        setData(await res.json())
      })
      .catch(() => setError('Server unreachable.'))
      .finally(() => setLoading(false))
  }, [jobId, applicationId])

  const statusInfo = data ? (STATUS_STYLE[data.status] || STATUS_STYLE.pending) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        body { background: #F8FAFC; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>H</span>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'none', border: 'none', fontSize: 14, color: '#64748B', cursor: 'pointer' }}>Logout</button>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
          <button onClick={() => navigate(`/recruiter/jobs/${jobId}/applications`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 16 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Applications
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              Loading feedback…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#DC2626' }}>{error}</div>
          ) : (
            <>
              {/* Header card */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{data.candidate_name}</div>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>Application #{data.application_id}</div>
                  </div>
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20 }}>
                    {statusInfo.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>ATS Score</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{data.ats_score ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Pipeline Score</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{data.pipeline_score ?? '—'}</div>
                  </div>
                  {data.recommendation && (
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>AI Recommendation</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#2563EB' }}>{data.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>

              {!data.has_pipeline_result && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 13, color: '#92400E' }}>
                  This candidate hasn't been through the full AI pipeline yet — only the initial ATS check has run.
                  Run the pipeline from the dashboard to generate scoring, interview questions, and emails.
                </div>
              )}

              {/* Score breakdown */}
              {data.score_breakdown && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Score Breakdown</div>
                  <ScoreBar label="Skills Match" value={data.score_breakdown.skills_match} />
                  <ScoreBar label="Experience Match" value={data.score_breakdown.experience_match} />
                  <ScoreBar label="Education Match" value={data.score_breakdown.education_match} />
                  <ScoreBar label="Overall Fit" value={data.score_breakdown.overall_fit} />
                </div>
              )}

              {/* Strengths / Weaknesses */}
              {(data.strengths || data.weaknesses) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Strengths</div>
                    {(data.strengths || []).map((s, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>• {s}</div>
                    ))}
                  </div>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Weaknesses</div>
                    {(data.weaknesses || []).map((w, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>• {w}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Kit — only for shortlisted */}
              {data.interview_kit?.questions && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>🎯 AI-Generated Interview Questions</div>
                  {data.interview_kit.questions.map((q, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < data.interview_kit.questions.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{i + 1}. {q.question}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 10, marginRight: 6 }}>{q.probes}</span>
                        {q.why}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Email */}
              {data.email_body && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                    📧 AI-Generated {data.email_type === 'shortlist' ? 'Shortlist' : 'Rejection'} Email
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>This is what was sent to the candidate.</div>
                  <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 16, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {data.email_body}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
