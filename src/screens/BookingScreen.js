import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TIMES = [
  { label: '8:00 ص', available: false },
  { label: '8:30 ص', available: true },
  { label: '9:00 ص', available: true },
  { label: '9:30 ص', available: false },
  { label: '10:00 ص', available: true },
  { label: '10:30 ص', available: false },
  { label: '11:00 ص', available: true },
  { label: '11:30 ص', available: true },
  { label: '12:00 م', available: true },
  { label: '12:30 م', available: true },
  { label: '1:00 م', available: true },
  { label: '1:30 م', available: false },
];

const DURATIONS = [
  { label: 'ساعة', value: 1, sub: '60 دقيقة' },
  { label: 'ساعتان', value: 2, sub: '120 دقيقة' },
  { label: '3 ساعات', value: 3, sub: '180 دقيقة' },
  { label: '+4 ساعات', value: 4, sub: 'جلسة طويلة' },
];

const SEAT_TYPES = [
  { id: 'open', icon: '⬚', label: 'مفتوح', sub: 'طاولة عامة', available: true },
  { id: 'quiet', icon: '◈', label: 'هادئ', sub: 'زاوية معزولة', available: true },
  { id: 'private', icon: '⬡', label: 'خاص', sub: 'غرفة مستقلة', available: true },
  { id: 'podcast', icon: '◉', label: 'بودكاست', sub: 'غير متاح', available: false },
  { id: 'bar', icon: '◌', label: 'بار', sub: 'بجانب المطبخ', available: true },
  { id: 'outdoor', icon: '◎', label: 'خارجي', sub: 'تراس مفتوح', available: true },
];

export default function BookingScreen({ route, navigation }) {
  const { cafe } = route.params;
  const { user } = useAuth();
  const [selTime, setSelTime] = useState(null);
  const [selDur, setSelDur] = useState(null);
  const [selSeat, setSelSeat] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const isReady = selTime && selDur && selSeat;

  function handleConfirm() {
    setConfirmed(true);
    supabase.from('bookings').insert({
      user_id: user.id,
      cafe_name: cafe.name,
      time_slot: selTime.label,
      duration: selDur.value,
      seat_type: selSeat.label,
      status: 'confirmed',
    }).then(({ error }) => {
      if (error) console.warn('booking error:', error.message);
    });
    setTimeout(() => {
      Alert.alert(
        'تم الحجز! ✓',
        `سيصلك إشعار قبل موعدك ${selTime.label} بـ 15 دقيقة`,
        [{ text: 'ممتاز', onPress: () => navigation.goBack() }]
      );
    }, 600);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <Text style={styles.topTitle}>{cafe.name}</Text>
          <Text style={styles.topSub}>{cafe.area} · {cafe.distance}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {cafe.rating}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Cafe hero info */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.freeSeats}</Text>
              <Text style={styles.heroLabel}>مقاعد فارغة</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.privateSeats}</Text>
              <Text style={styles.heroLabel}>غرف خاصة</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.openTime}</Text>
              <Text style={styles.heroLabel}>يفتح الساعة</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            <View style={styles.tag}><Text style={styles.tagText}>⚡ واي فاي {cafe.wifi}</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>◍ {cafe.noise}</Text></View>
            {cafe.charging && <View style={styles.tag}><Text style={styles.tagText}>⊕ شحن متاح</Text></View>}
          </View>
        </View>

        {/* Time picker */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>وقت الوصول</Text>
          <View style={styles.timeGrid}>
            {TIMES.map(t => (
              <TouchableOpacity
                key={t.label}
                disabled={!t.available}
                onPress={() => setSelTime(t)}
                style={[
                  styles.timePill,
                  !t.available && styles.timePillDisabled,
                  selTime?.label === t.label && styles.timePillSelected,
                ]}
              >
                <Text style={[
                  styles.timePillText,
                  !t.available && styles.timePillTextDisabled,
                  selTime?.label === t.label && styles.timePillTextSelected,
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration picker */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>مدة الجلسة</Text>
          <View style={styles.durGrid}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d.value}
                onPress={() => setSelDur(d)}
                style={[styles.durCard, selDur?.value === d.value && styles.durCardSelected]}
              >
                <Text style={[styles.durLabel, selDur?.value === d.value && { color: colors.primary }]}>{d.label}</Text>
                <Text style={[styles.durSub, selDur?.value === d.value && { color: colors.primaryDim }]}>{d.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Seat type */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>نوع المقعد</Text>
          <View style={styles.seatGrid}>
            {SEAT_TYPES.map(s => (
              <TouchableOpacity
                key={s.id}
                disabled={!s.available}
                onPress={() => setSelSeat(s)}
                style={[
                  styles.seatCard,
                  !s.available && styles.seatCardDisabled,
                  selSeat?.id === s.id && styles.seatCardSelected,
                ]}
              >
                <Text style={styles.seatIcon}>{s.icon}</Text>
                <Text style={[styles.seatLabel, selSeat?.id === s.id && { color: colors.primary }]}>{s.label}</Text>
                <Text style={styles.seatSub}>{s.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>ملخص الحجز</Text>
          <View style={styles.summaryCard}>
            {[
              { label: 'الكافيه', value: cafe.name },
              { label: 'وقت الوصول', value: selTime?.label ?? '—' },
              { label: 'مدة الجلسة', value: selDur ? selDur.label : '—' },
              { label: 'نوع المقعد', value: selSeat?.label ?? '—' },
            ].map(row => (
              <View key={row.label} style={styles.sumRow}>
                <Text style={styles.sumLabel}>{row.label}</Text>
                <Text style={[styles.sumValue, row.value !== '—' && { color: colors.textPrimary }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !isReady && styles.confirmBtnDisabled, confirmed && styles.confirmBtnDone]}
          disabled={!isReady || confirmed}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmText, !isReady && { color: colors.textMuted }]}>
            {confirmed ? '✓ تم الحجز' : 'تأكيد الحجز'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>لا رسوم حجز — يُلغى قبل الموعد بـ 30 دقيقة</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.textPrimary, fontSize: 22, lineHeight: 26 },
  topInfo: { flex: 1 },
  topTitle: { ...typography.h2 },
  topSub: { ...typography.caption, marginTop: 1 },
  ratingBadge: { backgroundColor: colors.primaryGlow, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderStrong },
  ratingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  heroCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  heroRow: { flexDirection: 'row', marginBottom: spacing.md },
  heroStat: { flex: 1, alignItems: 'center' },
  heroNum: { fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: -0.5 },
  heroLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: colors.border },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surfaceElevated, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 11, color: colors.textSecondary },

  section: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  secLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.md },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: { width: '22%', paddingVertical: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  timePillDisabled: { opacity: 0.3 },
  timePillSelected: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  timePillText: { fontSize: 12, color: colors.textSecondary },
  timePillTextDisabled: { textDecorationLine: 'line-through' },
  timePillTextSelected: { color: colors.primary, fontWeight: '600' },

  durGrid: { flexDirection: 'row', gap: 8 },
  durCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  durCardSelected: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  durLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  durSub: { fontSize: 10, color: colors.textMuted },

  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatCard: { width: '30.5%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  seatCardDisabled: { opacity: 0.3 },
  seatCardSelected: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  seatIcon: { fontSize: 22, color: colors.textSecondary, marginBottom: 4 },
  seatLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  seatSub: { fontSize: 10, color: colors.textMuted, marginTop: 1, textAlign: 'center' },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sumLabel: { fontSize: 13, color: colors.textMuted },
  sumValue: { fontSize: 13, fontWeight: '500', color: colors.textMuted },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: 32 },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  confirmBtnDone: { backgroundColor: '#3B6D11' },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.background },
  footerNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
