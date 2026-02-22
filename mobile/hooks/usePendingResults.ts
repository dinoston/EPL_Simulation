import { useEffect } from 'react';
import { useUserStats } from './useUserStats';
import { fetchMatchResult } from '../services/api';
import { calcAccuracyBonus } from '../types/user';

/**
 * On app launch, checks all unresolved predictions against real match results.
 * If a match is FINISHED, awards accuracy bonus points and queues a notification.
 */
export function usePendingResults() {
  const { stats, resolvePrediction } = useUserStats();

  useEffect(() => {
    if (stats.predictions.length === 0) return;

    const unresolved = stats.predictions.filter((p) => !p.resolved);
    if (unresolved.length === 0) return;

    // Check each unresolved prediction with a small delay between calls
    // to avoid hammering the backend (free tier: 10 req/min)
    let delay = 0;
    for (const pred of unresolved) {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fetchMatchResult(pred.fixtureId);
          const s = result.score;
          if (
            result.status === 'FINISHED' &&
            s != null &&
            typeof s.home === 'number' &&
            typeof s.away === 'number'
          ) {
            const bonus = calcAccuracyBonus(
              pred.predictedHome,
              pred.predictedAway,
              s.home,
              s.away,
              pred.isCritical ?? false,
            );
            await resolvePrediction(pred.fixtureId, s, bonus);
          }
        } catch {
          // ignore — will retry next session
        }
      }, delay);
      delay += 6000; // 6s between calls → well within 10 req/min
      return () => clearTimeout(timeoutId);
    }
  }, [stats.predictions.length]);
}
