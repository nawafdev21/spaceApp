import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال البريد وكلمة المرور');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسمك');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim());
        Alert.alert('تم التسجيل', 'تحقق من بريدك الإلكتروني لتفعيل الحساب');
      }
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>م</Text>
            </View>
            <Text style={styles.appName}>مساحتي</Text>
            <Text style={styles.tagline}>ابحث عن مكانك قبل ما تطلع</Text>
          </View>

          <View style={styles.tabs}>
            {[
              { key: 'login', label: 'تسجيل الدخول' },
              { key: 'register', label: 'حساب جديد' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, tab === t.key && styles.tabActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            {tab === 'register' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>الاسم</Text>
                <TextInput
                  style={styles.input}
                  placeholder="اسمك الكريم"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>كلمة المرور</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.background} />
                : <Text style={styles.submitText}>
                    {tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: 40 },

  logoArea: { alignItems: 'center', marginBottom: 44 },
  logoCircle: {
    width: 76, height: 76, borderRadius: radius.full,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoIcon: { fontSize: 34, fontWeight: '700', color: colors.primary },
  appName: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary, marginBottom: 6 },
  tagline: { ...typography.caption },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 4, marginBottom: spacing.xl,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  form: { gap: spacing.lg },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    color: colors.textPrimary, fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
