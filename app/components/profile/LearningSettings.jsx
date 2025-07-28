'use client';

import { useState, useEffect } from 'react';
import { FaGlobe, FaBullseye, FaClock } from 'react-icons/fa';
import { Dialog } from '@headlessui/react';
import { auth, db } from '@/app/firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';



const LANGUAGES = [
  { code: 'en', label: 'English (English)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'as', label: 'Assamese (অসমীয়া)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
];

const GOAL_OPTIONS = [
  { value: 1, label: '1 Lesson', description: 'Easy pace' },
  { value: 2, label: '2 Lessons', description: 'Steady progress' },
  { value: 3, label: '3 Lessons', description: 'Regular learner' },
  { value: 4, label: '4 Lessons', description: 'Dedicated learner' },
  { value: 5, label: '5 Lessons', description: 'Ambitious goal' },
  { value: 7, label: '7 Lessons', description: 'Intensive learning' },
  { value: 10, label: '10 Lessons', description: 'Professional pace' },
];
const REMINDER_OPTIONS = [
  { value: '06:00', label: '6:00 AM', sub: 'Early bird' },
  { value: '07:00', label: '7:00 AM', sub: 'Morning person' },
  { value: '08:00', label: '8:00 AM', sub: 'Start of day' },
  { value: '09:00', label: '9:00 AM', sub: 'Morning routine' },
  { value: '12:00', label: '12:00 PM', sub: 'Lunch break' },
  { value: '15:00', label: '3:00 PM', sub: 'Afternoon session' },
  { value: '17:00', label: '5:00 PM', sub: 'After work' },
];

export default function LearningSettings() {
  const [learningLanguage, setLearningLanguage] = useState('en');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [reminderTime, setReminderTime] = useState('08:00');

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [hasShownToastToday, setHasShownToastToday] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setLearningLanguage(data?.learningLanguage || 'en');
          setDailyGoal(data?.learningTime?.goal || 5);
          setReminderTime(data?.learningTime?.time || '08:00');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!reminderTime) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const currentFormatted = now.format('HH:mm');

      const shownToday = localStorage.getItem('reminder-toast-shown') === now.format('YYYY-MM-DD');

      if (currentFormatted === reminderTime && !shownToday && !hasShownToastToday) {
        toast('⏰ Time for your English lesson!', {
          icon: '📚',
          style: {
            borderRadius: '12px',
            background: 'var(--card-background)',
            color: 'var(--text-color)',
            fontWeight: '500',
          },
        });

        localStorage.setItem('reminder-toast-shown', now.format('YYYY-MM-DD'));
        setHasShownToastToday(true);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [reminderTime, hasShownToastToday]);

  const updateGoal = async (goal) => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      'learningTime.goal': goal,
    });

    setDailyGoal(goal);
    setIsGoalOpen(false);
  };

  const updateLanguage = async (langCode) => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      learningLanguage: langCode,
    });

    setLearningLanguage(langCode);
    setIsLangOpen(false);
  };

  const selectedLangLabel =
    LANGUAGES.find((l) => l.code === learningLanguage)?.label || 'English (English)';

  const formatTime = (time24) => {
    if (!time24) return '';
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minuteStr} ${ampm}`;
  };

  return (
    <div className="space-y-3">
      <SettingItem
        icon={<FaGlobe size={16} className="text-[var(--color-primary)]" />}
        label="Learning Language"
        value={selectedLangLabel}
        onClick={() => setIsLangOpen(true)}
      />
      <SettingItem
        icon={<FaBullseye size={16} className="text-[var(--color-primary)]" />}
        label="Daily Goal"
        value={`${dailyGoal} Lessons`}
        onClick={() => setIsGoalOpen(true)}
      />
      <SettingItem
        icon={<FaClock size={16} className="text-[var(--color-primary)]" />}
        label="Study Reminder"
        value={formatTime(reminderTime)}
        onClick={() => setIsReminderOpen(true)}
      />

      {/* Language Modal */}
      <Dialog open={isLangOpen} onClose={() => setIsLangOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className="rounded-xl p-4 w-full max-w-sm space-y-3 max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-color)',
            }}
          >
            <Dialog.Title className="text-lg font-semibold mb-2">Select Language</Dialog.Title>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  lang.code === learningLanguage
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--accent)]'
                }`}
                onClick={() => updateLanguage(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Daily Goal Modal */}
      <Dialog open={isGoalOpen} onClose={() => setIsGoalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className="rounded-2xl p-4 w-full max-w-sm space-y-3 max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-color)',
            }}
          >
            <Dialog.Title className="text-lg font-semibold mb-3">
              Set Daily Goal
            </Dialog.Title>
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = goal.value === dailyGoal;
              return (
                <button
                  key={goal.value}
                  onClick={() => updateGoal(goal.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex justify-between items-center ${
                    isSelected
                      ? 'bg-[var(--accent)] border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'hover:bg-[var(--accent)] border-transparent'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{goal.label}</p>
                    <p className="text-sm opacity-80">{goal.description}</p>
                  </div>
                  {isSelected && <span className="text-xl font-bold">✔</span>}
                </button>
              );
            })}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Reminder Modal */}
      <Dialog open={isReminderOpen} onClose={() => setIsReminderOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className="rounded-2xl p-4 w-full max-w-sm space-y-3 max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--card-background)',
              color: 'var(--text-color)',
            }}
          >
            <Dialog.Title className="text-lg font-semibold mb-3">
              Study Reminder
            </Dialog.Title>
            {REMINDER_OPTIONS.map((slot) => {
              const isSelected = slot.value === reminderTime;
              return (
                <button
                  key={slot.value}
                  onClick={async () => {
                    const user = auth.currentUser;
                    if (!user) return;

                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      'learningTime.time': slot.value,
                    });

                    setReminderTime(slot.value);
                    setIsReminderOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex justify-between items-center ${
                    isSelected
                      ? 'bg-[var(--accent)] border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'hover:bg-[var(--accent)] border-transparent'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{slot.label}</p>
                    <p className="text-sm opacity-80">{slot.sub}</p>
                  </div>
                  {isSelected && <span className="text-xl font-bold">✔</span>}
                </button>
              );
            })}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

function SettingItem({ icon, label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className="accent-bg rounded-xl p-3 flex items-center gap-4 cursor-pointer"
    >
      <div
        className="min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full"
        style={{ backgroundColor: '#F6EAF2' }}
      >
        {icon}
      </div>
      <div className="flex justify-between items-center w-full">
        <span className="font-medium text-base" style={{ color: 'var(--text-color)' }}>
          {label}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--muted-text)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}
