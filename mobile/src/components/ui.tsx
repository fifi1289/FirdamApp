import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius } from '@/theme';

/** Text in Firdam's font. Pick a weight with `weight`. */
export function T({
  children,
  weight = 'regular',
  size = 15,
  color = colors.espresso,
  style,
  ...rest
}: {
  children: ReactNode;
  weight?: keyof typeof fonts;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}) {
  return (
    <Text style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        isPrimary && { backgroundColor: colors.walnut },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.sand },
        variant === 'text' && { height: 44 },
        (pressed || disabled) && { opacity: 0.75 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.walnut} />
      ) : (
        <T weight="bold" size={isPrimary ? 17 : 15} color={isPrimary ? colors.white : colors.walnut}>
          {label}
        </T>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<TextInput, TextInputProps & { label: string }>(function Field({ label, style, ...props }, ref) {
  return (
    <View style={{ gap: 6 }}>
      <T weight="semibold" size={14}>
        {label}
      </T>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor="#9C8D84"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
});

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.espresso,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 16,
  },
});
