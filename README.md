# EPL Simulation

## English

EPL Simulation is a full-stack football prediction and match-simulation application built around English Premier League fixtures. It combines a Python API backend with a TypeScript mobile client to provide match data, simulated results, prediction scoring, and comparison with real outcomes.

### Main Features

- EPL fixtures and results from football-data.org
- Match simulation with team strength, goal-frequency, and red-card events
- User predictions and a point-based scoring system
- Critical-match handling and boosted match intensity
- Comparison between predicted, simulated, and real results
- Mobile-friendly screens for fixtures, predictions, results, and standings
- Backend deployment configuration for Railway

### Tech Stack

- **Backend:** Python, FastAPI, service/router architecture
- **Mobile:** TypeScript, React Native, Expo
- **Data:** football-data.org API
- **Deployment:** Railway and Expo Application Services

### Repository Structure

- `backend/`: API routes, simulation services, caching, and deployment configuration
- `mobile/`: Expo application, screens, components, hooks, services, and shared types

> This project is an experimental sports simulation and prediction application. Simulated scores are not betting advice and do not guarantee real match outcomes.

---

## 한국어

EPL Simulation은 잉글랜드 프리미어리그 경기 일정과 결과를 기반으로 예측과 경기 시뮬레이션을 제공하는 풀스택 애플리케이션입니다. Python API 백엔드와 TypeScript 모바일 앱을 결합하여 경기 정보, 가상 경기 결과, 예측 점수와 실제 결과 비교 기능을 제공합니다.

### 주요 기능

- football-data.org 기반 EPL 경기 일정 및 결과
- 팀 전력, 득점 빈도와 퇴장 이벤트를 반영한 경기 시뮬레이션
- 사용자 승부 예측과 포인트 점수 시스템
- 중요 경기와 경기 강도 증가 처리
- 예측 결과, 시뮬레이션 결과와 실제 경기 결과 비교
- 일정, 예측, 결과와 순위를 확인하는 모바일 화면
- Railway 백엔드 배포 구성

### 기술 구성

- **백엔드:** Python, FastAPI, 서비스·라우터 구조
- **모바일:** TypeScript, React Native, Expo
- **데이터:** football-data.org API
- **배포:** Railway 및 Expo Application Services

### 저장소 구조

- `backend/`: API 라우트, 경기 시뮬레이션, 캐시와 배포 설정
- `mobile/`: Expo 앱, 화면, 컴포넌트, 훅, 서비스와 공통 타입

> 이 프로젝트는 스포츠 시뮬레이션과 예측 기능을 실험하기 위한 앱입니다. 시뮬레이션 점수는 베팅 조언이 아니며 실제 경기 결과를 보장하지 않습니다.
