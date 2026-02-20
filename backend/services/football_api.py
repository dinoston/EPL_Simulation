import os
import httpx
from services.cache import cache

BASE_URL = "https://api-football-v1.p.rapidapi.com/v3"

def _get_headers() -> dict:
    key = os.environ.get("RAPIDAPI_KEY", "")
    return {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
    }


async def get_fixtures_upcoming(league: int = 39, season: int = 2024, next_n: int = 10) -> dict:
    """오늘 이후 예정된 EPL 경기 목록 (캐시 30분)"""
    cache_key = f"fixtures:upcoming:{league}:{season}:{next_n}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/fixtures",
            params={"league": league, "season": season, "next": next_n},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    cache.set(cache_key, data, ttl_seconds=1800)  # 30분
    return data


async def get_fixtures_today(league: int = 39, season: int = 2024) -> dict:
    """오늘 EPL 경기 목록 (캐시 30분)"""
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"fixtures:today:{league}:{season}:{today}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 오늘 경기가 없을 수 있으므로 upcoming도 함께 요청
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/fixtures",
            params={"league": league, "season": season, "date": today},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    cache.set(cache_key, data, ttl_seconds=1800)
    return data


async def get_recent_fixtures(team_id: int, last: int = 10) -> dict:
    """팀의 최근 N경기 결과 (피로도 계산용, 캐시 1시간)"""
    cache_key = f"fixtures:recent:{team_id}:{last}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/fixtures",
            params={"team": team_id, "last": last},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    cache.set(cache_key, data, ttl_seconds=3600)  # 1시간
    return data


async def get_team_stats(team_id: int, league: int = 39, season: int = 2024) -> dict:
    """시즌 팀 통계 (공격/수비력 계산용, 캐시 6시간)"""
    cache_key = f"stats:{team_id}:{league}:{season}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/teams/statistics",
            params={"league": league, "season": season, "team": team_id},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    cache.set(cache_key, data, ttl_seconds=21600)  # 6시간
    return data
