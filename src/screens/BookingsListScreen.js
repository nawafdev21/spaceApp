import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Animated,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

const STATUS_LABELS = {
  confirmed: 'تم تأكيد حجزك ✓',
  cancelled: 'تم رفض حجزك',
};

const STATUS_MAP = {
  pending:   { bg: colors.lowBg,       text: colors.low,       label: 'بانتظار التأكيد' },
  confirmed: { bg: colors.availableBg, text: colors.available, label: 'مؤكد' },
  cancelled: { bg: colors.fullBg,      text: colors.full,      label: 'ملغي' },
  completed: { bg: colors.surface,     text: colors.textMuted, label: 'منتهي' },
};

function BookingCard({ booking, onCancel }) {
  const displayDate = booking.booking_date
    ? new Date(booking.booking_date).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : new Date(booking.created_at).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
  const dateStr = displayDate;
  const st = STATUS_MAP[booking.status] ?? STATUS_MAP.confirmed;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cafeName}>{booking.cafe_name}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.detailsRow}>
        {[
          { label: 'الوقت', value: booking.time_slot },
          { label: 'المدة', value: `${booking.duration} ساعة` },
          { label: 'النوع', value: booking.seat_type },
        ].map(d => (
          <View key={d.label} style={styles.detail}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
      </View>
      {booking.status === 'pending' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(booking)}>
          <Text style={styles.cancelBtnText}>إلغاء الحجز</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BookingsListScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setBookings(data ?? []);
  }, [user.id]);

  useEffect(() => {
    fetchBookings().finally(() => setLoading(false));

    const channel = supabase
      .channel('user-bookings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        payload => {
          const updated = payload.new;
          setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
          const label = STATUS_LABELS[updated.status];
          if (label) showToast(label, updated.status === 'confirmed' ? 'success' : 'error');
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings, user.id]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }

  async function handleCancel(booking) {
    Alert.alert(
      'إلغاء الحجز',
      `هل تريد إلغاء حجزك في ${booking.cafe_name}؟`,
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: 'نعم، إلغِ الحجز',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('bookings')
              .update({ status: 'cancelled' })
              .eq('id', booking.id)
              .eq('user_id', user.id);

            if (error) {
              Alert.alert('خطأ', 'تعذّر إلغاء الحجز، حاول مجدداً');
              return;
            }

            setBookings(prev =>
              prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b)
            );

            // Restore the seat to the cafe
            if (booking.cafe_id) {
              const SEAT_COL = { 'مفتوح': 'open_seats', 'هادئ': 'quiet_seats', 'خاص': 'private_seats', 'خارجي': 'outdoor_seats', 'بار': 'bar_seats', 'بودكاست': 'podcast_seats' };
              const col = SEAT_COL[booking.seat_type];
              const selectCols = col ? `free_seats, ${col}` : 'free_seats';
              const { data: cafeData } = await supabase.from('cafes').select(selectCols).eq('id', booking.cafe_id).maybeSingle();
              if (cafeData) {
                const update = { free_seats: (cafeData.free_seats ?? 0) + 1 };
                if (col) update[col] = (cafeData[col] ?? 0) + 1;
                await supabase.from('cafes').update(update).eq('id', booking.cafe_id);
              }
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>حجوزاتي</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={styles.emptyIcon}>◫</Text>
          <Text style={styles.emptyTitle}>لا توجد حجوزات بعد</Text>
          <Text style={styles.emptySub}>احجز مقعدك في أي كافيه واستمتع بجلسة منتجة</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.startBtnText}>ابدأ الاستكشاف</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {bookings.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
        </ScrollView>
      )}
      {toast && (
        <Animated.View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess, { opacity: toastOpacity }]}>
          <Text style={[styles.toastText, toast.type === 'error' ? styles.toastTextError : styles.toastTextSuccess]}>
            {toast.msg}
          </Text>
        </Animated.View>
      )}
      <BottomTabBar active="BookingsList" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...typography.h1, fontSize: 18 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 52, color: colors.textMuted, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  emptySub: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xl },
  startBtn: {
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.xl,
  },
  startBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 90, gap: spacing.md },

  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  cafeName: { ...typography.h2, fontSize: 15 },
  dateText: { ...typography.caption, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '600' },

  detailsRow: { flexDirection: 'row' },
  detail: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  detailLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 3 },
  detailValue: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

  cancelBtn: {
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.full,
    borderRadius: radius.md, paddingVertical: 10, alignItems: 'center',
  },
  cancelBtnText: { color: colors.full, fontWeight: '600', fontSize: 13 },

  toast: { position: 'absolute', bottom: 90, left: spacing.lg, right: spacing.lg, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.lg, alignItems: 'center', borderWidth: 1 },
  toastSuccess: { backgroundColor: colors.availableBg, borderColor: colors.available },
  toastError: { backgroundColor: colors.fullBg, borderColor: colors.full },
  toastText: { fontSize: 13, fontWeight: '600' },
  toastTextSuccess: { color: colors.available },
  toastTextError: { color: colors.full },
});
