import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useTheme } from '@/ui/hooks/use-theme';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const LOGO_SPLASH = require('@/assets/brand/kampus-marca-blanco.png');
const LOGO_CLARO = require('@/assets/brand/kampus-marca-blanco.png');
const LOGO_OSCURO = require('@/assets/brand/kampus-marca.png');

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const reducirMovimiento = useReducedMotion();

  if (!visible) return null;

  const image = <Image style={styles.splashImage} source={LOGO_SPLASH} contentFit="contain" />;

  if (reducirMovimiento) {
    return (
      <View
        onLayout={() => {
          SplashScreen.hideAsync().finally(() => setVisible(false));
        }}
        style={styles.splashOverlay}>
        {image}
      </View>
    );
  }

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

export function AnimatedIcon() {
  const theme = useTheme();
  const oscuro = useColorScheme() === 'dark';
  const reducirMovimiento = useReducedMotion();

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        entering={reducirMovimiento ? undefined : keyframe.duration(DURATION)}
        style={[styles.background, { backgroundColor: theme.primary }]}
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
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 76,
  },
  background: {
    borderRadius: 34,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  splashImage: {
    width: 120,
    height: 120,
  },
});
