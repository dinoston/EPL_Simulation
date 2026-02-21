export interface SavedPrediction {
  fixtureId: number;
  homeName: string;
  awayName: string;
  predictedHome: number;
  predictedAway: number;
  confidence: number;
  points: number;
  timestamp: string;
  keyPlayer?: { name: string; team: 'home' | 'away' };
}

export interface UserStats {
  totalPoints: number;
  totalPredictions: number;
  predictions: SavedPrediction[];
}

export type UserLevel = 'Rookie' | 'Semi-Pro' | 'Pro' | 'World Class' | 'Legend';

export const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  'Rookie': 0,
  'Semi-Pro': 100,
  'Pro': 300,
  'World Class': 600,
  'Legend': 1000,
};

export const LEVEL_ICONS: Record<UserLevel, string> = {
  'Rookie': '🥉',
  'Semi-Pro': '🥈',
  'Pro': '🥇',
  'World Class': '⭐',
  'Legend': '👑',
};

export function getLevel(totalPoints: number): UserLevel {
  if (totalPoints >= 1000) return 'Legend';
  if (totalPoints >= 600) return 'World Class';
  if (totalPoints >= 300) return 'Pro';
  if (totalPoints >= 100) return 'Semi-Pro';
  return 'Rookie';
}

export function getNextLevelPoints(totalPoints: number): { next: UserLevel | null; needed: number } {
  if (totalPoints >= 1000) return { next: null, needed: 0 };
  if (totalPoints >= 600) return { next: 'Legend', needed: 1000 - totalPoints };
  if (totalPoints >= 300) return { next: 'World Class', needed: 600 - totalPoints };
  if (totalPoints >= 100) return { next: 'Pro', needed: 300 - totalPoints };
  return { next: 'Semi-Pro', needed: 100 - totalPoints };
}
