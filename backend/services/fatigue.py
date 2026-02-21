
from datetime import datetime, timezone
from typing import Any


def calculate_fatigue_modifier(matches: list[dict[str, Any]], team_id: int) -> float:
    """
    최근 경기 일정을 바탕으로 팀 피로도 계수를 계산합니다.
    football-data.org 형식: matches[].utcDate

    반환값: 0.55 ~ 1.05 (1.0 = 정상, 낮을수록 피로)
    """
    now = datetime.now(timezone.utc)

    match_dates: list[datetime] = []
    for m in matches:
        try:
            date_str = m.get("utcDate", "")
            match_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            if match_date < now:
                match_dates.append(match_date)
        except (ValueError, AttributeError):
            continue

    if not match_dates:
        return 1.0

    match_dates.sort(reverse=True)
    days_since_last = (now - match_dates[0]).days

    fatigue_score = 0.0
    for match_date in match_dates:
        days_ago = (now - match_date).days
        if days_ago <= 7:
            fatigue_score += 0.15
        elif days_ago <= 14:
            fatigue_score += 0.07

    fatigue_modifier = 1.0 - min(fatigue_score, 0.45)

    if days_since_last >= 7:
        rest_bonus = 0.05
    elif days_since_last >= 4:
        rest_bonus = 0.00
    elif days_since_last == 3:
        rest_bonus = -0.05
    else:
        rest_bonus = -0.10

    final = fatigue_modifier + rest_bonus
    return round(max(0.55, min(1.05, final)), 3)


def get_fatigue_label(modifier: float) -> str:
    if modifier >= 0.95:
        return "Excellent"
    elif modifier >= 0.85:
        return "Good"
    elif modifier >= 0.75:
        return "Fair"
    elif modifier >= 0.65:
        return "Fatigued"
    else:
        return "Exhausted"
