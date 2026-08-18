import { Link } from 'react-router-dom';
import { money } from '../api.js';
import { fmtDuration } from '../utils/date.js';

export default function DesignCard({ design, showStatus = false }) {
  return (
    <article className="design-card">
      <div className="design-card__img">
        {design.image_url ? (
          <img src={design.image_url} alt={design.name} loading="lazy" />
        ) : (
          <div className="design-card__placeholder">💅</div>
        )}
        <span className="design-card__cat">{design.category}</span>
        {showStatus && !design.is_active && <span className="design-card__off">Inactive</span>}
      </div>
      <div className="design-card__body">
        <h3>{design.name}</h3>
        <p className="design-card__desc">{design.description}</p>
        <div className="design-card__meta">
          <span className="design-card__price">{money(design.price)}</span>
          <span className="design-card__duration">⏱ {fmtDuration(design.duration)}</span>
        </div>
        <Link to={`/book/${design.id}`} className="btn btn-primary btn-block">
          Book This Design
        </Link>
      </div>
    </article>
  );
}
