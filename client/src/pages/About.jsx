import { Link } from 'react-router-dom';
import { useSiteData } from '../hooks/useSiteData.js';
import { getBrandName } from '../utils/branding.js';

const VALUES = [
  { icon: 'Art', title: 'Artistry first', desc: 'We treat every set as a miniature piece of art, tailored to your hands, style and story.' },
  { icon: 'Care', title: 'Cleanliness is non-negotiable', desc: 'Autoclave sterilization, single-use files and fresh towels for every single client.' },
  { icon: 'Calm', title: 'Kindness and comfort', desc: 'A calm, welcoming studio where you can relax, chat or simply enjoy the quiet.' },
  { icon: 'Trust', title: 'Honest guidance', desc: 'We will always recommend what is genuinely best for your nail health, even if it means less length.' },
];

const STATS = [
  { num: '2019', label: 'Opened our doors' },
  { num: '2,400+', label: 'Happy clients' },
  { num: '12+', label: 'Signature designs' },
  { num: '4.9*', label: 'Average rating' },
];

export default function About() {
  const { settings } = useSiteData();
  const salonName = settings?.salon_name || 'Blush Nail Studio';
  const brandName = getBrandName(salonName);

  return (
    <>
      <section className="hero-simple">
        <div className="container">
          <span className="hero__eyebrow">Our Story</span>
          <h1>About the Studio</h1>
          <p>Where meticulous craft meets a warm, personal touch.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="story-grid">
            <div>
              <p className="lead">"{brandName} began with a simple belief: your nails are a canvas, and self-care is never selfish."</p>
              <p className="muted" style={{ marginBottom: 16 }}>
                Founded in 2019 in a sunlit corner studio, {salonName} grew from a one-chair passion project into a beloved neighborhood destination. We blend classic technique with modern artistry, from timeless French tips to avant-garde chrome and hand-painted art.
              </p>
              <p className="muted" style={{ marginBottom: 24 }}>
                Every visit starts with a conversation: what you love, what your nails need, and what will make you smile every time you look at your hands. No rush, no pressure, just beautiful work, done right.
              </p>
              <Link to="/book" className="btn btn-primary">
                Experience {brandName} Yourself
              </Link>
            </div>
            <div className="grid grid--2" style={{ gap: 14 }}>
              <div className="hero__photo">
                <img src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=600&auto=format&fit=crop" alt="Nail technician at work" />
              </div>
              <div className="hero__photo">
                <img src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=600&auto=format&fit=crop" alt="Finished manicure" />
              </div>
            </div>
          </div>

          <div className="grid grid--4" style={{ marginTop: 64 }}>
            {STATS.map((s) => (
              <div className="card" key={s.label} style={{ padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--pink-600)' }}>
                  {s.num}
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 72 }}>
            <div className="section-head">
              <span className="eyebrow">What We Stand For</span>
              <h2>Our Values</h2>
            </div>
            <div className="feature-grid">
              {VALUES.map((v) => (
                <div className="feature" key={v.title}>
                  <div className="feature__icon">{v.icon}</div>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
