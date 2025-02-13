import React, { useState, useEffect } from 'react';
import { 
  Plus,
  X,
  Clock,
  Calendar,
  Users,
  BookOpen,
  Trash2,
  Settings,
  Save,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase, getOrCreateTeacherProfile } from '../lib/supabase';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  full_name: string;
}

interface ScheduleItem {
  id: string;
  student: Student;
  subject: string;
  day_of_week: string;
  time_slot: string;
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

const DEFAULT_TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00'
];

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [newLesson, setNewLesson] = useState({
    student_id: '',
    subject: '',
    day_of_week: DAYS_OF_WEEK[0],
    time_slot: DEFAULT_TIME_SLOTS[0]
  });
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    initializeSchedule();
  }, []);

  const initializeSchedule = async () => {
    try {
      setLoading(true);
      const profile = await getOrCreateTeacherProfile();
      setTeacherId(profile.id);

      // Fetch time slots
      const { data: timeSlots } = await supabase
        .from('teacher_time_slots')
        .select('time_slots')
        .eq('teacher_id', profile.id)
        .single();

      if (timeSlots) {
        setSelectedTimeSlots(timeSlots.time_slots);
      } else {
        // Create default time slots
        await supabase
          .from('teacher_time_slots')
          .insert([{
            teacher_id: profile.id,
            time_slots: DEFAULT_TIME_SLOTS
          }]);
      }

      await Promise.all([
        fetchSchedule(profile.id),
        fetchStudents(profile.id)
      ]);
    } catch (error: any) {
      console.error('Schedule initialization error:', error);
      toast.error('Program yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select(`
          id,
          student:students (
            id,
            full_name
          ),
          subject,
          day_of_week,
          time_slot
        `)
        .eq('teacher_id', teacherId)
        .order('time_slot', { ascending: true });

      if (error) throw error;
      setSchedule(data || []);
    } catch (error: any) {
      console.error('Schedule fetch error:', error);
      toast.error('Ders programı yüklenirken bir hata oluştu');
    }
  };

  const fetchStudents = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('teacher_id', teacherId)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Students fetch error:', error);
      toast.error('Öğrenciler yüklenirken bir hata oluştu');
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) return;

    try {
      const { data, error } = await supabase
        .from('schedule')
        .insert([{
          teacher_id: teacherId,
          student_id: newLesson.student_id,
          subject: newLesson.subject,
          day_of_week: newLesson.day_of_week,
          time_slot: newLesson.time_slot
        }])
        .select(`
          id,
          student:students (
            id,
            full_name
          ),
          subject,
          day_of_week,
          time_slot
        `)
        .single();

      if (error) throw error;

      setSchedule([...schedule, data]);
      setShowModal(false);
      setNewLesson({
        student_id: '',
        subject: '',
        day_of_week: DAYS_OF_WEEK[0],
        time_slot: selectedTimeSlots[0]
      });
      toast.success('Ders başarıyla eklendi');
    } catch (error: any) {
      console.error('Lesson add error:', error);
      toast.error('Ders eklenirken bir hata oluştu');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('schedule')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      setSchedule(schedule.filter(item => item.id !== lessonId));
      toast.success('Ders başarıyla silindi');
    } catch (error: any) {
      console.error('Lesson delete error:', error);
      toast.error('Ders silinirken bir hata oluştu');
    }
  };

  const handleUpdateTimeSlots = async () => {
    if (!teacherId) return;

    try {
      const { error } = await supabase
        .from('teacher_time_slots')
        .upsert({
          teacher_id: teacherId,
          time_slots: selectedTimeSlots
        });

      if (error) throw error;

      setShowTimeSlotModal(false);
      toast.success('Saat aralıkları güncellendi');
    } catch (error: any) {
      console.error('Time slots update error:', error);
      toast.error('Saat aralıkları güncellenirken bir hata oluştu');
    }
  };

  const handleExportSchedule = async () => {
    try {
      // Create table header cells
      const headerCells = ['Saat', ...DAYS_OF_WEEK].map(text => 
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: AlignmentType.CENTER,
          shading: {
            fill: "E8EAED"
          }
        })
      );

      // Create table rows for each time slot
      const rows = selectedTimeSlots.map(timeSlot => {
        const cells = [
          // Time slot cell
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: timeSlot, bold: true })],
              alignment: AlignmentType.CENTER
            })],
            verticalAlign: AlignmentType.CENTER
          }),
          // Day cells
          ...DAYS_OF_WEEK.map(day => {
            const lesson = schedule.find(
              item => item.day_of_week === day && item.time_slot === timeSlot
            );

            return new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({
                    text: lesson ? `${lesson.student.full_name}\n${lesson.subject}` : '',
                    break: true
                  })
                ],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: AlignmentType.CENTER
            });
          })
        ];

        return new TableRow({ children: cells });
      });

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Haftalık Ders Programı', bold: true, size: 32 })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Table({
              rows: [
                new TableRow({ children: headerCells }),
                ...rows
              ],
              width: {
                size: 100,
                type: "pct"
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 }
              }
            })
          ]
        }]
      });

      // Generate and save file
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'ders-programi.docx');
      toast.success('Ders programı başarıyla indirildi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ders programı dışa aktarılırken bir hata oluştu');
    }
  };

  // Group lessons by day for mobile view
  const groupedLessons = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = schedule.filter(lesson => lesson.day_of_week === day)
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Araç Çubuğu */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Ders Programı
          </h2>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-end">
            <button
              onClick={handleExportSchedule}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Download className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Word'e Aktar</span>
              <span className="sm:hidden">Aktar</span>
            </button>
            <button
              onClick={() => setShowTimeSlotModal(true)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <Settings className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Saat Ayarları</span>
              <span className="sm:hidden">Ayarlar</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Yeni Ders</span>
              <span className="sm:hidden">Ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Calendar View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Saat
                </th>
                {DAYS_OF_WEEK.map(day => (
                  <th
                    key={day}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedTimeSlots.map(timeSlot => (
                <tr key={timeSlot}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {timeSlot}
                  </td>
                  {DAYS_OF_WEEK.map(day => {
                    const lesson = schedule.find(
                      item => item.day_of_week === day && item.time_slot === timeSlot
                    );

                    return (
                      <td
                        key={day}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                      >
                        {lesson && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {lesson.student.full_name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {lesson.subject}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-4">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setExpandedDay(expandedDay === day ? null : day)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {day}
              </h3>
              {expandedDay === day ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {expandedDay === day && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupedLessons[day].length > 0 ? (
                  groupedLessons[day].map(lesson => (
                    <div key={lesson.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {lesson.time_slot} - {lesson.student.full_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {lesson.subject}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Bu gün için ders yok
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Yeni Ders Ekle
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Öğrenci
                </label>
                <select
                  required
                  value={newLesson.student_id}
                  onChange={(e) => setNewLesson({ ...newLesson, student_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Öğrenci Seçin</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ders
                </label>
                <input
                  type="text"
                  required
                  value={newLesson.subject}
                  onChange={(e) => setNewLesson({ ...newLesson, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Matematik"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gün
                </label>
                <select
                  required
                  value={newLesson.day_of_week}
                  onChange={(e) => setNewLesson({ ...newLesson, day_of_week: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Saat
                </label>
                <select
                  required
                  value={newLesson.time_slot}
                  onChange={(e) => setNewLesson({ ...newLesson, time_slot: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {selectedTimeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saat Ayarları Modalı */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Saat Ayarları
              </h3>
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ders saatlerini seçin
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_TIME_SLOTS.map(time => (
                  <label
                    key={time}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTimeSlots.includes(time)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTimeSlots([...selectedTimeSlots, time].sort());
                        } else {
                          setSelectedTimeSlots(selectedTimeSlots.filter(t => t !== time));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {time}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTimeSlotModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateTimeSlots}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}