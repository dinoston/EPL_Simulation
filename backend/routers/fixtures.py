from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from services import football_api

router = APIRouter()


@router.get("/today")
async def get_today_fixtures(
    league: int = Query(default=39, description="리그 ID (39=EPL)"),
    season: int = Query(default=2024, description="시즌 연도"),
):
    """
    오늘 EPL 경기 목록을 반환합니다.
    오늘 경기가 없으면 가장 가까운 예정 경기 10개를 반환합니다.
    """
    try:
        data = await football_api.get_fixtures_today(league=league, season=season)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API-Football 오류: {str(e)}")

    fixtures = data.get("response", [])

    # 오늘 경기가 없으면 다음 예정 경기 반환
    if not fixtures:
        try:
            upcoming = await football_api.get_fixtures_upcoming(
                league=league, season=season, next_n=10
            )
            fixtures = upcoming.get("response", [])
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"API-Football 오류: {str(e)}")

    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "count": len(fixtures),
        "fixtures": _format_fixtures(fixtures),
    }


@router.get("/upcoming")
async def get_upcoming_fixtures(
    next_n: int = Query(default=10, ge=1, le=50),
    league: int = Query(default=39),
    season: int = Query(default=2024),
):
    """다음 N경기 EPL 일정"""
    try:
        data = await football_api.get_fixtures_upcoming(
            league=league, season=season, next_n=next_n
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    fixtures = data.get("response", [])
    return {
        "count": len(fixtures),
        "fixtures": _format_fixtures(fixtures),
    }


def _format_fixtures(fixtures: list) -> list:
    """API 응답을 앱에서 사용하기 좋은 형태로 변환"""
    result = []
    for f in fixtures:
        result.append({
            "id": f["fixture"]["id"],
            "date": f["fixture"]["date"],
            "status": f["fixture"]["status"]["short"],
            "venue": f["fixture"].get("venue", {}).get("name", ""),
            "home": {
                "id": f["teams"]["home"]["id"],
                "name": f["teams"]["home"]["name"],
                "logo": f["teams"]["home"]["logo"],
                "winner": f["teams"]["home"]["winner"],
            },
            "away": {
                "id": f["teams"]["away"]["id"],
                "name": f["teams"]["away"]["name"],
                "logo": f["teams"]["away"]["logo"],
                "winner": f["teams"]["away"]["winner"],
            },
            "score": {
                "home": f["goals"]["home"],
                "away": f["goals"]["away"],
            },
        })
    return result
