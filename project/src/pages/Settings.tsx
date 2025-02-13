import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Globe,
  Shield,
  Download,
  Save,
  Palette,
  Layout,
  Monitor,
  Clock,
  Volume2,
  BellRing,
  Languages,
  FileJson,
  AlertTriangle,
  Loader2,
  X,
  Check,
  Mail,
  FileText,
  Calendar,
  DollarSign,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const DEFAULT_SETTINGS = {
  theme: {
    mode: 'light' as const,
    primaryColor: 'indigo',
    menuStyle: 'floating' as const
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    types: {
      lessons: true,
      payments: true,
      students: true,
      system: true
    },
    timing: {
      '1_day': true,
      '3_hours': true,
      '1_hour': true,
      '10_minutes': true
    }
  },
  language: 'tr',
  timeFormat: '24h' as const,
  dataExport: {
    format: 'json' as const,
    includeStudents: true,
    includeLessons: true,
    includePayments: true
  }
};

type UserSettings = typeof DEFAULT_SETTINGS;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [expandedSection, setExpandedSection] = useState<string | null>('notifications');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...data.settings.notifications,
            types: {
              ...DEFAULT_SETTINGS.notifications.types,
              ...data.settings.notifications?.types
            },
            timing: {
              ...DEFAULT_SETTINGS.notifications.timing,
              ...data.settings.notifications?.timing
            }
          }
        });
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            settings: DEFAULT_SETTINGS
          }]);

        if (insertError) throw insertError;
      }
    } catch (error: any) {
      console.error('Settings fetch error:', error);
      toast.error('Ayarlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { error } = await supabase
        .from('user_settings')
        .update({ settings })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error: any) {
      console.error('Settings save error:', error);
      toast.error('Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Öğretmen profili bulunamadı');

      let exportData: any = {};

      if (settings.dataExport.includeStudents) {
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .eq('teacher_id', profile.id);
        exportData.students = students;
      }

      if (settings.dataExport.includeLessons) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .in('student_id', exportData.students?.map((s: any) => s.id) || []);
        exportData.lessons = lessons;
      }

      if (settings.dataExport.includePayments) {
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .in('student_id', exportData.students?.map((s: any) => s.id) || []);
        exportData.payments = payments;
      }

      if (settings.dataExport.format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        saveAs(blob, 'ozel-ders-verileri.json');
      } else {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Özel Ders Verileri', bold: true, size: 32 }),
                ],
              }),
              ...Object.entries(exportData).flatMap(([key, value]) => [
                new Paragraph({
                  children: [
                    new TextRun({ text: `\n${key.toUpperCase()}`, bold: true, size: 24 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: JSON.stringify(value, null, 2), size: 20 }),
                  ],
                }),
              ]),
            ],
          }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, 'ozel-ders-verileri.docx');
      }

      toast.success('Veriler başarıyla dışa aktarıldı');
    } catch (error: any) {
      console.error('Data export error:', error);
      toast.error('Veriler dışa aktarılırken bir hata oluştu');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
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
      {/* Ayarlar Başlığı */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-2 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Sistem Ayarları
            </h2>
          </div>
          <button
            onClick={handleSaveSettings}
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
      </div>

      {/* Tema Ayarları */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => toggleSection('theme')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-2 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tema Ayarları
            </h3>
          </div>
          {expandedSection === 'theme' ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSection === 'theme' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tema Modu
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      theme: { ...settings.theme, mode: 'light' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.theme.mode === 'light'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Sun className="h-5 w-5 mr-2" />
                    Açık
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      theme: { ...settings.theme, mode: 'dark' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.theme.mode === 'dark'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Moon className="h-5 w-5 mr-2" />
                    Koyu
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Menü Stili
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      theme: { ...settings.theme, menuStyle: 'floating' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.theme.menuStyle === 'floating'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Layout className="h-5 w-5 mr-2" />
                    Yüzen
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      theme: { ...settings.theme, menuStyle: 'fixed' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.theme.menuStyle === 'fixed'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Monitor className="h-5 w-5 mr-2" />
                    Sabit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bildirim Ayarları */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => toggleSection('notifications')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-2 rounded-lg">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bildirim Ayarları
            </h3>
          </div>
          {expandedSection === 'notifications' ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSection === 'notifications' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BellRing className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bildirimleri Etkinleştir
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tüm sistem bildirimlerini aç/kapat
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      enabled: !settings.notifications.enabled
                    }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    settings.notifications.enabled
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      settings.notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.notifications.enabled && (
                <div className="space-y-4 pl-8">
                  {/* Bildirim Türleri */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Bildirim Türleri
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(settings.notifications.types).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {key === 'lessons' && <BookOpen className="h-4 w-4 text-gray-400" />}
                            {key === 'payments' && <DollarSign className="h-4 w-4 text-gray-400" />}
                            {key === 'students' && <Users className="h-4 w-4 text-gray-400" />}
                            {key === 'system' && <Shield className="h-4 w-4 text-gray-400" />}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {key === 'lessons' ? 'Ders Bildirimleri' :
                               key === 'payments' ? 'Ödeme Bildirimleri' :
                               key === 'students' ? 'Öğrenci Bildirimleri' :
                               'Sistem Bildirimleri'}
                            </p>
                          </div>
                          <button
                            onClick={() => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                types: {
                                  ...settings.notifications.types,
                                  [key]: !value
                                }
                              }
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                              value
                                ? 'bg-indigo-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bildirim Zamanlaması */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Bildirim Zamanlaması
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(settings.notifications.timing).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {key === '1_day' ? 'Bir gün önce' :
                               key === '3_hours' ? 'Üç saat önce' :
                               key === '1_hour' ? 'Bir saat önce' :
                               'On dakika önce'}
                            </p>
                          </div>
                          <button
                            onClick={() => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                timing: {
                                  ...settings.notifications.timing,
                                  [key]: !value
                                }
                              }
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                              value
                                ? 'bg-indigo-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bildirim Seçenekleri */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Volume2 className="h-5 w-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Ses Bildirimleri
                        </p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            sound: !settings.notifications.sound
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          settings.notifications.sound
                            ? 'bg-indigo-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            settings.notifications.sound ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Monitor className="h-5 w-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Masaüstü Bildirimleri
                        </p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            desktop: !settings.notifications.desktop
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          settings.notifications.desktop
                            ? 'bg-indigo-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            settings.notifications.desktop ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          E-posta Bildirimleri
                        </p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            email: !settings.notifications.email
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          settings.notifications.email
                            ? 'bg-indigo-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Genel Ayarlar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => toggleSection('general')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 p-2 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Genel Ayarlar
            </h3>
          </div>
          {expandedSection === 'general' ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSection === 'general' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dil
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    language: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Saat Formatı
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      timeFormat: '12h'
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.timeFormat === '12h'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    12 Saat
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      timeFormat: '24h'
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.timeFormat === '24h'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    24 Saat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Veri Dışa Aktarma */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => toggleSection('export')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-green -100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 p-2 rounded-lg">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Veri Dışa Aktarma
            </h3>
          </div>
          {expandedSection === 'export' ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSection === 'export' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dosya Formatı
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      dataExport: { ...settings.dataExport, format: 'json' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.dataExport.format === 'json'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <FileJson className="h-5 w-5 mr-2" />
                    JSON
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      dataExport: { ...settings.dataExport, format: 'docx' }
                    })}
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      settings.dataExport.format === 'docx'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    DOCX
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Dahil Edilecek Veriler
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Öğrenci Verileri
                    </p>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        dataExport: {
                          ...settings.dataExport,
                          includeStudents: !settings.dataExport.includeStudents
                        }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        settings.dataExport.includeStudents
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          settings.dataExport.includeStudents ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ders Verileri
                    </p>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        dataExport: {
                          ...settings.dataExport,
                          includeLessons: !settings.dataExport.includeLessons
                        }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        settings.dataExport.includeLessons
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          settings.dataExport.includeLessons ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ödeme Verileri
                    </p>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        dataExport: {
                          ...settings.dataExport,
                          includePayments: !settings.dataExport.includePayments
                        }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        settings.dataExport.includePayments
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          settings.dataExport.includePayments ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleExportData}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Verileri Dışa Aktar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}