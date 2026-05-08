import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const name = user?.user_metadata?.full_name ?? '';
  const email = user?.email ?? '';
  const initial = (name[0] ?? email[0] ?? 'م').toUpperCase();

  function handleSignOut() {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        {
          text: 'خروج', style: 'destructive',
          onPress: async () => {
            try { await signOut(); } catch (e) { console.warn(e); }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>حسابي</Text>
      </View>

      {/* Avatar + info */}
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        {name ? <Text style={styles.name}>{name}</Text> : null}
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        {[
          { label: 'الاسم', value: name || '—' },
          { label: 'البريد الإلكتروني', value: email },
        ].map(row => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('BookingsList')}
        >
          <Text style={styles.actionIcon}>◫</Text>
          <Text style={styles.actionText}>حجوزاتي</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <BottomTabBar active="Profile" navigation={navigation} />
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

  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: radius.full,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: colors.primary },
  name: { ...typography.h2, marginBottom: 4 },
  email: { ...typography.caption },

  section: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14, gap: spacing.md,
  },
  actionIcon: { fontSize: 18, color: colors.textSecondary },
  actionText: { flex: 1, fontSize: 14, color: colors.textPrimary },
  actionArrow: { fontSize: 20, color: colors.textMuted },

  signOutBtn: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.fullBg,
    borderWidth: 1, borderColor: colors.full,
    borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.full, fontWeight: '700', fontSize: 14 },
});
