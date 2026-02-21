import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';
import type { PredictionResponse } from '../types/prediction';
import type { Fixture } from '../types/fixture';

interface Props {
  prediction: PredictionResponse;
  fixture: Fixture;
}

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={probStyles.block}>
      <Text style={[probStyles.value, { color }]}>{value}%</Text>
      <View style={probStyles.track}>
        <View style={[probStyles.fill, { height: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={probStyles.label}>{label}</Text>
    </View>
  );
}

const probStyles = StyleSheet.create({
  block: { alignItems: 'center', flex: 1 },
  value: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  track: {
    width: 36,
    height: 100,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', borderRadius: 6 },
  label: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6, textAlign: 'center' },
});

export function PredictionResult({ prediction, fixture }: Props) {
  const { predicted_score, probabilities, expected_goals, top_scorelines } = prediction;

  return (
    <View style={styles.container}>
      {/* Team header */}
      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <Image source={{ uri: fixture.home.logo }} style={styles.logo} />
          <Text style={styles.teamName} numberOfLines={2}>{fixture.home.name}</Text>
          <Text style={styles.teamLabel}>Home</Text>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>Predicted Score</Text>
          <Text style={styles.score}>{predicted_score.home} - {predicted_score.away}</Text>
          <Text style={styles.xgText}>
            xG: {expected_goals.home} - {expected_goals.away}
          </Text>
        </View>

        <View style={styles.teamBlock}>
          <Image source={{ uri: fixture.away.logo }} style={styles.logo} />
          <Text style={styles.teamName} numberOfLines={2}>{fixture.away.name}</Text>
          <Text style={styles.teamLabel}>Away</Text>
        </View>
      </View>

      {/* Win/Draw/Loss probability bars */}
      <View style={styles.probSection}>
        <Text style={styles.sectionTitle}>Win Probability</Text>
        <View style={styles.probRow}>
          <ProbBar
            label={`${fixture.home.name}\nHome Win`}
            value={probabilities.home_win}
            color={COLORS.homeWin}
          />
          <ProbBar
            label="Draw"
            value={probabilities.draw}
            color={COLORS.draw}
          />
          <ProbBar
            label={`${fixture.away.name}\nAway Win`}
            value={probabilities.away_win}
            color={COLORS.awayWin}
          />
        </View>
      </View>

      {/* Top scorelines */}
      <View style={styles.scorelineSection}>
        <Text style={styles.sectionTitle}>Top Scorelines</Text>
        <View style={styles.scorelines}>
          {top_scorelines.map((item, i) => (
            <View key={i} style={[styles.scorelineItem, i === 0 && styles.scorelineTop]}>
              <Text style={[styles.scorelineScore, i === 0 && styles.scorelineScoreTop]}>
                {item.score}
              </Text>
              <Text style={styles.scorelineProb}>{item.probability}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 20,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  teamName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  teamLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  scoreBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scoreLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  score: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  xgText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  probSection: {
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  scorelineSection: {
    gap: 12,
  },
  scorelines: {
    gap: 6,
  },
  scorelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scorelineTop: {
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primary + '11',
  },
  scorelineScore: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scorelineScoreTop: {
    color: COLORS.primary,
  },
  scorelineProb: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
