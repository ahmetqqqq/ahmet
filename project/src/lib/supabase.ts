import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase bağlantı bilgileri eksik! Lütfen .env dosyasını kontrol edin.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

// Öğretmen profili oluşturma veya getirme
export const getOrCreateTeacherProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Oturum açmanız gerekiyor');
    }

    // Önce mevcut profili kontrol et
    const { data: existingProfile, error: fetchError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    // Profil yoksa yeni profil oluştur
    const { data: newProfile, error: insertError } = await supabase
      .from('teacher_profiles')
      .insert([{
        user_id: user.id,
        full_name: user.email?.split('@')[0] || 'Yeni Öğretmen',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Profil oluşturma hatası:', insertError);
      throw new Error('Profil oluşturulamadı');
    }

    return newProfile;
  } catch (error: any) {
    console.error('Öğretmen profili işlemi hatası:', error);
    throw error;
  }
};