import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserStats, SavedPrediction } from '../types/user';

const STORAGE_KEY = 'epl_user_stats';

const DEFAULT_STATS: UserStats = {
  totalPoints: 0,
  totalPredictions: 0,
  predictions: [],
};

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setStats(JSON.parse(raw));
        } catch {
          // ignore parse errors
        }
      }
      setLoading(false);
    });
  }, []);

  const savePrediction = useCallback(async (prediction: SavedPrediction) => {
    setStats((prev) => {
      const next: UserStats = {
        totalPoints: prev.totalPoints + prediction.points,
        totalPredictions: prev.totalPredictions + 1,
        predictions: [prediction, ...prev.predictions].slice(0, 100), // keep last 100
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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

  return { stats, loading, savePrediction, addPoints };
}
