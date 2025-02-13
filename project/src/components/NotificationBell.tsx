import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: '1_day' | '3_hours' | '1_hour' | '10_minutes';
  student: {
    full_name: string;
  };
  lesson: {
    subject: string;
    start_time: string;
    day_of_week: string;
  };
  read: boolean;
  sent: boolean;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Her dakika kontrol et
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Bildirim paneli açıkken dışarı tıklamayı dinle
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-panel') && !target.closest('.notification-button')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacherProfile) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          read,
          sent,
          student:students!notifications_student_id_fkey(full_name),
          lesson:lessons!notifications_lesson_id_fkey(subject, start_time, day_of_week)
        `)
        .eq('teacher_id', teacherProfile.id)
        .eq('sent', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);

      // Sesli bildirim kontrolü
      const newNotifications = data?.filter(n => !n.read) || [];
      if (newNotifications.length > 0) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('Notifications fetch error:', error);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => {
      console.error('Audio playback failed:', error);
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const timeMessages = {
      '1_day': '1 gün',
      '3_hours': '3 saat',
      '1_hour': '1 saat',
      '10_minutes': '10 dakika'
    };

    return `${notification.student.full_name} ile ${notification.lesson.subject} dersiniz ${timeMessages[notification.type]} sonra başlayacak.`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="notification-button relative p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors duration-150 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem]">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-panel fixed inset-0 z-50 sm:inset-auto sm:absolute sm:right-0 sm:mt-2 sm:w-80">
          <div className="relative h-full sm:h-auto">
            {/* Mobil Arka Plan Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50 sm:hidden" />

            {/* Bildirim Paneli */}
            <div className="relative h-full sm:h-auto bg-white dark:bg-gray-800 sm:rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Bildirimler
                </h3>
                <div className="space-y-4 max-h-[calc(100vh-8rem)] sm:max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg transition-colors duration-150 cursor-pointer
                          ${notification.read 
                            ? 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700' 
                            : 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                          }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <p className="text-sm text-gray-900 dark:text-white">
                          {getNotificationMessage(notification)}
                        </p>
                        {!notification.read && (
                          <span className="inline-block mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            Yeni bildirim
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Bildirim bulunmuyor
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}