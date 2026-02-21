import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useUserStats } from '../hooks/useUserStats';
import {
  getLevel,
  getNextLevelPoints,
  LEVEL_ICONS,
  LEVEL_THRESHOLDS,
  type UserLevel,
  type SavedPrediction,
} from '../types/user';
import { COLORS } from '../constants/config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 80;

// ── Growth chart (pure RN bars) ───────────────────────────────────────────────
function GrowthChart({ predictions }: { predictions: SavedPrediction[] }) {
  const sorted = useMemo(
    () =>
      [...predictions].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [predictions],
  );

  const cumPoints = useMemo(() => {
    const acc: number[] = [];
    sorted.forEach((p, i) => {
      const total = (p.points || 0) + (p.bonusPoints || 0);
      acc.push((acc[i - 1] ?? 0) + total);
    });
    return acc;
  }, [sorted]);

  const display = cumPoints.slice(-30);
  const maxPts = Math.max(...display, 1);

  if (display.length < 2) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>
          Make at least 2 predictions to see your growth chart.
        </Text>
      </View>
    );
  }

  return (
    <View style={chartStyles.wrapper}>
      <View style={chartStyles.yLabels}>
        <Text style={chartStyles.yLabel}>{maxPts}</Text>
        <Text style={chartStyles.yLabel}>{Math.round(maxPts / 2)}</Text>
        <Text style={chartStyles.yLabel}>0</Text>
      </View>
      <View style={[chartStyles.chart, { width: SCREEN_WIDTH - 104 }]}>
        <View style={[chartStyles.gridLine, { bottom: '100%' }]} />
        <View style={[chartStyles.gridLine, { bottom: '50%' }]} />
        <View style={[chartStyles.gridLine, { bottom: 0 }]} />
        <View style={chartStyles.bars}>
          {display.map((pts, i) => {
            const pct = Math.max(pts / maxPts, 0.03);
            const opacity = 0.4 + (i / display.length) * 0.6;
            return (
              <View key={i} style={chartStyles.barWrapper}>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: pct * CHART_HEIGHT,
                      opacity,
                      backgroundColor:
                        i === display.length - 1 ? COLORS.primary : COLORS.primary + 'aa',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  yLabels: { justifyContent: 'space-between', alignItems: 'flex-end', height: CHART_HEIGHT },
  yLabel: { color: COLORS.textSecondary, fontSize: 9 },
  chart: { height: CHART_HEIGHT, position: 'relative' },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: COLORS.border,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 2 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2, minHeight: 3 },
  empty: { paddingVertical: 16, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
});

// ── Level progress bar ────────────────────────────────────────────────────────
function LevelProgress({ totalPoints }: { totalPoints: number }) {
  const level = getLevel(totalPoints);
  const { next, needed } = getNextLevelPoints(totalPoints);
  const thresholds = LEVEL_THRESHOLDS as Record<UserLevel, number>;
  const currentThreshold = thresholds[level];
  const nextThreshold = next ? thresholds[next] : currentThreshold + 1;
  const progress = Math.min(
    (totalPoints - currentThreshold) / (nextThreshold - currentThreshold),
    1,
  );

  return (
    <View style={progStyles.container}>
      <View style={progStyles.labels}>
        <Text style={progStyles.levelLabel}>{LEVEL_ICONS[level]} {level}</Text>
        {next && <Text style={progStyles.nextLabel}>{next}</Text>}
      </View>
      <View style={progStyles.track}>
        <View style={[progStyles.fill, { width: `${progress * 100}%` }]} />
      </View>
      {next ? (
        <Text style={progStyles.sub}>{needed} pts to next level</Text>
      ) : (
        <Text style={progStyles.sub}>Maximum level reached!</Text>
      )}
    </View>
  );
}

const progStyles = StyleSheet.create({
  container: { gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  levelLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  nextLabel: { color: COLORS.textSecondary, fontSize: 12 },
  track: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  sub: { color: COLORS.textSecondary, fontSize: 11 },
});

// ── Single prediction card — shows my pick vs real result ─────────────────────
function PredictionCard({ p }: { p: SavedPrediction }) {
  const predWinner =
    p.predictedHome > p.predictedAway ? 'h' : p.predictedAway > p.predictedHome ? 'a' : 'd';
  const realWinner = p.realScore
    ? p.realScore.home > p.realScore.away
      ? 'h'
      : p.realScore.away > p.realScore.home
      ? 'a'
      : 'd'
    : null;

  const isExact =
    p.realScore != null &&
    p.predictedHome === p.realScore.home &&
    p.predictedAway === p.realScore.away;
  const isCorrect = realWinner != null && predWinner === realWinner;
  const totalPts = (p.points || 0) + (p.bonusPoints || 0);

  return (
    <View style={pcStyles.card}>
      {/* Match title + pts */}
      <View style={pcStyles.header}>
        <Text style={pcStyles.matchName} numberOfLines={1}>
          {p.homeName} vs {p.awayName}
          {p.isCritical ? '  ⭐ Critical' : ''}
        </Text>
        <View style={[
          pcStyles.ptsBadge,
          isExact ? pcStyles.ptsExact : isCorrect ? pcStyles.ptsCorrect : p.resolved ? pcStyles.ptsWrong : {},
        ]}>
          <Text style={pcStyles.ptsVal}>{totalPts} pts</Text>
          {(p.bonusPoints ?? 0) > 0 && (
            <Text style={pcStyles.ptsBonus}>+{p.bonusPoints} bonus</Text>
          )}
        </View>
      </View>

      {/* My Pick ←→ Real Result */}
      <View style={pcStyles.scoresRow}>
        <View style={pcStyles.scoreBlock}>
          <Text style={pcStyles.scoreLabel}>MY PICK</Text>
          <Text style={pcStyles.scoreVal}>
            {p.predictedHome} – {p.predictedAway}
          </Text>
        </View>

        <View style={pcStyles.arrow}>
          <Text style={pcStyles.arrowText}>VS</Text>
        </View>

        {p.resolved && p.realScore ? (
          <View style={[
            pcStyles.scoreBlock,
            isExact ? pcStyles.exactBox : isCorrect ? pcStyles.correctBox : pcStyles.wrongBox,
          ]}>
            <Text style={pcStyles.scoreLabel}>REAL</Text>
            <Text style={[
              pcStyles.scoreVal,
              isExact ? pcStyles.exactText : isCorrect ? pcStyles.correctText : pcStyles.wrongText,
            ]}>
              {p.realScore.home} – {p.realScore.away}
            </Text>
          </View>
        ) : (
          <View style={pcStyles.pendingBlock}>
            <Text style={pcStyles.pendingIcon}>⏳</Text>
            <Text style={pcStyles.pendingLabel}>Pending</Text>
          </View>
        )}
      </View>

      {/* Accuracy badge + date */}
      <View style={pcStyles.footer}>
        {p.resolved ? (
          <Text style={[
            pcStyles.resultText,
            isExact ? pcStyles.exactText : isCorrect ? pcStyles.correctText : pcStyles.wrongText,
          ]}>
            {isExact ? '✅ Exact score!' : isCorrect ? '✓ Correct result' : '✗ Wrong result'}
          </Text>
        ) : (
          <Text style={pcStyles.pendingResultText}>Points awarded after real match</Text>
        )}
        <Text style={pcStyles.dateText}>
          {new Date(p.timestamp).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
          })}
        </Text>
      </View>

      {/* Key player pick */}
      {p.keyPlayer && (
        <Text style={pcStyles.keyPlayer}>
          ⭐ Key pick: {p.keyPlayer.name}
        </Text>
      )}
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  matchName: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  ptsBadge: {
    backgroundColor: COLORS.card, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  ptsExact: { backgroundColor: '#38d9a922', borderColor: '#38d9a966' },
  ptsCorrect: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary + '44' },
  ptsWrong: { backgroundColor: '#f8514911', borderColor: '#f8514933' },
  ptsVal: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  ptsBonus: { color: COLORS.primary, fontSize: 9, fontWeight: '600' },

  scoresRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  scoreBlock: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  exactBox: { borderColor: '#38d9a9', backgroundColor: '#38d9a918' },
  correctBox: { borderColor: COLORS.primary + '88', backgroundColor: COLORS.primary + '12' },
  wrongBox: { borderColor: '#f8514966', backgroundColor: '#f851490a' },
  scoreLabel: {
    color: COLORS.textSecondary, fontSize: 9, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  scoreVal: { color: COLORS.text, fontSize: 22, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  exactText: { color: '#38d9a9' },
  correctText: { color: COLORS.primary },
  wrongText: { color: '#f85149' },

  arrow: { justifyContent: 'center', alignItems: 'center', width: 28 },
  arrowText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },

  pendingBlock: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  pendingIcon: { fontSize: 20 },
  pendingLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultText: { fontSize: 12, fontWeight: '700' },
  pendingResultText: { color: COLORS.textSecondary, fontSize: 10, fontStyle: 'italic', flex: 1 },
  dateText: { color: COLORS.textSecondary, fontSize: 10 },
  keyPlayer: {
    color: COLORS.textSecondary, fontSize: 11,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { stats } = useUserStats();
  const level = getLevel(stats.totalPoints);

  const allPreds = useMemo(
    () =>
      [...stats.predictions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [stats.predictions],
  );

  const resolvedPreds = allPreds.filter((p) => p.resolved);
  const pendingPreds = allPreds.filter((p) => !p.resolved);

  const avgPts =
    stats.totalPredictions > 0
      ? Math.round(stats.totalPoints / stats.totalPredictions)
      : 0;

  const accuracy = useMemo(() => {
    if (resolvedPreds.length === 0) return null;
    const correct = resolvedPreds.filter((p) => {
      if (!p.realScore) return false;
      const pw = p.predictedHome > p.predictedAway ? 'h' : p.predictedAway > p.predictedHome ? 'a' : 'd';
      const rw = p.realScore.home > p.realScore.away ? 'h' : p.realScore.away > p.realScore.home ? 'a' : 'd';
      return pw === rw;
    }).length;
    return Math.round((correct / resolvedPreds.length) * 100);
  }, [resolvedPreds]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Level header */}
      <View style={styles.headerCard}>
        <Text style={styles.levelIcon}>{LEVEL_ICONS[level]}</Text>
        <Text style={styles.levelName}>{level}</Text>
        <Text style={styles.totalPts}>{stats.totalPoints} pts</Text>
        <View style={styles.progressSection}>
          <LevelProgress totalPoints={stats.totalPoints} />
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats.totalPredictions}</Text>
          <Text style={styles.statLabel}>Predictions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{avgPts}</Text>
          <Text style={styles.statLabel}>Avg pts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[
            styles.statVal,
            { color: accuracy != null && accuracy >= 50 ? COLORS.primary : COLORS.danger },
          ]}>
            {accuracy != null ? `${accuracy}%` : '—'}
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{resolvedPreds.length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Growth chart */}
      {allPreds.length >= 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Curve</Text>
          <Text style={styles.sectionSub}>Cumulative points over time</Text>
          <GrowthChart predictions={allPreds} />
        </View>
      )}

      {/* Pending predictions */}
      {pendingPreds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Waiting for Real Result</Text>
          <Text style={styles.sectionSub}>+0–4 bonus pts awarded after match</Text>
          {pendingPreds.map((p, i) => (
            <PredictionCard key={`pending-${p.fixtureId}-${i}`} p={p} />
          ))}
        </View>
      )}

      {/* Resolved predictions */}
      {resolvedPreds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ My Pick vs Real Result</Text>
          {resolvedPreds.map((p, i) => (
            <PredictionCard key={`resolved-${p.fixtureId}-${i}`} p={p} />
          ))}
        </View>
      )}

      {/* Empty state */}
      {allPreds.length === 0 && (
        <View style={styles.noData}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataText}>
            No predictions yet.{'\n'}Simulate a match and tap "Save This Prediction"!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  levelIcon: { fontSize: 48 },
  levelName: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  totalPts: { color: COLORS.primary, fontSize: 28, fontWeight: '800' },
  progressSection: { width: '100%', marginTop: 12 },

  statGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 2,
  },
  statVal: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  statLabel: {
    color: COLORS.textSecondary, fontSize: 8, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  section: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  sectionSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: -4 },

  noData: { alignItems: 'center', padding: 40, gap: 12 },
  noDataIcon: { fontSize: 48 },
  noDataText: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
});
