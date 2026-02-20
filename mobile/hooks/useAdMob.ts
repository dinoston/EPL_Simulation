/**
 * AdMob 전면/보상 광고 훅
 *
 * react-native-google-mobile-ads 설치 후 활성화:
 * npx expo install react-native-google-mobile-ads
 */

// TODO: AdMob 설정 후 아래 코드로 교체
//
// import { useEffect, useRef } from 'react';
// import {
//   InterstitialAd,
//   RewardedAd,
//   AdEventType,
//   RewardedAdEventType,
//   TestIds,
// } from 'react-native-google-mobile-ads';
// import { ADMOB_IDS } from '../constants/config';
//
// export function useAdMob() {
//   const interstitial = useRef(
//     InterstitialAd.createForAdRequest(__DEV__ ? TestIds.INTERSTITIAL : ADMOB_IDS.INTERSTITIAL)
//   );
//   const rewarded = useRef(
//     RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : ADMOB_IDS.REWARDED)
//   );
//
//   useEffect(() => {
//     interstitial.current.load();
//     rewarded.current.load();
//   }, []);
//
//   const showInterstitial = () => {
//     if (interstitial.current.loaded) interstitial.current.show();
//   };
//
//   const showRewarded = (onEarned: () => void) => {
//     const sub = rewarded.current.addAdEventListener(
//       RewardedAdEventType.EARNED_REWARD,
//       () => { onEarned(); sub(); }
//     );
//     if (rewarded.current.loaded) rewarded.current.show();
//   };
//
//   return { showInterstitial, showRewarded };
// }

export function useAdMob() {
  // 개발 중 더미 구현
  const showInterstitial = () => {
    if (__DEV__) console.log('[AdMob] Interstitial 광고 표시 (개발 모드)');
  };

  const showRewarded = (onEarned: () => void) => {
    if (__DEV__) {
      console.log('[AdMob] Rewarded 광고 표시 (개발 모드)');
      // 개발 중에는 즉시 보상 지급
      setTimeout(onEarned, 500);
    }
  };

  return { showInterstitial, showRewarded };
}
