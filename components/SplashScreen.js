import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ onFinish }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, [onFinish, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity, transform: [{ scale }] }]}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>NoteApp</Text>
        <Text style={styles.subtitle}>by TopHat</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    color: '#E3F2FD',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#64B5F6',
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 1,
  },
});
