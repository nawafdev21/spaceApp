import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken(userId) {
  if (!Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: true,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  if (!token) return;

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

export async function sendPushToUser(userId, title, body) {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.token) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      to: data.token,
      title,
      body,
      sound: 'default',
      priority: 'high',
    }),
  });
}
