import React, { useState, useEffect } from 'react';
import { 
  User,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Save,
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  Users,
  GraduationCap,
  DollarSign,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TeacherProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  subject: string;
  avatar_url?: string;
  email?: string;
}

interface ProfileProps {
  profile: TeacherProfile | null;
  onProfileUpdate: (profile: TeacherProfile) => void;
}

function Profile({ profile: initialProfile, onProfileUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(initialProfile);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    fetchStats();
    setLoading(false);
  }, []);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacherProfile) return;

      // Öğrenci sayısı
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', teacherProfile.id);

      // Ders istatistikleri
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, status, price_per_hour')
        .in('student_id', students?.map(s => s.id) || []);

      // Ödeme toplamı
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .in('student_id', students?.map(s => s.id) || [])
        .eq('status', 'completed');

      setStats({
        totalStudents: students?.length || 0,
        totalLessons: lessons?.length || 0,
        completedLessons: lessons?.filter(l => l.status === 'completed').length || 0,
        totalEarnings: payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      });
    } catch (error: any) {
      console.error('Stats fetch error:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          subject: profile.subject
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      onProfileUpdate(data);
      toast.success('Profil başarıyla güncellendi');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploadingAvatar(true);

      // Dosya boyutunu kontrol et (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      }

      // Dosya tipini kontrol et
      if (!file.type.startsWith('image/')) {
        throw new Error('Sadece resim dosyaları yüklenebilir');
      }

      // Eski avatarı sil
      if (profile.avatar_url) {
        await supabase.storage
          .from('avatars')
          .remove([profile.avatar_url]);
      }

      // Yeni avatarı yükle
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Profili güncelle
      const { data, error: updateError } = await supabase
        .from('teacher_profiles')
        .update({
          avatar_url: filePath
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      onProfileUpdate(data);
      toast.success('Profil fotoğrafı güncellendi');
    } catch (error: any) {
      console.error('Avatar update error:', error);
      toast.error(error.message || 'Profil fotoğrafı güncellenirken bir hata oluştu');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) return;

    try {
      setUploadingAvatar(true);

      // Avatarı storage'dan sil
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([profile.avatar_url]);

      if (removeError) throw removeError;

      // Profildeki avatar_url'i temizle
      const { data, error: updateError } = await supabase
        .from('teacher_profiles')
        .update({
          avatar_url: null
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      onProfileUpdate(data);
      toast.success('Profil fotoğrafı kaldırıldı');
    } catch (error: any) {
      console.error('Avatar remove error:', error);
      toast.error('Profil fotoğrafı kaldırılırken bir hata oluştu');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Profil Bulunamadı
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Profil bilgilerinize ulaşılamadı. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Profil Başlığı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-500">
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 p-1">
                {profile.avatar_url ? (
                  <img
                    src={`${supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}`}
                    alt={profile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1.5 cursor-pointer hover:bg-indigo-700 transition-colors duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {profile.full_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Mail className="h-4 w-4 mr-2" />
            {profile.email}
          </p>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Toplam Öğrenci
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Toplam Ders
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalLessons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
              <Check className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tamamlanan Ders
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.completedLessons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Toplam Kazanç
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₺{stats.totalEarnings.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profil Formu */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Profil Bilgileri
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Branş
                </label>
                <input
                  type="text"
                  value={profile.subject || ''}
                  onChange={(e) => setProfile({ ...profile, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-posta
                </label>
                <input
                  type="email"
                  value={profile.email || ''}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;