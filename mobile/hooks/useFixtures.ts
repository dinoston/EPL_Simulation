import { useState, useEffect, useCallback } from 'react';
import { fetchTodayFixtures } from '../services/api';
import type { Fixture } from '../types/fixture';

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodayFixtures();
      setFixtures(data.fixtures);
      setDate(data.date);
    } catch (e: any) {
      if (e?.code === 'ECONNABORTED') {
        setError('Server is warming up. Please try again in a moment.');
      } else if (e?.response?.status === 502) {
        setError('Failed to load fixtures. Please check the API key.');
      } else {
        setError('A network error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { fixtures, loading, error, date, refetch: load };
}
