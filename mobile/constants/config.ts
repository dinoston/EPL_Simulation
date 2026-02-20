// 백엔드 API URL (.env에서 로드)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// AdMob 광고 ID (개발 중에는 TestIds 사용, 배포 시 실제 ID로 교체)
export const ADMOB_IDS = {
  // 배포 시 실제 AdMob ID로 교체
  BANNER: 'ca-app-pub-3940256099942544/6300978111',       // 테스트 배너
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712', // 테스트 전면
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',     // 테스트 보상
};

// EPL 팀 색상 (예측 결과 표시용)
export const COLORS = {
  background: '#0d1117',
  surface: '#161b22',
  card: '#21262d',
  primary: '#38d9a9',   // EPL 초록
  accent: '#58a6ff',    // 파랑
  danger: '#f85149',    // 빨강
  warning: '#e3b341',   // 노랑
  text: '#e6edf3',
  textSecondary: '#8b949e',
  border: '#30363d',
  homeWin: '#38d9a9',
  draw: '#e3b341',
  awayWin: '#f85149',
};
