'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import dayjs from 'dayjs';
import { PiTargetBold } from 'react-icons/pi';
import { FaCheckCircle } from 'react-icons/fa';

export default function DailyGoal() {
  const { user } = useAuth();
  const [dailyGoal, setDailyGoal] = useState(5);
  const [completedToday, setCompletedToday] = useState(0);
  const [isGoalMet, setIsGoalMet] = useState(false);
  const [today, setToday] = useState(dayjs().format('YYYY-MM-DD'));

  // 🕒 Auto-update the date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(dayjs().format('YYYY-MM-DD'));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 📥 Get user's daily goal
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      const goal = snap.exists() ? snap.data()?.learningTime?.goal || 5 : 5;
      setDailyGoal(goal);
    });
    return () => unsubscribe();
  }, [user]);

  // 📥 Track completed lessons for today
  useEffect(() => {
    if (!user) return;
    const progressRef = doc(db, 'users', user.uid, 'progress', 'chapters');
    const unsubscribe = onSnapshot(progressRef, (snap) => {
      if (!snap.exists()) return;
      const lessons = snap.data().completedLessons || [];
      const todayCount = lessons.filter((lesson) => {
        if (typeof lesson === 'object' && lesson.completedAt) {
          const date = lesson.completedAt.toDate?.() || new Date(lesson.completedAt);
          return dayjs(date).format('YYYY-MM-DD') === today;
        }
        return false;
      }).length;
      setCompletedToday(todayCount);
      setIsGoalMet(todayCount >= dailyGoal);
    });
    return () => unsubscribe();
  }, [user, dailyGoal, today]);

  const progressPercent = Math.min(100, (completedToday / dailyGoal) * 100);

  return (
    <div
      className="p-4 rounded-xl shadow transition-colors duration-300"
      style={{
        backgroundColor: 'var(--card-background)',
        color: 'var(--text-color)',
      }}
    >
      {/* 🔹 Heading */}
      <p className="font-bold mb-2 flex items-center gap-2 text-base">
        <PiTargetBold style={{ color: 'var(--text-color)' }} />
        Daily Goal
      </p>

      {/* 🔹 Progress Bar */}
      <div className="h-2 mb-2 rounded-full overflow-hidden bg-gray-300">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: 'var(--color-primary)',
          }}
        ></div>
      </div>

      {/* 🔹 Status */}
      {isGoalMet ? (
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-color)' }}>
          <FaCheckCircle style={{ color: 'var(--text-color)' }} />
          Goal Met! Great job!
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-color)' }}>
          {completedToday}/{dailyGoal} lessons completed today
        </p>
      )}
    </div>
  );
}
