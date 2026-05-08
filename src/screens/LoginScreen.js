import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'user',        icon: '☕', label: 'أبحث عن مساحة', sub: 'مستخدم' },
  { key: 'cafe_owner',  icon: '🏪', label: 'أملك كافيه',    sub: 'صاحب كافيه' },
];

function translateError(msg) {
  if (!msg) return 'حدث خطأ غير متوقع';
  if (msg.includes('Invalid login credentials'))         return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (msg.includes('Email not confirmed'))               return 'الرجاء تأكيد بريدك الإلكتروني أولاً ثم سجّل الدخول';
  if (msg.includes('User already registered'))           return 'هذا البريد الإلكتروني مسجّل مسبقاً';
  if (msg.includes('Password should be at least'))       return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  if (msg.includes('Unable to validate email address'))  return 'صيغة البريد الإلكتروني غير صحيحة';
  if (msg.includes('signup is disabled'))                return 'التسجيل معطّل حالياً';
  if (msg.includes('rate limit'))                        return 'محاولات كثيرة، انتظر قليلاً ثم حاول مجدداً';
  return msg;
}

function Banner({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return (
    <View style={[styles.banner, isSuccess ? styles.bannerSuccess : styles.bannerError]}>
      <Text style={[styles.bannerText, isSuccess ? styles.bannerTextSuccess : styles.bannerTextError]}>
        {msg}
      </Text>
    </View>
  );
}

export default function LoginScreen() {
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const { signIn, signUp } = useAuth();

  function showMsg(msg, type = 'error') {
    setBanner({ msg, type });
  }

  async function handleSubmit() {
    setBanner(null);
    if (!email.trim() || !password.trim()) {
      showMsg('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      showMsg('الرجاء إدخال اسمك');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim(), role);
        showMsg('تم إنشاء الحساب — تحقق من بريدك الإلكتروني لتفعيل الحساب', 'success');
      }
    } catch (e) {
      showMsg(translateError(e.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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

          <Banner msg={banner?.msg} type={banner?.type} />

          <View style={styles.form}>

            {/* Role selector — register only */}
            {tab === 'register' && (
              <View style={styles.roleSection}>
                <Text style={styles.roleTitle}>أنت...</Text>
                <View style={styles.roleCards}>
                  {ROLES.map(r => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                      onPress={() => setRole(r.key)}
                    >
                      <Text style={styles.roleIcon}>{r.icon}</Text>
                      <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>
                        {r.label}
                      </Text>
                      <Text style={styles.roleSub}>{r.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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

  banner: {
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.md,
  },
  bannerError:   { backgroundColor: colors.fullBg,      borderColor: colors.full },
  bannerSuccess: { backgroundColor: colors.availableBg, borderColor: colors.available },
  bannerText:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  bannerTextError:   { color: colors.full },
  bannerTextSuccess: { color: colors.available },

  logoArea: { alignItems: 'center', marginBottom: 44 },
  logoCircle: {
    width: 76, height: 76, borderRadius: radius.full,
    backgroundColor: colors.primaryGlow, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  logoIcon: { fontSize: 34, fontWeight: '700', color: colors.primary },
  appName: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary, marginBottom: 6 },
  tagline: { ...typography.caption },

  tabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: 4, marginBottom: spacing.xl,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  form: { gap: spacing.lg },

  roleSection: { gap: spacing.sm },
  roleTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  roleCards: { flexDirection: 'row', gap: spacing.md },
  roleCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center', gap: 6,
  },
  roleCardActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  roleIcon: { fontSize: 28 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  roleLabelActive: { color: colors.primary },
  roleSub: { fontSize: 10, color: colors.textMuted },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
    color: colors.textPrimary, fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
