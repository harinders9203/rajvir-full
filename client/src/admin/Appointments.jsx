import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { ConfirmDialog, EmptyState, Modal, PageLoader, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtDateTime, fmtTime12 } from '../utils/date.js';

const STATUSES = ['all', 'pending', 'accepted', 'rejected', 'completed', 'cancelled'];

export default function AdminAppointments() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { loadNtf } = useOutletContext();

  const status = params.get('status') || 'all';
  const q = params.get('q') || '';
  const date = params.get('date') || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action, appointment, admin_notes }
  const [adminNotes, setAdminNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status !== 'all') query.set('status', status);
    if (q) query.set('q', q);
    if (date) query.set('date', date);
    api(`/admin/appointments?${query.toString()}`)
      .then((d) => setRows(d.appointments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, q, date]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (action, id, notes) => {
    setBusy(true);
    try {
      const d = await api(`/admin/appointments/${id}/${action}`, { method: 'PUT', body: { admin_notes: notes || '' } });
      toast.success(`Appointment #${id} ${action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : action === 'complete' ? 'marked completed' : 'cancelled'}. Customer notified.`);
      setDetail(d.appointment);
      setConfirm(null);
      setAdminNotes('');
      load();
      loadNtf?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openAction = (action, a) => {
    setConfirm({ action, appointment: a });
  };

  return (
    <>
      <h1 className="page-title">Appointments</h1>
      <p className="page-sub">Review requests, accept or reject bookings, and manage the schedule.</p>

      <div className="filter-bar">
        <div className="status-tabs">
          {STATUSES.map((st) => (
            <button key={st} className={`status-tab ${status === st ? 'active' : ''}`} onClick={() => setParam('status', st)}>
              {st === 'all' ? 'All' : st[0].toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="🔍 Search…"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
          style={{ minWidth: 180 }}
        />
        <input className="input" type="date" value={date} onChange={(e) => setParam('date', e.target.value)} />
        {(q || date) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({}, { replace: true })}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon="📅" title="No appointments found" message="Try different filters, or wait for new booking requests to come in." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Nail Design</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="cell-title" data-label="ID">#{a.id}</td>
                  <td data-label="Customer">
                    <span className="cell-title">{a.customer_name}</span>
                    <div className="cell-sub">{a.customer_email}</div>
                  </td>
                  <td data-label="Phone">{a.customer_phone}</td>
                  <td data-label="Design">{a.design_name}</td>
                  <td data-label="Date">{a.appointment_date}</td>
                  <td data-label="Time">{fmtTime12(a.appointment_time)}</td>
                  <td data-label="Price">{money(a.design_price)}</td>
                  <td data-label="Status">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="cell-sub" data-label="Booked">{fmtDateTime(a.created_at)}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setDetail(a)}>
                        View
                      </button>
                      {a.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => openAction('accept', a)}>
                            Accept
                          </button>
                          <button className="btn btn-danger btn-xs" onClick={() => openAction('reject', a)}>
                            Reject
                          </button>
                        </>
                      )}
                      {a.status === 'accepted' && (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => openAction('complete', a)}>
                            Complete
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => openAction('cancel', a)}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* detail modal */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={`Appointment #${detail?.id}`} wide
        footer={
          detail && (detail.status === 'pending' || detail.status === 'accepted') ? (
            <>
              {detail.status === 'pending' && (
                <>
                  <button className="btn btn-danger" onClick={() => { setConfirm({ action: 'reject', appointment: detail }); setDetail(null); }}>
                    Reject
                  </button>
                  <button className="btn btn-primary" onClick={() => { setConfirm({ action: 'accept', appointment: detail }); setDetail(null); }}>
                    Accept
                  </button>
                </>
              )}
              {detail.status === 'accepted' && (
                <button className="btn btn-primary" onClick={() => { setConfirm({ action: 'complete', appointment: detail }); setDetail(null); }}>
                  Mark Completed
                </button>
              )}
            </>
          ) : undefined
        }
      >
        {detail && (
          <div>
            <div className="kv"><span>Customer</span><strong>{detail.customer_name} · {detail.customer_phone}</strong></div>
            <div className="kv"><span>Email</span><span>{detail.customer_email}</span></div>
            <div className="kv"><span>Nail design</span><strong>{detail.design_name} ({money(detail.design_price)} · {detail.design_duration} min)</strong></div>
            <div className="kv"><span>Date & time</span><strong>{fmtDate(detail.appointment_date)} · {fmtTime12(detail.appointment_time)}</strong></div>
            <div className="kv"><span>Status</span><StatusBadge status={detail.status} /></div>
            <div className="kv"><span>Booked</span><span>{fmtDateTime(detail.created_at)}</span></div>
            <div className="kv"><span>Customer notes</span><span>{detail.customer_notes || '—'}</span></div>
            <div className="kv"><span>Admin notes</span><span>{detail.admin_notes || '—'}</span></div>
          </div>
        )}
      </Modal>

      {/* action confirm with notes */}
      <Modal
        open={Boolean(confirm)}
        onClose={() => { setConfirm(null); setAdminNotes(''); }}
        title={confirm ? `${confirm.action[0].toUpperCase() + confirm.action.slice(1)} appointment #${confirm.appointment.id}` : ''}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setConfirm(null); setAdminNotes(''); }}>
              Cancel
            </button>
            <button
              className={`btn ${confirm?.action === 'reject' || confirm?.action === 'cancel' ? 'btn-danger' : 'btn-primary'}`}
              disabled={busy}
              onClick={() => doAction(confirm.action, confirm.appointment.id, adminNotes)}
            >
              {busy ? 'Working…' : `Confirm ${confirm?.action}`}
            </button>
          </>
        }
      >
        {confirm && (
          <div>
            <p className="muted" style={{ marginBottom: 16 }}>
              {confirm.action === 'accept' && 'Accepting reserves the slot and notifies the customer.'}
              {confirm.action === 'reject' && 'Rejecting releases the slot and notifies the customer.'}
              {confirm.action === 'complete' && 'Marking as completed closes this appointment.'}
              {confirm.action === 'cancel' && 'Cancelling releases the slot and notifies the customer.'}
            </p>
            <div className="field">
              <label>Admin note (visible to customer, optional)</label>
              <textarea className="textarea" rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="e.g. Technician unavailable that day…" />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
