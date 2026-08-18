import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import DesignCard from '../components/DesignCard.jsx';
import { Skeleton } from '../components/ui.jsx';
import { DAY_NAMES, fmtTime12 } from '../utils/date.js';
import { getBrandName } from '../utils/branding.js';

const FEATURED_IMAGES = [
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=500&auto=format&fit=crop',
];

const SERVICES = [
  { icon: '💅', name: 'Gel Nails', desc: 'Glossy, long-lasting gel manicures in every shade imaginable.', from: 45 },
  { icon: '✨', name: 'Acrylics & Extensions', desc: 'Sculpted acrylics and gel extensions built to last.', from: 65 },
  { icon: '🎨', name: 'Nail Art', desc: 'Hand-painted designs, chrome, ombré and custom artwork.', from: 55 },
  { icon: '🤍', name: 'Bridal Packages', desc: 'Bridal trials, pearl accents and day-of perfection.', from: 90 },
  { icon: '🌸', name: 'French & Minimal', desc: 'Clean French tips and barely-there nude styles.', from: 40 },
  { icon: '💆‍♀️', name: 'Spa Manicure & Pedicure', desc: 'Relaxing care rituals with massage and cuticle work.', from: 35 },
];

const TESTIMONIALS = [
  { name: 'Sophia Bennett', role: 'Regular since 2022', text: 'Blush is my happy place. The chrome set I got lasted six weeks and I still got compliments on day one. The studio is spotless and the team is so warm.' },
  { name: 'Emma Carter', role: 'Bridal client', text: 'They did my bridal nails for my wedding day — pearl accents on a nude base, absolutely perfect. I cried a little. Booking online was effortless.' },
  { name: 'Olivia Reyes', role: 'Nail art lover', text: 'The watercolor sunset set was exactly the reference photo I brought, only better. Online booking shows live slots, so I never have to call.' },
];

const INSTA = [
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604908174453-a6a2a9057b19?q=80&w=400&auto=format&fit=crop',
];

const FEATURES = [
  { icon: '🕐', title: 'Book in 60 Seconds', desc: 'Pick a design, choose a date, select a live time slot. No phone calls, no back-and-forth.' },
  { icon: '🧼', title: 'Sterile & Spotless', desc: 'Hospital-grade sterilization for every tool, fresh files, and single-use buffers. Always.' },
  { icon: '💎', title: 'Premium Products', desc: 'We use only professional gel and acrylic systems loved by top studios worldwide.' },
  { icon: '🎨', title: 'Certified Artists', desc: 'Every technician is trained and certified, from classic French to avant-garde nail art.' },
  { icon: '🤝', title: 'Satisfaction Promise', desc: 'Not in love with your set? We will redo it within 7 days, free of charge.' },
  { icon: '📅', title: 'Flexible Scheduling', desc: 'Evenings and weekends available, with easy online rescheduling and cancellation.' },
];

export default function Home({ settings, hours }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const brandName = getBrandName(settings?.salon_name);

  useEffect(() => {
    api('/nail-designs?include_inactive=false')
      .then((d) => setDesigns(d.designs.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDays = (hours || []).filter((h) => h.is_open).slice(0, 3);

  return (
    <>
      {/* ------------------------------ hero ------------------------------ */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="hero__eyebrow">✦ Premium Nail Studio</span>
            <h1>
              Beautiful Nails.
              <br />
              <em>Beautiful You.</em>
            </h1>
            <p className="hero__sub">
              {settings.salon_name || 'Blush Nail Studio'} is a boutique nail studio where art meets
              self-care. Browse our designs and book your spot online in under a minute.
            </p>
            <div className="hero__actions">
              <Link to="/book" className="btn btn-primary">
                💅 Book Your Appointment
              </Link>
              <Link to="/designs" className="btn btn-outline">
                Explore Nail Designs
              </Link>
            </div>
            <p className="hero__note">
              ⭐ 4.9 rated · {designs.length ? `${designs.length}+ signature designs` : '12+ signature designs'} ·
              Bookings confirmed by our team
            </p>
          </div>
          <div className="hero__visual">
            <div className="hero__photo hero__photo--tall">
              <img src={FEATURED_IMAGES[0]} alt="Classic French manicure" />
            </div>
            <div className="hero__photo hero__photo--sm">
              <img src={FEATURED_IMAGES[1]} alt="Milky pink gel nails" />
            </div>
            <div className="hero__photo hero__photo--sm">
              <img src={FEATURED_IMAGES[2]} alt="Bridal nails" />
            </div>
            <div className="hero__badge">
              <span className="stars">★★★★★</span>
              <div>
                <strong>2,400+ happy clients</strong>
                <span>and counting since 2019</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ featured designs ------------------------------ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Our Signature Work</span>
            <h2>Featured Nail Designs</h2>
            <p>Hand-crafted sets our clients keep coming back for.</p>
          </div>
          <div className="divider-flower">❀ ❀ ❀</div>
          {loading ? (
            <div className="grid">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={380} />
              ))}
            </div>
          ) : (
            <div className="grid">
              {designs.map((d) => (
                <DesignCard key={d.id} design={d} />
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/designs" className="btn btn-gold">
              View All Designs →
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------ services ------------------------------ */}
      <section className="section section--alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What We Do</span>
            <h2>Popular Services</h2>
            <p>From everyday elegance to statement artistry — there is a service for every mood.</p>
          </div>
          <div className="grid">
            {SERVICES.map((s) => (
              <Link to={`/services?cat=${encodeURIComponent(s.name)}`} className="service-card" key={s.name}>
                <div className="service-card__icon">{s.icon}</div>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <div className="service-card__foot">
                  <span>
                    from <strong>{money(s.from)}</strong>
                  </span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ why choose us ------------------------------ */}
      <section className="section">
        <div className="container">
            <div className="section-head">
              <span className="eyebrow">The {brandName} Difference</span>
              <h2>Why Choose Us</h2>
            </div>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <div className="feature__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ testimonials ------------------------------ */}
      <section className="section section--alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Love Notes</span>
            <h2>What Our Clients Say</h2>
          </div>
          <div className="grid">
            {TESTIMONIALS.map((t) => (
              <article className="testimonial" key={t.name}>
                <div className="testimonial__stars">★★★★★</div>
                <p className="testimonial__text">“{t.text}”</p>
                <div className="testimonial__who">
                  <div className="testimonial__avatar">{t.name.split(' ').map((w) => w[0]).join('')}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ instagram ------------------------------ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Follow Along</span>
            <h2>@blush.nailstudio</h2>
            <p>Daily sets, behind-the-scenes and booking drops. Tag us to be featured.</p>
          </div>
          <div className="insta-grid">
            {INSTA.map((src, i) => (
              <a
                key={i}
                href={settings.instagram || 'https://instagram.com'}
                target="_blank"
                rel="noreferrer"
                className="insta-cell"
                aria-label="Instagram post"
              >
                <img src={src} alt="Nail art from our Instagram" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ hours / contact strip ------------------------------ */}
      <section className="section section--alt">
        <div className="container">
          <div className="grid">
            <div>
              <div className="section-head" style={{ textAlign: 'left', margin: 0, marginBottom: 20 }}>
                <span className="eyebrow">Visit Us</span>
                <h2>Opening Hours</h2>
              </div>
              <div className="hours-table">
                {hours.map((h) => (
                  <div key={h.day_of_week} className={`row ${!h.is_open ? 'closed' : ''}`}>
                    <span>{DAY_NAMES[h.day_of_week]}</span>
                    <span>{h.is_open ? `${fmtTime12(h.opening_time)} – ${fmtTime12(h.closing_time)}` : 'Closed'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="section-head" style={{ textAlign: 'left', margin: 0, marginBottom: 20 }}>
                <span className="eyebrow">Get In Touch</span>
                <h2>We Can't Wait to Meet You</h2>
              </div>
              <div className="card" style={{ padding: '28px 30px' }}>
                <p style={{ color: 'var(--muted)', marginBottom: 18 }}>
                  Walk-ins welcome when space allows, but booking ahead guarantees your slot — especially on
                  weekends and evenings.
                </p>
                <div className="kv">
                  <span>📍 Address</span>
                  <span>{settings.address}</span>
                </div>
                <div className="kv">
                  <span>📞 Phone</span>
                  <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                </div>
                <div className="kv">
                  <span>✉️ Email</span>
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </div>
                {openDays.length > 0 && (
                  <div className="kv">
                    <span>🕐 Open now (weekdays)</span>
                    <span>
                      {fmtTime12(openDays[0].opening_time)} – {fmtTime12(openDays[0].closing_time)}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/book" className="btn btn-primary">
                    Book Now
                  </Link>
                  <Link to="/contact" className="btn btn-ghost">
                    Contact Page
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
