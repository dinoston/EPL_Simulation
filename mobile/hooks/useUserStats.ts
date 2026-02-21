import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserStats, SavedPrediction, ResolvedNotification } from '../types/user';

const STORAGE_KEY = 'epl_user_stats';

const DEFAULT_STATS: UserStats = {
  totalPoints: 0,
  totalPredictions: 0,
  predictions: [],
  pendingNotifications: [],
};

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Migrate old data that lacks pendingNotifications
          setStats({ pendingNotifications: [], ...parsed });
        } catch {
          // ignore parse errors
        }
      }
      setLoading(false);
    });
  }, []);

  /** Save a new prediction. Awards 1 base point immediately. */
  const savePrediction = useCallback(async (prediction: SavedPrediction) => {
    const withBase: SavedPrediction = { ...prediction, points: 1, resolved: false };
    setStats((prev) => {
      const next: UserStats = {
        ...prev,
        totalPoints: prev.totalPoints + 1,
        totalPredictions: prev.totalPredictions + 1,
        predictions: [withBase, ...prev.predictions].slice(0, 100),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /**
   * Resolve a saved prediction with the real match result.
   * Awards accuracy bonus points and queues a notification.
   */
  const resolvePrediction = useCallback(
    async (fixtureId: number, realScore: { home: number; away: number }, bonusPoints: number) => {
      setStats((prev) => {
        const predictions = prev.predictions.map((p) => {
          if (p.fixtureId !== fixtureId || p.resolved) return p;
          return { ...p, resolved: true, realScore, bonusPoints };
        });
        const changed = prev.predictions.find((p) => p.fixtureId === fixtureId && !p.resolved);
        if (!changed) return prev; // nothing to resolve

        const notification: ResolvedNotification = {
          homeName: changed.homeName,
          awayName: changed.awayName,
          bonusPoints,
          realScore,
        };
        const next: UserStats = {
          ...prev,
          totalPoints: Math.max(0, prev.totalPoints + bonusPoints),
          predictions,
          pendingNotifications: [...(prev.pendingNotifications ?? []), notification],
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  /** Clear all pending notifications (called after showing them). */
  const clearNotifications = useCallback(async () => {
    setStats((prev) => {
      const next: UserStats = { ...prev, pendingNotifications: [] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Add or subtract raw points (used by key player result). */
  const addPoints = useCallback(async (points: number) => {
    setStats((prev) => {
      const next: UserStats = {
        ...prev,
        totalPoints: Math.max(0, prev.totalPoints + points),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { stats, loading, savePrediction, resolvePrediction, clearNotifications, addPoints };
}
