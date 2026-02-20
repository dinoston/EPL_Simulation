from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    """헬스체크 엔드포인트 (Render.com 슬립 방지용)"""
    return {"status": "ok"}
