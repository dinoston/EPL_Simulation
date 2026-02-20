import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

interface Props {
  value: number; // 0.0 ~ 1.0
}

function getColor(value: number): string {
  if (value >= 0.7) return '#38d9a9'; // 초록 (높은 신뢰도)
  if (value >= 0.4) return '#e3b341'; // 노랑 (보통)
  return '#f85149';                    // 빨강 (낮은 신뢰도)
}

function getLabel(value: number): string {
  if (value >= 0.7) return '높음';
  if (value >= 0.4) return '보통';
  return '낮음';
}

export function ConfidenceBar({ value }: Props) {
  const color = getColor(value);
  const label = getLabel(value);
  const pct = Math.round(value * 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.title}>예측 신뢰도</Text>
        <Text style={[styles.pct, { color }]}>{pct}% ({label})</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.hint}>10,000번 시뮬레이션 기반 확률</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
});
