import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP = {
  confirmed: { bg: colors.availableBg, text: colors.available, label: 'مؤكد' },
  cancelled: { bg: colors.fullBg, text: colors.full, label: 'ملغي' },
  completed: { bg: colors.surface, text: colors.textMuted, label: 'منتهي' },
};

function BookingCard({ booking }) {
  const date = new Date(booking.created_at);
  const dateStr = date.toLocaleDateString('ar-SA', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
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
    </View>
  );
}

export default function BookingsListScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) setBookings(data ?? []);
      setLoading(false);
    }
    fetchBookings();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>حجوزاتي</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>◫</Text>
          <Text style={styles.emptyTitle}>لا توجد حجوزات بعد</Text>
          <Text style={styles.emptySub}>احجز مقعدك في أي كافيه واستمتع بجلسة منتجة</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.startBtnText}>ابدأ الاستكشاف</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: colors.textPrimary, fontSize: 22, lineHeight: 26 },
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

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40, gap: spacing.md },

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
});
