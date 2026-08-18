import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { EmptyState, ErrorBox, FieldError, Spinner } from '../components/ui.jsx';
import { DAY_NAMES, SHORT_DAYS, MONTHS, addDays, fmtDate, fmtTime12, todayISO } from '../utils/date.js';

export default function Booking() {
  const { designId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [design, setDesign] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [date, setDate] = useState('');
  const [availability, setAvailability] = useState(null);
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const advanceLimit = useMemo(() => {
    const d = new Date();
    const limit = availability?.settings?.advance_booking_days || 60;
    d.setDate(d.getDate() + limit);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, [availability]);

  useEffect(() => {
    let cancelled = false;
    api(`/nail-designs/${designId}`)
      .then((d) => {
        if (cancelled) return;
        setDesign(d.design);
        if (d.design.is_active === false) setLoadErr('This design is currently unavailable for booking.');
      })
      .catch((e) => !cancelled && setLoadErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [designId]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setAvailability(null);
    setSlot('');
    api(`/availability?date=${date}`)
      .then((d) => !cancelled && setAvailability(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [date]);

  const dates = useMemo(() => {
    const list = [];
    const today = todayISO();
    for (let i = 0; i < 21; i++) {
      const iso = addDays(today, i);
      if (iso > advanceLimit) break;
      list.push(iso);
    }
    return list;
  }, [advanceLimit]);

  const nowISO = todayISO();
  const currentTimeMin = new Date().getHours() * 60 + new Date().getMinutes();

  const isPastSlot = (t) => {
    if (date !== nowISO) return false;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m <= currentTimeMin;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!date) {
      setErrors({ date: 'Please choose a date.' });
      return;
    }
    if (!slot) {
      setErrors({ slot: 'Please choose an available time slot.' });
      return;
    }
    setSubmitting(true);
    try {
      const d = await api('/appointments', {
        method: 'POST',
        body: {
          nail_design_id: designId,
          appointment_date: date,
          appointment_time: slot,
          customer_notes: notes,
        },
      });
      setDone(d.appointment);
      toast.success(
        'Your appointment request has been submitted and is awaiting confirmation. You can track its status in your dashboard.',
        'Booking received'
      );
    } catch (err) {
      if (err.status === 409) {
        setErrors({ slot: err.message });
        toast.error(err.message);
      } else if (err.data?.errors) {
        setErrors(err.data.errors);
        toast.error(Object.values(err.data.errors)[0]);
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadErr) {
    return (
      <div className="container" style={{ padding: '80px 0' }}>
        <EmptyState icon="⚠️" title="Can't book this design" message={loadErr} cta="Browse designs" to="/designs" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="booking-wrap">
        <div className="booking-success">
          <div className="booking-success__icon">✅</div>
          <h2>Booking Request Submitted!</h2>
          <p>
            <strong>{design?.name}</strong> on <strong>{fmtDate(done.appointment_date)}</strong> at{' '}
            <strong>{fmtTime12(done.appointment_time)}</strong>. Your request is{' '}
            <span className="badge badge--pending">Pending</span> — our team will confirm it shortly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn btn-primary">
              Track in Dashboard
            </Link>
            <Link to="/designs" className="btn btn-ghost">
              Book Another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="container" style={{ padding: '80px 0' }}>
        <Spinner label="Loading design…" />
      </div>
    );
  }

  const slotGrid = availability?.slots || [];

  return (
    <div className="booking-wrap">
      <div className="booking-grid">
        {/* summary */}
        <aside className="design-summary">
          <div className="design-summary__img">
            {design.image_url ? (
              <img src={design.image_url} alt={design.name} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 48 }}>💅</div>
            )}
          </div>
          <div className="design-summary__body">
            <span className="design-card__cat" style={{ position: 'static', display: 'inline-block', marginBottom: 10 }}>
              {design.category}
            </span>
            <h2>{design.name}</h2>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {design.description}
            </p>
            <div className="design-summary__meta">
              <span>⏱ {design.duration} min</span>
              {user && <span>👤 {user.name}</span>}
            </div>
            <div className="design-summary__price">{money(design.price)}</div>
          </div>
        </aside>

        {/* form */}
        <form className="booking-panel" onSubmit={submit}>
          <div className="step-label">Step 1 — Pick a date</div>
          <div className="date-strip">
            {dates.map((iso) => {
              const d = new Date(`${iso}T00:00:00`);
              return (
                <button
                  type="button"
                  key={iso}
                  className={`date-chip ${date === iso ? 'active' : ''}`}
                  onClick={() => setDate(iso)}
                  aria-pressed={date === iso}
                >
                  <span className="date-chip__dow">{SHORT_DAYS[d.getDay()]}</span>
                  <span className="date-chip__day">{d.getDate()}</span>
                  <span className="date-chip__mon">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                </button>
              );
            })}
          </div>

          <div className="step-label">Step 2 — Choose a time</div>
          {!date ? (
            <p className="muted" style={{ fontSize: 14 }}>
              Select a date above to see live availability.
            </p>
          ) : availability === null ? (
            <Spinner label="Checking availability…" />
          ) : !availability.is_open ? (
            <EmptyState icon="🌙" title="Closed on this day" message="The salon is closed on this day. Please pick another date." />
          ) : (
            <>
              <div className="slots-grid">
                {slotGrid.map((s) => {
                  const past = isPastSlot(s.time);
                  const disabled = !s.available || past;
                  return (
                    <button
                      type="button"
                      key={s.time}
                      className={`slot-btn ${slot === s.time ? 'selected' : ''}`}
                      disabled={disabled}
                      onClick={() => setSlot(s.time)}
                      title={disabled ? (past ? 'This time has passed' : 'Already booked') : `${s.time} — Available`}
                    >
                      {fmtTime12(s.time)}
                    </button>
                  );
                })}
              </div>
              {!slot && (
                <p className="muted mt-2" style={{ fontSize: 13 }}>
                  Struck-through slots are already booked. Live availability is checked on the server when you confirm.
                </p>
              )}
            </>
          )}

          <div className="step-label mt-3">Step 3 — Your details</div>
          <div className="grid grid--2" style={{ gap: 14 }}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Full name</label>
              <input className="input" value={user?.name || ''} readOnly disabled placeholder="Sign in to book" />
              {!user && (
                <Link to={`/login?next=${encodeURIComponent(`/book/${designId}`)}`} className="field-error">
                  Please sign in to book
                </Link>
              )}
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Phone</label>
              <input className="input" value={user?.phone || ''} readOnly disabled />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Notes (optional)</label>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, inspo links, preferred colors…"
            />
          </div>

          <ErrorBox message={errors.form} />
          <FieldError>{errors.date || errors.slot || errors.appointment_time || errors.appointment_date}</FieldError>

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !user || !date || !slot}>
            {submitting ? 'Confirming…' : `Confirm Booking · ${money(design.price)}`}
          </button>

          <div className="booking-confirm">
            💡 Booking is <strong>pending confirmation</strong> — our team reviews every request and you will
            be notified the moment it is accepted. Your slot is reserved the instant you confirm.
          </div>
        </form>
      </div>
    </div>
  );
}
