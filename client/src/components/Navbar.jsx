import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteData } from '../hooks/useSiteData.js';
import { getBrandName } from '../utils/branding.js';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { settings } = useSiteData();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const salonName = getBrandName(settings?.salon_name);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  const link = (to, label) => (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      onClick={close}
    >
      {label}
    </NavLink>
  );

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand__mark">✿</span>
          <span className="brand__text">
            <strong>{salonName}</strong>
            <em>Nail Studio</em>
          </span>
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {link('/', 'Home')}
          {link('/designs', 'Nail Designs')}
          {link('/services', 'Services')}
          {link('/about', 'About')}
          {link('/contact', 'Contact')}
          {isAdmin && (
            <Link to="/admin" className="nav-link nav-link--admin" onClick={close}>
              Admin
            </Link>
          )}
          {user ? (
            <>
              {link('/dashboard', 'Dashboard')}
              <button className="nav-link nav-link--btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              {link('/login', 'Login')}
              <Link to="/signup" className="btn btn-primary btn-sm" onClick={close}>
                Sign Up
              </Link>
            </>
          )}
          <Link to="/book" className="btn btn-gold btn-sm nav-cta" onClick={close}>
            Book Appointment
          </Link>
        </nav>

        <button
          className={`hamburger ${open ? 'open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
