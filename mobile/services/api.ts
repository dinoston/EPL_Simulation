import axios from 'axios';
import { API_URL } from '../constants/config';
import type { FixturesResponse } from '../types/fixture';
import type { PredictionResponse } from '../types/prediction';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s (accounts for server cold start)
});

export async function fetchTodayFixtures(): Promise<FixturesResponse> {
  const { data } = await client.get<FixturesResponse>('/fixtures/today');
  return data;
}

export async function fetchPrediction(
  fixtureId: number,
  homeTeamId: number,
  awayTeamId: number,
  homeRedCard: boolean = false,
  awayRedCard: boolean = false,
): Promise<PredictionResponse> {
  const { data } = await client.post<PredictionResponse>(
    `/predict/?fixture_id=${fixtureId}&home_team_id=${homeTeamId}&away_team_id=${awayTeamId}&home_red_card=${homeRedCard}&away_red_card=${awayRedCard}`,
  );
  return data;
}

export interface Player {
  id: number;
  name: string;
  position: string;
}

export interface SquadsResponse {
  home: Player[];
  away: Player[];
}

export async function fetchSquads(
  homeTeamId: number,
  awayTeamId: number,
): Promise<SquadsResponse> {
  const { data } = await client.get<SquadsResponse>(
    `/fixtures/squads?home_team_id=${homeTeamId}&away_team_id=${awayTeamId}`,
  );
  return data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await client.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
