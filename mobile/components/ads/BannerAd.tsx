import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/config';

/**
 * 배너 광고 컴포넌트
 * react-native-google-mobile-ads 설치 후 아래 주석 해제
 *
 * 설치: npx expo install react-native-google-mobile-ads
 * app.json의 plugins 섹션에 AdMob App ID 추가 필요
 */

// TODO: AdMob 설정 후 아래 코드로 교체
// import { BannerAd as AdMobBanner, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
// import { ADMOB_IDS } from '../../constants/config';
//
// export function BannerAd() {
//   return (
//     <AdMobBanner
//       unitId={__DEV__ ? TestIds.BANNER : ADMOB_IDS.BANNER}
//       size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
//       requestOptions={{ requestNonPersonalizedAdsOnly: true }}
//     />
//   );
// }

export function BannerAd() {
  // 개발 중 플레이스홀더
  if (!__DEV__) return null;
  return (
    <View style={styles.placeholder}>
      <Text style={styles.text}>📢 광고 영역 (AdMob 연동 후 활성화)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 60,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
