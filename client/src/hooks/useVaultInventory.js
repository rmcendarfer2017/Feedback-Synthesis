import { useState, useEffect } from 'react';

export function useVaultInventory(vaultName, filters) {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vaultName) {
      setInventory(null);
      setError(null);
      return;
    }

    const params = new URLSearchParams();
    if (filters?.source) params.set('source', filters.source);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.tags) params.set('tags', filters.tags);

    const query = params.toString();
    const url = `/api/vaults/${encodeURIComponent(vaultName)}/inventory${query ? `?${query}` : ''}`;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setInventory(null);
        } else {
          setInventory(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load vault files.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vaultName, filters?.source, filters?.from, filters?.to, filters?.tags]);

  return { inventory, loading, error };
}
