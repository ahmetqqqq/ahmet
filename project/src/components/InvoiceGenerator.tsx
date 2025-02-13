import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, HeightRule } from 'docx';
import { saveAs } from 'file-saver';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download,
  X,
  Clock,
  DollarSign,
  User,
  GraduationCap,
  Pencil,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LessonDetail {
  date: string;
  time: string;
  subject: string;
  duration: number;
  price: number;
}

interface InvoiceGeneratorProps {
  onClose: () => void;
}

export default function InvoiceGenerator({ onClose }: InvoiceGeneratorProps) {
  const [invoiceData, setInvoiceData] = useState({
    studentName: '',
    teacherName: '',
    teacherSignature: '',
    lessons: [] as LessonDetail[]
  });

  const handleAddLesson = () => {
    setInvoiceData({
      ...invoiceData,
      lessons: [
        ...invoiceData.lessons,
        {
          date: '',
          time: '',
          subject: '',
          duration: 1,
          price: 0
        }
      ]
    });
  };

  const handleRemoveLesson = (index: number) => {
    setInvoiceData({
      ...invoiceData,
      lessons: invoiceData.lessons.filter((_, i) => i !== index)
    });
  };

  const handleLessonChange = (index: number, field: keyof LessonDetail, value: string | number) => {
    const updatedLessons = [...invoiceData.lessons];
    updatedLessons[index] = {
      ...updatedLessons[index],
      [field]: value
    };
    setInvoiceData({
      ...invoiceData,
      lessons: updatedLessons
    });
  };

  const calculateTotal = () => {
    return invoiceData.lessons.reduce((total, lesson) => total + (lesson.price * lesson.duration), 0);
  };

  const generateInvoice = async () => {
    try {
      // Create header
      const header = new Paragraph({
        children: [
          new TextRun({ text: 'ÖZEL DERS FATURASI', bold: true, size: 32 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      });

      // Create student and teacher info
      const info = [
        new Paragraph({
          children: [
            new TextRun({ text: 'Öğrenci: ', bold: true }),
            new TextRun(invoiceData.studentName)
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Öğretmen: ', bold: true }),
            new TextRun(invoiceData.teacherName)
          ],
          spacing: { after: 400 }
        })
      ];

      // Create lessons table
      const tableRows = [
        new TableRow({
          children: [
            'Tarih',
            'Saat',
            'Ders',
            'Süre (Saat)',
            'Saat Ücreti (₺)',
            'Toplam (₺)'
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
        ...invoiceData.lessons.map(lesson => 
          new TableRow({
            children: [
              lesson.date,
              lesson.time,
              lesson.subject,
              lesson.duration.toString(),
              lesson.price.toString(),
              (lesson.price * lesson.duration).toString()
            ].map(text => 
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun(text)],
                  alignment: AlignmentType.CENTER
                })],
                verticalAlign: AlignmentType.CENTER
              })
            )
          })
        )
      ];

      const table = new Table({
        rows: tableRows,
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
      });

      // Create total amount
      const total = new Paragraph({
        children: [
          new TextRun({ text: `Toplam Tutar: ₺${calculateTotal()}`, bold: true, size: 28 })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400, after: 400 }
      });

      // Create signature area
      const signature = new Paragraph({
        children: [
          new TextRun({ text: 'Öğretmen İmzası: ', bold: true }),
          new TextRun(invoiceData.teacherSignature)
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 800 }
      });

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            header,
            ...info,
            table,
            total,
            signature
          ]
        }]
      });

      // Generate and save file
      const blob = await Packer.toBlob(doc);
      const fileName = `fatura_${invoiceData.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);
      toast.success('Fatura başarıyla oluşturuldu');
      onClose();
    } catch (error) {
      console.error('Fatura oluşturma hatası:', error);
      toast.error('Fatura oluşturulurken bir hata oluştu');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Fatura Oluştur
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
            {/* Öğrenci ve Öğretmen Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Öğrenci Adı
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceData.studentName}
                    onChange={(e) => setInvoiceData({ ...invoiceData, studentName: e.target.value })}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Öğretmen Adı
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceData.teacherName}
                    onChange={(e) => setInvoiceData({ ...invoiceData, teacherName: e.target.value })}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <GraduationCap className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Öğretmen İmzası
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceData.teacherSignature}
                    onChange={(e) => setInvoiceData({ ...invoiceData, teacherSignature: e.target.value })}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <Pencil className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Ders Listesi */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Dersler
                </h3>
                <button
                  onClick={handleAddLesson}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ders Ekle
                </button>
              </div>

              {invoiceData.lessons.map((lesson, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tarih
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={lesson.date}
                          onChange={(e) => handleLessonChange(index, 'date', e.target.value)}
                          className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Saat
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={lesson.time}
                          onChange={(e) => handleLessonChange(index, 'time', e.target.value)}
                          className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ders
                      </label>
                      <input
                        type="text"
                        value={lesson.subject}
                        onChange={(e) => handleLessonChange(index, 'subject', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                        placeholder="Matematik"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Süre (Saat)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={lesson.duration}
                        onChange={(e) => handleLessonChange(index, 'duration', parseFloat(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Saat Ücreti (₺)
                      </label>
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            value={lesson.price}
                            onChange={(e) => handleLessonChange(index, 'price', parseFloat(e.target.value))}
                            className="pl-10 pr-12 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                        <button
                          onClick={() => handleRemoveLesson(index)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {invoiceData.lessons.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Henüz ders eklenmemiş
                  </p>
                  <button
                    onClick={handleAddLesson}
                    className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Dersi Ekle
                  </button>
                </div>
              )}

              {invoiceData.lessons.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    Toplam Tutar: ₺{calculateTotal().toLocaleString('tr-TR')}
                  </div>
                  <button
                    onClick={generateInvoice}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Fatura Oluştur
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}