import { useState, useEffect } from 'react';
import { fetchPrediction } from '../services/api';
import type { PredictionResponse } from '../types/prediction';

export function usePrediction(
  fixtureId: number,
  homeTeamId: number,
  awayTeamId: number,
) {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPrediction(fixtureId, homeTeamId, awayTeamId);
        if (!cancelled) {
          setPrediction(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          if (e?.code === 'ECONNABORTED') {
            setError('시뮬레이션 서버가 깨어나는 중입니다. 30초 후 다시 시도해주세요.');
          } else {
            setError('예측을 가져오지 못했습니다. 다시 시도해주세요.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [fixtureId, homeTeamId, awayTeamId]);

  return { prediction, loading, error };
}
