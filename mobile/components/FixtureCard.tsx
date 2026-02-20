import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';
import type { Fixture } from '../types/fixture';

interface Props {
  fixture: Fixture;
  onPress: () => void;
  onSimulationPress: () => void;
}

function formatKickoffTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  });
}

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'NS': return { label: '예정', color: COLORS.accent };
    case 'LIVE':
    case '1H':
    case '2H':
    case 'HT': return { label: '진행 중', color: COLORS.danger };
    case 'FT': return { label: '종료', color: COLORS.textSecondary };
    default: return { label: status, color: COLORS.textSecondary };
  }
}

export function FixtureCard({ fixture, onPress, onSimulationPress }: Props) {
  const kickoff = formatKickoffTime(fixture.date);
  const dateLabel = formatDate(fixture.date);
  const badge = getStatusBadge(fixture.status);
  const isScheduled = fixture.status === 'NS';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.matchRow}>
        {/* 홈팀 */}
        <View style={styles.team}>
          <Image source={{ uri: fixture.home.logo }} style={styles.logo} />
          <Text style={styles.teamName} numberOfLines={2}>{fixture.home.name}</Text>
        </View>

        {/* 스코어 / 킥오프 시간 */}
        <View style={styles.centerBlock}>
          {!isScheduled && fixture.score.home !== null ? (
            <>
              <Text style={styles.score}>{fixture.score.home} - {fixture.score.away}</Text>
              <Text style={styles.kickoff}>{kickoff}</Text>
            </>
          ) : (
            <>
              <Text style={styles.versus}>VS</Text>
              <Text style={styles.kickoff}>{kickoff} KST</Text>
            </>
          )}
        </View>

        {/* 원정팀 */}
        <View style={[styles.team, styles.awayTeam]}>
          <Image source={{ uri: fixture.away.logo }} style={styles.logo} />
          <Text style={styles.teamName} numberOfLines={2}>{fixture.away.name}</Text>
        </View>
      </View>

      {isScheduled && (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.simBtn} onPress={onSimulationPress}>
            <Text style={styles.simBtnText}>▶ 시뮬레이션</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.predictBtn} onPress={onPress}>
            <Text style={styles.predictBtnText}>AI 예측 분석</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  awayTeam: {
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  teamName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 80,
  },
  versus: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },
  score: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  kickoff: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  simBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  simBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  predictBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  predictBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
