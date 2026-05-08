import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function StatCard({ num, label, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statNum, color && { color }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ active: 0, pending: 0, total: 0, users: 0 });
  const [pendingCafes, setPendingCafes] = useState([]);

  const fetchData = useCallback(async () => {
    const [
      { count: total },
      { count: active },
      { count: pending },
      { data: pendingList },
      { data: usersCount },
    ] = await Promise.all([
      supabase.from('cafes').select('*', { count: 'exact', head: true }),
      supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('cafes')
        .select('id, name, area, phone, description, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.rpc('get_users_count'),
    ]);

    setStats({
      total: total ?? 0,
      active: active ?? 0,
      pending: pending ?? 0,
      users: usersCount ?? 0,
    });
    setPendingCafes(pendingList ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function handleApprove(id) {
    const { error } = await supabase.from('cafes').update({ status: 'active' }).eq('id', id);
    if (error) { Alert.alert('خطأ', error.message); return; }
    setPendingCafes(p => p.filter(c => c.id !== id));
    setStats(s => ({ ...s, active: s.active + 1, pending: s.pending - 1 }));
  }

  async function handleReject(id) {
    Alert.alert('رفض الطلب', 'هل أنت متأكد من رفض هذا الكافيه؟', [
      {
        text: 'رفض', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('cafes').update({ status: 'rejected' }).eq('id', id);
          if (error) { Alert.alert('خطأ', error.message); return; }
          setPendingCafes(p => p.filter(c => c.id !== id));
          setStats(s => ({ ...s, pending: s.pending - 1 }));
        },
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }

  function handleSignOut() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      {
        text: 'خروج', style: 'destructive',
        onPress: async () => { try { await signOut(); } catch (_) {} },
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>لوحة الإدارة</Text>
          <Text style={styles.subtitle}>مساحتي — Admin</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard num={stats.active}  label="كافيه نشط"        color={colors.primary} />
          <StatCard num={stats.pending} label="طلب معلق"         color={stats.pending > 0 ? colors.low : undefined} />
          <StatCard num={stats.total}   label="إجمالي الكافيهات" />
          <StatCard num={stats.users}   label="مستخدم" />
        </View>

        {/* Pending requests */}
        <Text style={styles.sectionTitle}>
          {`الطلبات المعلقة${stats.pending > 0 ? ` (${stats.pending})` : ''}`}
        </Text>

        {pendingCafes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>لا توجد طلبات معلقة</Text>
          </View>
        ) : (
          pendingCafes.map(cafe => (
            <View key={cafe.id} style={styles.cafeCard}>
              <Text style={styles.cafeName}>{cafe.name}</Text>
              <Text style={styles.cafeArea}>{cafe.area}</Text>
              {cafe.phone ? <Text style={styles.cafeMeta}>📞 {cafe.phone}</Text> : null}
              {cafe.description ? (
                <Text style={styles.cafeDesc} numberOfLines={2}>{cafe.description}</Text>
              ) : null}
              <View style={styles.cafeActions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(cafe.id)}>
                  <Text style={styles.rejectText}>رفض</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(cafe.id)}>
                  <Text style={styles.approveText}>قبول ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  title: { ...typography.h1, fontSize: 20 },
  subtitle: { ...typography.caption, marginTop: 2 },
  signOutBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  signOutText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  statCard: {
    width: '50%', alignItems: 'center', paddingVertical: spacing.lg,
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  statNum: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { ...typography.h3, fontSize: 15, color: colors.textSecondary },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xxl, alignItems: 'center', gap: spacing.sm,
  },
  emptyIcon: { fontSize: 28, color: colors.primary },
  emptyText: { fontSize: 14, color: colors.textMuted },

  cafeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  cafeName: { ...typography.h2, fontSize: 16 },
  cafeArea: { ...typography.caption },
  cafeMeta: { fontSize: 12, color: colors.textSecondary },
  cafeDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  cafeActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  rejectBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.full, alignItems: 'center',
  },
  rejectText: { fontSize: 13, fontWeight: '700', color: colors.full },
  approveBtn: {
    flex: 2, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  approveText: { fontSize: 13, fontWeight: '700', color: colors.background },
});
