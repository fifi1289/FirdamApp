import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/** Firdam's F leaf mark. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size * 0.85} height={size} viewBox="0 0 34 40" accessibilityLabel="Firdam logo">
      <Path d="M2 40V14C2 6.3 8.3 0 16 0h18c-0.8 6.2-6 11-12.3 11H15c-2.2 0-4 1.8-4 4v25z" fill="#9A5B3E" />
      <Path d="M13 29.5V22c0-4.4 3.6-8 8-8h11c-0.6 4.4-4.4 7.8-8.9 7.8H20c-1.7 0-3 1.3-3 3v2.7c0 1.1-.9 2-2 2z" fill="#B8784F" />
      <Path d="M18 40V31c0-3.3 2.7-6 6-6h0v15z" fill="#D9A27A" />
    </Svg>
  );
}

/** The soft eight-point star used as decoration. */
export function StarPattern({ size, color = colors.sand, strokeWidth = 0.6 }: { size: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x={18} y={18} width={64} height={64} />
      <Rect x={18} y={18} width={64} height={64} transform="rotate(45 50 50)" />
      <Rect x={30} y={30} width={40} height={40} />
      <Rect x={30} y={30} width={40} height={40} transform="rotate(45 50 50)" />
      <Circle cx={50} cy={50} r={12} />
    </Svg>
  );
}

export type IconName =
  | 'today' | 'kitchen' | 'prayer' | 'halal' | 'family' | 'shield' | 'chevron' | 'cart' | 'back'
  | 'qibla' | 'money' | 'recipes' | 'pantry' | 'calendar' | 'quran' | 'fasting' | 'bell' | 'learning' | 'services';

/** Line icons drawn to match the design. */
export function Icon({ name, size = 24, color = colors.walnut, fill = 'none' }: { name: IconName; size?: number; color?: ColorValue; fill?: ColorValue }) {
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'today' && <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={fill} {...common} />}
      {name === 'kitchen' && (
        <>
          <Path d="M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill={fill} {...common} />
          <Path d="M2 11h20M9 7V5M12 7V4M15 7V5" {...common} />
        </>
      )}
      {name === 'prayer' && <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill={fill} {...common} />}
      {name === 'halal' && (
        <>
          <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill={fill} {...common} />
          <Circle cx={12} cy={9.5} r={2.5} {...common} />
        </>
      )}
      {name === 'family' && (
        <>
          <Circle cx={9} cy={8} r={3.2} fill={fill} {...common} />
          <Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill={fill} {...common} />
          <Circle cx={17} cy={9} r={2.5} {...common} />
          <Path d="M15.5 14.2A5 5 0 0 1 21 19" {...common} />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" {...common} />
          <Path d="M9 12l2 2 4-4" {...common} />
        </>
      )}
      {name === 'cart' && (
        <>
          <Path d="M6 6h15l-1.5 9h-12zM6 6 5 3H2" {...common} />
          <Circle cx={9} cy={20} r={1.5} {...common} />
          <Circle cx={18} cy={20} r={1.5} {...common} />
        </>
      )}
      {name === 'qibla' && (
        <>
          <Circle cx={12} cy={12} r={9} fill={fill} {...common} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...common} />
        </>
      )}
      {name === 'money' && (
        <>
          <Circle cx={12} cy={12} r={9} fill={fill} {...common} />
          <Path d="M14.6 9.2C14.1 8.5 13.1 8 12 8c-1.5 0-2.6.8-2.6 1.9 0 2.6 5.2 1.5 5.2 4.2 0 1.1-1.1 1.9-2.6 1.9-1.2 0-2.2-.5-2.7-1.3M12 6.5V8M12 16v1.5" {...common} />
        </>
      )}
      {name === 'recipes' && (
        <>
          <Path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" fill={fill} {...common} />
          <Path d="M12 6.5v13" {...common} />
        </>
      )}
      {name === 'pantry' && (
        <>
          <Path d="M7 8h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill={fill} {...common} />
          <Path d="M8 4h8v4H8zM10 13h4" {...common} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} fill={fill} {...common} />
          <Path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" {...common} />
        </>
      )}
      {name === 'quran' && (
        <>
          <Path d="M12 6.5C10.2 5 7.6 4.5 4 4.5V15c3.6 0 6.2.5 8 2 1.8-1.5 4.4-2 8-2V4.5c-3.6 0-6.2.5-8 2z" fill={fill} {...common} />
          <Path d="M12 6.5V17M5 20.5l7-3.5 7 3.5" {...common} />
        </>
      )}
      {name === 'fasting' && (
        <>
          <Path d="M17.5 12.5A6.5 6.5 0 1 1 9 4.4a5 5 0 0 0 8.5 8.1z" fill={fill} {...common} />
          <Path d="M17 3.5l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" {...common} strokeWidth={1.2} />
          <Path d="M4 20.5h16" {...common} />
        </>
      )}
      {name === 'learning' && (
        <>
          <Path d="M2.5 9 12 4.5 21.5 9 12 13.5z" fill={fill} {...common} />
          <Path d="M6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11M21.5 9v5" {...common} />
        </>
      )}
      {name === 'services' && (
        <>
          <Path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" {...common} />
          <Path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h14a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" fill={fill} {...common} />
          <Path d="M3.5 12.5h17M10.5 12.5v1.5h3v-1.5" {...common} />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" fill={fill} {...common} />
          <Path d="M10 21a2 2 0 0 0 4 0" {...common} />
        </>
      )}
      {name === 'chevron' && <Path d="M9 6l6 6-6 6" {...common} strokeWidth={2} />}
      {name === 'back' && <Path d="M15 6l-6 6 6 6" {...common} strokeWidth={2} />}
    </Svg>
  );
}
