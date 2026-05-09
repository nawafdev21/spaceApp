import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';

const SEAT_TYPES = [
  { id: 'open',    icon: '⬚', label: 'مفتوح',   col: 'open_seats' },
  { id: 'quiet',   icon: '◈', label: 'هادئ',    col: 'quiet_seats' },
  { id: 'private', icon: '⬡', label: 'خاص',     col: 'private_seats' },
  { id: 'outdoor', icon: '◎', label: 'خارجي',   col: 'outdoor_seats' },
  { id: 'bar',     icon: '◌', label: 'بار',     col: 'bar_seats' },
  { id: 'podcast', icon: '◉', label: 'بودكاست', col: 'podcast_seats' },
];

function calcEndTime(startSlot, durationHours) {
  const parts = startSlot?.split(' ');
  if (!parts || parts.length < 2) return '—';
  const [time, period] = parts;
  const [h, m] = time.split(':').map(Number);
  let hour24 = h;
  if (period === 'م' && h !== 12) hour24 += 12;
  if (period === 'ص' && h === 12) hour24 = 0;
  const endHour24 = (hour24 + durationHours) % 24;
  const endPeriod = endHour24 < 12 ? 'ص' : 'م';
  const endHour12 = endHour24 % 12 || 12;
  return `${endHour12}:${String(m).padStart(2, '0')} ${endPeriod}`;
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sendPushToUser } from '../lib/notifications';

function StatCard({ num, label, accent }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statNum, accent && { color: colors.primary }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}


export default function CafeDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [cafe, setCafe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatCounts, setSeatCounts] = useState({});
  const [savingCol, setSavingCol] = useState(null);
  const [enabledTypes, setEnabledTypes] = useState(new Set());

  const ownerName = user?.user_metadata?.full_name ?? user?.email ?? '';

  const fetchData = useCallback(async () => {
    const { data: cafeData } = await supabase
      .from('cafes').select('*').eq('owner_id', user.id).maybeSingle();
    setCafe(cafeData);
    if (cafeData) {
      const counts = {};
      SEAT_TYPES.forEach(t => { counts[t.col] = cafeData[t.col] ?? 0; });
      setSeatCounts(counts);
      setEnabledTypes(new Set(cafeData.seat_types ?? []));
    }

    if (cafeData?.id) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('cafe_id', cafeData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setBookings(bookingsData ?? []);
    }
    setLoading(false);
  }, [user.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function updateBooking(id, status) {
    const booking = bookings.find(b => b.id === id);
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) { Alert.alert('خطأ', error.message); return; }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));

    if (booking?.user_id) {
      if (status === 'confirmed') {
        sendPushToUser(
          booking.user_id,
          'تم تأكيد حجزك ✓',
          `حجزك في ${cafe?.name} الساعة ${booking.time_slot} مؤكد`
        ).catch(() => {});
      } else if (status === 'cancelled') {
        sendPushToUser(
          booking.user_id,
          'تم رفض الحجز',
          `للأسف تم رفض حجزك في ${cafe?.name} — جرّب وقتاً آخر`
        ).catch(() => {});
      }
    }
    // Seat was already decremented when user created the booking (pending)
    // Restore seat when booking is cancelled (cafe rejects) or session completes
    if ((status === 'cancelled' || status === 'completed') && cafe && booking) {
      const seatDef = SEAT_TYPES.find(t => t.label === booking.seat_type);
      const newFree = Math.min((cafe.free_seats ?? 0) + 1, cafe.total_seats ?? 0);
      const update = { free_seats: newFree };
      if (seatDef?.col) update[seatDef.col] = (cafe[seatDef.col] ?? 0) + 1;
      await supabase.from('cafes').update(update).eq('id', cafe.id);
      setCafe(c => {
        const next = { ...c, free_seats: newFree };
        if (seatDef?.col) next[seatDef.col] = (c[seatDef.col] ?? 0) + 1;
        return next;
      });
    }
  }

  async function toggleSeatType(typeId) {
    const newEnabled = new Set(enabledTypes);
    if (newEnabled.has(typeId)) newEnabled.delete(typeId);
    else newEnabled.add(typeId);
    setEnabledTypes(newEnabled);
    const arr = Array.from(newEnabled);
    const newFree = SEAT_TYPES.filter(t => newEnabled.has(t.id)).reduce((sum, t) => sum + (seatCounts[t.col] ?? 0), 0);
    const { error } = await supabase.from('cafes').update({ seat_types: arr, free_seats: newFree }).eq('id', cafe.id);
    if (error) { setEnabledTypes(enabledTypes); Alert.alert('خطأ', error.message); return; }
    setCafe(c => ({ ...c, seat_types: arr, free_seats: newFree }));
  }

  async function adjustSeatType(col, delta) {
    const newVal = Math.max(0, (seatCounts[col] ?? 0) + delta);
    const newCounts = { ...seatCounts, [col]: newVal };
    const newFree = SEAT_TYPES.filter(t => enabledTypes.has(t.id)).reduce((sum, t) => sum + (newCounts[t.col] ?? 0), 0);
    setSeatCounts(newCounts);
    setCafe(c => ({ ...c, [col]: newVal, free_seats: newFree }));
    setSavingCol(col);
    const { error } = await supabase.from('cafes').update({ [col]: newVal, free_seats: newFree }).eq('id', cafe.id);
    setSavingCol(null);
    if (error) {
      setSeatCounts(seatCounts);
      setCafe(c => ({ ...c, [col]: seatCounts[col] ?? 0 }));
      Alert.alert('خطأ', error.message);
    }
  }

  function handleSignOut() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      {
        text: 'خروج', style: 'destructive',
        onPress: async () => { try { await signOut(); } catch (e) { console.warn(e); } },
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً، {ownerName.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>لوحة تحكم الكافيه</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !cafe ? (
        // No cafe registered yet
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={styles.emptyTitle}>لم تسجّل كافيهك بعد</Text>
          <Text style={styles.emptySub}>أضف كافيهك ليظهر للمستخدمين الباحثين عن مساحة عمل</Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('CafeRegistration')}
          >
            <Text style={styles.registerBtnText}>سجّل كافيهك الآن</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Cafe name + status */}
          <View style={styles.cafeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cafeName}>{cafe.name}</Text>
              <Text style={styles.cafeArea}>{cafe.area}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              cafe.status === 'active' ? styles.statusActive : styles.statusPending,
            ]}>
              <Text style={[
                styles.statusText,
                { color: cafe.status === 'active' ? colors.available : colors.low },
              ]}>
                {cafe.status === 'active' ? 'نشط' : 'قيد المراجعة'}
              </Text>
            </View>
          </View>

          {cafe.status === 'pending' && (
            <View style={styles.pendingNote}>
              <Text style={styles.pendingNoteText}>
                ⏳ كافيهك قيد المراجعة من الإدارة وسيُنشر خلال 24 ساعة
              </Text>
            </View>
          )}

          {/* Stats + Seat type bar */}
          <View style={styles.seatBlock}>
            {/* Overview row */}
            <View style={styles.statsRow}>
              <StatCard num={cafe.free_seats ?? 0} label="متاح الآن" accent />
              <StatCard num={cafe.total_seats ?? 0} label="إجمالي المقاعد" />
            </View>

            {/* Horizontal seat type controls */}
            {cafe.status === 'active' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seatBarContent}
              >
                {SEAT_TYPES.map(t => {
                  const count = seatCounts[t.col] ?? 0;
                  const isSaving = savingCol === t.col;
                  const isEnabled = enabledTypes.has(t.id);
                  return (
                    <View key={t.id} style={[styles.seatChip, !isEnabled && styles.seatChipOff]}>
                      <Text style={styles.seatChipIcon}>{t.icon}</Text>
                      <Text style={styles.seatChipLabel}>{t.label}</Text>
                      {isEnabled ? (
                        <>
                          <Text style={[styles.seatChipCount, count > 0 && { color: colors.primary }]}>
                            {count}
                          </Text>
                          <View style={styles.seatChipCtrl}>
                            <TouchableOpacity
                              onPress={() => adjustSeatType(t.col, -1)}
                              disabled={isSaving || count === 0}
                              style={[styles.seatChipBtn, (isSaving || count === 0) && { opacity: 0.3 }]}
                            >
                              <Text style={styles.seatChipBtnText}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => adjustSeatType(t.col, +1)}
                              disabled={isSaving}
                              style={[styles.seatChipBtn, isSaving && { opacity: 0.3 }]}
                            >
                              <Text style={styles.seatChipBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => toggleSeatType(t.id)} style={styles.seatChipXBtn}>
                            <Text style={styles.seatChipXText}>✕</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity onPress={() => toggleSeatType(t.id)} style={styles.seatChipActivateBtn}>
                          <Text style={styles.seatChipActivateText}>تفعيل</Text>
                        </TouchableOpacity>
                      )}
                      {isSaving && (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                          style={{ position: 'absolute', top: 6, left: 6 }}
                        />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Quick info */}
          <View style={styles.infoCard}>
            {[
              { label: 'وقت الفتح', value: cafe.open_time ?? '—' },
              { label: 'وقت الإغلاق', value: cafe.close_time ?? '—' },
              { label: 'واي فاي', value: cafe.wifi ?? '—' },
              { label: 'مستوى الضجيج', value: cafe.noise ?? '—' },
              { label: 'إنستقرام', value: cafe.instagram ?? '—' },
              { label: 'رقم التواصل', value: cafe.phone ?? '—' },
            ].map(row => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>


          {/* Incoming bookings */}
          {cafe.status === 'active' && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.sectionTitle}>
                {`الحجوزات الواردة${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
              </Text>
              {bookings.length === 0 ? (
                <View style={styles.emptyBookings}>
                  <Text style={styles.emptyBookingsText}>لا توجد حجوزات بعد</Text>
                </View>
              ) : (
                bookings.map(b => {
                  const endTime = calcEndTime(b.time_slot, b.duration);
                  const date = new Date(b.created_at).toLocaleDateString('ar-SA', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  });
                  const isPending = b.status === 'pending';
                  return (
                    <View key={b.id} style={styles.bookingCard}>
                      <View style={styles.bookingRow}>
                        <Text style={styles.bookingTime}>
                          {b.time_slot} ← {endTime}
                        </Text>
                        <View style={[
                          styles.bookingBadge,
                          isPending ? styles.badgePending :
                          b.status === 'confirmed' ? styles.badgeConfirmed : styles.badgeDone,
                        ]}>
                          <Text style={[
                            styles.bookingBadgeText,
                            { color: isPending ? colors.low : b.status === 'confirmed' ? colors.available : colors.textMuted },
                          ]}>
                            {isPending ? 'انتظار' : b.status === 'confirmed' ? 'مؤكد' : 'منتهي'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bookingDetails}>
                        <Text style={styles.bookingSeat}>◈ {b.seat_type}</Text>
                        <Text style={styles.bookingMeta}>·</Text>
                        <Text style={styles.bookingMeta}>{b.duration} ساعة</Text>
                        <Text style={styles.bookingMeta}>·</Text>
                        <Text style={styles.bookingMeta}>{date}</Text>
                      </View>

                      {isPending && (
                        <View style={styles.bookingActions}>
                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => updateBooking(b.id, 'cancelled')}
                          >
                            <Text style={styles.rejectBtnText}>رفض</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => updateBooking(b.id, 'confirmed')}
                          >
                            <Text style={styles.approveBtnText}>قبول ✓</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {b.status === 'confirmed' && (
                        <TouchableOpacity
                          style={styles.leaveBtn}
                          onPress={() => updateBooking(b.id, 'completed')}
                        >
                          <Text style={styles.leaveBtnText}>غادر العميل — تحرير المقعد</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Edit cafe */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('CafeRegistration', { cafe })}
          >
            <Text style={styles.editBtnText}>تعديل بيانات الكافيه</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  greeting: { ...typography.h1, fontSize: 20 },
  subtitle: { ...typography.caption, marginTop: 2 },
  signOutBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  signOutText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  emptySub: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xl },
  registerBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.xxl,
  },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: colors.background },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },

  cafeHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  cafeName: { ...typography.h1, fontSize: 18 },
  cafeArea: { ...typography.caption, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.full },
  statusActive: { backgroundColor: colors.availableBg },
  statusPending: { backgroundColor: colors.lowBg },
  statusText: { fontSize: 11, fontWeight: '700' },

  pendingNote: {
    backgroundColor: colors.lowBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.low, padding: spacing.md,
  },
  pendingNoteText: { fontSize: 13, color: colors.low, textAlign: 'center' },

  seatBlock: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statNum: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  seatBarContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 8 },
  seatChip: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    alignItems: 'center', minWidth: 78, gap: 4, position: 'relative',
  },
  seatChipIcon:  { fontSize: 18, color: colors.textSecondary },
  seatChipLabel: { fontSize: 10, color: colors.textMuted },
  seatChipCount: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  seatChipCtrl:  { flexDirection: 'row', gap: 6 },
  seatChipBtn: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  seatChipBtnText: { fontSize: 18, color: colors.primary, fontWeight: '300', lineHeight: 22 },
  seatChipOff: { opacity: 0.45 },
  seatChipXBtn: { position: 'absolute', top: 4, right: 4, padding: 2 },
  seatChipXText: { fontSize: 9, color: colors.textMuted },
  seatChipActivateBtn: {
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10, marginTop: 4,
  },
  seatChipActivateText: { fontSize: 11, color: colors.primary, fontWeight: '700' },

  infoCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },

  editBtn: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 14, alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm },

  emptyBookings: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center',
  },
  emptyBookingsText: { fontSize: 13, color: colors.textMuted },

  bookingCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 8,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingTime: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  bookingBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full },
  badgePending:   { backgroundColor: colors.lowBg },
  badgeConfirmed: { backgroundColor: colors.availableBg },
  badgeDone:      { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bookingBadgeText: { fontSize: 11, fontWeight: '600' },
  bookingDetails: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  bookingSeat: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  bookingMeta: { fontSize: 12, color: colors.textMuted },
  bookingActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  rejectBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.full, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: colors.full },
  approveBtn: {
    flex: 2, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: colors.background },

  leaveBtn: {
    paddingVertical: 8, borderRadius: radius.md, marginTop: 4,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  leaveBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

});
