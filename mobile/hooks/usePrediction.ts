import { useState, useEffect } from 'react';
import { fetchPrediction } from '../services/api';
import type { PredictionResponse } from '../types/prediction';

export function usePrediction(
  fixtureId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeRedCard: boolean = false,
  awayRedCard: boolean = false,
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
        const data = await fetchPrediction(fixtureId, homeTeamId, awayTeamId, homeRedCard, awayRedCard);
        if (!cancelled) {
          setPrediction(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          if (e?.code === 'ECONNABORTED') {
            setError('Simulation server is waking up. Please try again in 30 seconds.');
          } else {
            setError('Failed to load prediction. Please try again.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [fixtureId, homeTeamId, awayTeamId, homeRedCard, awayRedCard]);

  return { prediction, loading, error };
}
