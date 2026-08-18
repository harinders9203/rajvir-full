import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import DesignCard from '../components/DesignCard.jsx';
import { EmptyState, Skeleton } from '../components/ui.jsx';

const PRICE_RANGES = [
  { label: 'Any price', min: '', max: '' },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 – $80', min: 50, max: 80 },
  { label: '$80 – $110', min: 80, max: 110 },
  { label: '$110+', min: 110, max: '' },
];

export default function Designs() {
  const [params, setParams] = useSearchParams();
  const [designs, setDesigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const category = params.get('cat') || 'All';
  const q = params.get('q') || '';
  const rangeIdx = Number(params.get('range') || 0);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'All' || value === '0') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const range = PRICE_RANGES[rangeIdx] || PRICE_RANGES[0];
    const query = new URLSearchParams();
    if (category !== 'All') query.set('category', category);
    if (q) query.set('q', q);
    if (range.min !== '') query.set('min', range.min);
    if (range.max !== '') query.set('max', range.max);
    api(`/nail-designs?${query.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setDesigns(d.designs);
        setCategories(d.categories);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, q, rangeIdx]);

  const shownCategories = useMemo(() => ['All', ...categories], [categories]);

  return (
    <>
      <section className="hero-simple">
        <div className="container">
          <span className="hero__eyebrow">The Collection</span>
          <h1>Nail Designs & Services</h1>
          <p>Browse our full menu of hand-crafted designs. Filter by category, price or search for your dream set.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          {/* filters */}
          <div className="filter-bar">
            <input
              className="input"
              placeholder="🔍 Search designs…"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select className="select" value={rangeIdx} onChange={(e) => setParam('range', e.target.value)}>
              {PRICE_RANGES.map((r, i) => (
                <option key={r.label} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="status-tabs" style={{ marginBottom: 28 }}>
            {shownCategories.map((c) => (
              <button
                key={c}
                className={`status-tab ${category === c ? 'active' : ''}`}
                onClick={() => setParam('cat', c)}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={380} />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No designs match your filters"
              message="Try a different category, a wider price range, or clear your search."
              cta="Clear filters"
              onCta={() => setParams({}, { replace: true })}
            />
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 18 }}>
                {designs.length} design{designs.length > 1 ? 's' : ''} found
              </p>
              <div className="grid">
                {designs.map((d) => (
                  <DesignCard key={d.id} design={d} showStatus />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
