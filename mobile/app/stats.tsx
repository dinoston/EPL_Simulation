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
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 80;

// ── Growth chart using pure RN Views ─────────────────────────────────────────
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
      acc.push((acc[i - 1] ?? 0) + p.points);
    });
    return acc;
  }, [sorted]);

  const display = cumPoints.slice(-30); // last 30 data points
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
      {/* Y-axis labels */}
      <View style={chartStyles.yLabels}>
        <Text style={chartStyles.yLabel}>{maxPts}</Text>
        <Text style={chartStyles.yLabel}>{Math.round(maxPts / 2)}</Text>
        <Text style={chartStyles.yLabel}>0</Text>
      </View>

      {/* Chart area */}
      <View style={[chartStyles.chart, { width: CHART_WIDTH - 40 }]}>
        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { bottom: '100%' }]} />
        <View style={[chartStyles.gridLine, { bottom: '50%' }]} />
        <View style={[chartStyles.gridLine, { bottom: 0 }]} />

        {/* Bars */}
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
  track: {
    height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  sub: { color: COLORS.textSecondary, fontSize: 11 },
});

// ── Helper: group predictions by week ────────────────────────────────────────
function groupPredictionsByWeek(predictions: SavedPrediction[]) {
  const groups: Record<string, { label: string; preds: SavedPrediction[] }> = {};
  predictions.forEach((p) => {
    const date = new Date(p.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7)); // Monday
    const key = weekStart.toISOString().split('T')[0];
    if (!groups[key]) {
      groups[key] = {
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        preds: [],
      };
    }
    groups[key].preds.push(p);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // newest first
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { stats } = useUserStats();
  const level = getLevel(stats.totalPoints);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const recentPreds = useMemo(
    () =>
      stats.predictions
        .filter((p) => new Date(p.timestamp).getTime() >= sevenDaysAgo)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [stats.predictions],
  );

  const olderPreds = useMemo(
    () => stats.predictions.filter((p) => new Date(p.timestamp).getTime() < sevenDaysAgo),
    [stats.predictions],
  );

  const olderWeeklyGroups = useMemo(() => groupPredictionsByWeek(olderPreds), [olderPreds]);

  const avgPts = stats.totalPredictions > 0
    ? Math.round(stats.totalPoints / stats.totalPredictions)
    : 0;
  const maxPts = stats.predictions.reduce((m, p) => Math.max(m, p.points), 0);

  const recentWinRate = useMemo(() => {
    if (recentPreds.length === 0) return null;
    const avgConf = recentPreds.reduce((s, p) => s + p.confidence, 0) / recentPreds.length;
    return Math.round(avgConf * 100);
  }, [recentPreds]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Level + Points header ── */}
      <View style={styles.headerCard}>
        <Text style={styles.levelIcon}>{LEVEL_ICONS[level]}</Text>
        <Text style={styles.levelName}>{level}</Text>
        <Text style={styles.totalPts}>{stats.totalPoints} pts</Text>
        <View style={styles.progressSection}>
          <LevelProgress totalPoints={stats.totalPoints} />
        </View>
      </View>

      {/* ── Stat grid ── */}
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
          <Text style={styles.statVal}>{maxPts}</Text>
          <Text style={styles.statLabel}>Best pts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: COLORS.primary }]}>
            {recentWinRate !== null ? `${recentWinRate}%` : '—'}
          </Text>
          <Text style={styles.statLabel}>Avg conf</Text>
        </View>
      </View>

      {/* ── Growth chart ── */}
      {stats.predictions.length >= 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Curve</Text>
          <Text style={styles.sectionSub}>Cumulative points over time</Text>
          <GrowthChart predictions={stats.predictions} />
        </View>
      )}

      {/* ── Last 7 days ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        {recentPreds.length === 0 ? (
          <Text style={styles.emptyText}>No predictions in the last 7 days.</Text>
        ) : (
          <>
            <View style={styles.weekSummaryRow}>
              <Text style={styles.weekSummaryLabel}>
                {recentPreds.length} prediction{recentPreds.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.weekSummaryPts}>
                +{recentPreds.reduce((s, p) => s + p.points, 0)} pts
              </Text>
            </View>
            {recentPreds.map((p, i) => (
              <View key={i} style={styles.predRow}>
                <View style={styles.predLeft}>
                  <Text style={styles.predMatch}>
                    {p.homeName} vs {p.awayName}
                  </Text>
                  <Text style={styles.predScore}>
                    Predicted: {p.predictedHome} – {p.predictedAway}
                    {p.keyPlayer ? ` · ⭐ ${p.keyPlayer.name}` : ''}
                  </Text>
                  <Text style={styles.predDate}>
                    {new Date(p.timestamp).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.predPtsBadge}>
                  <Text style={styles.predPtsVal}>+{p.points}</Text>
                  <Text style={styles.predPtsLabel}>pts</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {/* ── Older weeks (summary only) ── */}
      {olderWeeklyGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Weeks</Text>
          {olderWeeklyGroups.map(([key, { label, preds }]) => {
            const weekPts = preds.reduce((s, p) => s + p.points, 0);
            return (
              <View key={key} style={styles.weekRow}>
                <View>
                  <Text style={styles.weekLabel}>Week of {label}</Text>
                  <Text style={styles.weekCount}>{preds.length} predictions</Text>
                </View>
                <Text style={[styles.weekPts, weekPts >= 0 ? styles.ptsPosi : styles.ptsNeg]}>
                  {weekPts >= 0 ? '+' : ''}{weekPts} pts
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {stats.predictions.length === 0 && (
        <View style={styles.noData}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataText}>
            No predictions yet. Go simulate a match and save your first prediction!
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
  statVal: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },

  section: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  sectionSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: -4 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  weekSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekSummaryLabel: { color: COLORS.textSecondary, fontSize: 12 },
  weekSummaryPts: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  predRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  predLeft: { flex: 1, gap: 2 },
  predMatch: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  predScore: { color: COLORS.textSecondary, fontSize: 11 },
  predDate: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  predPtsBadge: {
    backgroundColor: COLORS.primary + '22', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
    minWidth: 48, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  predPtsVal: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  predPtsLabel: { color: COLORS.primary, fontSize: 9, fontWeight: '600' },

  weekRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  weekLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  weekCount: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  weekPts: { fontSize: 15, fontWeight: '800' },
  ptsPosi: { color: COLORS.primary },
  ptsNeg: { color: '#f85149' },

  noData: { alignItems: 'center', padding: 40, gap: 12 },
  noDataIcon: { fontSize: 48 },
  noDataText: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20,
  },
});
