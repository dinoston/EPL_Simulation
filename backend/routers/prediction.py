import asyncio
from fastapi import APIRouter, HTTPException, Query
from services import football_api, fatigue, team_stats, simulation
from services.cache import cache

router = APIRouter()


@router.post("/")
async def predict_match(
    fixture_id: int = Query(..., description="경기 ID"),
    home_team_id: int = Query(..., description="홈팀 ID"),
    away_team_id: int = Query(..., description="원정팀 ID"),
):
    """
    Monte Carlo Poisson 시뮬레이션으로 경기 결과를 예측합니다.
    10,000번 시뮬레이션을 실행하여 승/무/패 확률과 예측 점수를 반환합니다.
    """
    cache_key = f"prediction:{fixture_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    try:
        # 4개 API 호출을 동시에 실행 (API 할당량 최적화)
        home_recent, away_recent, home_stats_data, away_stats_data = await asyncio.gather(
            football_api.get_recent_fixtures(home_team_id),
            football_api.get_recent_fixtures(away_team_id),
            football_api.get_team_stats(home_team_id),
            football_api.get_team_stats(away_team_id),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"데이터 수집 실패: {str(e)}")

    # 피로도 계산
    home_fatigue_mod = fatigue.calculate_fatigue_modifier(
        home_recent.get("response", []), home_team_id
    )
    away_fatigue_mod = fatigue.calculate_fatigue_modifier(
        away_recent.get("response", []), away_team_id
    )

    # 팀 스탯 추출 (공격력, 수비 취약성, 폼)
    home_att, home_def, home_form = team_stats.extract_stats(
        home_stats_data, home_recent
    )
    away_att, away_def, away_form = team_stats.extract_stats(
        away_stats_data, away_recent
    )

    # Monte Carlo 시뮬레이션 실행
    sim_result = simulation.run_simulation(
        home_attack=home_att,
        home_defense=home_def,
        away_attack=away_att,
        away_defense=away_def,
        home_fatigue=home_fatigue_mod,
        away_fatigue=away_fatigue_mod,
        home_form=home_form,
        away_form=away_form,
    )

    # 피로도 레이블 추가
    result = {
        **sim_result,
        "fatigue": {
            "home": {
                "modifier": home_fatigue_mod,
                "label": fatigue.get_fatigue_label(home_fatigue_mod),
            },
            "away": {
                "modifier": away_fatigue_mod,
                "label": fatigue.get_fatigue_label(away_fatigue_mod),
            },
        },
        "team_stats": {
            "home": {
                "attack": home_att,
                "defense_weakness": home_def,
                "form": home_form,
            },
            "away": {
                "attack": away_att,
                "defense_weakness": away_def,
                "form": away_form,
            },
        },
        "cached": False,
    }

    cache.set(cache_key, result, ttl_seconds=900)  # 15분 캐시
    return result
