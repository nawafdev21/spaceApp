import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, TextInput, SafeAreaView, Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CAFES = [
  {
    id: '1',
    name: 'كافيه السكون',
    area: 'حي النزهة',
    distance: '2.1 كم',
    openTime: '7:00 ص',
    totalSeats: 12,
    freeSeats: 7,
    privateSeats: 2,
    wifi: 'سريع',
    charging: true,
    noise: 'هادئ',
    rating: 4.8,
    seats: ['free','free','taken','free','private','private','taken','free','free','free','taken','free'],
  },
  {
    id: '2',
    name: 'ورك هاوس',
    area: 'حي العليا',
    distance: '3.4 كم',
    openTime: '8:00 ص',
    totalSeats: 10,
    freeSeats: 2,
    privateSeats: 1,
    wifi: 'متوسط',
    charging: true,
    noise: 'متوسط',
    rating: 4.3,
    seats: ['taken','taken','taken','free','taken','private','taken','free','taken','taken'],
  },
  {
    id: '3',
    name: 'ذا بودكاست لاونج',
    area: 'حي الملقا',
    distance: '4.0 كم',
    openTime: '9:00 ص',
    totalSeats: 8,
    freeSeats: 0,
    privateSeats: 0,
    wifi: 'سريع',
    charging: false,
    noise: 'هادئ جداً',
    rating: 4.9,
    seats: ['taken','taken','taken','taken','taken','taken','taken','taken'],
  },
  {
    id: '4',
    name: 'بروان ستوديو',
    area: 'حي الروضة',
    distance: '5.2 كم',
    openTime: '7:30 ص',
    totalSeats: 14,
    freeSeats: 10,
    privateSeats: 3,
    wifi: 'سريع جداً',
    charging: true,
    noise: 'هادئ',
    rating: 4.6,
    seats: ['free','free','free','taken','free','private','free','private','free','free','private','free','free','taken'],
  },
];

const FILTERS = ['الكل', 'متاح الآن', 'غرف خاصة', 'الأقرب', 'الأهدأ'];

function AvailBadge({ free, total }) {
  const pct = free / total;
  let bg, tc, label;
  if (free === 0) { bg = colors.fullBg; tc = colors.full; label = 'ممتلئ'; }
  else if (pct < 0.3) { bg = colors.lowBg; tc = colors.low; label = `${free} متبقي`; }
  else { bg = colors.availableBg; tc = colors.available; label = `${free} مقاعد فارغة`; }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: tc }]}>{label}</Text>
    </View>
  );
}

function SeatMap({ seats }) {
  return (
    <View style={styles.seatMap}>
      {seats.map((s, i) => (
        <View
          key={i}
          style={[
            styles.seatDot,
            s === 'free' && { backgroundColor: colors.seatFree, borderColor: colors.available },
            s === 'taken' && { backgroundColor: colors.seatTaken, borderColor: 'transparent' },
            s === 'private' && { backgroundColor: colors.seatPrivate, borderColor: 'rgba(100,120,255,0.5)' },
          ]}
        />
      ))}
    </View>
  );
}

function CafeCard({ cafe, onPress }) {
  return (
    <TouchableOpacity style={styles.cafeCard} onPress={() => onPress(cafe)} activeOpacity={0.75}>
      <View style={styles.cafeCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.cafeSub}>{cafe.area} · {cafe.distance}</Text>
        </View>
        <AvailBadge free={cafe.freeSeats} total={cafe.totalSeats} />
      </View>

      <SeatMap seats={cafe.seats} />

      <View style={styles.cafeMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>◷</Text>
          <Text style={styles.metaText}>{cafe.openTime}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>⚡</Text>
          <Text style={styles.metaText}>واي فاي {cafe.wifi}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>★</Text>
          <Text style={[styles.metaText, { color: colors.primary }]}>{cafe.rating}</Text>
        </View>
        {cafe.charging && (
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>🔌</Text>
            <Text style={styles.metaText}>شحن</Text>
          </View>
        )}
      </View>

      {cafe.freeSeats > 0 && (
        <TouchableOpacity style={styles.bookNowBtn} onPress={() => onPress(cafe)}>
          <Text style={styles.bookNowText}>احجز الآن</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [search, setSearch] = useState('');
  const [cafes, setCafes] = useState(CAFES);
  const { user, signOut } = useAuth();

  useEffect(() => {
    async function fetchCafes() {
      const { data, error } = await supabase.from('cafes').select('*');
      if (!error && data?.length) {
        setCafes(data.map(c => ({
          ...c,
          freeSeats: c.free_seats,
          privateSeats: c.private_seats,
          openTime: c.open_time,
          totalSeats: c.total_seats,
        })));
      }
    }
    fetchCafes();
  }, []);

  const filtered = cafes.filter(c => {
    if (search && !c.name.includes(search) && !c.area.includes(search)) return false;
    if (activeFilter === 'متاح الآن') return c.freeSeats > 0;
    if (activeFilter === 'غرف خاصة') return c.privateSeats > 0;
    if (activeFilter === 'الأقرب') return parseFloat(c.distance) < 3.5;
    if (activeFilter === 'الأهدأ') return c.noise === 'هادئ' || c.noise === 'هادئ جداً';
    return true;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>صباح الإنتاج ☕</Text>
          <Text style={styles.subtitle}>ابحث عن مكانك قبل ما تطلع</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? 'م').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Live stats strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>
            {cafes.filter(c => c.freeSeats > 0).length}
          </Text>
          <Text style={styles.statLabel}>متاح الآن</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>
            {cafes.reduce((a, c) => a + c.freeSeats, 0)}
          </Text>
          <Text style={styles.statLabel}>مقعد فارغ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>
            {cafes.filter(c => c.privateSeats > 0).length}
          </Text>
          <Text style={styles.statLabel}>غرف خاصة</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن كافيه أو حي..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legItem}>
          <View style={[styles.legDot, { backgroundColor: colors.seatFree, borderColor: colors.available }]} />
          <Text style={styles.legText}>فارغ</Text>
        </View>
        <View style={styles.legItem}>
          <View style={[styles.legDot, { backgroundColor: colors.seatTaken }]} />
          <Text style={styles.legText}>محجوز</Text>
        </View>
        <View style={styles.legItem}>
          <View style={[styles.legDot, { backgroundColor: colors.seatPrivate, borderColor: 'rgba(100,120,255,0.5)' }]} />
          <Text style={styles.legText}>خاص</Text>
        </View>
      </View>

      {/* Cafe list */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◉</Text>
            <Text style={styles.emptyText}>لا توجد نتائج</Text>
          </View>
        ) : (
          filtered.map(cafe => (
            <CafeCard
              key={cafe.id}
              cafe={cafe}
              onPress={c => navigation.navigate('Booking', { cafe: c })}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        {[
          { icon: '⊞', label: 'الرئيسية', active: true, onPress: () => {} },
          { icon: '◎', label: 'اكتشف', active: false, onPress: () => {} },
          { icon: '◫', label: 'حجوزاتي', active: false, onPress: () => navigation.navigate('BookingsList') },
          {
            icon: '◯', label: 'حسابي', active: false,
            onPress: () => Alert.alert(
              'حسابي',
              user?.user_metadata?.full_name ?? user?.email ?? '',
              [
                { text: 'تسجيل الخروج', style: 'destructive', onPress: signOut },
                { text: 'إلغاء', style: 'cancel' },
              ]
            ),
          },
        ].map(n => (
          <TouchableOpacity key={n.label} style={styles.navItem} onPress={n.onPress}>
            <Text style={[styles.navIcon, n.active && { color: colors.primary }]}>{n.icon}</Text>
            <Text style={[styles.navLabel, n.active && { color: colors.primary }]}>{n.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  greeting: { ...typography.h1, fontSize: 20 },
  subtitle: { ...typography.caption, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },

  statsStrip: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, marginBottom: spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchIcon: { fontSize: 18, color: colors.textMuted, marginRight: spacing.sm },
  searchInput: { flex: 1, height: 44, color: colors.textPrimary, fontSize: 14 },

  filtersScroll: { marginBottom: spacing.sm },
  filterPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, backgroundColor: colors.surface },
  filterPillActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.textSecondary },
  filterTextActive: { color: colors.primary, fontWeight: '600' },

  legend: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: 16 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
  legText: { fontSize: 11, color: colors.textMuted },

  cafeCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cafeCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  cafeName: { ...typography.h2, fontSize: 15 },
  cafeSub: { ...typography.caption, marginTop: 2 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },

  seatMap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: spacing.md },
  seatDot: { width: 20, height: 20, borderRadius: 5, borderWidth: 1 },

  cafeMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12, color: colors.textMuted },
  metaText: { fontSize: 11, color: colors.textSecondary },

  bookNowBtn: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  bookNowText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 36, color: colors.textMuted, marginBottom: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 15 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 20, paddingTop: 12 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 20, color: colors.textMuted },
  navLabel: { fontSize: 10, color: colors.textMuted },
});
