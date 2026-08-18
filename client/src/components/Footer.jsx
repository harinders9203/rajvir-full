import { Link } from 'react-router-dom';
import { getBrandName } from '../utils/branding.js';
import { DAY_NAMES, fmtTime12 } from '../utils/date.js';

export default function Footer({ settings, hours }) {
  const s = settings || {};
  const brandName = getBrandName(s.salon_name);
  const socials = [
    { key: 'instagram', label: 'Instagram', href: s.instagram },
    { key: 'facebook', label: 'Facebook', href: s.facebook },
    { key: 'tiktok', label: 'TikTok', href: s.tiktok },
  ].filter((x) => x.href);

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__col">
          <div className="brand brand--footer">
            <span className="brand__mark">✿</span>
            <span className="brand__text">
              <strong>{brandName}</strong>
              <em>Nail Studio</em>
            </span>
          </div>
          <p className="footer__tagline">{s.tagline || 'Beautiful Nails. Beautiful You.'}</p>
          <p className="muted footer__address">{s.address}</p>
          <div className="socials">
            {socials.map((x) => (
              <a key={x.key} href={x.href} target="_blank" rel="noreferrer" className="social-chip" aria-label={x.label}>
                {x.key === 'instagram' ? '📸' : x.key === 'facebook' ? '👥' : '🎵'}
                <span>{x.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="footer__col">
          <h4>Explore</h4>
          <ul className="footer__links">
            <li><Link to="/designs">Nail Designs</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/book">Book an Appointment</Link></li>
            <li><Link to="/about">About the Studio</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/login">Customer Login</Link></li>
          </ul>
        </div>

        <div className="footer__col">
          <h4>Contact</h4>
          <ul className="footer__contact">
            <li>📞 <a href={`tel:${s.phone}`}>{s.phone}</a></li>
            <li>✉️ <a href={`mailto:${s.email}`}>{s.email}</a></li>
            <li>📍 {s.address}</li>
          </ul>
        </div>

        <div className="footer__col">
          <h4>Opening Hours</h4>
          <ul className="footer__hours">
            {Array.isArray(hours) &&
              hours.map((h) => (
                <li key={h.day_of_week} className={!h.is_open ? 'closed' : ''}>
                  <span>{DAY_NAMES[h.day_of_week]}</span>
                  <span>
                    {h.is_open ? `${fmtTime12(h.opening_time)} – ${fmtTime12(h.closing_time)}` : 'Closed'}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          © {new Date().getFullYear()} {s.salon_name || 'Blush Nail Studio'}. All rights reserved. Crafted with 💕
        </div>
      </div>
    </footer>
  );
}
