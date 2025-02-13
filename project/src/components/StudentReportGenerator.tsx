import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  BookOpen, 
  TrendingUp,
  Download,
  X,
  Calendar,
  Clock,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, HeightRule, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface StudentReportProps {
  onClose: () => void;
}

interface Student {
  id: string;
  full_name: string;
  grade: string;
}

interface Lesson {
  id: string;
  subject: string;
  start_time: string;
  status: 'completed' | 'postponed' | null;
  price_per_hour: number;
}

export default function StudentReportGenerator({ onClose }: StudentReportProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teacherSignature, setTeacherSignature] = useState('');
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchLessons(selectedStudent);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Öğretmen profili bulunamadı');

      setTeacherName(profile.full_name);

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade')
        .eq('teacher_id', profile.id)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Students fetch error:', error);
      toast.error('Öğrenciler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error: any) {
      console.error('Lessons fetch error:', error);
      toast.error('Dersler yüklenirken bir hata oluştu');
    }
  };

  const calculateProgress = () => {
    if (!lessons.length) return 0;
    const completedLessons = lessons.filter(lesson => lesson.status === 'completed').length;
    return Math.round((completedLessons / lessons.length) * 100);
  };

  const generateReport = async () => {
    if (!selectedStudent || !teacherSignature) {
      toast.error('Lütfen öğrenci seçin ve imzanızı ekleyin');
      return;
    }

    try {
      setGenerating(true);
      const student = students.find(s => s.id === selectedStudent);
      if (!student) throw new Error('Öğrenci bulunamadı');

      const completedLessons = lessons.filter(l => l.status === 'completed');
      const totalLessons = lessons.length;
      const progress = calculateProgress();
      const totalHours = lessons.reduce((sum, lesson) => sum + 1, 0);
      const averagePrice = lessons.reduce((sum, lesson) => sum + lesson.price_per_hour, 0) / lessons.length;

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({ 
                  text: 'ÖĞRENCİ GELİŞİM RAPORU',
                  bold: true,
                  size: 32,
                  color: '2563EB'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),

            // Student Info
            new Paragraph({
              children: [
                new TextRun({ text: 'Öğrenci Bilgileri', bold: true, size: 24 })
              ],
              spacing: { after: 200 }
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Ad Soyad:', bold: true })] })],
                      width: { size: 30, type: 'percentage' }
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(student.full_name)] })]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Sınıf:', bold: true })] })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(student.grade || '-')] })]
                    })
                  ]
                })
              ],
              width: { size: 100, type: 'percentage' }
            }),

            // Progress Summary
            new Paragraph({
              children: [
                new TextRun({ text: '\nGenel Değerlendirme', bold: true, size: 24 })
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Toplam Ders Sayısı:', bold: true })] })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(totalLessons.toString())] })]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Tamamlanan Dersler:', bold: true })] })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(completedLessons.length.toString())] })]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'İlerleme Oranı:', bold: true })] })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(`%${progress}`)] })]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Toplam Ders Saati:', bold: true })] })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(`${totalHours} saat`)] })]
                    })
                  ]
                })
              ],
              width: { size: 100, type: 'percentage' }
            }),

            // Lesson Details
            new Paragraph({
              children: [
                new TextRun({ text: '\nDers Detayları', bold: true, size: 24 })
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Table({
              rows: [
                // Header Row
                new TableRow({
                  children: [
                    'Tarih',
                    'Konu',
                    'Durum'
                  ].map(text => 
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text, bold: true })],
                        alignment: AlignmentType.CENTER
                      })],
                      verticalAlign: AlignmentType.CENTER
                    })
                  )
                }),
                // Data Rows
                ...lessons.map(lesson => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({
                          children: [new TextRun(new Date(lesson.start_time).toLocaleDateString('tr-TR'))]
                        })]
                      }),
                      new TableCell({
                        children: [new Paragraph({
                          children: [new TextRun(lesson.subject)]
                        })]
                      }),
                      new TableCell({
                        children: [new Paragraph({
                          children: [new TextRun(
                            lesson.status === 'completed' ? 'Tamamlandı' :
                            lesson.status === 'postponed' ? 'Ertelendi' : 'Planlandı'
                          )]
                        })]
                      })
                    ]
                  })
                )
              ],
              width: { size: 100, type: 'percentage' }
            }),

            // Teacher Signature
            new Paragraph({
              children: [
                new TextRun({ text: '\nÖğretmen Değerlendirmesi ve İmza', bold: true, size: 24 })
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: teacherName + '\n', bold: true }),
                new TextRun(teacherSignature)
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 200 }
            })
          ]
        }]
      });

      // Generate and save file
      const blob = await Packer.toBlob(doc);
      const fileName = `${student.full_name.replace(/\s+/g, '_')}_Rapor_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);
      toast.success('Rapor başarıyla oluşturuldu');
      onClose();
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error('Rapor oluşturulurken bir hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Öğrenci Raporu Oluştur
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Öğrenci
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Öğrenci Seçin</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} {student.grade ? `- ${student.grade}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Toplam Ders</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {lessons.length}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">İlerleme</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        %{calculateProgress()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Öğretmen İmzası ve Değerlendirmesi
                  </label>
                  <textarea
                    value={teacherSignature}
                    onChange={(e) => setTeacherSignature(e.target.value)}
                    placeholder="Öğrenci hakkında genel değerlendirmenizi yazın..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={generateReport}
                disabled={!selectedStudent || !teacherSignature || generating}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Rapor Oluştur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}