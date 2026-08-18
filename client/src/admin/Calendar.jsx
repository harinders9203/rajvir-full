import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { Modal, PageLoader, StatusBadge } from '../components/ui.jsx';
import { DAY_NAMES, MONTHS, SHORT_DAYS, addDays, fmtDate, fmtTime12, todayISO, toISO } from '../utils/date.js';

export default function AdminCalendar() {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => toISO(new Date()));
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null); // { date, appts }

  const load = useCallback(async (start, end) => {
    setData(null);
    const d = await api(`/admin/calendar?start=${start}&end=${end}`);
    setData(d);
  }, []);

  useEffect(() => {
    const d = new Date(`${cursor}T00:00:00`);
    if (view === 'month') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const start = addDays(toISO(first), -first.getDay());
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const end = addDays(toISO(last), 6 - last.getDay());
      load(start, end);
    } else if (view === 'week') {
      const start = addDays(cursor, -d.getDay());
      const end = addDays(start, 6);
      load(start, end);
    } else {
      load(cursor, cursor);
    }
  }, [view, cursor, load]);

  const byDate = useMemo(() => {
    const map = {};
    for (const a of data?.appointments || []) {
      (map[a.appointment_date] = map[a.appointment_date] || []).push(a);
    }
    return map;
  }, [data]);

  const hours = useMemo(() => {
    const map = {};
    for (const h of data?.hours || []) map[h.day_of_week] = h;
    return map;
  }, [data]);

  const shift = (n) => {
    const d = new Date(`${cursor}T00:00:00`);
    if (view === 'month') d.setMonth(d.getMonth() + n);
    else if (view === 'week') d.setDate(d.getDate() + 7 * n);
    else d.setDate(d.getDate() + n);
    setCursor(toISO(d));
  };

  const goToday = () => setCursor(todayISO());

  const title = useMemo(() => {
    const d = new Date(`${cursor}T00:00:00`);
    if (view === 'month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (view === 'week') {
      const start = new Date(`${addDays(cursor, -d.getDay())}T00:00:00`);
      const end = addDays(addDays(cursor, -d.getDay()), 6);
      const e = new Date(`${end}T00:00:00`);
      if (start.getMonth() === e.getMonth()) return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${e.getDate()}, ${e.getFullYear()}`;
      return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return fmtDate(cursor);
  }, [cursor, view]);

  const openDay = (date) => setSelected({ date, appts: byDate[date] || [] });

  const weekDays = useMemo(() => {
    const d = new Date(`${cursor}T00:00:00`);
    const start = addDays(cursor, -d.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  if (!data) return <PageLoader />;

  const Chip = ({ a, compact }) => (
    <button className={`cal-chip cal-chip--${a.status}`} title={`${a.customer_name} — ${a.design_name}`} onClick={() => openDay(a.appointment_date)}>
      {compact ? `${fmtTime12(a.appointment_time)} ${a.customer_name.split(' ')[0]}` : `${fmtTime12(a.appointment_time)} · ${a.customer_name}`}
    </button>
  );

  const dayCell = (iso, otherMonth) => {
    const appts = byDate[iso] || [];
    const d = new Date(`${iso}T00:00:00`);
    const h = hours[d.getDay()];
    const closed = !h?.is_open;
    const today = iso === todayISO();
    return (
      <div key={iso} className={`cal-cell ${otherMonth ? 'other-month' : ''} ${closed ? 'closed-day' : ''} ${today ? 'today-cell' : ''}`}>
        <div className="cal-cell__num">
          <span>{d.getDate()}</span>
          {closed && <span className="closed-tag">Closed</span>}
        </div>
        {appts.slice(0, 3).map((a) => (
          <Chip key={a.id} a={a} compact />
        ))}
        {appts.length > 3 && (
          <button className="cal-more" onClick={() => openDay(iso)}>
            +{appts.length - 3} more
          </button>
        )}
      </div>
    );
  };

  const dayList = view === 'day' ? [cursor] : weekDays;

  return (
    <>
      <h1 className="page-title">Calendar</h1>
      <p className="page-sub">See at a glance which slots are occupied — pending, accepted, completed and more.</p>

      <div className="cal-head">
        <div className="cal-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => shift(-1)}>←</button>
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => shift(1)}>→</button>
          <button className="btn btn-outline btn-sm" onClick={goToday}>Today</button>
        </div>
        <div className="cal-views">
          {['month', 'week', 'day'].map((v) => (
            <button key={v} className={`status-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <>
          <div className="cal-grid">
            {SHORT_DAYS.map((d) => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {(() => {
              const d = new Date(`${cursor}T00:00:00`);
              const first = new Date(d.getFullYear(), d.getMonth(), 1);
              const start = addDays(toISO(first), -first.getDay());
              const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
              const end = addDays(toISO(last), 6 - last.getDay());
              const cells = [];
              let cur = start;
              let guard = 0;
              while (cur <= end && guard < 42) {
                const iso = cur;
                const dt = new Date(`${iso}T00:00:00`);
                cells.push(dayCell(iso, dt.getMonth() !== d.getMonth()));
                cur = addDays(cur, 1);
                guard++;
              }
              return cells;
            })()}
          </div>
        </>
      )}

      {(view === 'week' || view === 'day') && (
        <div style={{ overflowX: 'auto' }}>
          <div className="cal-week" style={{ minWidth: view === 'week' ? 860 : 200 }}>
            <div />
            {dayList.map((iso) => {
              const d = new Date(`${iso}T00:00:00`);
              return (
                <div key={iso} className="cal-dow" style={{ cursor: 'pointer' }} onClick={() => openDay(iso)}>
                  {SHORT_DAYS[d.getDay()]} {d.getDate()}
                </div>
              );
            })}
            <div />
            {dayList.map((iso) => {
              const appts = byDate[iso] || [];
              const h = hours[new Date(`${iso}T00:00:00`).getDay()];
              const sorted = [...appts].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
              return (
                <div key={iso} className="hour-cell" style={{ minHeight: 80 }}>
                  {sorted.map((a) => (
                    <button key={a.id} className={`cal-chip cal-chip--${a.status}`} style={{ position: 'static', width: '100%', marginTop: 6 }} onClick={() => openDay(iso)}>
                      {fmtTime12(a.appointment_time)} · {a.customer_name} · {a.design_name}
                    </button>
                  ))}
                  {sorted.length === 0 && <p className="muted" style={{ fontSize: 12, paddingTop: 8 }}>—</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Appointments — ${fmtDate(selected.date)}` : ''} wide>
        {selected?.appts.length === 0 ? (
          <p className="muted">No appointments on this day.</p>
        ) : (
          selected?.appts.map((a) => (
            <div key={a.id} className="appointment-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
              <div className="appointment-card__main">
                <h3>{a.design_name}</h3>
                <p className="sub">
                  {fmtTime12(a.appointment_time)} · {a.customer_name} · {a.customer_phone} · {money(a.design_price)}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))
        )}
      </Modal>
    </>
  );
}
