import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, url, body) {
  const res = await fetch(`api${url}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !url.startsWith('/auth/')) {
    window.location.assign('#/login');
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || res.statusText);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

/** Fetch `url` (skips when null). Returns { data, error, loading, reload }. */
export function useApi(url) {
  const [state, setState] = useState({ data: null, error: null, loading: !!url });

  const load = useCallback(async () => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ data: await api.get(url), error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
