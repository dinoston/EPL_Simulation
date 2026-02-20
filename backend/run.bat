@echo off
echo EPL Predictor Backend 시작 중...
echo API 문서: http://localhost:8000/docs
echo.
C:\Users\LG_GRAM\AppData\Local\Programs\Python\Python314\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
