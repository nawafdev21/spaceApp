import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import BottomTabBar from '../components/BottomTabBar';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const name    = user?.user_metadata?.full_name ?? '';
  const email   = user?.email ?? '';
  const phone   = user?.user_metadata?.phone ?? '';
  const initial = (name[0] ?? email[0] ?? 'م').toUpperCase();

  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(name);
  const [editPhone, setEditPhone] = useState(phone);
  const [saving, setSaving]     = useState(false);
  const [banner, setBanner]     = useState(null);

  async function handleSave() {
    if (!editName.trim()) {
      setBanner({ type: 'error', msg: 'الاسم مطلوب' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: editName.trim(), phone: editPhone.trim() },
    });
    setSaving(false);
    if (error) {
      setBanner({ type: 'error', msg: 'تعذّر الحفظ، حاول مجدداً' });
    } else {
      setBanner({ type: 'success', msg: 'تم تحديث البيانات ✓' });
      setEditing(false);
      setTimeout(() => setBanner(null), 3000);
    }
  }

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
        <TouchableOpacity
          style={styles.editToggle}
          onPress={() => { setEditing(e => !e); setBanner(null); }}
        >
          <Text style={styles.editToggleText}>{editing ? 'إلغاء' : 'تعديل'}</Text>
        </TouchableOpacity>
      </View>

      {banner && (
        <View style={[styles.banner, banner.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={[styles.bannerText, banner.type === 'error' ? styles.bannerTextError : styles.bannerTextSuccess]}>
            {banner.msg}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Avatar */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {name ? <Text style={styles.name}>{editing ? editName || '—' : name}</Text> : null}
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Edit form or info rows */}
        {editing ? (
          <View style={styles.section}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="اسمك الكامل"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.fieldWrap, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>رقم الجوال</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="05xxxxxxxx"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {[
              { label: 'الاسم', value: name || '—' },
              { label: 'البريد الإلكتروني', value: email },
              { label: 'رقم الجوال', value: phone || '—' },
            ].map((row, i, arr) => (
              <View key={row.label} style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {editing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.background} />
              : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
            }
          </TouchableOpacity>
        )}

        {/* Actions */}
        {!editing && (
          <View style={styles.section}>
            <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('BookingsList')}>
              <Text style={styles.actionIcon}>◫</Text>
              <Text style={styles.actionText}>حجوزاتي</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign out */}
        {!editing && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

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
  title: { ...typography.h1, fontSize: 18 },
  editToggle: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  editToggleText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderWidth: 1 },
  bannerError: { backgroundColor: colors.fullBg, borderColor: colors.full },
  bannerSuccess: { backgroundColor: colors.availableBg, borderColor: colors.available },
  bannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  bannerTextError: { color: colors.full },
  bannerTextSuccess: { color: colors.available },

  heroCard: {
    alignItems: 'center', paddingVertical: spacing.xxl,
    marginHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: radius.full,
    backgroundColor: colors.primaryGlow, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: colors.primary },
  name: { ...typography.h2, marginBottom: 4 },
  email: { ...typography.caption },

  section: {
    marginHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  fieldWrap: { paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  input: { fontSize: 14, color: colors.textPrimary, paddingVertical: 4 },

  saveBtn: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.background },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  actionIcon: { fontSize: 18, color: colors.textSecondary },
  actionText: { flex: 1, fontSize: 14, color: colors.textPrimary },
  actionArrow: { fontSize: 20, color: colors.textMuted },

  signOutBtn: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.fullBg, borderWidth: 1, borderColor: colors.full,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { color: colors.full, fontWeight: '700', fontSize: 14 },
});
