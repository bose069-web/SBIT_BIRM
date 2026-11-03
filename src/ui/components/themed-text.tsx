import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/ui/theme/theme';
import { useTheme } from '@/ui/hooks/use-theme';
import { traducirHijos } from '@/ui/utils/idioma';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  // Los textos fijos salen en el idioma de la app (ver traducirHijos).
  return (
    <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest}>
      {traducirHijos(children)}
    </Text>
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.semibold,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontFamily: FontFamily.semibold,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontFamily: FontFamily.semibold,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
