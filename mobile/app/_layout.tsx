import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/config';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'EPL Predictor', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="prediction/[fixtureId]"
          options={{ title: '경기 예측' }}
        />
        <Stack.Screen
          name="simulation/[fixtureId]"
          options={{
            title: '경기 시뮬레이션',
            headerStyle: { backgroundColor: '#0d2e0a' },
          }}
        />
      </Stack>
    </>
  );
}
