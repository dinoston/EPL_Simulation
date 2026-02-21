import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePrediction } from '../../hooks/usePrediction';
import { useAdMob } from '../../hooks/useAdMob';
import { PredictionResult } from '../../components/PredictionResult';
import { ConfidenceBar } from '../../components/ConfidenceBar';
import { FatigueIndicator } from '../../components/FatigueIndicator';
import { COLORS } from '../../constants/config';
import type { Fixture } from '../../types/fixture';

type RedCardTeam = 'none' | 'home' | 'away';

export default function PredictionScreen() {
  const params = useLocalSearchParams<{
    fixtureId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeName: string;
    awayName: string;
    homeLogo: string;
    awayLogo: string;
    kickoff: string;
  }>();

  const { showInterstitial, showRewarded } = useAdMob();
  const [expertUnlocked, setExpertUnlocked] = useState(false);

  // Which team user has selected for red card (not yet applied)
  const [selectedRedCard, setSelectedRedCard] = useState<RedCardTeam>('none');
  // Which red card is actually being simulated
  const [appliedRedCard, setAppliedRedCard] = useState<RedCardTeam>('none');

  const { prediction, loading, error } = usePrediction(
    Number(params.fixtureId),
    Number(params.homeTeamId),
    Number(params.awayTeamId),
    appliedRedCard === 'home',
    appliedRedCard === 'away',
  );

  // Show interstitial ad on initial load only
  useEffect(() => {
    if (prediction && !loading && appliedRedCard === 'none') {
      showInterstitial();
    }
  }, [prediction, loading]);

  function handleRunRedCardSim() {
    // Show ad, then apply red card and rerun simulation
    showInterstitial();
    setAppliedRedCard(selectedRedCard);
  }

  const fixture: Fixture = {
    id: Number(params.fixtureId),
    date: params.kickoff ?? '',
    status: 'NS',
    venue: '',
    home: {
      id: Number(params.homeTeamId),
      name: params.homeName ?? 'Home',
      logo: params.homeLogo ?? '',
      winner: null,
    },
    away: {
      id: Number(params.awayTeamId),
      name: params.awayName ?? 'Away',
      logo: params.awayLogo ?? '',
      winner: null,
    },
    score: { home: null, away: null },
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>
          {appliedRedCard !== 'none' ? '🟥 Red Card Simulation' : 'Running Simulation'}
        </Text>
        <Text style={styles.loadingDesc}>Simulating 10,000 matches...</Text>
        <Text style={styles.teams}>
          {params.homeName} vs {params.awayName}
        </Text>
      </View>
    );
  }

  if (error || !prediction) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚽</Text>
        <Text style={styles.errorText}>{error ?? 'Failed to load prediction.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active red card banner */}
      {appliedRedCard !== 'none' && (
        <View style={styles.redCardBanner}>
          <Text style={styles.redCardBannerText}>
            🟥 Red Card Applied: {appliedRedCard === 'home' ? params.homeName : params.awayName}
          </Text>
        </View>
      )}

      {/* Main prediction result */}
      <PredictionResult prediction={prediction} fixture={fixture} />

      {/* Red Card Scenario */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🟥 Red Card Scenario</Text>
        <Text style={styles.redCardHint}>Select a team, then run to see the impact</Text>

        {/* Team toggle */}
        <View style={styles.redCardRow}>
          <TouchableOpacity
            style={[styles.redCardBtn, selectedRedCard === 'home' && styles.redCardBtnActive]}
            onPress={() => setSelectedRedCard(selectedRedCard === 'home' ? 'none' : 'home')}
          >
            <Text style={styles.redCardIcon}>🟥</Text>
            <Text style={[styles.redCardBtnText, selectedRedCard === 'home' && styles.redCardBtnTextActive]}>
              {params.homeName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.redCardBtn, selectedRedCard === 'away' && styles.redCardBtnActive]}
            onPress={() => setSelectedRedCard(selectedRedCard === 'away' ? 'none' : 'away')}
          >
            <Text style={styles.redCardIcon}>🟥</Text>
            <Text style={[styles.redCardBtnText, selectedRedCard === 'away' && styles.redCardBtnTextActive]}>
              {params.awayName}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Run button */}
        <TouchableOpacity
          style={[
            styles.runRedCardBtn,
            selectedRedCard === 'none' && styles.runRedCardBtnDisabled,
          ]}
          onPress={handleRunRedCardSim}
          disabled={selectedRedCard === 'none'}
        >
          <Text style={styles.runRedCardBtnText}>
            {selectedRedCard === 'none'
              ? 'Select a team above'
              : `▶ Run Red Card Simulation`}
          </Text>
        </TouchableOpacity>

        {appliedRedCard !== 'none' && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setSelectedRedCard('none'); setAppliedRedCard('none'); }}
          >
            <Text style={styles.resetBtnText}>↩ Back to Normal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Confidence bar */}
      <View style={styles.card}>
        <ConfidenceBar value={prediction.confidence} />
      </View>

      {/* Fatigue indicator */}
      <FatigueIndicator
        home={prediction.fatigue.home}
        away={prediction.fatigue.away}
        homeName={fixture.home.name}
        awayName={fixture.away.name}
      />

      {/* Team stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Team Stats</Text>
        <View style={styles.statsRow}>
          <StatBlock label="Attack" homeVal={prediction.team_stats.home.attack} awayVal={prediction.team_stats.away.attack} />
          <StatBlock label="Def. Weakness" homeVal={prediction.team_stats.home.defense_weakness} awayVal={prediction.team_stats.away.defense_weakness} />
          <StatBlock
            label="Recent Form"
            homeVal={Math.round(prediction.team_stats.home.form * 100) / 100}
            awayVal={Math.round(prediction.team_stats.away.form * 100) / 100}
          />
        </View>
      </View>

      {/* Expert analysis (rewarded ad unlock) */}
      {!expertUnlocked ? (
        <TouchableOpacity
          style={styles.expertBtn}
          onPress={() => showRewarded(() => setExpertUnlocked(true))}
        >
          <Text style={styles.expertBtnIcon}>🔒</Text>
          <Text style={styles.expertBtnText}>Watch Ad to Unlock Expert Analysis</Text>
          <Text style={styles.expertBtnSub}>Injured players, H2H record, AI insights</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.expertCard}>
          <Text style={styles.cardTitle}>Expert Analysis</Text>
          <Text style={styles.expertContent}>
            • Home advantage factor: 1.15x{'\n'}
            • Simulations: {prediction.simulations.toLocaleString()}{'\n'}
            • Cache: {prediction.cached ? 'Cached' : 'Live'}{'\n'}
            • Home xG: {prediction.expected_goals.home}{'\n'}
            • Away xG: {prediction.expected_goals.away}
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatBlock({ label, homeVal, awayVal }: { label: string; homeVal: number; awayVal: number }) {
  const homeColor = homeVal >= awayVal ? COLORS.primary : COLORS.textSecondary;
  const awayColor = awayVal > homeVal ? COLORS.primary : COLORS.textSecondary;
  return (
    <View style={statStyles.block}>
      <Text style={[statStyles.val, { color: homeColor }]}>{homeVal.toFixed(2)}</Text>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.val, { color: awayColor }]}>{awayVal.toFixed(2)}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  block: { alignItems: 'center', flex: 1, gap: 4 },
  val: { fontSize: 16, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 8 },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  loadingDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  teams: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  errorIcon: { fontSize: 40 },
  errorText: {
    color: COLORS.text,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  redCardBanner: {
    backgroundColor: '#f85149' + '22',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f85149' + '55',
    marginBottom: 4,
  },
  redCardBannerText: {
    color: '#f85149',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  redCardHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 10,
  },
  redCardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  redCardBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  redCardBtnActive: {
    borderColor: '#f85149',
    backgroundColor: '#f85149' + '22',
  },
  redCardIcon: {
    fontSize: 14,
  },
  redCardBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  redCardBtnTextActive: {
    color: '#f85149',
  },
  runRedCardBtn: {
    backgroundColor: '#f85149',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  runRedCardBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  runRedCardBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    alignItems: 'center',
    marginTop: 8,
  },
  resetBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  expertBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
    gap: 6,
    marginVertical: 4,
  },
  expertBtnIcon: { fontSize: 28 },
  expertBtnText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  expertBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  expertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    marginVertical: 4,
  },
  expertContent: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
