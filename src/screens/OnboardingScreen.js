import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Dimensions, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⊙',
    title: 'ابحث عن مساحتك',
    body: 'اكتشف الكافيهات القريبة منك وشوف المقاعد الفارغة قبل ما تطلع من البيت',
  },
  {
    icon: '◫',
    title: 'احجز بثلاث خطوات',
    body: 'اختر التاريخ والوقت ونوع المقعد — الكافيه يوافق وتوصلك إشعار فوراً',
  },
  {
    icon: '♥',
    title: 'احفظ مفضلاتك',
    body: 'أضف الكافيهات اللي تعجبك للمفضلة وارجع إليها بضغطة واحدة في أي وقت',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef(null);

  function goTo(index) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrent(index);
  }

  async function finish() {
    await AsyncStorage.setItem('hasSeenOnboarding', '1');
    onDone();
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={finish}>
        <Text style={styles.skipText}>تخطى</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        {current < SLIDES.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => goTo(current + 1)}>
            <Text style={styles.nextBtnText}>التالي</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startBtn} onPress={finish}>
            <Text style={styles.startBtnText}>ابدأ الاستكشاف</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  skipBtn: { position: 'absolute', top: 56, left: spacing.lg, zIndex: 10 },
  skipText: { fontSize: 13, color: colors.textMuted },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primaryGlow, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  icon:  { fontSize: 52, color: colors.primary },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  body:  { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: 48 },
  nextBtn:  { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  startBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  startBtnText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
