import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';
import type { FatigueInfo } from '../types/prediction';

interface Props {
  home: FatigueInfo;
  away: FatigueInfo;
  homeName: string;
  awayName: string;
}

function fatigueColor(modifier: number): string {
  if (modifier >= 0.95) return '#38d9a9';
  if (modifier >= 0.85) return '#58a6ff';
  if (modifier >= 0.75) return '#e3b341';
  return '#f85149';
}

function FatigueMeter({ label, info, name }: { label: string; info: FatigueInfo; name: string }) {
  const color = fatigueColor(info.modifier);
  const pct = Math.round(info.modifier * 100);

  return (
    <View style={styles.meterBlock}>
      <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
      <View style={styles.meterRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(pct, 105)}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
      </View>
      <Text style={[styles.labelText, { color }]}>{info.label}</Text>
    </View>
  );
}

export function FatigueIndicator({ home, away, homeName, awayName }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>컨디션 / 피로도</Text>
      <View style={styles.row}>
        <FatigueMeter label="홈" info={home} name={homeName} />
        <View style={styles.divider} />
        <FatigueMeter label="원정" info={away} name={awayName} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  meterBlock: {
    flex: 1,
    gap: 6,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  pct: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
});
