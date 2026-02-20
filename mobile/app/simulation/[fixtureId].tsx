import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePrediction } from '../../hooks/usePrediction';
import { COLORS } from '../../constants/config';
import type { MatchEvent } from '../../types/prediction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PITCH_WIDTH = SCREEN_WIDTH - 32;
const PITCH_HEIGHT = PITCH_WIDTH * 0.65;

// 90분 경기를 몇 밀리초로 압축할지
const MATCH_DURATION_MS = 15000; // 15초 = 90분

export default function SimulationScreen() {
  const params = useLocalSearchParams<{
    fixtureId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeName: string;
    awayName: string;
  }>();
  const router = useRouter();

  const { prediction, loading } = usePrediction(
    Number(params.fixtureId),
    Number(params.homeTeamId),
    Number(params.awayTeamId),
  );

  const [simStarted, setSimStarted] = useState(false);
  const [simFinished, setSimFinished] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);
  const [flashTeam, setFlashTeam] = useState<'home' | 'away' | null>(null);
  const [phase, setPhase] = useState<'first' | 'half' | 'second' | 'full'>('first');

  // 애니메이션 값들
  const scoreFlashAnim = useRef(new Animated.Value(1)).current;
  const goalBannerAnim = useRef(new Animated.Value(0)).current;
  const goalBannerOpacity = useRef(new Animated.Value(0)).current;
  const timerProgress = useRef(new Animated.Value(0)).current;
  const [lastGoalTeam, setLastGoalTeam] = useState<string>('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventIndexRef = useRef(0);
  const startTimeRef = useRef(0);

  function startSimulation() {
    if (!prediction) return;
    setSimStarted(true);
    setSimFinished(false);
    setCurrentMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setVisibleEvents([]);
    setPhase('first');
    eventIndexRef.current = 0;
    startTimeRef.current = Date.now();

    // 타이머 프로그레스 바 애니메이션
    timerProgress.setValue(0);
    Animated.timing(timerProgress, {
      toValue: 1,
      duration: MATCH_DURATION_MS,
      useNativeDriver: false,
    }).start();

    // 경기 타이머 (매 100ms마다 분 업데이트)
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const minute = Math.min(90, Math.floor((elapsed / MATCH_DURATION_MS) * 90));
      setCurrentMinute(minute);

      // 전반/후반 체크
      if (minute >= 45 && minute < 46) {
        setPhase('half');
      } else if (minute >= 46) {
        setPhase('second');
      }

      // 이벤트 발생 체크
      const events = prediction.match_events as MatchEvent[];
      while (
        eventIndexRef.current < events.length &&
        events[eventIndexRef.current].minute <= minute
      ) {
        const ev = events[eventIndexRef.current];
        triggerGoal(ev);
        eventIndexRef.current++;
      }

      if (minute >= 90) {
        clearInterval(intervalRef.current!);
        setPhase('full');
        setSimFinished(true);
      }
    }, 100);
  }

  function triggerGoal(ev: MatchEvent) {
    setHomeScore(ev.home_score);
    setAwayScore(ev.away_score);
    setFlashTeam(ev.team);
    setLastGoalTeam(ev.team === 'home' ? params.homeName ?? '홈팀' : params.awayName ?? '원정팀');
    setVisibleEvents((prev) => [ev, ...prev]);

    // 골 배너 애니메이션
    goalBannerOpacity.setValue(0);
    goalBannerAnim.setValue(-60);
    Animated.parallel([
      Animated.spring(goalBannerAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.sequence([
        Animated.timing(goalBannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(goalBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => setFlashTeam(null));

    // 점수판 펄스
    Animated.sequence([
      Animated.timing(scoreFlashAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scoreFlashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function getPhaseLabel() {
    if (phase === 'half') return '하프타임';
    if (phase === 'full') return '경기 종료';
    return `${currentMinute}'`;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>⚽ 시뮬레이션 데이터 준비 중...</Text>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>데이터를 불러오지 못했습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 골 배너 (화면 상단 팝업) */}
      {flashTeam && (
        <Animated.View
          style={[
            styles.goalBanner,
            { transform: [{ translateY: goalBannerAnim }], opacity: goalBannerOpacity },
          ]}
        >
          <Text style={styles.goalBannerText}>⚽ GOAL!</Text>
          <Text style={styles.goalBannerTeam}>{lastGoalTeam}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* 점수판 */}
        <View style={styles.scoreboard}>
          <View style={styles.teamSection}>
            <Text style={styles.teamNameSb} numberOfLines={2}>{params.homeName}</Text>
            <Text style={styles.teamSubLabel}>홈</Text>
          </View>

          <View style={styles.scoreCenter}>
            <Animated.Text
              style={[styles.scoreMain, { transform: [{ scale: scoreFlashAnim }] }]}
            >
              {homeScore} - {awayScore}
            </Animated.Text>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseText}>{getPhaseLabel()}</Text>
            </View>
          </View>

          <View style={[styles.teamSection, styles.teamRight]}>
            <Text style={styles.teamNameSb} numberOfLines={2}>{params.awayName}</Text>
            <Text style={styles.teamSubLabel}>원정</Text>
          </View>
        </View>

        {/* 타이머 프로그레스 바 */}
        {simStarted && (
          <View style={styles.timerTrack}>
            <Animated.View
              style={[
                styles.timerFill,
                {
                  width: timerProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <View style={styles.halfLine} />
          </View>
        )}

        {/* 축구장 시각화 */}
        <View style={styles.pitchContainer}>
          <View style={styles.pitch}>
            {/* 센터라인 */}
            <View style={styles.centerLine} />
            {/* 센터 서클 */}
            <View style={styles.centerCircle} />
            {/* 페널티 박스 (왼쪽 = 원정) */}
            <View style={[styles.penaltyBox, styles.penaltyLeft]} />
            {/* 페널티 박스 (오른쪽 = 홈) */}
            <View style={[styles.penaltyBox, styles.penaltyRight]} />

            {/* 팀 레이블 */}
            <Text style={[styles.pitchTeamLabel, { left: 12 }]}>{params.awayName?.split(' ').pop()}</Text>
            <Text style={[styles.pitchTeamLabel, { right: 12 }]}>{params.homeName?.split(' ').pop()}</Text>

            {/* 경기 이벤트 공 위치 */}
            {visibleEvents.slice(0, 5).map((ev, i) => {
              const isRecent = i === 0;
              const xPos = ev.team === 'home'
                ? PITCH_WIDTH * 0.72 + (Math.sin(ev.minute) * 20)
                : PITCH_WIDTH * 0.28 + (Math.sin(ev.minute) * 20);
              const yPos = PITCH_HEIGHT * 0.3 + (i * 18);
              return (
                <View
                  key={`${ev.minute}-${i}`}
                  style={[
                    styles.goalDot,
                    {
                      left: xPos - 8,
                      top: yPos - 8,
                      backgroundColor: ev.team === 'home' ? COLORS.homeWin : COLORS.awayWin,
                      opacity: isRecent ? 1 : 0.4 - i * 0.05,
                      transform: [{ scale: isRecent ? 1.4 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.goalDotText}>⚽</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 시작 전 상태 */}
        {!simStarted && (
          <View style={styles.startSection}>
            <Text style={styles.previewTitle}>AI 예측 결과</Text>
            <Text style={styles.previewScore}>
              {prediction.predicted_score.home} - {prediction.predicted_score.away}
            </Text>
            <View style={styles.probRow}>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.homeWin }]}>
                  {prediction.probabilities.home_win}%
                </Text>
                <Text style={styles.probLabel}>홈승</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.draw }]}>
                  {prediction.probabilities.draw}%
                </Text>
                <Text style={styles.probLabel}>무승부</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.awayWin }]}>
                  {prediction.probabilities.away_win}%
                </Text>
                <Text style={styles.probLabel}>원정승</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startSimulation}>
              <Text style={styles.startBtnText}>▶ 시뮬레이션 시작</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 경기 종료 후 */}
        {simFinished && (
          <View style={styles.resultSection}>
            <Text style={styles.fullTimeLabel}>경기 종료</Text>
            <Text style={styles.finalScore}>{homeScore} - {awayScore}</Text>
            <Text style={styles.finalOutcome}>
              {homeScore > awayScore
                ? `🏆 ${params.homeName} 승`
                : awayScore > homeScore
                ? `🏆 ${params.awayName} 승`
                : '🤝 무승부'}
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.replayBtn} onPress={startSimulation}>
                <Text style={styles.replayBtnText}>↻ 다시 시뮬레이션</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() =>
                  router.push({
                    pathname: '/prediction/[fixtureId]',
                    params: {
                      fixtureId: params.fixtureId,
                      homeTeamId: params.homeTeamId,
                      awayTeamId: params.awayTeamId,
                      homeName: params.homeName,
                      awayName: params.awayName,
                    },
                  })
                }
              >
                <Text style={styles.detailBtnText}>상세 분석 보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 경기 이벤트 로그 */}
        {visibleEvents.length > 0 && (
          <View style={styles.eventLog}>
            <Text style={styles.eventLogTitle}>경기 이벤트</Text>
            {visibleEvents.map((ev, i) => (
              <View
                key={`${ev.minute}-${ev.team}-${i}`}
                style={[
                  styles.eventRow,
                  ev.team === 'home' ? styles.eventHome : styles.eventAway,
                ]}
              >
                <Text style={styles.eventMinute}>{ev.minute}'</Text>
                <Text style={styles.eventIcon}>⚽</Text>
                <Text style={styles.eventTeam}>
                  {ev.team === 'home' ? params.homeName : params.awayName}
                </Text>
                <Text style={styles.eventScore}>
                  {ev.home_score} - {ev.away_score}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 16,
  },

  // 골 배너
  goalBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  goalBannerText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },
  goalBannerTeam: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },

  // 점수판
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  teamSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamRight: {
    alignItems: 'flex-end',
  },
  teamNameSb: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  teamSubLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scoreCenter: {
    alignItems: 'center',
    minWidth: 120,
  },
  scoreMain: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  phaseBadge: {
    backgroundColor: COLORS.primary + '33',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  phaseText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // 타이머 바
  timerTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    position: 'relative',
  },
  timerFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  halfLine: {
    position: 'absolute',
    left: '50%',
    top: -4,
    width: 2,
    height: 12,
    backgroundColor: COLORS.textSecondary,
  },

  // 축구장
  pitchContainer: {
    padding: 16,
  },
  pitch: {
    width: PITCH_WIDTH,
    height: PITCH_HEIGHT,
    backgroundColor: '#2d7a1f',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  centerCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: PITCH_HEIGHT * 0.55,
    height: PITCH_HEIGHT * 0.55,
    marginLeft: -(PITCH_HEIGHT * 0.275),
    marginTop: -(PITCH_HEIGHT * 0.275),
    borderRadius: PITCH_HEIGHT * 0.275,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  penaltyBox: {
    position: 'absolute',
    width: PITCH_WIDTH * 0.18,
    height: PITCH_HEIGHT * 0.55,
    top: '50%',
    marginTop: -(PITCH_HEIGHT * 0.275),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  penaltyLeft: {
    left: 0,
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  penaltyRight: {
    right: 0,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  pitchTeamLabel: {
    position: 'absolute',
    bottom: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  goalDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  goalDotText: {
    fontSize: 12,
  },

  // 시작 전
  startSection: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  previewTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  previewScore: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
  },
  probRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 4,
  },
  probItem: {
    alignItems: 'center',
  },
  probVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  probLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  startBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  startBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // 경기 종료
  resultSection: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  fullTimeLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  finalScore: {
    color: COLORS.text,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
  },
  finalOutcome: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  replayBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  replayBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  detailBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },

  // 이벤트 로그
  eventLog: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  eventLogTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  eventHome: {
    backgroundColor: COLORS.homeWin + '18',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.homeWin,
  },
  eventAway: {
    backgroundColor: COLORS.awayWin + '18',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.awayWin,
  },
  eventMinute: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 32,
  },
  eventIcon: {
    fontSize: 16,
  },
  eventTeam: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  eventScore: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
