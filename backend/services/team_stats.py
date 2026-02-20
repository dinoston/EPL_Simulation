from typing import Any

# EPL 2024/25 시즌 기준 평균 골 (팀당 경기당)
LEAGUE_AVG_GOALS = 1.35


def extract_stats(
    stats_response: dict[str, Any],
    recent_fixtures: dict[str, Any],
) -> tuple[float, float, float]:
    """
    API-Football 응답에서 팀의 공격력, 수비 취약성, 최근 폼을 추출합니다.

    반환: (attack_ratio, defense_ratio, form_score)
      - attack_ratio:  1.0 = 리그 평균 공격력
      - defense_ratio: 1.0 = 리그 평균 실점 (높을수록 수비 취약)
      - form_score:    0.0 ~ 1.0 (최근 5경기 승점 비율)
    """
    response = stats_response.get("response", {})

    # 공격력 계산 (시즌 평균 득점 / 리그 평균)
    goals_for = response.get("goals", {}).get("for", {})
    avg_goals_for = goals_for.get("average", {}).get("total")
    try:
        avg_goals_for = float(avg_goals_for)
    except (TypeError, ValueError):
        avg_goals_for = LEAGUE_AVG_GOALS

    attack_ratio = avg_goals_for / LEAGUE_AVG_GOALS

    # 수비 취약성 (실점 많을수록 높음 = 상대가 많이 넣음)
    goals_against = response.get("goals", {}).get("against", {})
    avg_goals_against = goals_against.get("average", {}).get("total")
    try:
        avg_goals_against = float(avg_goals_against)
    except (TypeError, ValueError):
        avg_goals_against = LEAGUE_AVG_GOALS

    defense_ratio = avg_goals_against / LEAGUE_AVG_GOALS

    # 최근 폼 (최근 5경기 승점 비율)
    form_score = _calculate_form(recent_fixtures)

    return (
        round(max(0.3, attack_ratio), 3),
        round(max(0.3, defense_ratio), 3),
        round(form_score, 3),
    )


def _calculate_form(recent_fixtures: dict[str, Any]) -> float:
    """최근 경기에서 승점 비율 계산 (최근 5경기 기준)"""
    fixtures = recent_fixtures.get("response", [])

    if not fixtures:
        return 0.5  # 데이터 없으면 중간값

    # 날짜 기준 정렬 (최신순)
    sorted_fixtures = sorted(
        fixtures,
        key=lambda f: f.get("fixture", {}).get("date", ""),
        reverse=True,
    )

    last_5 = sorted_fixtures[:5]
    if not last_5:
        return 0.5

    points = 0
    max_points = len(last_5) * 3

    for f in last_5:
        home_team_id = f.get("teams", {}).get("home", {}).get("id")
        home_winner = f.get("teams", {}).get("home", {}).get("winner")
        away_winner = f.get("teams", {}).get("away", {}).get("winner")

        if home_winner is True:
            points += 3  # 홈팀 승
        elif home_winner is None and away_winner is None:
            points += 1  # 무승부
        # 패배: +0

    return points / max_points if max_points > 0 else 0.5
