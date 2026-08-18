import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import { DAY_NAMES, fmtTime12 } from '../utils/date.js';

export default function Contact({ settings, hours }) {
  const s = settings || {};
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    const subject = encodeURIComponent(`Message from ${form.name} via the website`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:${s.email}?subject=${subject}&body=${body}`;
    toast.success('Opening your email app — we will get back to you within 24 hours.');
  };

  const socials = [
    { label: 'Instagram', href: s.instagram, icon: '📸' },
    { label: 'Facebook', href: s.facebook, icon: '👥' },
    { label: 'TikTok', href: s.tiktok, icon: '🎵' },
  ].filter((x) => x.href);

  return (
    <>
      <section className="hero-simple">
        <div className="container">
          <span className="hero__eyebrow">Say Hello</span>
          <h1>Contact Us</h1>
          <p>Questions, custom requests, or rescheduling — we are one message away.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          <div className="info-grid">
            <div className="info-card">
              <div className="feature__icon">📍</div>
              <h3>Visit</h3>
              <p>{s.address}</p>
            </div>
            <div className="info-card">
              <div className="feature__icon">📞</div>
              <h3>Call or Text</h3>
              <p>
                <a href={`tel:${s.phone}`}>{s.phone}</a>
              </p>
              <p className="muted mt-1">Mon–Sat, 10am – 7pm</p>
            </div>
            <div className="info-card">
              <div className="feature__icon">✉️</div>
              <h3>Email</h3>
              <p>
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </p>
              <p className="muted mt-1">Replies within 24 hours</p>
            </div>
          </div>

          <div className="grid" style={{ marginTop: 48, alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: 28, marginBottom: 18 }}>Send a Message</h2>
              <form className="card" style={{ padding: 28 }} onSubmit={submit}>
                <div className="field">
                  <label>Your name</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea
                    className="textarea"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about the set you dream of…"
                  />
                </div>
                <button className="btn btn-primary" type="submit">
                  Send Message
                </button>
              </form>
            </div>

            <div>
              <h2 style={{ fontSize: 28, marginBottom: 18 }}>Opening Hours</h2>
              <div className="hours-table" style={{ margin: 0, marginBottom: 24 }}>
                {hours.map((h) => (
                  <div key={h.day_of_week} className={`row ${!h.is_open ? 'closed' : ''}`}>
                    <span>{DAY_NAMES[h.day_of_week]}</span>
                    <span>{h.is_open ? `${fmtTime12(h.opening_time)} – ${fmtTime12(h.closing_time)}` : 'Closed'}</span>
                  </div>
                ))}
              </div>

              {socials.length > 0 && (
                <>
                  <h2 style={{ fontSize: 28, marginBottom: 18 }}>Follow Us</h2>
                  <div className="socials">
                    {socials.map((x) => (
                      <a key={x.label} href={x.href} target="_blank" rel="noreferrer" className="social-chip" style={{ background: 'var(--pink-100)', color: 'var(--pink-700)' }}>
                        {x.icon} {x.label}
                      </a>
                    ))}
                  </div>
                </>
              )}

              <div className="card" style={{ padding: 26, marginTop: 24 }}>
                <h3 style={{ fontSize: 19, marginBottom: 10 }}>Ready to book?</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
                  Skip the waiting — pick a design and reserve your slot online right now.
                </p>
                <Link to="/book" className="btn btn-gold btn-block">
                  Book an Appointment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
