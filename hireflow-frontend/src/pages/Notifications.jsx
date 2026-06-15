import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:8000'

const NOTIF_ICONS = {
  shortlisted: { icon: '⭐', color: '#2563EB', bg: '#EFF6FF' },
  interview:   { icon: '📅', color: '#16A34A', bg: '#F0FDF4' },
  rejected:    { icon: '✕',  color: '#DC2626', bg: '#FEF2F2' },
  default:     { icon: '✓',  color: '#64748B', bg: '#F1F5F9' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 1} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : data.items || [])
      }
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { fetchNotifications() }, [])

  const markAllRead = () => {
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
  }

  const getStyle = (type) => {
    const t = type?.toLowerCase()
    if (t?.includes('shortlist')) return NOTIF_ICONS.shortlisted
    if (t?.includes('interview')) return NOTIF_ICONS.interview
    if (t?.includes('reject') || t?.includes('not')) return NOTIF_ICONS.rejected
    return NOTIF_ICONS.default
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .notif-root { min-height: 100vh; background: #F8FAFC; font-family: 'DM Sans', sans-serif; padding-bottom: 80px; }
        .notif-nav { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 20px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .notif-nav-logo { display: flex; align-items: center; gap: 8px; }
        .notif-logo-icon { width: 28px; height: 28px; background: #2563EB; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
        .notif-logo-icon span { color: #fff; font-size: 15px; font-weight: 700; }
        .notif-bell { background: none; border: none; cursor: pointer; color: #64748B; display: flex; }
        .notif-card { background: #fff; border-bottom: 1px solid #F1F5F9; padding: 16px 20px; display: flex; gap: 14px; align-items: flex-start; cursor: pointer; transition: background 0.15s; }
        .notif-card:hover { background: #F8FAFC; }
        .notif-card.unread { background: #FAFBFF; border-left: 3px solid #2563EB; }
        .notif-icon-wrap { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
        .notif-title { font-size: 14px; font-weight: 600; color: #0F172A; margin-bottom: 3px; line-height: 1.3; }
        .notif-body { font-size: 13px; color: #64748B; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .notif-time { font-size: 11px; color: #94A3B8; margin-top: 5px; font-weight: 500; }
        .notif-header { padding: 16px 20px 8px; display: flex; align-items: center; justify-content: space-between; }
        .notif-heading { font-size: 18px; font-weight: 700; color: #0F172A; }
        .mark-read-btn { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; color: #2563EB; }
        .view-all { text-align: center; padding: 16px; font-size: 14px; color: #2563EB; font-weight: 600; cursor: pointer; }
        .empty-state { text-align: center; padding: 60px 20px; color: #94A3B8; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px; margin: 0 auto; background: #fff; border-top: 1px solid #E2E8F0; display: flex; height: 64px; }
        .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #94A3B8; }
        .bnav-item.active { color: #2563EB; }
      `}</style>

      <div className="notif-root">
        <nav className="notif-nav">
          <div className="notif-nav-logo">
            <div className="notif-logo-icon"><span>H</span></div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>HireFlow</span>
          </div>
          <button className="notif-bell">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </nav>

        <div className="notif-header">
          <span className="notif-heading">Notifications</span>
          <button className="mark-read-btn" onClick={markAllRead}>Mark all as read</button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
            No notifications yet.
          </div>
        ) : (
          <>
            {notifications.map(n => {
              const s = getStyle(n.type || n.title)
              return (
                <div
                  key={n.id}
                  className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => n.application_id && navigate(`/interview/${n.application_id}`)}
                >
                  <div className="notif-icon-wrap" style={{ background: s.bg, color: s.color }}>
                    {n.type?.includes('interview') || n.title?.toLowerCase().includes('interview') ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ) : n.type?.includes('shortlist') || n.title?.toLowerCase().includes('shortlist') ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-title">{n.title || 'Notification'}</div>
                    <div className="notif-body">{n.message || n.body || ''}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 8, height: 8, background: '#2563EB', borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              )
            })}
            <div className="view-all">View all notifications</div>
          </>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          { label: 'Dashboard', path: '/dashboard', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: 'Jobs', path: '/jobs', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
          { label: 'Alerts', path: '/notifications', active: true, icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { label: 'Profile', path: '/profile', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(item => (
          <button key={item.label} className={`bnav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
    </>
  )
}
