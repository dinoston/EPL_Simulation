export interface SavedPrediction {
  fixtureId: number;
  homeName: string;
  awayName: string;
  predictedHome: number;
  predictedAway: number;
  confidence: number;
  points: number;           // base pts awarded at save (1 pt)
  bonusPoints?: number;     // accuracy pts awarded after real result
  timestamp: string;
  matchDate?: string;       // ISO date of the actual match
  resolved: boolean;        // true once real result has been checked
  realScore?: { home: number; away: number };
  isCritical?: boolean;     // critical match → 2x bonus multiplier
  keyPlayer?: { name: string; team: 'home' | 'away' };
}

export interface ResolvedNotification {
  homeName: string;
  awayName: string;
  bonusPoints: number;
  realScore: { home: number; away: number };
}

export interface UserStats {
  totalPoints: number;
  totalPredictions: number;
  predictions: SavedPrediction[];
  pendingNotifications: ResolvedNotification[];
}

export type UserLevel = 'Rookie' | 'Semi-Pro' | 'Pro' | 'World Class' | 'Legend';

// Points scale: 1 base + up to 4 bonus = max 5 pts per prediction
// (8 pts for critical exact score: (4 bonus) × 2 capped at 5)
export const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  'Rookie': 0,
  'Semi-Pro': 20,
  'Pro': 60,
  'World Class': 120,
  'Legend': 200,
};

export const LEVEL_ICONS: Record<UserLevel, string> = {
  'Rookie': '🥉',
  'Semi-Pro': '🥈',
  'Pro': '🥇',
  'World Class': '⭐',
  'Legend': '👑',
};

export function getLevel(totalPoints: number): UserLevel {
  if (totalPoints >= 200) return 'Legend';
  if (totalPoints >= 120) return 'World Class';
  if (totalPoints >= 60) return 'Pro';
  if (totalPoints >= 20) return 'Semi-Pro';
  return 'Rookie';
}

export function getNextLevelPoints(totalPoints: number): { next: UserLevel | null; needed: number } {
  if (totalPoints >= 200) return { next: null, needed: 0 };
  if (totalPoints >= 120) return { next: 'Legend', needed: 200 - totalPoints };
  if (totalPoints >= 60) return { next: 'World Class', needed: 120 - totalPoints };
  if (totalPoints >= 20) return { next: 'Pro', needed: 60 - totalPoints };
  return { next: 'Semi-Pro', needed: 20 - totalPoints };
}

/**
 * Calculate accuracy bonus/penalty compared to real result.
 * Correct = positive, Wrong = negative.
 * Base +1 pt is always awarded at save time for participation.
 *
 * Exact score:      +4 pts (net +5 with base)
 * Correct winner:   +2 pts (net +3 with base)
 * Wrong prediction: -2 pts (net -1 with base — points decrease)
 * Critical match:   bonus × 1.5 (both positive and negative)
 */
export function calcAccuracyBonus(
  predictedHome: number,
  predictedAway: number,
  realHome: number,
  realAway: number,
  isCritical: boolean,
): number {
  const predWinner =
    predictedHome > predictedAway ? 'home' : predictedAway > predictedHome ? 'away' : 'draw';
  const realWinner = realHome > realAway ? 'home' : realAway > realHome ? 'away' : 'draw';

  const exactScore = predictedHome === realHome && predictedAway === realAway;
  const correctWinner = predWinner === realWinner;

  let bonus: number;
  if (exactScore) {
    bonus = 4; // perfect: +4
  } else if (correctWinner) {
    bonus = 2; // right winner: +2
  } else {
    bonus = -2; // wrong: -2 penalty
  }

  if (isCritical) {
    // Critical match: ×1.5 (rounded), cap positive at +6, cap negative at -3
    bonus = bonus > 0
      ? Math.min(6, Math.ceil(bonus * 1.5))
      : Math.max(-3, Math.floor(bonus * 1.5));
  }

  return bonus;
}
