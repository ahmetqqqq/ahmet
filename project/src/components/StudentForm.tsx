import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, 
  Plus, 
  Trash2, 
  GraduationCap, 
  Phone, 
  Users, 
  Clock, 
  BookOpen, 
  CreditCard,
  Calendar 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

interface LessonSchedule {
  subject: string;
  day_of_week: string;
  start_time: string;
  price_per_hour: string;
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

const TIME_SLOTS = Array.from({ length: 7 }, (_, i) => `${i + 17}:00`);

export default function StudentForm({ onClose, onSuccess, initialData }: StudentFormProps) {
  const [loading, setLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: initialData?.full_name || '',
    grade: initialData?.grade || '',
    phone: initialData?.phone || '',
    parent_name: initialData?.parent_name || '',
    parent_phone: initialData?.parent_phone || '',
  });

  const [lessons, setLessons] = useState<LessonSchedule[]>([]);

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');

        const { data: teacherProfile, error } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!teacherProfile) throw new Error('Öğretmen profili bulunamadı');

        setTeacherId(teacherProfile.id);

        if (initialData) {
          const { data: lessonData, error: lessonError } = await supabase
            .from('lessons')
            .select('*')
            .eq('student_id', initialData.id);

          if (lessonError) throw lessonError;
          setLessons(lessonData.map((lesson: any) => ({
            subject: lesson.subject,
            day_of_week: lesson.day_of_week,
            start_time: lesson.start_time.substring(0, 5),
            price_per_hour: lesson.price_per_hour.toString()
          })));
        }
      } catch (error: any) {
        toast.error('Profil bilgileri alınamadı: ' + error.message);
        onClose();
      }
    };

    fetchTeacherProfile();
  }, [onClose, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      toast.error('Öğretmen profili bulunamadı');
      return;
    }

    setLoading(true);

    try {
      let studentId = initialData?.id;

      if (initialData) {
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert([{
            ...formData,
            teacher_id: teacherId
          }])
          .select()
          .single();

        if (error) throw error;
        studentId = data.id;
      }

      if (initialData) {
        const { error: deleteError } = await supabase
          .from('lessons')
          .delete()
          .eq('student_id', studentId);

        if (deleteError) throw deleteError;
      }

      if (lessons.length > 0) {
        const { error: lessonsError } = await supabase
          .from('lessons')
          .insert(
            lessons.map(lesson => ({
              student_id: studentId,
              subject: lesson.subject,
              day_of_week: lesson.day_of_week,
              start_time: lesson.start_time + ':00',
              price_per_hour: parseFloat(lesson.price_per_hour)
            }))
          );

        if (lessonsError) throw lessonsError;
      }

      toast.success(initialData ? 'Öğrenci başarıyla güncellendi' : 'Öğrenci başarıyla eklendi');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addLesson = () => {
    setLessons([
      ...lessons,
      {
        subject: '',
        day_of_week: DAYS_OF_WEEK[0],
        start_time: '17:00',
        price_per_hour: ''
      }
    ]);
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, field: keyof LessonSchedule, value: string) => {
    const newLessons = [...lessons];
    newLessons[index] = { ...newLessons[index], [field]: value };
    setLessons(newLessons);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full my-8 relative transform transition-all">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30"></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {initialData ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Öğrenci Bilgileri */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Öğrenci Bilgileri
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sınıf
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Veli Adı
                  </label>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Veli Telefonu
                  </label>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Ders Programı */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ders Programı
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addLesson}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ders Ekle
                </button>
              </div>

              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div
                    key={index}
                    className="relative group bg-gray-50 dark:bg-gray-700 rounded-xl p-6 transform transition-all duration-200 hover:shadow-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-200"></div>
                    <div className="relative">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Ders
                          </label>
                          <input
                            type="text"
                            required
                            value={lesson.subject}
                            onChange={(e) => updateLesson(index, 'subject', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                            placeholder="Matematik"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="h-4 w-4 mr-2" />
                            Gün
                          </label>
                          <select
                            value={lesson.day_of_week}
                            onChange={(e) => updateLesson(index, 'day_of_week', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                          >
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4 mr-2" />
                            Saat
                          </label>
                          <select
                            value={lesson.start_time}
                            onChange={(e) => updateLesson(index, 'start_time', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                          >
                            {TIME_SLOTS.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Saat Ücreti (₺)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              value={lesson.price_per_hour}
                              onChange={(e) => updateLesson(index, 'price_per_hour', e.target.value)}
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-colors duration-200"
                              placeholder="150"
                            />
                            <button
                              type="button"
                              onClick={() => removeLesson(index)}
                              className="absolute right-0 top-0 p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {lessons.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Henüz ders eklenmemiş
                    </p>
                    <button
                      type="button"
                      onClick={addLesson}
                      className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Dersi Ekle
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !teacherId}
                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? 'Kaydediliyor...' : initialData ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}