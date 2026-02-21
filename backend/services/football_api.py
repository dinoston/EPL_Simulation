"""
football-data.org API v4 클라이언트
- 무료 플랜: 승인 없이 즉시 발급, 분당 10 req
- 등록: https://www.football-data.org/client/register
- EPL 코드: PL
"""
import os
from datetime import datetime, timezone
import httpx
from services.cache import cache

BASE_URL = "https://api.football-data.org/v4"
EPL_CODE = "PL"


def _get_headers() -> dict:
    token = os.environ.get("FOOTBALL_DATA_TOKEN", "")
    return {"X-Auth-Token": token}


async def get_fixtures_today() -> list[dict]:
    """오늘 EPL 경기 목록 (캐시 30분)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"fixtures:today:{today}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/competitions/{EPL_CODE}/matches",
            params={"dateFrom": today, "dateTo": today},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    matches = data.get("matches", [])
    cache.set(cache_key, matches, ttl_seconds=1800)
    return matches


async def get_upcoming_fixtures(limit: int = 10) -> list[dict]:
    """다음 예정 EPL 경기 목록 (캐시 30분)"""
    cache_key = f"fixtures:upcoming:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/competitions/{EPL_CODE}/matches",
            params={"status": "SCHEDULED"},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    matches = data.get("matches", [])[:limit]
    cache.set(cache_key, matches, ttl_seconds=1800)
    return matches


async def get_recent_team_matches(team_id: int, limit: int = 10) -> list[dict]:
    """팀의 최근 완료된 경기 목록 (피로도 계산용, 캐시 1시간)"""
    cache_key = f"team:recent:{team_id}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/teams/{team_id}/matches",
            params={"status": "FINISHED", "limit": limit},
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    matches = data.get("matches", [])
    cache.set(cache_key, matches, ttl_seconds=3600)
    return matches


async def get_squad(team_id: int) -> list[dict]:
    """Team squad for key player selection (24h cache, excludes goalkeepers)"""
    cache_key = f"team:squad:{team_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/teams/{team_id}",
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    raw_squad = data.get("squad", [])
    # football-data.org v4 returns: "Goalkeeper", "Defence", "Midfield", "Offence"
    position_map = {"Defence": "Defender", "Midfield": "Midfielder", "Offence": "Forward"}
    position_order = {"Defender": 0, "Midfielder": 1, "Forward": 2}
    players = sorted(
        [
            {
                "id": p.get("id"),
                "name": p.get("name", ""),
                "position": position_map.get(p.get("position", ""), p.get("position", "")),
            }
            for p in raw_squad
            if p.get("position") != "Goalkeeper"
        ],
        key=lambda p: position_order.get(p["position"], 3),
    )
    # Clear old cache if it had wrong position names
    cache.set(cache_key, players, ttl_seconds=604800)  # 7 days
    return players


async def get_standings() -> list[dict]:
    """EPL 순위표 (팀별 득실 통계 포함, 캐시 6시간)"""
    cache_key = "standings:PL"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/competitions/{EPL_CODE}/standings",
            headers=_get_headers(),
        )
        r.raise_for_status()
        data = r.json()

    tables = data.get("standings", [])
    total_table = []
    for t in tables:
        if t.get("type") == "TOTAL":
            total_table = t.get("table", [])
            break
    if not total_table and tables:
        total_table = tables[0].get("table", [])

    cache.set(cache_key, total_table, ttl_seconds=21600)
    return total_table
