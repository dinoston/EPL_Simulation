import axios from 'axios';
import { API_URL } from '../constants/config';
import type { FixturesResponse } from '../types/fixture';
import type { PredictionResponse } from '../types/prediction';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30초 (서버 콜드 스타트 고려)
});

export async function fetchTodayFixtures(): Promise<FixturesResponse> {
  const { data } = await client.get<FixturesResponse>('/fixtures/today');
  return data;
}

export async function fetchPrediction(
  fixtureId: number,
  homeTeamId: number,
  awayTeamId: number,
): Promise<PredictionResponse> {
  const { data } = await client.post<PredictionResponse>(
    `/predict/?fixture_id=${fixtureId}&home_team_id=${homeTeamId}&away_team_id=${awayTeamId}`,
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
