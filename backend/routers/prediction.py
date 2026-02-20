import asyncio
from fastapi import APIRouter, HTTPException, Query
from services import football_api, fatigue, team_stats, simulation
from services.cache import cache

router = APIRouter()


@router.post("/")
async def predict_match(
    fixture_id: int = Query(...),
    home_team_id: int = Query(...),
    away_team_id: int = Query(...),
):
    """Monte Carlo Poisson 시뮬레이션으로 경기 결과 예측"""
    cache_key = f"prediction:{fixture_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    try:
        # 3개 비동기 호출 동시 실행
        home_matches, away_matches, standings = await asyncio.gather(
            football_api.get_recent_team_matches(home_team_id),
            football_api.get_recent_team_matches(away_team_id),
            football_api.get_standings(),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"데이터 수집 실패: {str(e)}")

    # 피로도 계산
    home_fatigue_mod = fatigue.calculate_fatigue_modifier(home_matches, home_team_id)
    away_fatigue_mod = fatigue.calculate_fatigue_modifier(away_matches, away_team_id)

    # 팀 스탯 (순위표 + 최근 경기)
    home_att, home_def, home_form = team_stats.extract_stats(
        home_team_id, standings, home_matches
    )
    away_att, away_def, away_form = team_stats.extract_stats(
        away_team_id, standings, away_matches
    )

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
            "home": {"attack": home_att, "defense_weakness": home_def, "form": home_form},
            "away": {"attack": away_att, "defense_weakness": away_def, "form": away_form},
        },
        "cached": False,
    }

    cache.set(cache_key, result, ttl_seconds=900)
    return result
