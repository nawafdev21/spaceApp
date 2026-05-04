import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function StatCard({ num, label, accent }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statNum, accent && { color: colors.primary }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SeatsControl({ cafe, onUpdate }) {
  const [freeSeats, setFreeSeats] = useState(cafe.free_seats ?? 0);
  const [saving, setSaving] = useState(false);
  const max = cafe.total_seats ?? 0;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('cafes')
      .update({ free_seats: freeSeats })
      .eq('id', cafe.id);
    setSaving(false);
    if (error) { Alert.alert('خطأ', error.message); return; }
    onUpdate(freeSeats);
    Alert.alert('✓', 'تم تحديث المقاعد');
  }

  return (
    <View style={styles.seatsCard}>
      <Text style={styles.seatsTitle}>المقاعد الفارغة الآن</Text>
      <View style={styles.seatsControl}>
        <TouchableOpacity
          style={styles.seatsBtn}
          onPress={() => setFreeSeats(f => Math.max(0, f - 1))}
        >
          <Text style={styles.seatsBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.seatsValueWrap}>
          <Text style={styles.seatsValue}>{freeSeats}</Text>
          <Text style={styles.seatsMax}>من {max}</Text>
        </View>
        <TouchableOpacity
          style={styles.seatsBtn}
          onPress={() => setFreeSeats(f => Math.min(max, f + 1))}
        >
          <Text style={styles.seatsBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        onPress={save}
        disabled={saving || freeSeats === cafe.free_seats}
      >
        {saving
          ? <ActivityIndicator color={colors.background} size="small" />
          : <Text style={styles.saveBtnText}>حفظ التحديث</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

export default function CafeDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);

  const ownerName = user?.user_metadata?.full_name ?? user?.email ?? '';

  useEffect(() => {
    async function fetchCafe() {
      const { data, error } = await supabase
        .from('cafes')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!error) setCafe(data);
      setLoading(false);
    }
    fetchCafe();
  }, []);

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
          <Text style={styles.signOutIcon}>⎋</Text>
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

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard num={cafe.free_seats ?? 0} label="مقعد فارغ" accent />
            <StatCard num={cafe.total_seats ?? 0} label="مقاعد كلية" />
            <StatCard num={cafe.private_seats ?? 0} label="غرف خاصة" />
          </View>

          {/* Seat update control */}
          {cafe.status === 'active' && (
            <SeatsControl
              cafe={cafe}
              onUpdate={n => setCafe(c => ({ ...c, free_seats: n }))}
            />
          )}

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

          {/* Edit cafe */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('CafeRegistration')}
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
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutIcon: { fontSize: 18, color: colors.textSecondary },

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

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statNum: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  seatsCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
    alignItems: 'center', gap: spacing.lg,
  },
  seatsTitle: { ...typography.h3 },
  seatsControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  seatsBtn: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  seatsBtnText: { fontSize: 24, color: colors.primary, fontWeight: '300' },
  seatsValueWrap: { alignItems: 'center' },
  seatsValue: { fontSize: 40, fontWeight: '700', color: colors.primary, letterSpacing: -1 },
  seatsMax: { fontSize: 12, color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: spacing.xxl,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.background },

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
});
