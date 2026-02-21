import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFixtures } from '../hooks/useFixtures';
import { useUserStats } from '../hooks/useUserStats';
import { FixtureCard } from '../components/FixtureCard';
import { BannerAd } from '../components/ads/BannerAd';
import { COLORS } from '../constants/config';
import { getLevel, getNextLevelPoints, LEVEL_ICONS } from '../types/user';
import type { Fixture } from '../types/fixture';

export default function HomeScreen() {
  const { fixtures, loading, error, date, refetch } = useFixtures();
  const { stats } = useUserStats();
  const router = useRouter();

  const level = getLevel(stats.totalPoints);
  const { next, needed } = getNextLevelPoints(stats.totalPoints);

  const sharedParams = (fixture: Fixture) => ({
    fixtureId: String(fixture.id),
    homeTeamId: String(fixture.home.id),
    awayTeamId: String(fixture.away.id),
    homeName: fixture.home.name,
    awayName: fixture.away.name,
    homeLogo: fixture.home.logo,
    awayLogo: fixture.away.logo,
    kickoff: fixture.date,
  });

  function handleFixturePress(fixture: Fixture) {
    router.push({ pathname: '/prediction/[fixtureId]', params: sharedParams(fixture) });
  }

  function handleSimulationPress(fixture: Fixture) {
    router.push({ pathname: '/simulation/[fixtureId]', params: sharedParams(fixture) });
  }

  if (loading && fixtures.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading fixtures...</Text>
      </View>
    );
  }

  if (error && fixtures.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={fixtures}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FixtureCard
            fixture={item}
            onPress={() => handleFixturePress(item)}
            onSimulationPress={() => handleSimulationPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* User level badge */}
            <TouchableOpacity style={styles.levelCard} onPress={() => router.push('/stats')}>
              <View style={styles.levelLeft}>
                <Text style={styles.levelIcon}>{LEVEL_ICONS[level]}</Text>
                <View>
                  <Text style={styles.levelTitle}>{level}</Text>
                  <Text style={styles.levelPts}>{stats.totalPoints} pts · {stats.totalPredictions} predictions</Text>
                </View>
              </View>
              {next ? (
                <Text style={styles.levelNext}>{needed} pts to {next}</Text>
              ) : (
                <Text style={styles.levelNext}>View Stats →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.dateLabel}>
                {date ? `${date} EPL Matches` : 'EPL Schedule'}
              </Text>
              {fixtures.length === 0 && !loading && (
                <Text style={styles.noMatch}>No matches scheduled today</Text>
              )}
            </View>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
        contentContainerStyle={styles.list}
      />
      <BannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingBottom: 16 },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
  errorIcon: { fontSize: 40 },
  errorText: { color: COLORS.text, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#000', fontWeight: '700', fontSize: 14 },

  // Level card
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelIcon: { fontSize: 28 },
  levelTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  levelPts: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  levelNext: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },

  header: { paddingHorizontal: 16, paddingVertical: 12 },
  dateLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  noMatch: { color: COLORS.text, fontSize: 16, marginTop: 8 },
});
