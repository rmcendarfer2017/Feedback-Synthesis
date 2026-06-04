import { useState, useEffect } from 'react';

export function useVaultTags(vaultName) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vaultName) {
      setTags([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/vaults/${encodeURIComponent(vaultName)}/tags`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && !data.error) setTags(data);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vaultName]);

  return { tags, loading };
}
