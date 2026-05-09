import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';

function CafeFavCard({ cafe, onPress, onRemove }) {
  const freeSeats  = cafe.free_seats ?? 0;
  const totalSeats = cafe.total_seats ?? 0;
  const pct = totalSeats > 0 ? freeSeats / totalSeats : 0;

  let badgeBg = colors.availableBg, badgeColor = colors.available, badgeLabel = `${freeSeats} فارغ`;
  if (freeSeats === 0)  { badgeBg = colors.fullBg; badgeColor = colors.full; badgeLabel = 'ممتلئ'; }
  else if (pct < 0.3)  { badgeBg = colors.lowBg;  badgeColor = colors.low;  badgeLabel = `${freeSeats} متبقي`; }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(cafe)} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.cafeSub}>{cafe.area}{cafe.distance ? ` · ${cafe.distance}` : ''}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        {cafe.wifi ? <Text style={styles.metaChip}>⚡ {cafe.wifi}</Text> : null}
        {cafe.noise ? <Text style={styles.metaChip}>◍ {cafe.noise}</Text> : null}
        {cafe.rating ? <Text style={[styles.metaChip, { color: colors.primary }]}>★ {cafe.rating}</Text> : null}
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(cafe)}>
        <Text style={styles.removeBtnText}>إزالة من المفضلة</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, cafe_id, cafes(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setFavorites((data ?? []).map(f => ({ favId: f.id, ...f.cafes })));
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFavorites().finally(() => setLoading(false));
    }, [fetchFavorites])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  }

  async function handleRemove(cafe) {
    await supabase.from('favorites').delete().eq('id', cafe.favId);
    setFavorites(prev => prev.filter(f => f.favId !== cafe.favId));
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>المفضلة</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>لا توجد مفضلات بعد</Text>
          <Text style={styles.emptySub}>اضغط ♡ في أي كافيه لإضافته هنا</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.startBtnText}>استكشف الكافيهات</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {favorites.map(cafe => (
            <CafeFavCard
              key={cafe.favId}
              cafe={cafe}
              onPress={c => navigation.navigate('CafeDetail', { cafe: c })}
              onRemove={handleRemove}
            />
          ))}
        </ScrollView>
      )}

      <BottomTabBar active="Favorites" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.textPrimary, fontSize: 22, lineHeight: 26 },
  title: { ...typography.h1, fontSize: 18 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 52, color: colors.textMuted, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  emptySub: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xl },
  startBtn: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.xl },
  startBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 90, gap: spacing.md },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cafeName: { ...typography.h2, fontSize: 15 },
  cafeSub: { ...typography.caption, marginTop: 2 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: 10, marginBottom: spacing.md, flexWrap: 'wrap' },
  metaChip: { fontSize: 11, color: colors.textSecondary },
  removeBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center' },
  removeBtnText: { fontSize: 12, color: colors.textMuted },
});
