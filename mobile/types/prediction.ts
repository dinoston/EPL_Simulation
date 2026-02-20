export interface PredictedScore {
  home: number;
  away: number;
}

export interface Probabilities {
  home_win: number;
  draw: number;
  away_win: number;
}

export interface ExpectedGoals {
  home: number;
  away: number;
}

export interface FatigueInfo {
  modifier: number;
  label: string;
}

export interface TeamStats {
  attack: number;
  defense_weakness: number;
  form: number;
}

export interface TopScorelinesItem {
  score: string;
  probability: number;
}

export interface PredictionResponse {
  predicted_score: PredictedScore;
  probabilities: Probabilities;
  expected_goals: ExpectedGoals;
  fatigue: {
    home: FatigueInfo;
    away: FatigueInfo;
  };
  team_stats: {
    home: TeamStats;
    away: TeamStats;
  };
  top_scorelines: TopScorelinesItem[];
  confidence: number;
  simulations: number;
  cached: boolean;
}
