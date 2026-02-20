import numpy as np
from collections import Counter

HOME_ADVANTAGE = 1.15
SIMULATIONS = 10_000
LEAGUE_AVG_GOALS = 1.35
MIN_XG = 0.5  # 최소 기대골 (0-0만 예측되는 상황 방지)


def run_simulation(
    home_attack: float,
    home_defense: float,
    away_attack: float,
    away_defense: float,
    home_fatigue: float,
    away_fatigue: float,
    home_form: float,
    away_form: float,
) -> dict:
    """
    Monte Carlo Poisson 시뮬레이션으로 경기 결과를 예측합니다.

    인자:
      - home/away_attack:  공격력 지수 (1.0 = 리그 평균)
      - home/away_defense: 수비 취약성 지수 (1.0 = 리그 평균)
      - home/away_fatigue: 피로도 계수 (0.55 ~ 1.05)
      - home/away_form:    최근 폼 (0.0 ~ 1.0)

    반환: 예측 점수, 승/무/패 확률, 기대골, 신뢰도
    """
    # 폼 계수: 0.85 ~ 1.15 범위
    home_form_factor = 0.85 + 0.30 * home_form
    away_form_factor = 0.85 + 0.30 * away_form

    # 기대골 (xG) 계산 - Dixon-Coles 간소화 모델
    # home_xG = home_attack(득점력) × away_defense(상대 수비 취약성) × 리그평균 × 홈이점 × 피로 × 폼
    home_xG = (
        home_attack
        * away_defense
        * LEAGUE_AVG_GOALS
        * HOME_ADVANTAGE
        * home_fatigue
        * home_form_factor
    )
    away_xG = (
        away_attack
        * home_defense
        * LEAGUE_AVG_GOALS
        * away_fatigue
        * away_form_factor
    )

    # 최소 기대골 보정
    home_xG = max(home_xG, MIN_XG)
    away_xG = max(away_xG, MIN_XG)

    # Poisson 랜덤 드로 (10,000번 시뮬레이션)
    rng = np.random.default_rng()
    home_goals_sim = rng.poisson(lam=home_xG, size=SIMULATIONS)
    away_goals_sim = rng.poisson(lam=away_xG, size=SIMULATIONS)

    # 결과 집계
    home_wins = int(np.sum(home_goals_sim > away_goals_sim))
    draws = int(np.sum(home_goals_sim == away_goals_sim))
    away_wins = int(np.sum(away_goals_sim > home_goals_sim))

    # 가장 빈번한 스코어라인 = 예측 점수
    scorelines = Counter(zip(home_goals_sim.tolist(), away_goals_sim.tolist()))
    predicted_home, predicted_away = scorelines.most_common(1)[0][0]
    top_count = scorelines.most_common(1)[0][1]

    # 신뢰도: 예측 스코어가 얼마나 지배적인지 (0.0 ~ 1.0)
    confidence = round(min(1.0, (top_count / SIMULATIONS) * 5), 2)

    # 상위 5개 스코어라인
    top_scorelines = [
        {
            "score": f"{h}-{a}",
            "probability": round(count / SIMULATIONS * 100, 1),
        }
        for (h, a), count in scorelines.most_common(5)
    ]

    return {
        "predicted_score": {
            "home": int(predicted_home),
            "away": int(predicted_away),
        },
        "probabilities": {
            "home_win": round(home_wins / SIMULATIONS * 100, 1),
            "draw": round(draws / SIMULATIONS * 100, 1),
            "away_win": round(away_wins / SIMULATIONS * 100, 1),
        },
        "expected_goals": {
            "home": round(float(home_xG), 2),
            "away": round(float(away_xG), 2),
        },
        "top_scorelines": top_scorelines,
        "confidence": confidence,
        "simulations": SIMULATIONS,
    }
