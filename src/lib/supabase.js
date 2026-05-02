import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: استبدل هذين القيمتين بمعلومات مشروعك من Supabase → Settings → API
const SUPABASE_URL = 'https://znwjfnvbbnfjdkkpiirg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VA8ml2gspNMKFI0sK_syeQ_fmj2nHxe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
