from datetime import datetime, timezone
from typing import Any


def calculate_fatigue_modifier(recent_fixtures: list[dict[str, Any]], team_id: int) -> float:
    """
    최근 경기 일정을 바탕으로 팀 피로도 계수를 계산합니다.

    반환값: 0.55 ~ 1.05 (1.0 = 정상, 낮을수록 피로)
    """
    now = datetime.now(timezone.utc)

    # 완료된 경기의 날짜 추출
    match_dates: list[datetime] = []
    for f in recent_fixtures:
        try:
            fixture_date_str = f["fixture"]["date"]
            fixture_date = datetime.fromisoformat(
                fixture_date_str.replace("Z", "+00:00")
            )
            # 현재 시각보다 과거 경기만 (완료된 경기)
            if fixture_date < now:
                match_dates.append(fixture_date)
        except (KeyError, ValueError):
            continue

    if not match_dates:
        return 1.0  # 데이터 없으면 피로 없음으로 간주

    match_dates.sort(reverse=True)

    # 마지막 경기 이후 경과일
    days_since_last = (now - match_dates[0]).days

    # 피로도 누적 (최근 14일 이내 경기)
    fatigue_score = 0.0
    for match_date in match_dates:
        days_ago = (now - match_date).days
        if days_ago <= 7:
            fatigue_score += 0.15  # 7일 내 경기: 15% 페널티
        elif days_ago <= 14:
            fatigue_score += 0.07  # 8~14일 내 경기: 7% 페널티

    fatigue_modifier = 1.0 - min(fatigue_score, 0.45)  # 최대 45% 감소

    # 휴식일 보너스/페널티
    if days_since_last >= 7:
        rest_bonus = 0.05   # 충분한 휴식
    elif days_since_last >= 4:
        rest_bonus = 0.00   # 보통
    elif days_since_last == 3:
        rest_bonus = -0.05  # 약간 피로
    else:
        rest_bonus = -0.10  # 극심한 피로 (미드위크 포함 3연전 등)

    final = fatigue_modifier + rest_bonus
    return round(max(0.55, min(1.05, final)), 3)


def get_fatigue_label(modifier: float) -> str:
    """피로도 계수를 사람이 읽기 쉬운 레이블로 변환"""
    if modifier >= 0.95:
        return "최상"
    elif modifier >= 0.85:
        return "양호"
    elif modifier >= 0.75:
        return "보통"
    elif modifier >= 0.65:
        return "피로"
    else:
        return "극심한 피로"
