'use client';

import { useState, useEffect } from 'react';
import { FiEdit2, FiLogOut } from 'react-icons/fi';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/app/firebase/firebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/app/firebase/firebaseConfig'; // ✅ Make sure you initialized this

export default function AccountSettings({ onSignOut, onProfileUpdate }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        setName(u.displayName || '');
        setPreview(u.photoURL || null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSaveProfile = async () => {
    try {
      let photoURL = user.photoURL;

      if (file) {
        const fileRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(fileRef, file);
        photoURL = await getDownloadURL(fileRef);
      }

      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL,
      });

      if (onProfileUpdate) {
        onProfileUpdate({ displayName: name, photoURL });
      }

      setShowEdit(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <div>
      
      <div className="accent-bg rounded-xl p-3 mb-3">
  <button
    onClick={() => setShowEdit(true)}
    className="w-full flex items-center gap-4 text-left font-medium cursor-pointer"
    style={{ color: 'var(--text-color)' }}
  >
    <div
      className="min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full"
      style={{ backgroundColor: '#F6EAF2 ' }} // light-blue fill
    >
      <FiEdit2 size={18} style={{ color: 'var(--color-primary)' }} />
    </div>
    <span className="text-sm font-medium">Edit Profile</span>
  </button>
</div>


      <div className="accent-bg rounded-xl p-3">
  <button
    onClick={() => setShowConfirm(true)}
    className="w-full flex items-center gap-4 text-left font-medium cursor-pointer"
    style={{ color: 'var(--text-color)' }}
  >
    <div className="min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full" style={{ backgroundColor: '#FEE2E2' }}>
      <FiLogOut size={18} className="text-red-500" />
    </div>
    <span className="text-sm font-medium">Sign Out</span>
  </button>
</div>

      {/* Sign Out Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="card rounded-xl p-6 w-11/12 max-w-sm text-center space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>
              Confirm Sign Out
            </h2>
            <p className="text-sm muted-text">Are you sure you want to sign out?</p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-full border muted-text"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={onSignOut}
                className="px-4 py-2 rounded-full bg-red-500 text-white font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="card rounded-xl p-6 w-11/12 max-w-sm shadow-xl space-y-5">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>
              Edit Profile
            </h2>

            <div className="flex justify-center">
              <label className="relative cursor-pointer">
                <input type="file" onChange={handleFileChange} className="hidden" />
                <img
                  src={preview || '/assets/avatar-placeholder.png'}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border"
                  style={{ borderColor: 'var(--card-border)' }}
                />
                <span 
                  className="absolute bottom-0 right-0 text-white text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Edit
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm muted-text mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none card"
                style={{ 
                  borderColor: 'var(--card-border)',
                  focusRingColor: 'var(--color-primary)'
                }}
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-full border muted-text"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-full text-white font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Achievements Component
export function Achievements() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setStreak(data.streak || 0);
          setCompletedLessons(data.completedLessons || 0);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      }
    };

    fetchAchievements();
  }, [user]);

  return (
    <div className="accent-bg p-4 rounded-xl">
      <p className="font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
        🏆 Achievements
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-3 rounded-xl text-center shadow-sm">
          <p className="font-semibold" style={{ color: 'var(--text-color)' }}>
            🔥 7 Day Streak
          </p>
          <p className="text-xs muted-text">{Math.min(streak, 7)}/7</p>
        </div>
        <div className="card p-3 rounded-xl text-center shadow-sm">
          <p className="font-semibold" style={{ color: 'var(--text-color)' }}>
            📘 Quick Learner
          </p>
          <p className="text-xs muted-text">{Math.min(completedLessons, 10)}/10</p>
        </div>
      </div>
    </div>
  );
}

// DailyGoal Component
export function DailyGoal() {
  const { user } = useAuth();
  const [dailyGoal, setDailyGoal] = useState(5);
  const [completedToday, setCompletedToday] = useState(0);
  const [isGoalMet, setIsGoalMet] = useState(false);

  useEffect(() => {
    const fetchGoalProgress = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const goal = userSnap.exists() ? (userSnap.data().dailyGoal || 5) : 5;
        setDailyGoal(goal);

        const progressDocRef = doc(db, 'users', user.uid, 'progress', 'chapters');
        const progressSnap = await getDoc(progressDocRef);

        if (progressSnap.exists()) {
          const data = progressSnap.data();
          const completedLessons = data.completedLessons || [];

          const today = dayjs().format('YYYY-MM-DD');

          const todayCompletedCount = completedLessons.filter((lesson) => {
            if (typeof lesson === 'object' && lesson.completedAt) {
              return dayjs(lesson.completedAt).format('YYYY-MM-DD') === today;
            }
            return false;
          }).length;

          setCompletedToday(todayCompletedCount);
          setIsGoalMet(todayCompletedCount >= goal);
        }
      } catch (error) {
        console.error('Error fetching daily goal:', error);
      }
    };

    fetchGoalProgress();
  }, [user]);

  const progressPercent = Math.min(100, (completedToday / dailyGoal) * 100);

  return (
    <div className="accent-bg p-4 rounded-xl shadow">
      <p className="font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
        🎯 Daily Goal
      </p>
      <p className={`text-sm ${isGoalMet ? 'text-green-600 dark:text-green-400' : ''}`}
         style={{ color: isGoalMet ? undefined : 'var(--text-color)' }}>
        {completedToday}/{dailyGoal} lessons completed today
      </p>

      <div className="h-2 mt-2 rounded-full secondary-bg">
        <div
          className="h-full rounded-full"
          style={{ 
            width: `${progressPercent}%`,
            backgroundColor: 'var(--color-primary)'
          }}
        ></div>
      </div>

      {isGoalMet && (
        <p className="text-xs mt-2 text-green-600 dark:text-green-400 font-semibold">
          ✅ Goal Met! Great job!
        </p>
      )}
    </div>
  );
}

// LearningSettings Component
export function LearningSettings({ learningLanguage = 'en', dailyGoal = 5, reminderTime = '08:00' }) {
  return (
    <div>
      <p className="font-semibold muted-text mb-2">Learning</p>
      <div className="accent-bg rounded-xl divide-y" style={{ borderColor: 'var(--card-border)' }}>
        <SettingItem
          label="🌐 Learning Language"
          value={getLanguageName(learningLanguage)}
        />
        <SettingItem
          label="🎯 Daily Goal"
          value={`${dailyGoal} Lessons`}
        />
        <SettingItem
          label="⏰ Study Reminder"
          value={formatTime(reminderTime)}
        />
      </div>
    </div>
  );
}

function SettingItem({ label, value }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="font-medium" style={{ color: 'var(--text-color)' }}>{label}</span>
      <span className="text-sm muted-text">{value}</span>
    </div>
  );
}

function formatTime(time24) {
  if (!time24) return '';
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${ampm}`;
}

function getLanguageName(code) {
  const map = {
    en: 'English',
    ta: 'Tamil',
    hi: 'Hindi',
  };
  return map[code] || 'English';
}

// Preferences Component with Dark Mode Toggle
export function Preferences() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is stored in memory or system preference
    const stored = window.darkMode || false;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored || systemDark;
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    // Store in memory instead of localStorage
    window.darkMode = newDarkMode;
  };

  return (
    <div>
      <p className="font-semibold muted-text mb-2">Preferences</p>
      <div className="accent-bg p-4 rounded-xl flex justify-between items-center">
        <p className="font-medium" style={{ color: 'var(--text-color)' }}>🌙 Dark Mode</p>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isDarkMode}
            onChange={toggleDarkMode}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
               style={{ backgroundColor: isDarkMode ? 'var(--color-primary)' : undefined }}>
          </div>
        </label>
      </div>
    </div>
  );
}

// StatsSection Component
export function StatsSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    availableXP: 0,
    activeDays: 0,
    completedLessons: 0,
    level: 1,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          const availableXP = data.availableXP || 0;
          const completedLessons = data.completedLessons || 0;
          const level = data.level || 1;

          const dailyUsage = data.appUsage?.dailyUsage || [];
          const uniqueDates = new Set(dailyUsage.map((entry) => entry.date));
          const activeDays = uniqueDates.size;

          setStats({
            availableXP,
            activeDays,
            completedLessons,
            level,
          });
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-semibold"
         style={{ color: 'var(--color-primary)' }}>
      <div>
        <p className="text-lg">{stats.availableXP}</p>
        <p className="text-xs muted-text">Available XP</p>
      </div>

      <div>
        <p className="text-lg">{stats.activeDays}</p>
        <p className="text-xs muted-text">Days Active</p>
      </div>

      <div>
        <p className="text-lg">{stats.completedLessons}</p>
        <p className="text-xs muted-text">Lessons Completed</p>
      </div>

      <div>
        <p className="text-lg">{stats.level}</p>
        <p className="text-xs muted-text">Level</p>
      </div>
    </div>
  );
}