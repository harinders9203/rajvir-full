const BASE = '/api';

export function getToken() {
  return localStorage.getItem('blush_token');
}
export function setToken(t) {
  if (t) localStorage.setItem('blush_token', t);
  else localStorage.removeItem('blush_token');
}

/**
 * Lightweight fetch wrapper. `body` is JSON, `form` is a FormData instance.
 * Throws an Error carrying `status` and the parsed `data` on non-2xx.
 */
export async function api(path, { method = 'GET', body, form, headers: extra } = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // multipart — let the browser set the content-type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || data?.errors?.form || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.data = data || {};
    throw err;
  }
  return data;
}

export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
