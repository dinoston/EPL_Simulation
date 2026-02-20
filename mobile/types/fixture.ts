export interface Team {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface FixtureScore {
  home: number | null;
  away: number | null;
}

export interface Fixture {
  id: number;
  date: string;
  status: string;
  venue: string;
  home: Team;
  away: Team;
  score: FixtureScore;
}

export interface FixturesResponse {
  date: string;
  count: number;
  fixtures: Fixture[];
}
