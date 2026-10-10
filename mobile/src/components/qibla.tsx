import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { T } from '@/components/ui';
import { compassWord } from '@/lib/prayer';
import { colors, fonts } from '@/theme';

/**
 * Qibla compass. Uses the phone's compass while the screen is open; without one
 * it shows a fixed dial with north at the top.
 */
export function QiblaCompass({ bearing, size = 96 }: { bearing: number; size?: number }) {
  const [heading, setHeading] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let sub: Location.LocationSubscription | null = null;
      let cancelled = false;
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => {
          if (status !== 'granted' || cancelled) return null;
          return Location.watchHeadingAsync((h) => {
            const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
            setHeading(Math.round(value));
          });
        })
        .then((s) => {
          if (s && cancelled) s.remove();
          else sub = s;
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        sub?.remove();
      };
    }, [])
  );

  // The dial turns with the phone so the arrow points to the Kaaba.
  const dial = heading === null ? 0 : -heading;
  const facing = heading !== null && Math.abs(((bearing - heading + 540) % 360) - 180) < 5;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`Qibla ${Math.round(bearing)} degrees ${compassWord(bearing)}`}>
        <Circle cx={50} cy={50} r={44} fill={facing ? colors.sageTint : colors.linen} stroke={facing ? colors.sage : colors.sand} strokeWidth={2} />
        <G rotation={dial} origin="50, 50">
          <SvgText x={50} y={17} textAnchor="middle" fontSize={10} fill={colors.muted} fontFamily={fonts.semibold}>
            N
          </SvgText>
          <G rotation={bearing} origin="50, 50">
            <Path d="M50 14 L57 50 L50 46 L43 50 Z" fill={facing ? colors.sage : colors.walnut} />
            <Path d="M50 86 L57 50 L50 54 L43 50 Z" fill={colors.sand} />
          </G>
        </G>
        <Circle cx={50} cy={50} r={4} fill={colors.espresso} />
      </Svg>
      <T weight="bold" size={14}>
        {`Qibla ${Math.round(bearing)}° ${compassWord(bearing)}`}
      </T>
      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        {heading === null ? 'Hold your phone flat to use the compass' : facing ? 'You are facing the Qibla' : 'Turn until the arrow points up'}
      </T>
    </View>
  );
}
