import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { T } from '@/components/ui';
import { compassWord } from '@/lib/prayer';
import { colors, fonts } from '@/theme';

type Access = 'checking' | 'granted' | 'ask' | 'blocked';

/**
 * Qibla compass. The iPhone compass needs location permission; when it is on,
 * the dial turns with the phone so the arrow points to the Kaaba.
 */
export function QiblaCompass({ bearing, size = 96 }: { bearing: number; size?: number }) {
  const [access, setAccess] = useState<Access>('checking');
  const [heading, setHeading] = useState<number | null>(null);

  const check = useCallback(async () => {
    const p = await Location.getForegroundPermissionsAsync();
    setAccess(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
  }, []);

  useEffect(() => {
    check().catch(() => setAccess('ask'));
  }, [check]);

  useFocusEffect(
    useCallback(() => {
      if (access !== 'granted') return undefined;
      let sub: Location.LocationSubscription | null = null;
      let cancelled = false;
      Location.watchHeadingAsync((h) => {
        const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (value >= 0) setHeading(Math.round(value));
      })
        .then((s) => {
          if (cancelled) s.remove();
          else sub = s;
        })
        .catch(() => setHeading(null));
      return () => {
        cancelled = true;
        sub?.remove();
      };
    }, [access])
  );

  const turnOn = async () => {
    if (access === 'blocked') {
      Linking.openSettings().catch(() => {});
      return;
    }
    const p = await Location.requestForegroundPermissionsAsync();
    setAccess(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
  };

  // Turning the whole dial (a plain view rotation works on every phone).
  const dialTurn = heading === null ? 0 : -heading;
  const diff = heading === null ? 180 : Math.abs(((bearing - heading + 540) % 360) - 180);
  const facing = diff < 5;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <View style={{ width: size, height: size, transform: [{ rotate: `${dialTurn}deg` }] }}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={44} fill={facing ? colors.sageTint : colors.linen} stroke={facing ? colors.sage : colors.sand} strokeWidth={2} />
            <SvgText x={50} y={17} textAnchor="middle" fontSize={10} fill={colors.muted} fontFamily={fonts.semibold}>
              N
            </SvgText>
          </Svg>
        </View>
        <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${dialTurn + bearing}deg` }] }}>
          <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`Qibla ${Math.round(bearing)} degrees ${compassWord(bearing)}`}>
            <Path d="M50 14 L57 50 L50 46 L43 50 Z" fill={facing ? colors.sage : colors.walnut} />
            <Path d="M50 86 L57 50 L50 54 L43 50 Z" fill={colors.sand} />
            <Circle cx={50} cy={50} r={4} fill={colors.espresso} />
          </Svg>
        </View>
      </View>
      <T weight="bold" size={14}>
        {`Qibla ${Math.round(bearing)}° ${compassWord(bearing)}`}
      </T>
      {access === 'granted' ? (
        <T size={12} color={facing ? colors.sageDark : colors.muted} weight={facing ? 'bold' : 'regular'} style={{ textAlign: 'center' }}>
          {heading === null ? 'Hold your phone flat, away from metal' : facing ? 'You are facing the Qibla' : 'Turn until the arrow points up'}
        </T>
      ) : access === 'checking' ? null : (
        <Pressable accessibilityRole="button" onPress={turnOn} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ textAlign: 'center' }}>
            {access === 'blocked' ? 'Allow location in Settings to use the compass' : 'Turn on the compass'}
          </T>
        </Pressable>
      )}
    </View>
  );
}
