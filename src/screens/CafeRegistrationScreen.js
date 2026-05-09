import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Switch, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const WIFI_OPTIONS = ['بطيء', 'متوسط', 'سريع', 'سريع جداً'];
const NOISE_OPTIONS = ['هادئ جداً', 'هادئ', 'متوسط', 'صاخب'];
const PAYMENT_OPTIONS = ['كاش', 'بطاقة', 'STC Pay', 'Apple Pay'];

const STEPS = ['المعلومات', 'الموقع', 'التفاصيل', 'المميزات'];

function extractCoordsFromMapsLink(url) {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  return null;
}

const TIME_OPTIONS = [
  '5:00 ص','5:30 ص','6:00 ص','6:30 ص','7:00 ص','7:30 ص',
  '8:00 ص','8:30 ص','9:00 ص','9:30 ص','10:00 ص','10:30 ص',
  '11:00 ص','11:30 ص','12:00 م','12:30 م','1:00 م','1:30 م',
  '2:00 م','2:30 م','3:00 م','3:30 م','4:00 م','4:30 م',
  '5:00 م','5:30 م','6:00 م','6:30 م','7:00 م','7:30 م',
  '8:00 م','8:30 م','9:00 م','9:30 م','10:00 م','10:30 م',
  '11:00 م','11:30 م','12:00 ص','12:30 ص','1:00 ص','1:30 ص','2:00 ص',
];

function TimePicker({ value, onChange, placeholder, error }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.input, error && styles.inputError, { justifyContent: 'center' }]}
      >
        <Text style={{ color: value ? colors.textPrimary : colors.textMuted, fontSize: 14 }}>
          {value || placeholder || 'اختر الوقت'}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.header}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={pickerStyles.cancel}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={pickerStyles.title}>اختر الوقت</Text>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[pickerStyles.option, value === opt && pickerStyles.optionSelected]}
                  onPress={() => { onChange(opt); setVisible(false); }}
                >
                  <Text style={[pickerStyles.optionText, value === opt && pickerStyles.optionTextSelected]}>
                    {opt}
                  </Text>
                  {value === opt && <Text style={{ color: colors.primary, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StepIndicator({ current, total, isEditing, onPress }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.stepItem}>
          <TouchableOpacity
            onPress={() => onPress(i)}
            disabled={!isEditing && i > current}
          >
            <View style={[styles.stepDot, i <= current && styles.stepDotActive]}>
              {i < current
                ? <Text style={styles.stepCheck}>✓</Text>
                : <Text style={[styles.stepNum, i === current && styles.stepNumActive]}>{i + 1}</Text>
              }
            </View>
          </TouchableOpacity>
          {i < total - 1 && (
            <View style={[styles.stepLine, i < current && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

function Field({ label, children, error }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>⚠ {error}</Text> : null}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, error }) {
  return (
    <TextInput
      style={[
        styles.input,
        multiline && { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
        error && styles.inputError,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlign="right"
    />
  );
}

function OptionGroup({ options, selected, onSelect }) {
  return (
    <View style={styles.optionGroup}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionPill, selected === opt && styles.optionPillActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.optionText, selected === opt && styles.optionTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MultiSelect({ options, selected, onToggle }) {
  return (
    <View style={styles.optionGroup}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.optionPill, active && styles.optionPillActive]}
            onPress={() => onToggle(opt)}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Toggle({ label, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryGlow }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
      <Text style={styles.toggleLabel}>{label}</Text>
    </View>
  );
}

export default function CafeRegistrationScreen({ navigation, route }) {
  const { user } = useAuth();
  const existing = route.params?.cafe ?? null;
  const isEditing = !!existing;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1 — Basic Info
  const [name, setName] = useState(existing?.name ?? '');
  const [area, setArea] = useState(existing?.area ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [instagram, setInstagram] = useState(existing?.instagram ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');

  // Step 2 — Location
  const [mapsLink, setMapsLink] = useState(existing?.maps_link ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [coordsFound, setCoordsFound] = useState(
    existing?.lat ? { lat: existing.lat, lng: existing.lng } : null
  );

  // Step 3 — Details
  const [totalSeats, setTotalSeats] = useState(existing?.total_seats?.toString() ?? '');
  const [privateSeats, setPrivateSeats] = useState(existing?.private_seats?.toString() ?? '');
  const [openTime, setOpenTime] = useState(existing?.open_time ?? '');
  const [closeTime, setCloseTime] = useState(existing?.close_time ?? '');
  const [wifi, setWifi] = useState(existing?.wifi ?? 'سريع');
  const [noise, setNoise] = useState(existing?.noise ?? 'هادئ');
  const [charging, setCharging] = useState(existing?.charging ?? false);

  // Step 4 — Features
  const [hasParking, setHasParking] = useState(existing?.has_parking ?? false);
  const [familySection, setFamilySection] = useState(existing?.family_section ?? false);
  const [minConsumption, setMinConsumption] = useState(existing?.min_consumption ?? '');
  const [payments, setPayments] = useState(existing?.payment_methods ?? []);
  const [fridayHours, setFridayHours] = useState(existing?.friday_hours ?? '');

  function handleMapsLink(url) {
    setMapsLink(url);
    const coords = extractCoordsFromMapsLink(url);
    setCoordsFound(coords);
  }

  function togglePayment(method) {
    setPayments(prev =>
      prev.includes(method) ? prev.filter(p => p !== method) : [...prev, method]
    );
  }

  function validateStep() {
    const newErrors = {};
    if (step === 0) {
      if (!name.trim()) newErrors.name = 'الرجاء تعبئة هذا الحقل';
      if (!area.trim()) newErrors.area = 'الرجاء تعبئة هذا الحقل';
    }
    if (step === 1) {
      if (!mapsLink.trim()) newErrors.mapsLink = 'الرجاء تعبئة هذا الحقل';
    }
    if (step === 2) {
      if (!totalSeats || isNaN(Number(totalSeats))) newErrors.totalSeats = 'الرجاء تعبئة هذا الحقل';
      if (!openTime.trim()) newErrors.openTime = 'الرجاء تعبئة هذا الحقل';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  }

  async function handleSubmit() {
    setLoading(true);
    const payload = {
      name: name.trim(),
      area: area.trim(),
      phone: phone.trim() || null,
      instagram: instagram.trim() || null,
      description: description.trim() || null,
      maps_link: mapsLink.trim(),
      address: address.trim() || null,
      lat: coordsFound?.lat ?? null,
      lng: coordsFound?.lng ?? null,
      total_seats: Number(totalSeats) || 0,
      private_seats: Number(privateSeats) || 0,
      open_time: openTime.trim(),
      close_time: closeTime.trim() || null,
      friday_hours: fridayHours.trim() || null,
      wifi, noise, charging,
      has_parking: hasParking,
      family_section: familySection,
      min_consumption: minConsumption.trim() || null,
      payment_methods: payments,
    };
    const query = isEditing
      ? supabase.from('cafes').update(payload).eq('id', existing.id)
      : supabase.from('cafes').insert({ ...payload, free_seats: Number(totalSeats) || 0, seats: [], status: 'pending', owner_id: user.id });

    const { error } = await query;
    setLoading(false);
    if (error) { Alert.alert('خطأ', error.message); return; }
    Alert.alert(
      isEditing ? 'تم الحفظ ✓' : 'تم الإرسال ✓',
      isEditing ? 'تم تحديث بيانات الكافيه' : 'طلبك قيد المراجعة وسيُنشر بعد الموافقة',
      [{ text: 'ممتاز', onPress: () => navigation.goBack() }]
    );
  }

  const stepContent = [
    // Step 0 — Basic Info
    <>
      <Field label="اسم الكافيه *" error={errors.name}>
        <Input value={name} onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: '' })); }} placeholder="مثال: كافيه السكون" error={!!errors.name} />
      </Field>
      <Field label="الحي / المنطقة *" error={errors.area}>
        <Input value={area} onChangeText={t => { setArea(t); setErrors(e => ({ ...e, area: '' })); }} placeholder="مثال: حي النزهة، الرياض" error={!!errors.area} />
      </Field>
      <Field label="رقم التواصل">
        <Input value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" />
      </Field>
      <Field label="حساب إنستقرام">
        <Input value={instagram} onChangeText={setInstagram} placeholder="@cafe_name" />
      </Field>
      <Field label="وصف مختصر">
        <Input value={description} onChangeText={setDescription} placeholder="ما يميّز كافيهك..." multiline numberOfLines={3} />
      </Field>
    </>,

    // Step 1 — Location
    <>
      <Field label="رابط قوقل ماب *" error={errors.mapsLink}>
        <Input value={mapsLink} onChangeText={t => { handleMapsLink(t); setErrors(e => ({ ...e, mapsLink: '' })); }} placeholder="https://maps.google.com/..." error={!!errors.mapsLink} />
        {mapsLink.length > 0 && (
          <View style={[styles.coordBadge, coordsFound ? styles.coordFound : styles.coordNotFound]}>
            <Text style={styles.coordText}>
              {coordsFound
                ? `✓ تم استخراج الإحداثيات: ${coordsFound.lat.toFixed(4)}, ${coordsFound.lng.toFixed(4)}`
                : '! لم تُستخرج الإحداثيات — أدخل رابطاً يحتوي على @lat,lng'}
            </Text>
          </View>
        )}
      </Field>
      <Field label="العنوان التفصيلي">
        <Input value={address} onChangeText={setAddress} placeholder="الشارع، المجمع، الدور..." multiline numberOfLines={2} />
      </Field>
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 للحصول على رابط مع إحداثيات: افتح قوقل ماب ← ابحث عن الكافيه ← شارك ← انسخ الرابط
        </Text>
      </View>
    </>,

    // Step 2 — Details
    <>
      <View style={styles.row}>
        <Field label="المقاعد الكلية *" error={errors.totalSeats}>
          <Input value={totalSeats} onChangeText={t => { setTotalSeats(t); setErrors(e => ({ ...e, totalSeats: '' })); }} placeholder="12" keyboardType="number-pad" error={!!errors.totalSeats} />
        </Field>
        <Field label="الغرف الخاصة">
          <Input value={privateSeats} onChangeText={setPrivateSeats} placeholder="2" keyboardType="number-pad" />
        </Field>
      </View>
      <View style={styles.row}>
        <Field label="وقت الفتح *" error={errors.openTime}>
          <TimePicker
            value={openTime}
            onChange={t => { setOpenTime(t); setErrors(e => ({ ...e, openTime: '' })); }}
            placeholder="اختر"
            error={!!errors.openTime}
          />
        </Field>
        <Field label="وقت الإغلاق">
          <TimePicker value={closeTime} onChange={setCloseTime} placeholder="اختر" />
        </Field>
      </View>
      <Field label="أوقات الخميس/الجمعة (إن اختلفت)">
        <Input value={fridayHours} onChangeText={setFridayHours} placeholder="2:00 م – 2:00 ص" />
      </Field>
      <Field label="سرعة الواي فاي">
        <OptionGroup options={WIFI_OPTIONS} selected={wifi} onSelect={setWifi} />
      </Field>
      <Field label="مستوى الضجيج">
        <OptionGroup options={NOISE_OPTIONS} selected={noise} onSelect={setNoise} />
      </Field>
      <Toggle label="منافذ شحن" value={charging} onValueChange={setCharging} />
    </>,

    // Step 3 — Features
    <>
      <Toggle label="موقف سيارات" value={hasParking} onValueChange={setHasParking} />
      <Toggle label="قسم عائلي" value={familySection} onValueChange={setFamilySection} />
      <Field label="الحد الأدنى للاستهلاك">
        <Input value={minConsumption} onChangeText={setMinConsumption} placeholder="مثال: لا يوجد — أو 30 ريال" />
      </Field>
      <Field label="وسائل الدفع المقبولة">
        <MultiSelect options={PAYMENT_OPTIONS} selected={payments} onToggle={togglePayment} />
      </Field>
      <View style={styles.reviewNote}>
        <Text style={styles.reviewNoteText}>
          ⏳ سيُراجع طلبك خلال 24 ساعة قبل النشر
        </Text>
      </View>
    </>,
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'تعديل بيانات الكافيه' : 'سجّل كافيهك'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepIndicator
        current={step}
        total={STEPS.length}
        isEditing={isEditing}
        onPress={i => { setErrors({}); setStep(i); }}
      />
      <Text style={styles.stepTitle}>{STEPS[step]}</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {stepContent[step]}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backStepText}>السابق</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && { flex: 1 }, loading && { opacity: 0.7 }]}
          onPress={nextStep}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.background} />
            : <Text style={styles.nextText}>
                {step === STEPS.length - 1 ? 'إرسال الطلب' : 'التالي'}
              </Text>
          }
        </TouchableOpacity>
      </View>
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

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, marginBottom: spacing.sm,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  stepNum: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  stepNumActive: { color: colors.primary },
  stepCheck: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  stepTitle: {
    ...typography.h2, fontSize: 14,
    paddingHorizontal: spacing.xl, marginBottom: spacing.lg,
    color: colors.textMuted,
  },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.lg },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14,
  },

  fieldError: { fontSize: 11, color: colors.full, marginTop: 4 },
  inputError: { borderColor: colors.full, borderWidth: 1.5 },

  row: { flexDirection: 'row', gap: spacing.md },

  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionPill: {
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionPillActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  optionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  optionTextActive: { color: colors.primary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  toggleLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

  coordBadge: {
    marginTop: 6, padding: spacing.sm,
    borderRadius: radius.sm, borderWidth: 1,
  },
  coordFound: { backgroundColor: colors.availableBg, borderColor: colors.available },
  coordNotFound: { backgroundColor: colors.lowBg, borderColor: colors.low },
  coordText: { fontSize: 11, color: colors.textSecondary },

  tip: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  tipText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  reviewNote: {
    backgroundColor: colors.primaryGlow, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderStrong, padding: spacing.md,
    marginTop: spacing.md,
  },
  reviewNoteText: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'center' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: spacing.md,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.lg, paddingBottom: 32,
  },
  backStepBtn: {
    flex: 0.4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  backStepText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  nextBtn: {
    flex: 0.6, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  nextText: { fontSize: 15, fontWeight: '700', color: colors.background },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:  { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  cancel: { color: colors.textMuted,   fontSize: 15, paddingHorizontal: 8 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primaryGlow },
  optionText: { color: colors.textSecondary, fontSize: 15 },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
});
