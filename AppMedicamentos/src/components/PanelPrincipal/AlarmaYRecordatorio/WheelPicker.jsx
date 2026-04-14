import React, { useRef, useCallback, useEffect, memo } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const VISIBLE_ITEMS = 5;

const WheelItem = memo(function WheelItem({ label, index, scrollY, itemHeight, isDark }) {
  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const distance = Math.abs(scrollY.value - index * itemHeight);
    const scale = interpolate(
      distance,
      [0, itemHeight, itemHeight * 2],
      [1, 0.82, 0.64],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      distance,
      [0, itemHeight, itemHeight * 2],
      [1, 0.52, 0.22],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View
      style={[{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }, animStyle]}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          letterSpacing: 0.5,
          color: isDark ? '#e2e8f0' : '#1e293b',
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
});

export default function WheelPicker({
  data,
  onValueChange,
  itemHeight = 52,
  selectedIndex = 0,
  isDark = false,
}) {
  const scrollY = useSharedValue(selectedIndex * itemHeight);
  const scrollRef = useRef(null);

  // Refs siempre actualizados → el worklet nunca tiene un closure viejo
  const dataRef = useRef(data);
  const onValueChangeRef = useRef(onValueChange);
  dataRef.current = data;
  onValueChangeRef.current = onValueChange;

  // Función estable (sin deps) que lee desde refs → scrollHandler nunca se recrea
  const stableSnap = useCallback((idx) => {
    const d = dataRef.current;
    const safeIdx = Math.max(0, Math.min(idx, d.length - 1));
    onValueChangeRef.current(d[safeIdx], safeIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      'worklet';
      const idx = Math.round(event.contentOffset.y / itemHeight);
      runOnJS(stableSnap)(idx);
    },
    onEndDrag: (event) => {
      'worklet';
      const idx = Math.round(event.contentOffset.y / itemHeight);
      runOnJS(stableSnap)(idx);
    },
  });

  useEffect(() => {
    const y = selectedIndex * itemHeight;
    scrollY.value = y;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const padding = Math.floor(VISIBLE_ITEMS / 2) * itemHeight;
  const containerHeight = VISIBLE_ITEMS * itemHeight;

  return (
    <View style={{ height: containerHeight, width: 72 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: padding,
          left: 0,
          right: 0,
          height: itemHeight,
          borderTopWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: '#667eea',
          zIndex: 10,
        }}
      />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: padding }}
        removeClippedSubviews={false}
      >
        {data.map((item, index) => (
          <WheelItem
            key={item}
            label={item}
            index={index}
            scrollY={scrollY}
            itemHeight={itemHeight}
            isDark={isDark}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
