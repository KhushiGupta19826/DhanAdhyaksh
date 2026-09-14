import { useState, useEffect, useCallback } from 'react';
import { checkHealth, HealthResponse } from '../services/api';

export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkHealth();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to DhanAdhyaksh API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { data, loading, error, refetch: fetchHealth };
}
