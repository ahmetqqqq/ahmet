import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  CreditCard, 
  Calendar,
  DollarSign,
  Users,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  ArrowUpDown,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  full_name: string;
  grade: string;
}

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'other';
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  student: Student;
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Nakit' },
  { id: 'credit_card', name: 'Kredi Kartı' },
  { id: 'bank_transfer', name: 'Banka Transferi' },
  { id: 'other', name: 'Diğer' }
];

const PAYMENT_STATUSES = [
  { id: 'pending', name: 'Bekliyor', color: 'yellow' },
  { id: 'completed', name: 'Tamamlandı', color: 'green' },
  { id: 'cancelled', name: 'İptal Edildi', color: 'red' }
];

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<string>('payment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    description: '',
    status: 'completed'
  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');

        const { data: teacherProfile, error: profileError } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        setTeacherId(teacherProfile.id);

        await Promise.all([
          fetchPayments(teacherProfile.id),
          fetchStudents(teacherProfile.id)
        ]);
      } catch (error: any) {
        console.error('Veri yükleme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchPayments = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          student:students(id, full_name, grade)
        `)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Ödemeler yüklenirken hata:', error);
      toast.error('Ödemeler yüklenirken bir hata oluştu');
    }
  };

  const fetchStudents = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade')
        .eq('teacher_id', teacherId)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Öğrenciler yüklenirken hata:', error);
      toast.error('Öğrenciler yüklenirken bir hata oluştu');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          student_id: newPayment.student_id,
          amount: parseFloat(newPayment.amount),
          payment_date: new Date(newPayment.payment_date).toISOString(),
          payment_method: newPayment.payment_method,
          description: newPayment.description,
          status: newPayment.status
        }])
        .select(`
          *,
          student:students(id, full_name, grade)
        `)
        .single();

      if (error) throw error;

      setPayments([data, ...payments]);
      setShowPaymentModal(false);
      setNewPayment({
        student_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        description: '',
        status: 'completed'
      });
      toast.success('Ödeme başarıyla eklendi');
    } catch (error: any) {
      console.error('Ödeme ekleme hatası:', error);
      toast.error('Ödeme eklenirken bir hata oluştu');
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          student_id: newPayment.student_id,
          amount: parseFloat(newPayment.amount),
          payment_date: new Date(newPayment.payment_date).toISOString(),
          payment_method: newPayment.payment_method,
          description: newPayment.description,
          status: newPayment.status
        })
        .eq('id', selectedPayment.id)
        .select(`
          *,
          student:students(id, full_name, grade)
        `)
        .single();

      if (error) throw error;

      setPayments(payments.map(p => p.id === selectedPayment.id ? data : p));
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setNewPayment({
        student_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        description: '',
        status: 'completed'
      });
      toast.success('Ödeme başarıyla güncellendi');
    } catch (error: any) {
      console.error('Ödeme güncelleme hatası:', error);
      toast.error('Ödeme güncellenirken bir hata oluştu');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(payments.filter(p => p.id !== paymentId));
      toast.success('Ödeme başarıyla silindi');
    } catch (error: any) {
      console.error('Ödeme silme hatası:', error);
      toast.error('Ödeme silinirken bir hata oluştu');
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setNewPayment({
      student_id: payment.student_id,
      amount: payment.amount.toString(),
      payment_date: new Date(payment.payment_date).toISOString().split('T')[0],
      payment_method: payment.payment_method,
      description: payment.description || '',
      status: payment.status
    });
    setShowPaymentModal(true);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments.reduce((sum, payment) => 
    payment.status === 'completed' ? sum + payment.amount : sum, 0
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
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
      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Tahsilat
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ₺{totalAmount.toLocaleString('tr-TR')}
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
                Bekleyen Ödemeler
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam İşlem
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {payments.length}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler ve Arama */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tüm Durumlar</option>
            {PAYMENT_STATUSES.map(status => (
              <option key={status.id} value={status.id}>{status.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedPayment(null);
              setNewPayment({
                student_id: '',
                amount: '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                description: '',
                status: 'completed'
              });
              setShowPaymentModal(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ödeme Ekle
          </button>
        </div>
      </div>

      {/* Ödemeler Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPayments.map(payment => (
          <div
            key={payment.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {payment.student.full_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {payment.student.grade}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPayment(payment)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePayment(payment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <DollarSign className="h-4 w-4 mr-2" />
                    ₺{payment.amount.toLocaleString('tr-TR')}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                  >
                    {getStatusIcon(payment.status)}
                    <span className="ml-1">
                      {PAYMENT_STATUSES.find(s => s.id === payment.status)?.name}
                    </span>
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Wallet className="h-4 w-4 mr-2" />
                  {PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.name}
                </div>

                {payment.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {payment.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Ödeme Bulunamadı
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Arama kriterlerinize uygun ödeme bulunmamaktadır.
          </p>
        </div>
      )}

      {/* Ödeme Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={selectedPayment ? handleUpdatePayment : handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Öğrenci
                </label>
                <select
                  required
                  value={newPayment.student_id}
                  onChange={(e) => setNewPayment({ ...newPayment, student_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Öğrenci Seçin</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tutar (₺)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ödeme Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ödeme Yöntemi
                </label>
                <select
                  required
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Durum
                </label>
                <select
                  required
                  value={newPayment.status}
                  onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {PAYMENT_STATUSES.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Açıklama
                </label>
                <textarea
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {selectedPayment ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}