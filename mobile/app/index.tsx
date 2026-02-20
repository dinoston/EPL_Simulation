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
import { FixtureCard } from '../components/FixtureCard';
import { BannerAd } from '../components/ads/BannerAd';
import { COLORS } from '../constants/config';
import type { Fixture } from '../types/fixture';

export default function HomeScreen() {
  const { fixtures, loading, error, date, refetch } = useFixtures();
  const router = useRouter();

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
        <Text style={styles.loadingText}>경기 일정 불러오는 중...</Text>
      </View>
    );
  }

  if (error && fixtures.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>다시 시도</Text>
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
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.dateLabel}>
              {date ? `${date} EPL 경기` : 'EPL 경기 일정'}
            </Text>
            {fixtures.length === 0 && !loading && (
              <Text style={styles.noMatch}>오늘 예정된 경기가 없습니다</Text>
            )}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  noMatch: {
    color: COLORS.text,
    fontSize: 16,
    marginTop: 8,
  },
});
