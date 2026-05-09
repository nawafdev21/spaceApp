import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';

const AR_DAYS   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function getNextDays(n = 10) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function sameDay(a, b) {
  return toISO(a) === toISO(b);
}

function parseTimeToMinutes(label) {
  if (!label || typeof label !== 'string') return null;
  const parts = label.trim().split(' ');
  if (parts.length < 2) return null;
  const colonParts = parts[0].split(':');
  if (colonParts.length < 2) return null;
  const h = parseInt(colonParts[0]);
  const m = parseInt(colonParts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  const isAM = parts[1] === 'ص';
  const hours = isAM ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return hours * 60 + m;
}

function isPastTime(label, date) {
  if (!sameDay(date, new Date())) return false;
  const mins = parseTimeToMinutes(label);
  if (mins === null) return false;
  const now = new Date();
  return mins <= now.getHours() * 60 + now.getMinutes();
}

import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function generateTimeSlots(openTime, closeTime) {
  const startMins = parseTimeToMinutes(openTime) ?? 8 * 60;
  const rawEnd    = parseTimeToMinutes(closeTime);
  let   endMins   = rawEnd ?? (startMins + 14 * 60);
  if (endMins <= startMins) endMins += 24 * 60; // يتجاوز منتصف الليل
  const cap = Math.min(endMins, startMins + 18 * 60);
  const slots = [];
  for (let m = startMins; m < cap; m += 30) {
    const mod  = m % (24 * 60);
    const h24  = Math.floor(mod / 60);
    const min  = mod % 60;
    const isAM = h24 < 12;
    let   h12  = h24 % 12;
    if (h12 === 0) h12 = 12;
    slots.push(`${h12}:${min === 0 ? '00' : '30'} ${isAM ? 'ص' : 'م'}`);
  }
  return slots;
}

const DURATIONS = [
  { label: 'ساعة', value: 1, sub: '60 دقيقة' },
  { label: 'ساعتان', value: 2, sub: '120 دقيقة' },
  { label: '3 ساعات', value: 3, sub: '180 دقيقة' },
  { label: '+4 ساعات', value: 4, sub: 'جلسة طويلة' },
];

const ALL_SEAT_TYPES = [
  { id: 'open',    icon: '⬚', label: 'مفتوح',   sub: 'طاولة عامة',    col: 'open_seats' },
  { id: 'quiet',   icon: '◈', label: 'هادئ',    sub: 'زاوية معزولة',  col: 'quiet_seats' },
  { id: 'private', icon: '⬡', label: 'خاص',     sub: 'غرفة مستقلة',  col: 'private_seats' },
  { id: 'outdoor', icon: '◎', label: 'خارجي',   sub: 'تراس مفتوح',   col: 'outdoor_seats' },
  { id: 'bar',     icon: '◌', label: 'بار',     sub: 'بجانب المطبخ', col: 'bar_seats' },
  { id: 'podcast', icon: '◉', label: 'بودكاست', sub: 'غرفة تسجيل',   col: 'podcast_seats' },
];

export default function BookingScreen({ route, navigation }) {
  const { cafe } = route.params;
  const { user } = useAuth();
  const [selDate, setSelDate] = useState(new Date());
  const [selTime, setSelTime] = useState(null);
  const [selDur, setSelDur] = useState(null);
  const [selSeat, setSelSeat] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const DAYS = getNextDays(10);

  const offeredTypes = (cafe.seat_types ?? []).length > 0
    ? ALL_SEAT_TYPES.filter(t => cafe.seat_types.includes(t.id))
    : ALL_SEAT_TYPES.filter(t => (cafe[t.col] ?? 0) > 0);
  const SEAT_TYPES = offeredTypes.map(t => ({ ...t, available: (cafe[t.col] ?? 0) > 0 }));

  useEffect(() => {
    if (!cafe.id) { setLoadingSlots(false); return; }
    setLoadingSlots(true);
    setSelTime(null);
    supabase
      .from('bookings')
      .select('time_slot')
      .eq('cafe_id', cafe.id)
      .eq('booking_date', toISO(selDate))
      .in('status', ['pending', 'confirmed'])
      .then(({ data }) => {
        setBookedSlots((data ?? []).map(b => b.time_slot));
        setLoadingSlots(false);
      });
  }, [cafe.id, selDate]);

  const TIMES = generateTimeSlots(cafe.open_time, cafe.close_time).map(label => {
    const past   = isPastTime(label, selDate);
    const booked = bookedSlots.includes(label);
    return { label, past, booked, available: !past && !booked };
  });

  const isReady = selTime && selDur && selSeat;
  const noSeats = (cafe.free_seats ?? cafe.freeSeats ?? 0) <= 0;

  async function handleConfirm() {
    if (noSeats) {
      Alert.alert('لا توجد مقاعد', 'هذا الكافيه ممتلئ حالياً، جرّب وقتاً آخر.');
      return;
    }
    if (bookedSlots.includes(selTime.label)) {
      Alert.alert('الوقت محجوز', 'هذا الوقت تم حجزه للتو، اختر وقتاً آخر.');
      return;
    }

    setConfirmed(true);
    const { error } = await supabase.from('bookings').insert({
      user_id:      user.id,
      cafe_id:      cafe.id ?? null,
      cafe_name:    cafe.name,
      booking_date: toISO(selDate),
      time_slot:    selTime.label,
      duration:     selDur.value,
      seat_type:    selSeat.label,
      status:       'pending',
    });

    if (error) {
      console.warn('booking error:', error.message);
      setConfirmed(false);
      Alert.alert('خطأ', 'تعذّر إرسال الحجز، حاول مجدداً');
      return;
    }

    // Decrease free seats and specific seat type immediately on booking creation
    if (cafe.id) {
      const seatDef = ALL_SEAT_TYPES.find(t => t.label === selSeat.label);
      const update = { free_seats: Math.max(0, (cafe.free_seats ?? 0) - 1) };
      if (seatDef?.col) update[seatDef.col] = Math.max(0, (cafe[seatDef.col] ?? 0) - 1);
      await supabase.from('cafes').update(update).eq('id', cafe.id);
    }

    Alert.alert(
      'تم إرسال طلب الحجز ✓',
      `طلبك في ${cafe.name} الساعة ${selTime.label} بانتظار تأكيد الكافيه`,
      [{ text: 'ممتاز', onPress: () => navigation.navigate('BookingsList') }]
    );
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

      {noSeats && (
        <View style={styles.fullBanner}>
          <Text style={styles.fullBannerText}>⚠ الكافيه ممتلئ حالياً — لا يمكن إجراء حجز جديد</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Cafe hero info */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.free_seats ?? cafe.freeSeats}</Text>
              <Text style={styles.heroLabel}>مقاعد فارغة</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.private_seats ?? cafe.privateSeats}</Text>
              <Text style={styles.heroLabel}>غرف خاصة</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{cafe.open_time ?? cafe.openTime}</Text>
              <Text style={styles.heroLabel}>يفتح الساعة</Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            <View style={styles.tag}><Text style={styles.tagText}>⚡ واي فاي {cafe.wifi}</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>◍ {cafe.noise}</Text></View>
            {cafe.charging && <View style={styles.tag}><Text style={styles.tagText}>⊕ شحن متاح</Text></View>}
          </View>
        </View>

        {/* Date picker */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>تاريخ الزيارة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {DAYS.map((d, i) => {
              const isSelected = sameDay(d, selDate);
              const isToday    = i === 0;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelDate(d)}
                  style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                    {isToday ? 'اليوم' : AR_DAYS[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateDayNum, isSelected && styles.dateTextSelected]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                    {AR_MONTHS[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time picker */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>وقت الوصول</Text>
          {loadingSlots ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : (
            <View style={styles.timeGrid}>
              {TIMES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  disabled={!t.available}
                  onPress={() => setSelTime(t)}
                  style={[
                    styles.timePill,
                    (t.booked || t.past) && styles.timePillDisabled,
                    selTime?.label === t.label && styles.timePillSelected,
                  ]}
                >
                  <Text style={[
                    styles.timePillText,
                    t.booked && styles.timePillTextDisabled,
                    t.past  && styles.timePillTextPast,
                    selTime?.label === t.label && styles.timePillTextSelected,
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
              { label: 'التاريخ', value: `${AR_DAYS[selDate.getDay()]} ${selDate.getDate()} ${AR_MONTHS[selDate.getMonth()]}` },
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
          style={[styles.confirmBtn, (!isReady || noSeats) && styles.confirmBtnDisabled, confirmed && styles.confirmBtnDone]}
          disabled={!isReady || confirmed || noSeats}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmText, (!isReady || noSeats) && { color: colors.textMuted }]}>
            {confirmed ? '✓ تم الحجز' : noSeats ? 'لا توجد مقاعد' : 'تأكيد الحجز'}
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

  fullBanner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.fullBg, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.full },
  fullBannerText: { color: colors.full, fontSize: 12, fontWeight: '600', textAlign: 'center' },

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

  dateCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 14, minWidth: 64 },
  dateCardSelected: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  dateDayName: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  dateDayNum:  { fontSize: 22, fontWeight: '700', color: colors.textPrimary, lineHeight: 26 },
  dateMonth:   { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  dateTextSelected: { color: colors.primary },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: { width: '22%', paddingVertical: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  timePillDisabled: { opacity: 0.3 },
  timePillSelected: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  timePillText: { fontSize: 12, color: colors.textSecondary },
  timePillTextDisabled: { textDecorationLine: 'line-through' },
  timePillTextPast: { textDecorationLine: 'line-through', color: colors.textMuted },
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
