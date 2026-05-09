import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView, Linking, Image,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

function getMapThumbnail(lat, lng) {
  if (!lat || !lng) return null;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=600x300&markers=${lat},${lng},ol-marker`;
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SEAT_TYPES = [
  { id: 'open',    icon: '⬚', label: 'مفتوح',   col: 'open_seats' },
  { id: 'quiet',   icon: '◈', label: 'هادئ',    col: 'quiet_seats' },
  { id: 'private', icon: '⬡', label: 'خاص',     col: 'private_seats' },
  { id: 'outdoor', icon: '◎', label: 'خارجي',   col: 'outdoor_seats' },
  { id: 'bar',     icon: '◌', label: 'بار',     col: 'bar_seats' },
  { id: 'podcast', icon: '◉', label: 'بودكاست', col: 'podcast_seats' },
];

export default function CafeDetailScreen({ route, navigation }) {
  const { cafe } = route.params;
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState(null);

  const freeSeats   = cafe.free_seats    ?? cafe.freeSeats    ?? 0;
  const totalSeats  = cafe.total_seats   ?? cafe.totalSeats   ?? 0;
  const privSeats   = cafe.private_seats ?? cafe.privateSeats ?? 0;
  const openTime    = cafe.open_time     ?? cafe.openTime     ?? '';

  useEffect(() => {
    if (!cafe.id) return;
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('cafe_id', cafe.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setIsFav(true); setFavId(data.id); }
      });
  }, [cafe.id, user.id]);

  async function toggleFav() {
    if (isFav) {
      await supabase.from('favorites').delete().eq('id', favId);
      setIsFav(false);
      setFavId(null);
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, cafe_id: cafe.id })
        .select('id')
        .single();
      if (data) { setIsFav(true); setFavId(data.id); }
    }
  }

  const availSeatTypes = SEAT_TYPES.filter(t => (cafe.seat_types ?? []).includes(t.id));

  const pct = totalSeats > 0 ? freeSeats / totalSeats : 0;
  let availColor = colors.available, availBg = colors.availableBg, availLabel = `${freeSeats} مقعد فارغ`;
  if (freeSeats === 0)    { availColor = colors.full; availBg = colors.fullBg; availLabel = 'ممتلئ'; }
  else if (pct < 0.3)    { availColor = colors.low;  availBg = colors.lowBg;  availLabel = `${freeSeats} متبقي`; }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{cafe.name}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleFav} disabled={!cafe.id}>
          <Text style={[styles.heartIcon, isFav && styles.heartActive]}>{isFav ? '♥' : '♡'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Cafe photo or map thumbnail */}
        {(cafe.photo_url || getMapThumbnail(cafe.lat, cafe.lng)) ? (
          <Image
            source={{ uri: cafe.photo_url || getMapThumbnail(cafe.lat, cafe.lng) }}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        ) : null}

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.availBadge, { backgroundColor: availBg }]}>
              <Text style={[styles.availText, { color: availColor }]}>{availLabel}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {cafe.rating}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statNum}>{totalSeats}</Text><Text style={styles.statLabel}>إجمالي</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statNum}>{freeSeats}</Text><Text style={styles.statLabel}>فارغة</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statNum}>{privSeats}</Text><Text style={styles.statLabel}>غرف خاصة</Text></View>
          </View>
        </View>

        {/* Info chips */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>معلومات</Text>
          <View style={styles.chipsWrap}>
            {openTime ? <View style={styles.chip}><Text style={styles.chipText}>◷ يفتح {openTime}</Text></View> : null}
            {cafe.close_time ? <View style={styles.chip}><Text style={styles.chipText}>◷ يغلق {cafe.close_time}</Text></View> : null}
            {cafe.wifi ? <View style={styles.chip}><Text style={styles.chipText}>⚡ واي فاي {cafe.wifi}</Text></View> : null}
            {cafe.noise ? <View style={styles.chip}><Text style={styles.chipText}>◍ {cafe.noise}</Text></View> : null}
            {cafe.charging ? <View style={styles.chip}><Text style={styles.chipText}>⊕ شحن متاح</Text></View> : null}
            {cafe.has_parking ? <View style={styles.chip}><Text style={styles.chipText}>◉ باركنج</Text></View> : null}
            {cafe.family_section ? <View style={styles.chip}><Text style={styles.chipText}>◈ قسم عائلي</Text></View> : null}
            {cafe.min_consumption ? <View style={styles.chip}><Text style={styles.chipText}>◎ حد أدنى {cafe.min_consumption}</Text></View> : null}
            {cafe.area ? <View style={styles.chip}><Text style={styles.chipText}>📍 {cafe.area}</Text></View> : null}
            {cafe.distance ? <View style={styles.chip}><Text style={styles.chipText}>⊙ {cafe.distance}</Text></View> : null}
          </View>
        </View>

        {/* Description */}
        {cafe.description ? (
          <View style={styles.section}>
            <Text style={styles.secLabel}>عن الكافيه</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{cafe.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Seat types */}
        {availSeatTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.secLabel}>أنواع المقاعد</Text>
            <View style={styles.seatTypeRow}>
              {availSeatTypes.map(t => (
                <View key={t.id} style={styles.seatTypeCard}>
                  <Text style={styles.seatTypeIcon}>{t.icon}</Text>
                  <Text style={styles.seatTypeLabel}>{t.label}</Text>
                  <Text style={styles.seatTypeCount}>{cafe[t.col]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.secLabel}>تواصل</Text>
          <View style={styles.contactCard}>
            {cafe.maps_link ? (
              <TouchableOpacity style={[styles.contactRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(cafe.maps_link)}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text style={styles.contactText}>الموقع</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noContact}>لم يُضاف الموقع بعد</Text>
            )}
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bookBtn, freeSeats === 0 && styles.bookBtnDisabled]}
          disabled={freeSeats === 0}
          onPress={() => navigation.navigate('Booking', { cafe })}
        >
          <Text style={[styles.bookBtnText, freeSeats === 0 && { color: colors.textMuted }]}>
            {freeSeats === 0 ? 'الكافيه ممتلئ' : 'احجز مقعداً'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  iconBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.textPrimary, fontSize: 22, lineHeight: 26 },
  heartIcon: { fontSize: 16, color: colors.textMuted },
  heartActive: { color: '#FF4D6D' },
  topTitle: { flex: 1, ...typography.h2 },

  heroPhoto: { width: '100%', height: 200 },
  heroCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  availBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.full },
  availText: { fontSize: 12, fontWeight: '600' },
  ratingBadge: { backgroundColor: colors.primaryGlow, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderStrong },
  ratingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  section: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  secLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.sm },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 12, color: colors.textSecondary },

  descCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  descText: { fontSize: 13, color: colors.textSecondary, lineHeight: 22, textAlign: 'right' },

  seatTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatTypeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', flex: 1, minWidth: '28%' },
  seatTypeIcon: { fontSize: 20, color: colors.primary, marginBottom: 4 },
  seatTypeLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  seatTypeCount: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 2 },

  contactCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  contactIcon: { fontSize: 16 },
  contactText: { flex: 1, fontSize: 13, color: colors.textPrimary },
  arrow: { fontSize: 20, color: colors.textMuted },
  noContact: { fontSize: 13, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: 32 },
  bookBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
