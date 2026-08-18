import { useCallback, useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { EmptyState, Modal, PageLoader, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtTime12 } from '../utils/date.js';

export default function AdminCustomers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    api(`/admin/customers${query}`)
      .then((d) => setCustomers(d.customers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (c) => {
    try {
      await api(`/admin/customers/${c.id}`, { method: 'PUT', body: { is_active: !c.is_active } });
      toast.success(c.is_active ? 'Customer deactivated.' : 'Customer reactivated.');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openHistory = async (c) => {
    setDetail(c);
    setHistory(null);
    setHistoryLoading(true);
    try {
      const d = await api(`/admin/customers/${c.id}`);
      setHistory(d);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Customers</h1>
      <p className="page-sub">Registered customers, their activity and appointment history.</p>

      <div className="filter-bar">
        <input className="input" placeholder="🔍 Search by name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
      </div>

      {loading ? (
        <PageLoader />
      ) : customers.length === 0 ? (
        <EmptyState icon="👥" title="No customers found" message="Customers appear here once they create an account." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Appointments</th>
                <th>Last Appointment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td data-label="Customer">
                    <span className="cell-title">{c.name}</span>
                    <div className="cell-sub">#{c.id}</div>
                  </td>
                  <td data-label="Email">{c.email}</td>
                  <td data-label="Phone">{c.phone}</td>
                  <td data-label="Registered">{fmtDate(String(c.created_at).slice(0, 10))}</td>
                  <td data-label="Appointments">
                    {c.appointment_count}
                    {c.pending_count > 0 && <span className="chip chip--off" style={{ marginLeft: 6 }}>{c.pending_count} pending</span>}
                  </td>
                  <td data-label="Last">{c.last_appointment ? fmtDate(c.last_appointment) : '—'}</td>
                  <td data-label="Status">
                    <span className={`chip ${c.is_active ? 'chip--on' : 'chip--off'}`}>{c.is_active ? 'Active' : 'Deactivated'}</span>
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => openHistory(c)}>
                        History
                      </button>
                      <button className="btn btn-outline btn-xs" onClick={() => toggleStatus(c)}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name} wide>
        {historyLoading ? (
          <PageLoader />
        ) : (
          history && (
            <div>
              <div className="grid grid--4" style={{ gap: 12, marginBottom: 22 }}>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div className="stat-card__num" style={{ fontSize: 24 }}>{history.customer.total}</div>
                  <div className="stat-card__label">Total</div>
                </div>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div className="stat-card__num" style={{ fontSize: 24 }}>{history.customer.upcoming || 0}</div>
                  <div className="stat-card__label">Upcoming</div>
                </div>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div className="stat-card__num" style={{ fontSize: 24 }}>{history.customer.completed || 0}</div>
                  <div className="stat-card__label">Completed</div>
                </div>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div className="stat-card__num" style={{ fontSize: 24 }}>{money(history.customer.spent || 0)}</div>
                  <div className="stat-card__label">Total spent</div>
                </div>
              </div>

              <div className="kv"><span>Email</span><span>{history.customer.email}</span></div>
              <div className="kv"><span>Phone</span><span>{history.customer.phone}</span></div>
              <div className="kv"><span>Registered</span><span>{fmtDate(String(history.customer.created_at).slice(0, 10))}</span></div>

              <h3 style={{ margin: '20px 0 12px', fontSize: 18 }}>Appointment History</h3>
              {history.appointments.length === 0 ? (
                <p className="muted">No appointments yet.</p>
              ) : (
                history.appointments.map((a) => (
                  <div key={a.id} className="appointment-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                    <div className="appointment-card__main">
                      <h3>{a.design_name}</h3>
                      <p className="sub">
                        #{a.id} · {fmtDate(a.appointment_date)} at {fmtTime12(a.appointment_time)} · {money(a.design_price)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              )}
            </div>
          )
        )}
      </Modal>
    </>
  );
}
