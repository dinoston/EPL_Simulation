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


ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1"

# Hardcoded football-data.org team ID → ESPN team ID mapping for 2025-26 EPL
_FDO_TO_ESPN: dict[int, int] = {
    57: 359,   # Arsenal
    58: 362,   # Aston Villa
    1044: 349, # Bournemouth
    402: 337,  # Brentford
    397: 331,  # Brighton
    61: 363,   # Chelsea
    354: 384,  # Crystal Palace
    62: 368,   # Everton
    63: 370,   # Fulham
    64: 364,   # Liverpool
    65: 382,   # Manchester City
    66: 360,   # Manchester United
    67: 361,   # Newcastle United
    351: 393,  # Nottingham Forest
    73: 367,   # Tottenham Hotspur
    563: 371,  # West Ham United
    76: 380,   # Wolverhampton
}

_POSITION_ORDER = {"Goalkeeper": 0, "Defender": 1, "Midfielder": 2, "Forward": 3}


async def _fetch_espn_squad(espn_id: int) -> list[dict]:
    """Fetch current squad from ESPN (no auth, real-time data)."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{ESPN_URL}/teams/{espn_id}/roster")
        if r.status_code != 200:
            return []
        data = r.json()

    pos_map = {"Goalkeeper": "Goalkeeper", "Defender": "Defender",
               "Midfielder": "Midfielder", "Forward": "Forward", "Attacker": "Forward"}
    players = []
    for p in data.get("athletes", []):
        name = p.get("displayName") or p.get("fullName", "")
        pos = p.get("position", {}).get("name", "")
        if name:
            players.append({
                "id": int(p.get("id", 0)) or None,
                "name": name,
                "position": pos_map.get(pos, "Midfielder"),
            })
    return sorted(players, key=lambda p: _POSITION_ORDER.get(p["position"], 4))


def _parse_fdo_squad(raw_squad: list[dict]) -> list[dict]:
    """Parse football-data.org squad array into our format."""
    pos_map = {"Goalkeeper": "Goalkeeper", "Defence": "Defender",
               "Midfield": "Midfielder", "Offence": "Forward"}
    return sorted(
        [
            {
                "id": p.get("id"),
                "name": p.get("name", ""),
                "position": pos_map.get(p.get("position", ""), p.get("position", "Midfielder")),
            }
            for p in raw_squad
            if p.get("name")
        ],
        key=lambda p: _POSITION_ORDER.get(p["position"], 4),
    )


async def get_squad(team_id: int) -> list[dict]:
    """Current team squad — ESPN primary source (real-time), FDO fallback.
    Cache: 24 hours so transfers reflect within a day."""
    cache_key = f"team:squad:v2:{team_id}"  # v2 key to bust old 7-day cache
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    players: list[dict] = []

    # 1. Try ESPN (most current data, no auth needed)
    espn_id = _FDO_TO_ESPN.get(team_id)
    if espn_id:
        try:
            players = await _fetch_espn_squad(espn_id)
        except Exception:
            players = []

    # 2. Fall back to football-data.org if ESPN fails or team not in mapping
    if not players:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(f"{BASE_URL}/teams/{team_id}", headers=_get_headers())
                r.raise_for_status()
                data = r.json()
            players = _parse_fdo_squad(data.get("squad", []))
        except Exception:
            players = []

    cache.set(cache_key, players, ttl_seconds=86400)  # 24 hours
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
