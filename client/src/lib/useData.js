import { useEffect, useState } from 'react';
import { get } from './api';

export function useData(path, { fallbackPath, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return undefined; }
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    get(path, undefined, { signal: controller.signal })
      .catch((error) => {
        if (!fallbackPath || error.status !== 404) throw error;
        return get(fallbackPath, undefined, { signal: controller.signal });
      })
      .then((result) => { if (alive) { setData(result); setError(''); } })
      .catch((e) => { if (alive && e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [path, fallbackPath, enabled]);
  return { data, error, loading };
}
