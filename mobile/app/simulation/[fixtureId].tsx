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
import { useAdMob } from '../../hooks/useAdMob';
import { useUserStats } from '../../hooks/useUserStats';
import { getLevel, LEVEL_ICONS } from '../../types/user';
import { COLORS } from '../../constants/config';
import type { MatchEvent } from '../../types/prediction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PITCH_WIDTH = SCREEN_WIDTH - 32;
const PITCH_HEIGHT = PITCH_WIDTH * 0.65;

// 90 minutes compressed to 15 seconds
const MATCH_DURATION_MS = 15000;

type RedCardTeam = 'none' | 'home' | 'away';

export default function SimulationScreen() {
  const params = useLocalSearchParams<{
    fixtureId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeName: string;
    awayName: string;
  }>();
  const router = useRouter();
  const { showInterstitial } = useAdMob();
  const { savePrediction } = useUserStats();
  const [predSaved, setPredSaved] = useState(false);

  // Red card state
  const [redCardMode, setRedCardMode] = useState(false);
  const [selectedRedCard, setSelectedRedCard] = useState<RedCardTeam>('none');
  const [appliedRedCard, setAppliedRedCard] = useState<RedCardTeam>('none');

  const { prediction, loading } = usePrediction(
    Number(params.fixtureId),
    Number(params.homeTeamId),
    Number(params.awayTeamId),
    appliedRedCard === 'home',
    appliedRedCard === 'away',
  );

  const [simStarted, setSimStarted] = useState(false);
  const [simFinished, setSimFinished] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);
  const [flashTeam, setFlashTeam] = useState<'home' | 'away' | null>(null);
  const [phase, setPhase] = useState<'first' | 'half' | 'second' | 'full'>('first');

  const scoreFlashAnim = useRef(new Animated.Value(1)).current;
  const goalBannerAnim = useRef(new Animated.Value(0)).current;
  const goalBannerOpacity = useRef(new Animated.Value(0)).current;
  const timerProgress = useRef(new Animated.Value(0)).current;
  const [lastGoalTeam, setLastGoalTeam] = useState<string>('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventIndexRef = useRef(0);
  const startTimeRef = useRef(0);

  function beginSimulation() {
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

    timerProgress.setValue(0);
    Animated.timing(timerProgress, {
      toValue: 1,
      duration: MATCH_DURATION_MS,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const minute = Math.min(90, Math.floor((elapsed / MATCH_DURATION_MS) * 90));
      setCurrentMinute(minute);

      if (minute >= 45 && minute < 46) setPhase('half');
      else if (minute >= 46) setPhase('second');

      const events = prediction.match_events as MatchEvent[];
      while (
        eventIndexRef.current < events.length &&
        events[eventIndexRef.current].minute <= minute
      ) {
        triggerGoal(events[eventIndexRef.current]);
        eventIndexRef.current++;
      }

      if (minute >= 90) {
        clearInterval(intervalRef.current!);
        setPhase('full');
        setSimFinished(true);
      }
    }, 100);
  }

  function handleStartNormal() {
    setAppliedRedCard('none');
    beginSimulation();
  }

  function handleStartRedCard() {
    if (selectedRedCard === 'none') return;
    showInterstitial();
    setAppliedRedCard(selectedRedCard);
    // beginSimulation() is triggered by useEffect when prediction updates
  }

  // When red card is applied and prediction reloads, auto-start simulation
  useEffect(() => {
    if (appliedRedCard !== 'none' && prediction && !loading && !simStarted) {
      beginSimulation();
    }
  }, [prediction, loading, appliedRedCard]);

  function triggerGoal(ev: MatchEvent) {
    setHomeScore(ev.home_score);
    setAwayScore(ev.away_score);
    setFlashTeam(ev.team);
    setLastGoalTeam(ev.team === 'home' ? params.homeName ?? 'Home' : params.awayName ?? 'Away');
    setVisibleEvents((prev) => [ev, ...prev]);

    goalBannerOpacity.setValue(0);
    goalBannerAnim.setValue(-60);
    Animated.parallel([
      Animated.spring(goalBannerAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.sequence([
        Animated.timing(goalBannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(goalBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => setFlashTeam(null));

    Animated.sequence([
      Animated.timing(scoreFlashAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scoreFlashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function getPhaseLabel() {
    if (phase === 'half') return 'Half Time';
    if (phase === 'full') return 'Full Time';
    return `${currentMinute}'`;
  }

  function handleReplay() {
    setSimStarted(false);
    setSimFinished(false);
    setRedCardMode(false);
    setSelectedRedCard('none');
    setAppliedRedCard('none');
    setPredSaved(false);
  }

  function handleSavePrediction() {
    if (!prediction || predSaved) return;
    const pts = Math.round(prediction.confidence * 100);
    savePrediction({
      fixtureId: Number(params.fixtureId),
      homeName: params.homeName ?? 'Home',
      awayName: params.awayName ?? 'Away',
      predictedHome: homeScore,
      predictedAway: awayScore,
      confidence: prediction.confidence,
      points: pts,
      timestamp: new Date().toISOString(),
    });
    setPredSaved(true);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>
          {appliedRedCard !== 'none' ? '🟥 Loading red card simulation...' : '⚽ Loading simulation...'}
        </Text>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load data.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Goal banner */}
      {flashTeam && (
        <Animated.View
          style={[
            styles.goalBanner,
            appliedRedCard !== 'none' && styles.goalBannerRed,
            { transform: [{ translateY: goalBannerAnim }], opacity: goalBannerOpacity },
          ]}
        >
          <Text style={styles.goalBannerText}>⚽ GOAL!</Text>
          <Text style={styles.goalBannerTeam}>{lastGoalTeam}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Scoreboard */}
        <View style={styles.scoreboard}>
          <View style={styles.teamSection}>
            <Text style={styles.teamNameSb} numberOfLines={2}>{params.homeName}</Text>
            <Text style={styles.teamSubLabel}>Home{appliedRedCard === 'home' ? ' 🟥' : ''}</Text>
          </View>
          <View style={styles.scoreCenter}>
            <Animated.Text style={[styles.scoreMain, { transform: [{ scale: scoreFlashAnim }] }]}>
              {homeScore} - {awayScore}
            </Animated.Text>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseText}>{getPhaseLabel()}</Text>
            </View>
          </View>
          <View style={[styles.teamSection, styles.teamRight]}>
            <Text style={styles.teamNameSb} numberOfLines={2}>{params.awayName}</Text>
            <Text style={styles.teamSubLabel}>Away{appliedRedCard === 'away' ? ' 🟥' : ''}</Text>
          </View>
        </View>

        {/* Timer progress bar */}
        {simStarted && (
          <View style={styles.timerTrack}>
            <Animated.View
              style={[
                styles.timerFill,
                {
                  width: timerProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: appliedRedCard !== 'none' ? '#f85149' : COLORS.primary,
                },
              ]}
            />
            <View style={styles.halfLine} />
          </View>
        )}

        {/* Football pitch */}
        <View style={styles.pitchContainer}>
          <View style={styles.pitch}>
            <View style={styles.centerLine} />
            <View style={styles.centerCircle} />
            <View style={[styles.penaltyBox, styles.penaltyLeft]} />
            <View style={[styles.penaltyBox, styles.penaltyRight]} />
            <Text style={[styles.pitchTeamLabel, { left: 12 }]}>{params.awayName?.split(' ').pop()}</Text>
            <Text style={[styles.pitchTeamLabel, { right: 12 }]}>{params.homeName?.split(' ').pop()}</Text>
            {visibleEvents.slice(0, 5).map((ev, i) => {
              const isRecent = i === 0;
              const xPos = ev.team === 'home'
                ? PITCH_WIDTH * 0.72 + (Math.sin(ev.minute) * 20)
                : PITCH_WIDTH * 0.28 + (Math.sin(ev.minute) * 20);
              const yPos = PITCH_HEIGHT * 0.3 + (i * 18);
              return (
                <View
                  key={`${ev.minute}-${i}`}
                  style={[styles.goalDot, {
                    left: xPos - 8, top: yPos - 8,
                    backgroundColor: ev.team === 'home' ? COLORS.homeWin : COLORS.awayWin,
                    opacity: isRecent ? 1 : 0.4 - i * 0.05,
                    transform: [{ scale: isRecent ? 1.4 : 1 }],
                  }]}
                >
                  <Text style={styles.goalDotText}>⚽</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Pre-match section */}
        {!simStarted && (
          <View style={styles.startSection}>
            <Text style={styles.previewTitle}>AI Prediction</Text>
            <Text style={styles.previewScore}>
              {prediction.predicted_score.home} - {prediction.predicted_score.away}
            </Text>
            <View style={styles.probRow}>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.homeWin }]}>{prediction.probabilities.home_win}%</Text>
                <Text style={styles.probLabel}>Home Win</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.draw }]}>{prediction.probabilities.draw}%</Text>
                <Text style={styles.probLabel}>Draw</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={[styles.probVal, { color: COLORS.awayWin }]}>{prediction.probabilities.away_win}%</Text>
                <Text style={styles.probLabel}>Away Win</Text>
              </View>
            </View>

            {/* Normal and Red Card simulation buttons */}
            <View style={styles.simBtnRow}>
              <TouchableOpacity style={styles.normalSimBtn} onPress={handleStartNormal}>
                <Text style={styles.normalSimBtnText}>▶ Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.redCardSimBtn, redCardMode && styles.redCardSimBtnActive]}
                onPress={() => setRedCardMode(!redCardMode)}
              >
                <Text style={styles.redCardSimBtnText}>🟥 Red Card</Text>
              </TouchableOpacity>
            </View>

            {/* Red card team picker */}
            {redCardMode && (
              <View style={styles.redCardPicker}>
                <Text style={styles.redCardPickerLabel}>Which team gets the red card?</Text>
                <View style={styles.redCardTeamRow}>
                  <TouchableOpacity
                    style={[styles.redCardTeamBtn, selectedRedCard === 'home' && styles.redCardTeamBtnActive]}
                    onPress={() => setSelectedRedCard(selectedRedCard === 'home' ? 'none' : 'home')}
                  >
                    <Text style={[styles.redCardTeamBtnText, selectedRedCard === 'home' && styles.redCardTeamBtnTextActive]}>
                      {params.homeName}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.redCardTeamBtn, selectedRedCard === 'away' && styles.redCardTeamBtnActive]}
                    onPress={() => setSelectedRedCard(selectedRedCard === 'away' ? 'none' : 'away')}
                  >
                    <Text style={[styles.redCardTeamBtnText, selectedRedCard === 'away' && styles.redCardTeamBtnTextActive]}>
                      {params.awayName}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.runRedCardSimBtn, selectedRedCard === 'none' && styles.runRedCardSimBtnDisabled]}
                  onPress={handleStartRedCard}
                  disabled={selectedRedCard === 'none'}
                >
                  <Text style={styles.runRedCardSimBtnText}>
                    {selectedRedCard === 'none' ? 'Select a team above' : '▶ Run Red Card Simulation'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Post-match result */}
        {simFinished && (
          <View style={styles.resultSection}>
            {appliedRedCard !== 'none' && (
              <Text style={styles.redCardResultLabel}>
                🟥 {appliedRedCard === 'home' ? params.homeName : params.awayName} Red Card
              </Text>
            )}
            <Text style={styles.fullTimeLabel}>FULL TIME</Text>
            <Text style={styles.finalScore}>{homeScore} - {awayScore}</Text>
            <Text style={styles.finalOutcome}>
              {homeScore > awayScore
                ? `🏆 ${params.homeName} Win`
                : awayScore > homeScore
                ? `🏆 ${params.awayName} Win`
                : '🤝 Draw'}
            </Text>

            {/* Save prediction */}
            {!predSaved ? (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrediction}>
                <Text style={styles.saveBtnText}>💾 Save This Prediction</Text>
                <Text style={styles.saveBtnSub}>+{Math.round((prediction?.confidence ?? 0) * 100)} pts</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>
                  ✓ Saved · +{Math.round((prediction?.confidence ?? 0) * 100)} pts · {LEVEL_ICONS[getLevel(0)]}
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.replayBtn} onPress={handleReplay}>
                <Text style={styles.replayBtnText}>↻ Replay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => router.push({
                  pathname: '/prediction/[fixtureId]',
                  params: {
                    fixtureId: params.fixtureId,
                    homeTeamId: params.homeTeamId,
                    awayTeamId: params.awayTeamId,
                    homeName: params.homeName,
                    awayName: params.awayName,
                  },
                })}
              >
                <Text style={styles.detailBtnText}>View Full Analysis</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Match event log */}
        {visibleEvents.length > 0 && (
          <View style={styles.eventLog}>
            <Text style={styles.eventLogTitle}>Match Events</Text>
            {visibleEvents.map((ev, i) => (
              <View
                key={`${ev.minute}-${ev.team}-${i}`}
                style={[styles.eventRow, ev.team === 'home' ? styles.eventHome : styles.eventAway]}
              >
                <Text style={styles.eventMinute}>{ev.minute}'</Text>
                <Text style={styles.eventIcon}>⚽</Text>
                <Text style={styles.eventTeam}>
                  {ev.team === 'home' ? params.homeName : params.awayName}
                </Text>
                <Text style={styles.eventScore}>{ev.home_score} - {ev.away_score}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  errorText: { color: COLORS.text, fontSize: 16 },

  goalBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: '#FFD700', paddingVertical: 14, alignItems: 'center',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 12, elevation: 10,
  },
  goalBannerRed: { backgroundColor: '#f85149', shadowColor: '#f85149' },
  goalBannerText: { fontSize: 26, fontWeight: '900', color: '#000', letterSpacing: 3 },
  goalBannerTeam: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 2 },

  scoreboard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingVertical: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderColor: COLORS.border,
  },
  teamSection: { flex: 1, alignItems: 'flex-start' },
  teamRight: { alignItems: 'flex-end' },
  teamNameSb: { color: COLORS.text, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  teamSubLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  scoreCenter: { alignItems: 'center', minWidth: 120 },
  scoreMain: { color: COLORS.text, fontSize: 42, fontWeight: '900', letterSpacing: 6, fontVariant: ['tabular-nums'] },
  phaseBadge: { backgroundColor: COLORS.primary + '33', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  phaseText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  timerTrack: { height: 4, backgroundColor: COLORS.border, position: 'relative' },
  timerFill: { height: '100%' },
  halfLine: { position: 'absolute', left: '50%', top: -4, width: 2, height: 12, backgroundColor: COLORS.textSecondary },

  pitchContainer: { padding: 16 },
  pitch: {
    width: PITCH_WIDTH, height: PITCH_HEIGHT, backgroundColor: '#2d7a1f',
    borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden', position: 'relative',
  },
  centerLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  centerCircle: {
    position: 'absolute', left: '50%', top: '50%',
    width: PITCH_HEIGHT * 0.55, height: PITCH_HEIGHT * 0.55,
    marginLeft: -(PITCH_HEIGHT * 0.275), marginTop: -(PITCH_HEIGHT * 0.275),
    borderRadius: PITCH_HEIGHT * 0.275, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  penaltyBox: {
    position: 'absolute', width: PITCH_WIDTH * 0.18, height: PITCH_HEIGHT * 0.55,
    top: '50%', marginTop: -(PITCH_HEIGHT * 0.275),
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  penaltyLeft: { left: 0, borderLeftWidth: 0 },
  penaltyRight: { right: 0, borderRightWidth: 0 },
  pitchTeamLabel: { position: 'absolute', bottom: 8, color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  goalDot: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 5,
  },
  goalDotText: { fontSize: 12 },

  startSection: { alignItems: 'center', padding: 24, gap: 12 },
  previewTitle: { color: COLORS.textSecondary, fontSize: 13 },
  previewScore: { color: COLORS.text, fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  probRow: { flexDirection: 'row', gap: 32, marginTop: 4 },
  probItem: { alignItems: 'center' },
  probVal: { fontSize: 20, fontWeight: '800' },
  probLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

  simBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  normalSimBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  normalSimBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  redCardSimBtn: {
    flex: 1, backgroundColor: COLORS.surface, paddingVertical: 13,
    borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f85149' + '66',
  },
  redCardSimBtnActive: { backgroundColor: '#f85149' + '22', borderColor: '#f85149' },
  redCardSimBtnText: { color: '#f85149', fontSize: 15, fontWeight: '700' },

  redCardPicker: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f85149' + '44', gap: 10, marginTop: 4,
  },
  redCardPickerLabel: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
  redCardTeamRow: { flexDirection: 'row', gap: 8 },
  redCardTeamBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  redCardTeamBtnActive: { borderColor: '#f85149', backgroundColor: '#f85149' + '22' },
  redCardTeamBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  redCardTeamBtnTextActive: { color: '#f85149' },
  runRedCardSimBtn: { backgroundColor: '#f85149', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  runRedCardSimBtnDisabled: { backgroundColor: COLORS.border },
  runRedCardSimBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  resultSection: {
    alignItems: 'center', padding: 24, gap: 8, backgroundColor: COLORS.card,
    margin: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  redCardResultLabel: { color: '#f85149', fontSize: 12, fontWeight: '600' },
  fullTimeLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  finalScore: { color: COLORS.text, fontSize: 52, fontWeight: '900', letterSpacing: 8 },
  finalOutcome: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  replayBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  replayBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  detailBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  detailBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  eventLog: { marginHorizontal: 16, marginTop: 8, gap: 6 },
  eventLogTitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  eventRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, gap: 10 },
  eventHome: { backgroundColor: COLORS.homeWin + '18', borderLeftWidth: 3, borderLeftColor: COLORS.homeWin },
  eventAway: { backgroundColor: COLORS.awayWin + '18', borderLeftWidth: 3, borderLeftColor: COLORS.awayWin },
  eventMinute: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', minWidth: 32 },
  eventIcon: { fontSize: 16 },
  eventTeam: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
  eventScore: { color: COLORS.text, fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  saveBtnSub: { color: '#00000088', fontSize: 11 },
  savedBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  savedBadgeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
});
