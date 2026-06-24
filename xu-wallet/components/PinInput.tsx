// components/PinInput.tsx
import React, { useCallback } from 'react';
import { View, Pressable, Text, Vibration, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../mobile/theme/ThemeProvider';

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
  error?: boolean;
}

export function PinInput({ value, onChange, length = 6, onComplete, error }: Props) {
  const t = useTheme();
  const shake = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shake]);

  const press = useCallback(
    (digit: string) => {
      if (value.length >= length) return;
      const next = value + digit;
      onChange(next);
      if (next.length === length) {
        Vibration.vibrate(8);
        onComplete?.(next);
      }
    },
    [value, length, onChange, onComplete]
  );

  const back = useCallback(() => {
    if (!value.length) return;
    onChange(value.slice(0, -1));
  }, [value, onChange]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={{ flexDirection: 'row', gap: 14, marginBottom: 32, transform: [{ translateX: shake }] }}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: error ? t.palette.danger : filled ? t.palette.rustox : t.palette.hairline,
                backgroundColor: filled
                  ? error
                    ? t.palette.danger
                    : t.palette.rustox
                  : 'transparent',
              }}
            />
          );
        })}
      </Animated.View>

      <View style={{ width: 280 }}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', '⌫'],
        ].map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((d, j) => {
              if (!d) return <View key={j} style={styles.keyPlaceholder} />;
              const isBack = d === '⌫';
              return (
                <Pressable
                  key={j}
                  onPress={() => (isBack ? back() : press(d))}
                  accessibilityLabel={isBack ? 'Backspace' : `Digit ${d}`}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: pressed ? t.palette.elevated : t.palette.surface,
                      borderColor: t.palette.hairline,
                    },
                  ]}
                >
                  <Text style={{ color: t.palette.text, fontSize: 26, fontWeight: '600' }}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyPlaceholder: { width: 72, height: 72 },
});