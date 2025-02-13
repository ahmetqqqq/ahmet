import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  BookOpen,
  Clock,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Wallet,
  CalendarRange,
  FileText,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import InvoiceGenerator from '../components/InvoiceGenerator';
import StudentReportGenerator from '../components/StudentReportGenerator';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Report {
  totalIncome: number;
  monthlyIncome: number;
  yearlyIncome: number;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  totalStudents: number;
  activeStudents: number;
  paymentMethods: {
    method: string;
    count: number;
    total: number;
  }[];
  dailyIncomeData: {
    date: string;
    amount: number;
  }[];
  monthlyIncomeData: {
    month: string;
    amount: number;
  }[];
  lessonStatusData: {
    status: string;
    count: number;
  }[];
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'year'>('month');
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showStudentReport, setShowStudentReport] = useState(false);
  const [report, setReport] = useState<Report>({
    totalIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    totalLessons: 0,
    completedLessons: 0,
    cancelledLessons: 0,
    totalStudents: 0,
    activeStudents: 0,
    paymentMethods: [],
    dailyIncomeData: [],
    monthlyIncomeData: [],
    lessonStatusData: []
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacherProfile) throw new Error('Öğretmen profili bulunamadı');

      // Öğrenci verilerini al
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', teacherProfile.id);

      if (!students) return;

      const studentIds = students.map(s => s.id);

      // Tarih aralığını belirle
      const startDate = dateRange === 'month' ? startOfMonth(new Date()) : startOfYear(new Date());
      const endDate = dateRange === 'month' ? endOfMonth(new Date()) : endOfYear(new Date());

      // Ödemeleri al
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .in('student_id', studentIds)
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString());

      // Dersleri al
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .in('student_id', studentIds);

      // Rapor verilerini hesapla
      const totalIncome = (payments || []).reduce((sum, payment) => 
        payment.status === 'completed' ? sum + payment.amount : sum, 0
      );

      const monthlyIncome = (payments || []).reduce((sum, payment) => 
        payment.status === 'completed' && isWithinInterval(parseISO(payment.payment_date), {
          start: startOfMonth(new Date()),
          end: endOfMonth(new Date())
        }) ? sum + payment.amount : sum, 0
      );

      const yearlyIncome = (payments || []).reduce((sum, payment) => 
        payment.status === 'completed' && isWithinInterval(parseISO(payment.payment_date), {
          start: startOfYear(new Date()),
          end: endOfYear(new Date())
        }) ? sum + payment.amount : sum, 0
      );

      // Ödeme yöntemlerine göre dağılım
      const paymentMethods = Object.entries(
        (payments || []).reduce((acc: any, payment) => {
          if (!acc[payment.payment_method]) {
            acc[payment.payment_method] = { count: 0, total: 0 };
          }
          acc[payment.payment_method].count++;
          acc[payment.payment_method].total += payment.amount;
          return acc;
        }, {})
      ).map(([method, data]: [string, any]) => ({
        method,
        count: data.count,
        total: data.total
      }));

      // Günlük gelir verileri
      const dailyIncomeData = eachDayOfInterval({ start: startDate, end: endDate })
        .map(date => {
          const dayPayments = (payments || []).filter(payment => 
            format(parseISO(payment.payment_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
            payment.status === 'completed'
          );
          return {
            date: format(date, 'dd MMM', { locale: tr }),
            amount: dayPayments.reduce((sum, payment) => sum + payment.amount, 0)
          };
        });

      // Aylık gelir verileri
      const monthlyIncomeData = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date()) })
        .map(date => {
          const monthPayments = (payments || []).filter(payment => 
            format(parseISO(payment.payment_date), 'yyyy-MM') === format(date, 'yyyy-MM') &&
            payment.status === 'completed'
          );
          return {
            month: format(date, 'MMM', { locale: tr }),
            amount: monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
          };
        });

      // Ders durumu verileri
      const lessonStatusData = [
        {
          status: 'Tamamlandı',
          count: (lessons || []).filter(lesson => lesson.status === 'completed').length
        },
        {
          status: 'Ertelendi',
          count: (lessons || []).filter(lesson => lesson.status === 'postponed').length
        },
        {
          status: 'Planlandı',
          count: (lessons || []).filter(lesson => !lesson.status).length
        }
      ];

      setReport({
        totalIncome,
        monthlyIncome,
        yearlyIncome,
        totalLessons: lessons?.length || 0,
        completedLessons: lessons?.filter(l => l.status === 'completed').length || 0,
        cancelledLessons: lessons?.filter(l => l.status === 'cancelled').length || 0,
        totalStudents: students.length,
        activeStudents: students.length,
        paymentMethods,
        dailyIncomeData,
        monthlyIncomeData,
        lessonStatusData
      });
    } catch (error: any) {
      console.error('Rapor verileri yüklenirken hata:', error);
      toast.error('Rapor verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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
            <BarChart3 className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Finansal Raporlar
          </h2>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-end w-full sm:w-auto">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'month' | 'year')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="month">Aylık</option>
              <option value="year">Yıllık</option>
            </select>
            <button
              onClick={() => setShowStudentReport(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <FileText className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Öğrenci Raporu</span>
              <span className="sm:hidden">Rapor</span>
            </button>
            <button
              onClick={() => setShowInvoiceGenerator(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Fatura Oluştur</span>
              <span className="sm:hidden">Fatura</span>
            </button>
          </div>
        </div>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {dateRange === 'month' ? 'Aylık Gelir' : 'Yıllık Gelir'}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₺{dateRange === 'month' ? report.monthlyIncome.toLocaleString('tr-TR') : report.yearlyIncome.toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Öğrenci
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {report.totalStudents}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Ders
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {report.totalLessons}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tamamlanan Dersler
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {report.completedLessons}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gelir Grafiği */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {dateRange === 'month' ? 'Günlük Gelir Analizi' : 'Aylık Gelir Analizi'}
          </h3>
          <div className="h-80">
            <Line
              data={{
                labels: dateRange === 'month' 
                  ? report.dailyIncomeData.map(d => d.date)
                  : report.monthlyIncomeData.map(d => d.month),
                datasets: [{
                  label: 'Gelir (₺)',
                  data: dateRange === 'month'
                    ? report.dailyIncomeData.map(d => d.amount)
                    : report.monthlyIncomeData.map(d => d.amount),
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Ders Durumu Grafiği */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ders Durumu Dağılımı
          </h3>
          <div className="h-80">
            <Doughnut
              data={{
                labels: report.lessonStatusData.map(d => d.status),
                datasets: [{
                  data: report.lessonStatusData.map(d => d.count),
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInvoiceGenerator && (
        <InvoiceGenerator onClose={() => setShowInvoiceGenerator(false)} />
      )}
      {showStudentReport && (
        <StudentReportGenerator onClose={() => setShowStudentReport(false)} />
      )}
    </div>
  );
}