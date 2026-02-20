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
        setError('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');
      } else if (e?.response?.status === 502) {
        setError('경기 데이터를 가져오지 못했습니다. API 키를 확인해주세요.');
      } else {
        setError('네트워크 오류가 발생했습니다.');
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
