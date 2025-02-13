import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp,
  Calendar,
  Check,
  Clock,
  AlertCircle,
  Trash2,
  ChevronRight,
  BookOpenCheck,
  CalendarClock,
  CircleDollarSign,
  GraduationCap,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { supabase, getOrCreateTeacherProfile } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Stats {
  totalStudents: number;
  activeClasses: number;
  monthlyIncome: number;
  estimatedIncome: number;
  successRate: number;
}

interface Lesson {
  id: string;
  student: {
    full_name: string;
  };
  subject: string;
  day_of_week: string;
  start_time: string;
  status?: 'completed' | 'postponed';
  postponed_to?: string;
  postpone_reason?: string;
  price_per_hour: number;
}

const DAYS_OF_WEEK = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar'
];

export default function Dashboard() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeClasses: 0,
    monthlyIncome: 0,
    estimatedIncome: 0,
    successRate: 0
  });

  const fetchStats = async (teacherId: string) => {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', teacherId);

      if (!students) {
        return;
      }

      const studentIds = students.map(s => s.id);

      const { data: activeLessons } = await supabase
        .from('lessons')
        .select('id, price_per_hour')
        .is('status', null)
        .in('student_id', studentIds);

      const { data: completedLessons } = await supabase
        .from('lessons')
        .select('id, price_per_hour')
        .eq('status', 'completed')
        .in('student_id', studentIds);

      // Gerçek aylık geliri hesapla (ödemeler tablosundan)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('payment_date', startOfMonth.toISOString())
        .in('student_id', studentIds);

      const totalLessons = (activeLessons?.length || 0) + (completedLessons?.length || 0);
      const estimatedIncome = (completedLessons || []).reduce((sum, lesson) => sum + (lesson.price_per_hour || 0), 0);
      const monthlyIncome = (monthlyPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const successRate = totalLessons > 0 ? (completedLessons?.length || 0) / totalLessons * 100 : 0;

      setStats({
        totalStudents: students.length,
        activeClasses: activeLessons?.length || 0,
        monthlyIncome,
        estimatedIncome,
        successRate: Math.round(successRate)
      });
    } catch (error: any) {
      console.error('İstatistikler yüklenirken hata:', error);
      toast.error('İstatistikler yüklenirken bir hata oluştu');
    }
  };

  const fetchLessons = async (teacherId: string) => {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', teacherId);

      if (!students?.length) {
        setLessons([]);
        return;
      }

      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          student:students(full_name),
          subject,
          day_of_week,
          start_time,
          status,
          postponed_to,
          postpone_reason,
          price_per_hour
        `)
        .in('student_id', students.map(s => s.id))
        .order('start_time', { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (error: any) {
      console.error('Ders yükleme hatası:', error);
      toast.error('Dersler yüklenirken bir hata oluştu');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast.success('Ders başarıyla silindi');
      if (teacherId) {
        await Promise.all([
          fetchLessons(teacherId),
          fetchStats(teacherId)
        ]);
      }
    } catch (error: any) {
      console.error('Ders silme hatası:', error);
      toast.error('Ders silinirken bir hata oluştu');
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!teacherId) return;
    
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ status: 'completed' })
        .eq('id', lessonId);

      if (error) throw error;

      toast.success('Ders tamamlandı olarak işaretlendi');
      await Promise.all([
        fetchLessons(teacherId),
        fetchStats(teacherId)
      ]);
    } catch (error: any) {
      console.error('Ders güncelleme hatası:', error);
      toast.error('Ders durumu güncellenirken bir hata oluştu');
    }
  };

  const handlePostponeLesson = async (lessonId: string, postponedTo: string, reason: string) => {
    if (!teacherId) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          status: 'postponed',
          postponed_to: postponedTo,
          postpone_reason: reason
        })
        .eq('id', lessonId);

      if (error) throw error;

      toast.success('Ders ertelendi');
      setShowPostponeModal(false);
      setSelectedLesson(null);
      await Promise.all([
        fetchLessons(teacherId),
        fetchStats(teacherId)
      ]);
    } catch (error: any) {
      console.error('Ders erteleme hatası:', error);
      toast.error('Ders ertelenirken bir hata oluştu');
    }
  };

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      const profile = await getOrCreateTeacherProfile();
      setTeacherId(profile.id);
      await Promise.all([
        fetchStats(profile.id),
        fetchLessons(profile.id)
      ]);
    } catch (error: any) {
      console.error('Dashboard yükleme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeDashboard();
  }, []);

  const groupLessonsByDay = () => {
    const grouped: { [key: string]: Lesson[] } = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = lessons.filter(lesson => lesson.day_of_week === day);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const groupedLessons = groupLessonsByDay();

  return (
    <div className="space-y-8">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-gray-900/5 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-3 rounded-lg">
                <Users className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Öğrenci</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalStudents}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-gray-900/5 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 p-3 rounded-lg">
                <BookOpenCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktif Dersler</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.activeClasses}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-gray-900/5 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-3 rounded-lg">
                <CircleDollarSign className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tahmini Gelir</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ₺{stats.estimatedIncome}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-gray-900/5 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 p-3 rounded-lg">
                <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aylık Gelir</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ₺{stats.monthlyIncome}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-gray-900/5 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-3 rounded-lg">
                <TrendingUp className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Başarı Oranı</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  %{stats.successRate}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Haftalık Ders Programı */}
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-75"></div>
            <div className="relative bg-white dark:bg-gray-800 p-2 rounded-lg">
              <CalendarClock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Haftalık Ders Programı
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-300"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                  <h3 className="text-lg font-bold text-white">{day}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {groupedLessons[day]?.length > 0 ? (
                    groupedLessons[day].map((lesson) => (
                      <div
                        key={lesson.id}
                        className="group/lesson relative bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transform hover:-translate-y-1 transition-all duration-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 opacity-0 group-hover/lesson:opacity-100 rounded-lg transition-opacity duration-200"></div>
                        <div className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-2 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {lesson.student.full_name}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {lesson.subject}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {lesson.start_time}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200
                              ${lesson.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : lesson.status === 'postponed'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}
                            >
                              {lesson.status === 'completed' && (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Tamamlandı
                                </>
                              )}
                              {lesson.status === 'postponed' && (
                                <>
                                  <Clock className="mr-1 h-3 w-3" />
                                  Ertelendi
                                </>
                              )}
                              {!lesson.status && (
                                <>
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Planlandı
                                </>
                              )}
                            </span>
                            <div className="flex space-x-2 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-200">
                              {!lesson.status && (
                                <>
                                  <button
                                    onClick={() => handleLessonComplete(lesson.id)}
                                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors duration-200"
                                    title="Tamamlandı olarak işaretle"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedLesson(lesson);
                                      setShowPostponeModal(true);
                                    }}
                                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 transition-colors duration-200"
                                    title="Ertele"
                                  >
                                    <Clock className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                              {lesson.status === 'postponed' && (
                                <button
                                  onClick={() => handleLessonComplete(lesson.id)}
                                  className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors duration-200"
                                  title="Tamamlandı olarak işaretle"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200"
                                title="Sil"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Bu gün için ders yok
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Erteleme Modal */}
      {showPostponeModal && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Dersi Ertele
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const postponedTo = (form.elements.namedItem('postponedTo') as HTMLInputElement).value;
              const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
              handlePostponeLesson(selectedLesson.id, postponedTo, reason);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Yeni Tarih
                  </label>
                  <input
                    type="datetime-local"
                    name="postponedTo"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Erteleme Nedeni
                  </label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  ></textarea>
                </div>
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostponeModal(false);
                    setSelectedLesson(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ertele
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}