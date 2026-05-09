import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CafeDetailScreen from './src/screens/CafeDetailScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingsListScreen from './src/screens/BookingsListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import CafeRegistrationScreen from './src/screens/CafeRegistrationScreen';
import CafeDashboardScreen from './src/screens/CafeDashboardScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { registerPushToken } from './src/lib/notifications';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then(val => setOnboardingDone(!!val));
  }, []);

  if (loading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  if (user) registerPushToken(user.id).catch(() => {});

  const role = user?.user_metadata?.role ?? 'user';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === 'admin' ? (
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        ) : role === 'cafe_owner' ? (
          <>
            <Stack.Screen name="CafeDashboard" component={CafeDashboardScreen} />
            <Stack.Screen name="CafeRegistration" component={CafeRegistrationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CafeDetail" component={CafeDetailScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="BookingsList" component={BookingsListScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="CafeRegistration" component={CafeRegistrationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
