import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { PageLoader, StatusBadge } from '../components/ui.jsx';
import { fmtDateShort, fmtTime12 } from '../utils/date.js';

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/admin/stats').then(setData).catch(() => {});
  }, []);

  if (!data) return <PageLoader />;

  const s = data.stats;
  const maxRevenue = Math.max(1, ...data.revenueSeries.map((r) => r.total));

  const statCards = [
    { icon: '📅', cls: 'i-pink', num: s.total_appointments, label: 'Total Appointments' },
    { icon: '⏳', cls: 'i-gold', num: s.pending, label: 'Pending Requests' },
    { icon: '✅', cls: 'i-blue', num: s.accepted, label: 'Accepted' },
    { icon: '✨', cls: 'i-green', num: s.completed, label: 'Completed' },
    { icon: '💵', cls: 'i-red', num: money(s.revenue), label: 'Revenue (completed)' },
    { icon: '👥', cls: 'i-nude', num: s.total_customers, label: 'Total Customers' },
    { icon: '💅', cls: 'i-pink', num: s.total_designs, label: 'Nail Designs' },
    { icon: '🚫', cls: 'i-red', num: s.rejected + s.cancelled, label: 'Rejected / Cancelled' },
  ];

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Welcome back — here is what is happening at the studio today.</p>

      <div className="stat-grid">
        {statCards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-card__icon ${c.cls}`}>{c.icon}</div>
            <div>
              <div className="stat-card__num">{c.num}</div>
              <div className="stat-card__label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel__head">
            <h2>Today's Appointments</h2>
            <span className="badge badge--pending">{s.upcoming} upcoming</span>
          </div>
          {data.todays.length === 0 ? (
            <p className="muted" style={{ padding: 12 }}>
              No appointments booked for today. Enjoy the quiet! 🌸
            </p>
          ) : (
            data.todays.map((a) => (
              <div key={a.id} className="rev-row">
                <div>
                  <strong>
                    {fmtTime12(a.appointment_time)} · {a.customer_name}
                  </strong>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {a.design_name} · {money(a.design_price)}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2>Pending Requests</h2>
            <Link to="/admin/appointments?status=pending" className="btn btn-ghost btn-sm">
              Review all
            </Link>
          </div>
          {data.pending.length === 0 ? (
            <p className="muted" style={{ padding: 12 }}>
              No pending requests. All caught up!
            </p>
          ) : (
            data.pending.map((a) => (
              <div key={a.id} className="rev-row">
                <div>
                  <strong>
                    {a.customer_name} · {fmtDateShort(a.appointment_date)} {fmtTime12(a.appointment_time)}
                  </strong>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {a.design_name}
                  </div>
                </div>
                <Link to={`/admin/appointments?status=pending`} className="btn btn-primary btn-xs">
                  Review
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel__head">
            <h2>Revenue — Last 7 Days</h2>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--pink-600)' }}>
              {money(data.revenueSeries.reduce((a, b) => a + b.total, 0))}
            </strong>
          </div>
          <div className="bars">
            {data.revenueSeries.map((r) => (
              <div className="bar" key={r.date}>
                <span className="bar__val">{r.total ? `$${r.total}` : ''}</span>
                <div className="bar__track" style={{ height: `${Math.max(6, (r.total / maxRevenue) * 100)}%` }} />
                <span className="bar__day">{fmtDateShort(r.date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2>Popular Nail Designs</h2>
          </div>
          {data.popular.length === 0 ? (
            <p className="muted">No bookings yet.</p>
          ) : (
            data.popular.map((d, i) => (
              <div key={d.id} className="rev-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="stat-card__icon i-pink" style={{ width: 36, height: 36, fontSize: 15 }}>
                    {i + 1}
                  </span>
                  <div>
                    <strong>{d.name}</strong>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {d.c} booking{d.c > 1 ? 's' : ''} · {money(d.price)}
                    </div>
                  </div>
                </div>
                <Link to={`/admin/designs`} className="btn btn-ghost btn-xs">
                  Manage
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>Recent Appointments</h2>
          <Link to="/admin/appointments" className="btn btn-ghost btn-sm">
            View all
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Design</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((a) => (
                <tr key={a.id}>
                  <td className="cell-title" data-label="ID">#{a.id}</td>
                  <td data-label="Customer">
                    <span className="cell-title">{a.customer_name}</span>
                    <div className="cell-sub">{a.customer_phone}</div>
                  </td>
                  <td data-label="Design">{a.design_name}</td>
                  <td data-label="Date">{a.appointment_date}</td>
                  <td data-label="Time">{fmtTime12(a.appointment_time)}</td>
                  <td data-label="Price">{money(a.design_price)}</td>
                  <td data-label="Status">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
