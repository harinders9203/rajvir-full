import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { ErrorBox, FieldError, PageLoader } from '../components/ui.jsx';
import { useSiteData } from '../hooks/useSiteData.js';
import { DAY_NAMES } from '../utils/date.js';

export default function AdminSettings() {
  const toast = useToast();
  const { setSiteData } = useSiteData();
  const [data, setData] = useState(null);
  const [info, setInfo] = useState({});
  const [hours, setHours] = useState([]);
  const [booking, setBooking] = useState({});
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});

  const syncFromResponse = (next) => {
    setData(next);
    setInfo({
      salon_name: next.settings.salon_name,
      tagline: next.settings.tagline,
      phone: next.settings.phone,
      email: next.settings.email,
      address: next.settings.address,
      instagram: next.settings.instagram,
      facebook: next.settings.facebook,
      tiktok: next.settings.tiktok,
      logo_url: next.settings.logo_url,
    });
    setHours(next.hours.map((h) => ({ ...h })));
    setBooking({
      appointment_duration: next.settings.appointment_duration,
      booking_interval: next.settings.booking_interval,
      max_slots_per_slot: next.settings.max_slots_per_slot,
      advance_booking_days: next.settings.advance_booking_days,
      allow_cancellation: Boolean(next.settings.allow_cancellation),
    });
    setSiteData(next);
  };

  useEffect(() => {
    api('/admin/settings')
      .then(syncFromResponse)
      .catch(() => {});
  }, []);

  const saveInfo = async (e) => {
    e.preventDefault();
    setBusy('info');
    setErrors({});
    try {
      const next = await api('/admin/settings', { method: 'PUT', body: { ...info } });
      syncFromResponse(next);
      toast.success('Salon information saved.');
    } catch (err) {
      setErrors(err.data?.errors || { form: err.message });
    } finally {
      setBusy('');
    }
  };

  const saveHours = async (e) => {
    e.preventDefault();
    setBusy('hours');
    try {
      const next = await api('/admin/hours', { method: 'PUT', body: { days: hours } });
      setHours(next.hours.map((h) => ({ ...h })));
      setData((current) => (current ? { ...current, hours: next.hours } : current));
      setSiteData({ hours: next.hours });
      toast.success('Business hours saved. Slot availability updates immediately.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveBooking = async (e) => {
    e.preventDefault();
    setBusy('booking');
    setErrors({});
    try {
      const next = await api('/admin/settings', { method: 'PUT', body: { ...info, ...booking } });
      syncFromResponse(next);
      toast.success('Booking settings saved.');
    } catch (err) {
      setErrors(err.data?.errors || { form: err.message });
    } finally {
      setBusy('');
    }
  };

  if (!data) return <PageLoader />;

  const setHour = (dow, key, value) => {
    setHours((hs) => hs.map((h) => (h.day_of_week === dow ? { ...h, [key]: value } : h)));
  };

  const setB = (k) => (e) => setBooking({ ...booking, [k]: e.target.value });

  return (
    <>
      <h1 className="page-title">Salon Settings</h1>
      <p className="page-sub">Configure your studio information, opening hours and booking rules.</p>

      <div className="panel">
        <div className="panel__head">
          <h2>Salon Information</h2>
        </div>
        <ErrorBox message={errors.form} />
        <form onSubmit={saveInfo} className="grid grid--2" style={{ gap: 14 }}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Salon name</label>
            <input className="input" value={info.salon_name || ''} onChange={(e) => setInfo({ ...info, salon_name: e.target.value })} />
            <FieldError>{errors.salon_name}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Tagline</label>
            <input className="input" value={info.tagline || ''} onChange={(e) => setInfo({ ...info, tagline: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Phone</label>
            <input className="input" value={info.phone || ''} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
            <FieldError>{errors.phone}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input className="input" value={info.email || ''} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12, gridColumn: '1 / -1' }}>
            <label>Address</label>
            <input className="input" value={info.address || ''} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Instagram URL</label>
            <input className="input" value={info.instagram || ''} onChange={(e) => setInfo({ ...info, instagram: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Facebook URL</label>
            <input className="input" value={info.facebook || ''} onChange={(e) => setInfo({ ...info, facebook: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>TikTok URL</label>
            <input className="input" value={info.tiktok || ''} onChange={(e) => setInfo({ ...info, tiktok: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Logo URL (optional)</label>
            <input className="input" value={info.logo_url || ''} onChange={(e) => setInfo({ ...info, logo_url: e.target.value })} placeholder="https://… or /uploads/…" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy === 'info'}>
              {busy === 'info' ? 'Saving…' : 'Save Information'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>Business Hours</h2>
          <span className="badge badge--pending">Affects live slot availability</span>
        </div>
        <form onSubmit={saveHours}>
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Open</th>
                  <th>Close</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.day_of_week}>
                    <td className="cell-title" data-label="Day">{DAY_NAMES[h.day_of_week]}</td>
                    <td data-label="Open">
                      <input
                        className="input"
                        type="time"
                        value={h.opening_time}
                        disabled={!h.is_open}
                        onChange={(e) => setHour(h.day_of_week, 'opening_time', e.target.value)}
                        style={{ width: 140 }}
                      />
                    </td>
                    <td data-label="Close">
                      <input
                        className="input"
                        type="time"
                        value={h.closing_time}
                        disabled={!h.is_open}
                        onChange={(e) => setHour(h.day_of_week, 'closing_time', e.target.value)}
                        style={{ width: 140 }}
                      />
                    </td>
                    <td data-label="Status">
                      <button
                        type="button"
                        className={`chip ${h.is_open ? 'chip--on' : 'chip--off'}`}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        onClick={() => setHour(h.day_of_week, 'is_open', !h.is_open)}
                      >
                        {h.is_open ? 'Open' : 'Closed'} — click to toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy === 'hours'}>
            {busy === 'hours' ? 'Saving…' : 'Save Business Hours'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>Booking Settings</h2>
        </div>
        <ErrorBox message={errors.form} />
        <form onSubmit={saveBooking} className="grid grid--2" style={{ gap: 14 }}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Appointment duration (minutes)</label>
            <input className="input" type="number" min="15" max="480" value={booking.appointment_duration} onChange={setB('appointment_duration')} />
            <FieldError>{errors.appointment_duration}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Booking interval (minutes between slots)</label>
            <input className="input" type="number" min="15" max="240" value={booking.booking_interval} onChange={setB('booking_interval')} />
            <FieldError>{errors.booking_interval}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Max appointments per slot</label>
            <input className="input" type="number" min="1" max="10" value={booking.max_slots_per_slot} onChange={setB('max_slots_per_slot')} />
            <FieldError>{errors.max_slots_per_slot}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Advance booking limit (days)</label>
            <input className="input" type="number" min="1" max="365" value={booking.advance_booking_days} onChange={setB('advance_booking_days')} />
            <FieldError>{errors.advance_booking_days}</FieldError>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Customer cancellation</label>
            <select
              className="select"
              value={booking.allow_cancellation ? '1' : '0'}
              onChange={(e) => setBooking({ ...booking, allow_cancellation: e.target.value === '1' })}
            >
              <option value="1">Allowed (customers can cancel pending/accepted)</option>
              <option value="0">Disabled</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy === 'booking'}>
              {busy === 'booking' ? 'Saving…' : 'Save Booking Settings'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
