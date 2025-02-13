import React, { useState, useEffect } from 'react';
import { 
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  UserPlus,
  GraduationCap,
  Phone,
  Users
} from 'lucide-react';
import { supabase, getOrCreateTeacherProfile } from '../lib/supabase';
import toast from 'react-hot-toast';

interface StudentsProps {
  onEditStudent: (student: any) => void;
}

export default function Students({ onEditStudent }: StudentsProps) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const fetchStudents = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', teacherId)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error('Öğrenciler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const initializeStudents = async () => {
    try {
      setLoading(true);
      const profile = await getOrCreateTeacherProfile();
      setTeacherId(profile.id);
      await fetchStudents(profile.id);
    } catch (error: any) {
      toast.error('Veriler yüklenirken bir hata oluştu');
      console.error('Students yükleme hatası:', error);
    }
  };

  useEffect(() => {
    initializeStudents();
  }, []);

  useEffect(() => {
    if (teacherId) {
      fetchStudents(teacherId);
    }
  }, [sortField, sortDirection, teacherId]);

  const handleDelete = async (studentId: string) => {
    if (!window.confirm('Bu öğrenciyi silmek istediğinizden emin misiniz? Tüm dersleri de silinecektir.')) return;

    try {
      // Önce öğrencinin var olduğunu kontrol et
      const { data: student, error: checkError } = await supabase
        .from('students')
        .select()
        .eq('id', studentId)
        .single();

      if (checkError || !student) {
        throw new Error('Öğrenci bulunamadı');
      }

      // Öğrencinin derslerini sil
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('student_id', studentId);

      if (lessonsError) {
        throw new Error('Dersler silinirken bir hata oluştu');
      }

      // Öğrenciyi sil
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (deleteError) {
        throw new Error('Öğrenci silinirken bir hata oluştu');
      }

      // State'i güncelle
      setStudents(prevStudents => 
        prevStudents.filter((student: any) => student.id !== studentId)
      );
      
      toast.success('Öğrenci başarıyla silindi');
    } catch (error: any) {
      console.error('Silme işlemi hatası:', error);
      toast.error(error.message || 'Silme işlemi sırasında bir hata oluştu');
    }
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredStudents = students.filter((student: any) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.grade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.parent_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Öğrenci ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={() => onEditStudent(null)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Yeni Öğrenci
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student: any) => (
          <div
            key={student.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {student.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {student.grade || 'Sınıf bilgisi yok'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditStudent(student)}
                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg transition-colors duration-200"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4 mr-2" />
                  {student.phone || 'Telefon bilgisi yok'}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Users className="h-4 w-4 mr-2" />
                  <div>
                    <p className="font-medium">{student.parent_name || 'Veli bilgisi yok'}</p>
                    {student.parent_phone && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.parent_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 inline-block mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Öğrenci Bulunamadı
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Arama kriterlerinize uygun öğrenci bulunmamaktadır.
          </p>
        </div>
      )}
    </div>
  );
}