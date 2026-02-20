from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()  # .env 파일에서 환경변수 로드

from routers import health, fixtures, prediction

app = FastAPI(
    title="EPL Predictor API",
    description="EPL 경기 결과 예측 API - Monte Carlo Poisson 시뮬레이션",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(fixtures.router, prefix="/fixtures", tags=["fixtures"])
app.include_router(prediction.router, prefix="/predict", tags=["prediction"])


@app.get("/")
async def root():
    return {
        "app": "EPL Predictor API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "today_fixtures": "/fixtures/today",
            "upcoming_fixtures": "/fixtures/upcoming",
            "predict": "POST /predict?fixture_id=X&home_team_id=Y&away_team_id=Z",
            "docs": "/docs",
        },
    }
