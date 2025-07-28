'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { FaBookOpen } from 'react-icons/fa';

import Navbar from '../components/Navbar';
import DailyGoal from '../components/profile/DailyGoal';
import Achievements from '../components/profile/Achievements';
import Preferences from '../components/profile/Preferences';
import LearningSettings from '../components/profile/LearningSettings';
import AccountSettings from '../components/profile/AccountSettings';
import StatsSection from '../components/profile/StatsSection';
import LearningProgress from '../components/profile/LearningProgress';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Store all user data
  const [proficiencyLevel, setProficiencyLevel] = useState('Beginner');
  const [learningLanguage, setLearningLanguage] = useState('en');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [reminderTime, setReminderTime] = useState('08:00');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace('/');
        return;
      }

      setUser(u);
      
      // Set up real-time listener for user data
      const userRef = doc(db, 'users', u.uid);
      
      const unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Real-time user data:', data);

          // Update userData state for StatsSection
          setUserData(data);

          const todayStr = new Date().toISOString().split('T')[0];
          
          // ✅ Only update activeDays if this is a new calendar day
          const lastActiveDate = data.lastActiveDate || '';
          
          if (lastActiveDate !== todayStr) {
            const newActiveDays = (data.activeDays || 0) + 1;

            await updateDoc(userRef, {
              activeDays: newActiveDays,
              lastActiveDate: todayStr,
            });

            console.log('✅ Updated activeDays to:', newActiveDays, 'for date:', todayStr);
          } else {
            console.log('📅 User already recorded as active today, not incrementing activeDays');
          }

          // Set local state
          setProficiencyLevel(data.proficiencyLevel || 'Beginner');
          setLearningLanguage(data.learningLanguage || 'en');
          setDailyGoal(data.dailyGoal || 5);
          setReminderTime(data.reminderTime || '08:00');
        } else {
          console.warn('User document not found');
        }
      }, (error) => {
        console.error('Error listening to user data:', error);
      });

      // Return cleanup function
      return () => unsubscribeDoc();
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleReminderChange = async (newTime) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { reminderTime: newTime });
      setReminderTime(newTime);
      console.log('Updated reminder time:', newTime);
    } catch (err) {
      console.error('Failed to update reminderTime:', err);
    }
  };

  const handleLanguageChange = async (newLang) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { learningLanguage: newLang });
      setLearningLanguage(newLang);
      console.log('Language updated in Firestore:', newLang);
    } catch (err) {
      console.error('Failed to update learningLanguage:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-color)] transition-colors duration-300 pb-20">
      {/* Profile Header */}
      <div className="bg-[var(--color-primary)] text-white px-4 py-3 rounded-b-2xl text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-1">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white text-[var(--color-primary)] font-bold text-2xl flex items-center justify-center">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold">
          {user?.displayName?.toUpperCase() || user?.email?.split('@')[0]}
        </h2>
        <p className="text-sm opacity-80 break-all">{user?.email}</p>
        <p className="text-xs mt-1 flex items-center justify-center gap-1">
          <FaBookOpen className="text-white text-sm" />
          Learning EN • {proficiencyLevel}
        </p>
      </div>

      {/* Sections */}
      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Pass userData to StatsSection to ensure it shows updated values */}
        <StatsSection userData={userData} />
        <DailyGoal />
        <div className="card rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>
            Achievements
          </p>
          <Achievements />
        </div>
        <div className="card rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>
            Learning Progress
          </p>
          <LearningProgress/>
        </div>

        <div className="card rounded-2xl border p-4 space-y-4">
          {/* Preferences */}
          <div className="space-y-3">
            <p className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>
              Preferences
            </p>
            <Preferences />
          </div>

          {/* Learning */}
          <div className="space-y-3">
            <p className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>
              Learning
            </p>
            <LearningSettings
              learningLanguage={learningLanguage}
              dailyGoal={dailyGoal}
              reminderTime={reminderTime}
              onLanguageChange={handleLanguageChange}
              onReminderChange={handleReminderChange}
            />
          </div>

          {/* Account */}
          <div className="space-y-3">
            <p className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>
              Account
            </p>
            <AccountSettings
              onSignOut={handleSignOut}
              onProfileUpdate={({ displayName, photoURL }) => {
                setUser((prev) => ({
                  ...prev,
                  displayName: displayName || prev.displayName,
                  photoURL: photoURL || prev.photoURL,
                }));
              }}
            />
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}