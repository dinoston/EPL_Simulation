from typing import Any

# EPL 2024/25 시즌 기준 평균 골 (팀당 경기당) — simulation.py와 동일하게 유지
LEAGUE_AVG_GOALS = 1.55


def extract_stats(
    team_id: int,
    standings_table: list[dict[str, Any]],
    recent_matches: list[dict[str, Any]],
) -> tuple[float, float, float]:
    """
    football-data.org 응답에서 팀의 공격력, 수비 취약성, 최근 폼을 추출합니다.

    반환: (attack_ratio, defense_ratio, form_score)
      - attack_ratio:  1.0 = 리그 평균 공격력
      - defense_ratio: 1.0 = 리그 평균 실점 (높을수록 수비 취약)
      - form_score:    0.0 ~ 1.0 (최근 5경기 승점 비율)
    """
    # 순위표에서 해당 팀 데이터 찾기
    team_row = None
    for row in standings_table:
        if row.get("team", {}).get("id") == team_id:
            team_row = row
            break

    if team_row and team_row.get("playedGames", 0) > 0:
        played = team_row["playedGames"]
        goals_for = team_row.get("goalsFor", 0)
        goals_against = team_row.get("goalsAgainst", 0)
        avg_for = goals_for / played
        avg_against = goals_against / played
    else:
        avg_for = LEAGUE_AVG_GOALS
        avg_against = LEAGUE_AVG_GOALS

    attack_ratio = avg_for / LEAGUE_AVG_GOALS
    defense_ratio = avg_against / LEAGUE_AVG_GOALS

    # 최근 폼 (최근 5경기 승점 비율)
    form_score = _calculate_form(team_id, recent_matches)

    return (
        round(max(0.3, attack_ratio), 3),
        round(max(0.3, defense_ratio), 3),
        round(form_score, 3),
    )


def _calculate_form(team_id: int, matches: list[dict[str, Any]]) -> float:
    """최근 5경기 승점 비율 계산 (football-data.org 형식)"""
    if not matches:
        return 0.5

    # 최신순 정렬
    sorted_matches = sorted(
        matches,
        key=lambda m: m.get("utcDate", ""),
        reverse=True,
    )
    last_5 = sorted_matches[:5]

    points = 0
    max_points = len(last_5) * 3

    for m in last_5:
        home_id = m.get("homeTeam", {}).get("id")
        score = m.get("score", {}).get("fullTime", {})
        home_goals = score.get("home")
        away_goals = score.get("away")

        if home_goals is None or away_goals is None:
            continue

        is_home = home_id == team_id
        if is_home:
            if home_goals > away_goals:
                points += 3
            elif home_goals == away_goals:
                points += 1
        else:
            if away_goals > home_goals:
                points += 3
            elif home_goals == away_goals:
                points += 1

    return points / max_points if max_points > 0 else 0.5
