// mobile/theme/primitives/Box.tsx
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../ThemeProvider';

type Align = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
type Justify =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
type Direction = 'row' | 'row-reverse' | 'column' | 'column-reverse';

export function Box({
  bg = 'surface',
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  mt,
  mb,
  ml,
  mr,
  m,
  mx,
  my,
  gap,
  rounded,
  borderWidth,
  borderColor = 'hairline',
  align,
  justify,
  direction = 'column',
  flex,
  style,
  children,
  ...rest
}: {
  bg?: keyof ReturnType<typeof useTheme>['palette'] | string;
  p?: number;
  px?: number;
  py?: number;
  pt?: number;
  pb?: number;
  pl?: number;
  pr?: number;
  mt?: number;
  mb?: number;
  ml?: number;
  mr?: number;
  m?: number;
  mx?: number;
  my?: number;
  gap?: number;
  rounded?: keyof ReturnType<typeof useTheme>['radius'] | number;
  borderWidth?: number;
  borderColor?: keyof ReturnType<typeof useTheme>['palette'] | string;
  align?: Align;
  justify?: Justify;
  direction?: Direction;
  flex?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const radiusVal =
    typeof rounded === 'number'
      ? rounded
      : rounded
      ? t.radius[rounded]
      : undefined;
  return (
    <View
      {...(rest as any)}
      style={[
        {
          backgroundColor: (t.palette as any)[bg] ?? bg,
          padding: p,
          paddingHorizontal: px,
          paddingVertical: py,
          paddingTop: pt,
          paddingBottom: pb,
          paddingLeft: pl,
          paddingRight: pr,
          margin: m,
          marginHorizontal: mx,
          marginVertical: my,
          marginTop: mt,
          marginBottom: mb,
          marginLeft: ml,
          marginRight: mr,
          gap,
          borderRadius: radiusVal,
          borderWidth,
          borderColor: borderWidth
            ? (t.palette as any)[borderColor] ?? borderColor
            : undefined,
          alignItems: align as any,
          justifyContent: justify as any,
          flexDirection: direction as any,
          flex,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}