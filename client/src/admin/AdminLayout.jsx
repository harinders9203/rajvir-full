import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteData } from '../hooks/useSiteData.js';
import { getBrandName } from '../utils/branding.js';
import { fmtDateTime } from '../utils/date.js';

const NAV = [
  { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/admin/appointments', icon: '📅', label: 'Appointments' },
  { to: '/admin/calendar', icon: '🗓️', label: 'Calendar' },
  { to: '/admin/designs', icon: '💅', label: 'Nail Designs' },
  { to: '/admin/customers', icon: '👥', label: 'Customers' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSiteData();
  const navigate = useNavigate();
  const [ntf, setNtf] = useState({ list: [], unread: 0 });
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef(null);

  const loadNtf = () => {
    api('/admin/notifications')
      .then((d) => setNtf({ list: d.notifications, unread: d.unread }))
      .catch(() => {});
  };

  useEffect(() => {
    loadNtf();
    const t = setInterval(loadNtf, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const markRead = async (id) => {
    await api(`/admin/notifications/${id}/read`, { method: 'PUT' });
    loadNtf();
  };

  const markAll = async () => {
    await api('/admin/notifications/read-all', { method: 'PUT' });
    loadNtf();
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/admin/appointments?q=${encodeURIComponent(search.trim())}`);
  };

  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const salonName = getBrandName(settings?.salon_name);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand__mark">✿</span>
          <span className="brand__text">
            <strong>{salonName}</strong>
            <em>Admin Studio</em>
          </span>
        </div>
        <nav className="sidebar__nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}>
              <span className="ico">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <span>{user?.name}</span>
          <button className="btn btn-ghost btn-xs" onClick={handleLogout} style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#d9c3ca' }}>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="topbar">
          <form className="topbar__search" onSubmit={submitSearch}>
            <span className="ico-search">🔍</span>
            <input
              placeholder="Search appointments, customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
          </form>

          <div className="topbar__actions">
            <div style={{ position: 'relative' }} ref={dropRef}>
              <button className="icon-btn" onClick={() => setDropOpen(!dropOpen)} aria-label="Notifications">
                🔔
                {ntf.unread > 0 && <span className="dot">{ntf.unread > 9 ? '9+' : ntf.unread}</span>}
              </button>
              {dropOpen && (
                <div className="ntf-drop">
                  <div className="ntf-drop__head">
                    <span>Notifications</span>
                    {ntf.unread > 0 && (
                      <button className="btn btn-ghost btn-xs" onClick={markAll}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {ntf.list.length === 0 ? (
                    <p className="muted" style={{ padding: 16, fontSize: 13 }}>
                      No notifications yet.
                    </p>
                  ) : (
                    ntf.list.slice(0, 10).map((n) => (
                      <div key={n.id} className={`ntf-drop__item ${!n.is_read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                        <span style={{ fontSize: 16 }}>{n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '🚫' : 'ℹ️'}</span>
                        <div>
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <time style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDateTime(n.created_at)}</time>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="topbar__profile">
              <div className="avatar">{initials}</div>
              <span>{user?.name}</span>
            </div>
          </div>
        </div>

        <div className="admin-content">
          <Outlet context={{ loadNtf }} />
        </div>
      </div>
    </div>
  );
}
