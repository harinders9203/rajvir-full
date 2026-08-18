import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../api.js';
import { Skeleton } from '../components/ui.jsx';

const SERVICE_DESCRIPTIONS = {
  'Gel Nails': ['Long-wearing glossy gel color or overlay.', '🚗'],
  'Acrylic Nails': ['Sculpted acrylic sets — classic to coffin.', '✨'],
  'Nail Art': ['Hand-painted art, chrome, gems and more.', '🎨'],
  'French Tips': ['Timeless hand-painted French manicures.', '🤍'],
  'Bridal Nails': ['Elegant bridal sets and trial sessions.', '👰'],
  Extensions: ['Gel extensions for added length and strength.', '💎'],
  'Custom Designs': ['Fully bespoke sets designed just for you.', '🖌️'],
  'Minimal Nails': ['Clean, nude, low-maintenance looks.', '🌸'],
};

export default function Services() {
  const [params] = useSearchParams();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/nail-designs')
      .then((d) => setDesigns(d.designs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byCategory = {};
  for (const d of designs) {
    (byCategory[d.category] = byCategory[d.category] || []).push(d);
  }
  const categories = Object.keys(byCategory).sort();
  const selected = params.get('cat');

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 80 }}>
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <>
      <section className="hero-simple">
        <div className="container">
          <span className="hero__eyebrow">Full Menu</span>
          <h1>Our Services</h1>
          <p>Every service is performed by a certified technician with premium products.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          {selected && (
            <Link to="/services" className="btn btn-ghost btn-sm" style={{ marginBottom: 22 }}>
              ← All services
            </Link>
          )}
          <div className="grid">
            {categories.map((cat) => {
              const items = byCategory[cat];
              const min = Math.min(...items.map((i) => i.price));
              const max = Math.max(...items.map((i) => i.price));
              const [desc, icon] = SERVICE_DESCRIPTIONS[cat] || ['Explore this collection.', '💅'];
              return (
                <Link to={`/designs?cat=${encodeURIComponent(cat)}`} className="service-card" key={cat}>
                  <div className="service-card__icon">{icon}</div>
                  <h3>{cat}</h3>
                  <p>{desc}</p>
                  <div className="service-card__foot">
                    <span>
                      {items.length} design{items.length > 1 ? 's' : ''} · {min === max ? money(min) : `${money(min)} – ${money(max)}`}
                    </span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="card" style={{ padding: '34px 36px', marginTop: 44, textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, marginBottom: 10 }}>Not sure what you need?</h2>
            <p className="muted" style={{ marginBottom: 22, maxWidth: 520, margin: '0 auto 22px' }}>
              Book a consultation and our artists will help you choose the perfect set for your nails, lifestyle and occasion.
            </p>
            <Link to="/book" className="btn btn-gold">
              Book a Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
