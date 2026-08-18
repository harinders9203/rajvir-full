import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { Skeleton } from '../components/ui.jsx';
import { fmtDuration } from '../utils/date.js';

export default function BookSelect() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/nail-designs')
      .then((d) => setDesigns(d.designs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero-simple">
        <div className="container">
          <span className="hero__eyebrow">Step 1 of 2</span>
          <h1>Choose Your Design</h1>
          <p>Pick the set you love — the next step is picking your perfect time.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          {loading ? (
            <div className="grid">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={380} />
              ))}
            </div>
          ) : (
            <div className="grid">
              {designs.map((d) => (
                <article className="design-card" key={d.id}>
                  <div className="design-card__img">
                    {d.image_url ? <img src={d.image_url} alt={d.name} loading="lazy" /> : <div className="design-card__placeholder">💅</div>}
                    <span className="design-card__cat">{d.category}</span>
                  </div>
                  <div className="design-card__body">
                    <h3>{d.name}</h3>
                    <p className="design-card__desc">{d.description}</p>
                    <div className="design-card__meta">
                      <span className="design-card__price">{money(d.price)}</span>
                      <span className="design-card__duration">⏱ {fmtDuration(d.duration)}</span>
                    </div>
                    <Link to={`/book/${d.id}`} className="btn btn-primary btn-block">
                      Select This Design →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
