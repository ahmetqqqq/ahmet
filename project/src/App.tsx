import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Students from './pages/Students';
import Lessons from './pages/Lessons';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import StudentForm from './components/StudentForm';
import Footer from './components/Footer';
import toast from 'react-hot-toast';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2,
  User,
  Phone,
  School,
  BookOpen,
  ChevronLeft
} from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    subject: ''
  });
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [profile, setProfile] = useState(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsAuthenticated(true);
          await fetchProfile(session.user.id);
        } else {
          setIsAuthenticated(false);
          setProfile(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            setIsAuthenticated(true);
            await fetchProfile(session.user.id);
          } else {
            setIsAuthenticated(false);
            setProfile(null);
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        toast.error('Oturum başlatılırken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: teacherProfile, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('teacher_profiles')
            .insert([{
              user_id: userId,
              full_name: 'Yeni Öğretmen',
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(teacherProfile);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Profil bilgileri alınamadı');
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;
      toast.success('Giriş başarılı!');
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            full_name: registerForm.fullName,
            phone: registerForm.phone,
            subject: registerForm.subject
          }
        }
      });

      if (error) throw error;
      toast.success('Kayıt başarılı! Email adresinizi kontrol edin.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>

          <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 relative z-10 transform transition-all duration-500 ease-in-out">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl shadow-lg transform hover:scale-110 transition-transform duration-200">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              {isRegister ? 'Hesap Oluşturun' : 'Giriş Yapın'}
            </h2>
            
            <form onSubmit={isRegister ? handleEmailRegister : handleEmailLogin} className="space-y-6">
              {isRegister ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ad Soyad
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="John Doe"
                      />
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefon
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="+90 555 123 4567"
                      />
                      <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Branş
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={registerForm.subject}
                        onChange={(e) => setRegisterForm({ ...registerForm, subject: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="Matematik"
                      />
                      <BookOpen className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="ornek@email.com"
                      />
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="********"
                      />
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="ornek@email.com"
                      />
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                        placeholder="********"
                      />
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    {isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setLoginForm({ email: '', password: '' });
                  setRegisterForm({ email: '', password: '', fullName: '', phone: '', subject: '' });
                }}
                className="w-full flex items-center justify-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {isRegister ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <Students onEditStudent={(student) => {
          setSelectedStudent(student);
          setShowStudentForm(true);
        }} />;
      case 'lessons':
        return <Lessons />;
      case 'payments':
        return <Payments />;
      case 'reports':
        return <Reports />;
      case 'schedule':
        return <Schedule />;
      case 'profile':
        return <Profile profile={profile} onProfileUpdate={setProfile} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${darkMode ? 'dark' : ''} flex flex-col`}>
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        profile={profile}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        }}
        onAddStudent={() => {
          setSelectedStudent(null);
          setShowStudentForm(true);
        }}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1">
        {renderContent()}
      </main>

      {showStudentForm && (
        <StudentForm
          onClose={() => {
            setShowStudentForm(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            setShowStudentForm(false);
            setSelectedStudent(null);
          }}
          initialData={selectedStudent}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;