import asyncio
from fastapi import APIRouter, HTTPException, Query
from services import football_api, fatigue, team_stats, simulation
from services.cache import cache

router = APIRouter()

RED_CARD_ATTACK_PENALTY = 0.70   # 30% attack reduction for team with red card
RED_CARD_DEFENSE_PENALTY = 1.15  # 15% defense weakness boost for team with red card


@router.post("/")
async def predict_match(
    fixture_id: int = Query(...),
    home_team_id: int = Query(...),
    away_team_id: int = Query(...),
    home_red_card: bool = Query(False),
    away_red_card: bool = Query(False),
):
    """Monte Carlo Poisson simulation for match result prediction"""
    # Red card scenarios are not cached (always fresh)
    use_cache = not home_red_card and not away_red_card
    cache_key = f"prediction:{fixture_id}"

    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return {**cached, "cached": True}

    try:
        home_matches, away_matches, standings = await asyncio.gather(
            football_api.get_recent_team_matches(home_team_id),
            football_api.get_recent_team_matches(away_team_id),
            football_api.get_standings(),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Data fetch failed: {str(e)}")

    home_fatigue_mod = fatigue.calculate_fatigue_modifier(home_matches, home_team_id)
    away_fatigue_mod = fatigue.calculate_fatigue_modifier(away_matches, away_team_id)

    home_att, home_def, home_form = team_stats.extract_stats(
        home_team_id, standings, home_matches
    )
    away_att, away_def, away_form = team_stats.extract_stats(
        away_team_id, standings, away_matches
    )

    # Apply red card penalties
    if home_red_card:
        home_att = round(home_att * RED_CARD_ATTACK_PENALTY, 3)
        away_def = round(away_def * RED_CARD_DEFENSE_PENALTY, 3)
    if away_red_card:
        away_att = round(away_att * RED_CARD_ATTACK_PENALTY, 3)
        home_def = round(home_def * RED_CARD_DEFENSE_PENALTY, 3)

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
        "red_card": {
            "home": home_red_card,
            "away": away_red_card,
        },
        "cached": False,
    }

    if use_cache:
        cache.set(cache_key, result, ttl_seconds=900)
    return result
