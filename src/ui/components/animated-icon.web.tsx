import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe, useReducedMotion } from 'react-native-reanimated';

import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useTheme } from '@/ui/hooks/use-theme';

const DURATION = 300;
const LOGO_CLARO = require('@/assets/brand/kampus-marca-blanco.png');
const LOGO_OSCURO = require('@/assets/brand/kampus-marca.png');

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

export function AnimatedIcon() {
  const theme = useTheme();
  const oscuro = useColorScheme() === 'dark';
  const reducirMovimiento = useReducedMotion();

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[styles.background, { backgroundColor: theme.text }]}
        entering={reducirMovimiento ? undefined : keyframe.duration(DURATION)}
      />
      <Animated.View
        style={styles.imageContainer}
        entering={reducirMovimiento ? undefined : logoKeyframe.duration(DURATION)}>
        <Image
          style={styles.image}
          source={oscuro ? LOGO_OSCURO : LOGO_CLARO}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 76,
  },
  background: {
    width: 128,
    height: 128,
    borderRadius: 34,
    position: 'absolute',
  },
});
