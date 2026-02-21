import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from services import football_api

router = APIRouter()


@router.get("/today")
async def get_today_fixtures():
    """오늘 EPL 경기 목록. 없으면 다음 예정 경기 반환."""
    try:
        matches = await football_api.get_fixtures_today()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API 오류: {str(e)}")

    if not matches:
        try:
            matches = await football_api.get_upcoming_fixtures(limit=10)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "count": len(matches),
        "fixtures": [_format_match(m) for m in matches],
    }


@router.get("/upcoming")
async def get_upcoming_fixtures(
    limit: int = Query(default=10, ge=1, le=50),
):
    """다음 N경기 EPL 일정"""
    try:
        matches = await football_api.get_upcoming_fixtures(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "count": len(matches),
        "fixtures": [_format_match(m) for m in matches],
    }


@router.get("/squads")
async def get_squads(
    home_team_id: int = Query(...),
    away_team_id: int = Query(...),
):
    """Both teams' outfield squads for key player selection."""
    try:
        home_squad, away_squad = await asyncio.gather(
            football_api.get_squad(home_team_id),
            football_api.get_squad(away_team_id),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"home": home_squad, "away": away_squad}


def _format_match(m: dict) -> dict:
    """football-data.org 응답 → 앱 공통 형식 변환"""
    score = m.get("score", {}).get("fullTime", {})
    status_raw = m.get("status", "SCHEDULED")

    status_map = {
        "SCHEDULED": "NS",
        "TIMED": "NS",
        "IN_PLAY": "LIVE",
        "PAUSED": "HT",
        "FINISHED": "FT",
        "SUSPENDED": "SUSP",
        "POSTPONED": "PST",
        "CANCELLED": "CANC",
    }

    return {
        "id": m.get("id"),
        "date": m.get("utcDate", ""),
        "status": status_map.get(status_raw, status_raw),
        "venue": m.get("venue", ""),
        "home": {
            "id": m.get("homeTeam", {}).get("id"),
            "name": m.get("homeTeam", {}).get("name", ""),
            "logo": m.get("homeTeam", {}).get("crest", ""),
            "winner": None,
        },
        "away": {
            "id": m.get("awayTeam", {}).get("id"),
            "name": m.get("awayTeam", {}).get("name", ""),
            "logo": m.get("awayTeam", {}).get("crest", ""),
            "winner": None,
        },
        "score": {
            "home": score.get("home"),
            "away": score.get("away"),
        },
    }
