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

  const { prediction, loading, error } = usePrediction(
    Number(params.fixtureId),
    Number(params.homeTeamId),
    Number(params.awayTeamId),
  );

  // 예측 결과 로드 시 전면 광고 표시
  useEffect(() => {
    if (prediction && !loading) {
      showInterstitial();
    }
  }, [prediction, loading]);

  // 실제 경기 데이터처럼 보이도록 더미 fixture 생성 (params에서 복원)
  const fixture: Fixture = {
    id: Number(params.fixtureId),
    date: params.kickoff ?? '',
    status: 'NS',
    venue: '',
    home: {
      id: Number(params.homeTeamId),
      name: params.homeName ?? '홈팀',
      logo: params.homeLogo ?? '',
      winner: null,
    },
    away: {
      id: Number(params.awayTeamId),
      name: params.awayName ?? '원정팀',
      logo: params.awayLogo ?? '',
      winner: null,
    },
    score: { home: null, away: null },
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>시뮬레이션 실행 중</Text>
        <Text style={styles.loadingDesc}>10,000번 경기를 시뮬레이션하는 중입니다...</Text>
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
        <Text style={styles.errorText}>{error ?? '예측을 불러오지 못했습니다.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* 예측 결과 메인 */}
      <PredictionResult prediction={prediction} fixture={fixture} />

      {/* 신뢰도 바 */}
      <View style={styles.card}>
        <ConfidenceBar value={prediction.confidence} />
      </View>

      {/* 피로도 인디케이터 */}
      <FatigueIndicator
        home={prediction.fatigue.home}
        away={prediction.fatigue.away}
        homeName={fixture.home.name}
        awayName={fixture.away.name}
      />

      {/* 팀 스탯 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>팀 능력치 분석</Text>
        <View style={styles.statsRow}>
          <StatBlock label="공격력" homeVal={prediction.team_stats.home.attack} awayVal={prediction.team_stats.away.attack} />
          <StatBlock label="수비 취약성" homeVal={prediction.team_stats.home.defense_weakness} awayVal={prediction.team_stats.away.defense_weakness} />
          <StatBlock
            label="최근 폼"
            homeVal={Math.round(prediction.team_stats.home.form * 100) / 100}
            awayVal={Math.round(prediction.team_stats.away.form * 100) / 100}
          />
        </View>
      </View>

      {/* 전문가 분석 (보상형 광고 잠금 해제) */}
      {!expertUnlocked ? (
        <TouchableOpacity
          style={styles.expertBtn}
          onPress={() => showRewarded(() => setExpertUnlocked(true))}
        >
          <Text style={styles.expertBtnIcon}>🔒</Text>
          <Text style={styles.expertBtnText}>광고 시청 후 전문가 분석 열기</Text>
          <Text style={styles.expertBtnSub}>부상 선수, 역대 상대전적, AI 코멘트</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.expertCard}>
          <Text style={styles.cardTitle}>전문가 분석</Text>
          <Text style={styles.expertContent}>
            • 홈 어드밴티지 계수: 1.15x{'\n'}
            • 시뮬레이션 횟수: {prediction.simulations.toLocaleString()}회{'\n'}
            • 캐시 여부: {prediction.cached ? '캐시 데이터' : '실시간 계산'}{'\n'}
            • 홈팀 xG: {prediction.expected_goals.home}{'\n'}
            • 원정팀 xG: {prediction.expected_goals.away}
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
    marginBottom: 12,
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
