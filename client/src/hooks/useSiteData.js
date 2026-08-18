import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const SiteDataContext = createContext(null);
const INITIAL_DATA = { settings: {}, hours: [] };

export function SiteDataProvider({ children }) {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  const setSiteData = useCallback((next) => {
    setData((current) => ({
      settings: next?.settings ?? current.settings,
      hours: Array.isArray(next?.hours) ? next.hours : current.hours,
    }));
  }, []);

  const refresh = useCallback(async () => {
    const next = await api('/settings');
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api('/settings')
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const salonName = data.settings?.salon_name || 'Blush Nail Studio';
    const tagline = data.settings?.tagline || 'Beautiful Nails. Beautiful You.';
    document.title = `${salonName} - ${tagline}`;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', `${salonName} - a premium nail salon. Book your appointment online.`);
    }
  }, [data.settings?.salon_name, data.settings?.tagline]);

  const value = useMemo(
    () => ({
      ...data,
      loading,
      refresh,
      setSiteData,
    }),
    [data, loading, refresh, setSiteData]
  );

  return createElement(SiteDataContext.Provider, { value }, children);
}

export function useSiteData() {
  const value = useContext(SiteDataContext);
  if (!value) throw new Error('useSiteData must be used inside SiteDataProvider.');
  return value;
}
