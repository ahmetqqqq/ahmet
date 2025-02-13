import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  GraduationCap,
  Users,
  BookOpen,
  CreditCard,
  BarChart3,
  Calendar,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Menu as MenuIcon,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  profile: any;
  onLogout: () => void;
  onAddStudent: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

function Navbar({ 
  darkMode, 
  toggleDarkMode, 
  profile, 
  onLogout,
  onAddStudent,
  activeSection,
  onSectionChange,
}: NavbarProps) {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', name: 'Öğrenciler', icon: Users },
    { id: 'lessons', name: 'Dersler', icon: BookOpen },
    { id: 'payments', name: 'Ödemeler', icon: CreditCard },
    { id: 'reports', name: 'Raporlar', icon: BarChart3 },
    { id: 'schedule', name: 'Ders Programı', icon: Calendar },
  ];

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-lg relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <GraduationCap className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                  Özel Ders Yönetim Sistemi
                </span>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium 
                      ${activeSection === item.id 
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                      } transition-colors duration-150`}
                  >
                    <item.icon className="h-5 w-5 mr-1.5" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Menu as="div" className="relative">
                <Menu.Button className="flex rounded-full bg-gray-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150">
                  <span className="sr-only">Kullanıcı menüsü</span>
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={`${supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}`}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                  </div>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => onSectionChange('profile')}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } flex w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 items-center transition-colors duration-150`}
                          >
                            <User className="h-5 w-5 mr-2" />
                            Profil
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => onSectionChange('settings')}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } flex w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 items-center transition-colors duration-150`}
                          >
                            <Settings className="h-5 w-5 mr-2" />
                            Ayarlar
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={onLogout}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } flex w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 items-center transition-colors duration-150`}
                          >
                            <LogOut className="h-5 w-5 mr-2" />
                            Çıkış Yap
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobil Alt Menü */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-50">
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg
                ${activeSection === item.id 
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                } transition-colors duration-150`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1 truncate w-full text-center">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default Navbar;