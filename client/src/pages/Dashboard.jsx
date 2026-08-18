import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { ConfirmDialog, EmptyState, ErrorBox, FieldError, PageLoader, StatusBadge, TypeIcon } from '../components/ui.jsx';
import { fmtDate, fmtDateTime, fmtTime12 } from '../utils/date.js';

const TABS = ['overview', 'appointments', 'notifications', 'profile'];

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, n] = await Promise.all([api('/appointments'), api('/notifications')]);
      setAppointments(a.appointments);
      setNotifications(n.notifications);
      setUnread(n.unread);
    } catch {
      /* handled by guard */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancelAppointment = async (id) => {
    try {
      await api(`/appointments/${id}/cancel`, { method: 'PUT' });
      toast.success('Appointment cancelled. The slot has been released.');
      setConfirmCancel(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const markRead = async (n) => {
    if (n.is_read) return;
    await api(`/notifications/${n.id}/read`, { method: 'PUT' });
    load();
  };

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'PUT' });
    load();
  };

  if (loading) return <PageLoader />;

  const upcoming = appointments.filter((a) => a.status === 'pending' || a.status === 'accepted');

  const past = appointments.filter((a) => ['completed', 'rejected', 'cancelled'].includes(a.status));
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const AppointmentRow = ({ a }) => (
    <div className="appointment-card">
      <div className="appointment-card__img">
        {a.design_image ? <img src={a.design_image} alt="" /> : '💅'}
      </div>
      <div className="appointment-card__main">
        <h3>{a.design_name}</h3>
        <p className="sub">
          #{a.id} · {fmtDate(a.appointment_date)} at {fmtTime12(a.appointment_time)} · booked {fmtDateTime(a.created_at)}
        </p>
        {a.admin_notes && (
          <p className="sub" style={{ marginTop: 4, fontStyle: 'italic' }}>
            Salon note: {a.admin_notes}
          </p>
        )}
      </div>
      <div className="appointment-card__meta">
        <StatusBadge status={a.status} />
        <div className="price mt-1">{money(a.design_price)}</div>
      </div>
      {(a.status === 'pending' || a.status === 'accepted') && (
        <button className="btn btn-ghost btn-xs" onClick={() => setConfirmCancel(a)}>
          Cancel
        </button>
      )}
    </div>
  );

  return (
    <div className="dash-wrap">
      <div className="dash-head">
        <div>
          <h1>Hello, {user?.name?.split(' ')[0]} 💕</h1>
          <p className="muted">Here is what is happening with your nails.</p>
        </div>
        <Link to="/book" className="btn btn-primary">
          + Book Appointment
        </Link>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'appointments' ? `My Appointments` : t === 'notifications' ? `Notifications${unread ? ` (${unread})` : ''}` : 'Profile'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid stat-grid--3">
            <div className="stat-card">
              <div className="stat-card__icon i-pink">💅</div>
              <div>
                <div className="stat-card__num">{appointments.length}</div>
                <div className="stat-card__label">Total appointments</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon i-gold">⏳</div>
              <div>
                <div className="stat-card__num">{upcoming.length}</div>
                <div className="stat-card__label">Upcoming</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon i-green">✨</div>
              <div>
                <div className="stat-card__num">{past.filter((a) => a.status === 'completed').length}</div>
                <div className="stat-card__label">Completed</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>Upcoming Appointments</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('appointments')}>
                View all
              </button>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No upcoming appointments yet"
                message="Your nails are ready for their moment — book your first appointment now."
                cta="Explore Nail Designs"
                to="/designs"
              />
            ) : (
              upcoming.map((a) => <AppointmentRow key={a.id} a={a} />)
            )}
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>Recent Activity</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('notifications')}>
                All notifications
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="muted">No notifications yet.</p>
            ) : (
              <div className="ntf-list">
                {notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className={`ntf-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markRead(n)}>
                    <TypeIcon type={n.type} />
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <time>{fmtDateTime(n.created_at)}</time>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'appointments' && (
        <>
          <div className="panel">
            <div className="panel__head">
              <h2>My Appointments</h2>
            </div>
            {appointments.length === 0 ? (
              <EmptyState
                icon="💅"
                title="You don't have any appointments yet"
                message="Browse our designs and book your first appointment in under a minute."
                cta="Explore Nail Designs"
                to="/designs"
              />
            ) : (
              appointments.map((a) => <AppointmentRow key={a.id} a={a} />)
            )}
          </div>
        </>
      )}

      {tab === 'notifications' && (
        <div className="panel">
          <div className="panel__head">
            <h2>Notifications</h2>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <EmptyState icon="🔔" title="No notifications yet" message="Booking updates and salon messages will appear here." />
          ) : (
            <div className="ntf-list">
              {notifications.map((n) => (
                <div key={n.id} className={`ntf-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markRead(n)}>
                  <TypeIcon type={n.type} />
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <time>{fmtDateTime(n.created_at)}</time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && <ProfilePane user={user} refreshUser={refreshUser} toast={toast} />}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => cancelAppointment(confirmCancel.id)}
        title="Cancel this appointment?"
        message={`This will cancel your appointment for "${confirmCancel?.design_name}" on ${confirmCancel ? fmtDate(confirmCancel.appointment_date) : ''} and release the time slot.`}
        confirmLabel="Yes, cancel it"
        danger
      />
    </div>
  );
}

function ProfilePane({ user, refreshUser, toast }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaved(false);
    setBusy(true);
    try {
      await api('/profile', { method: 'PUT', body: form });
      await refreshUser();
      setSaved(true);
      toast.success('Profile updated.');
    } catch (err) {
      setErrors(err.data?.errors || { form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="panel-grid">
      <div>
        <div className="profile-card">
          <div className="profile-card__head">
            <div className="profile-card__avatar">{initials}</div>
            <div>
              <h2>{user?.name}</h2>
              <p>Member since {fmtDate(String(user?.created_at || '').slice(0, 10))}</p>
            </div>
          </div>
          <div className="profile-card__body">
            <div className="profile-row">
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div className="profile-row">
              <span>Phone</span>
              <strong>{user?.phone || '—'}</strong>
            </div>
            <div className="profile-row">
              <span>Role</span>
              <strong>Customer</strong>
            </div>
          </div>
        </div>
      </div>
      <form className="profile-form" onSubmit={submit} style={{ maxWidth: 'none' }}>
        <h2 style={{ fontSize: 22, marginBottom: 18 }}>Edit Profile</h2>
        <ErrorBox message={errors.form} />
        {saved && <div className="success-box mb-2">Profile saved.</div>}
        <div className="field">
          <label>Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FieldError>{errors.email}</FieldError>
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <FieldError>{errors.phone}</FieldError>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
