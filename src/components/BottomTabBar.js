import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

const TABS = [
  { name: 'Home',         icon: '⊙', label: 'استكشف'  },
  { name: 'BookingsList', icon: '◫', label: 'حجوزاتي' },
  { name: 'Favorites',   icon: '♡', label: 'مفضلة'   },
  { name: 'Profile',     icon: '◯', label: 'حسابي'   },
];

export default function BottomTabBar({ active, navigation }) {
  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const isActive = active === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.item}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {tab.name === 'Favorites' && isActive ? '♥' : tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: 20, paddingTop: 12,
  },
  item:        { flex: 1, alignItems: 'center', gap: 3 },
  icon:        { fontSize: 20, color: colors.textMuted },
  iconActive:  { color: colors.primary },
  label:       { fontSize: 10, color: colors.textMuted },
  labelActive: { color: colors.primary },
});
