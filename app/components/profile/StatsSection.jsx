'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import {
  FaStar,
  FaCalendarCheck,
  FaBookOpen,
  FaArrowUp,
} from 'react-icons/fa';

export default function StatsSection({ userData }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    availableXP: 0,
    activeDays: 0,
    completedLessons: 0,
    level: 1,
  });

  useEffect(() => {
    if (!userData) return;
    setStats((prev) => ({
      ...prev,
      availableXP: userData.availableXP || 0,
      level: userData.level || 1,
    }));
  }, [userData]);

  useEffect(() => {
    if (!user || userData) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStats((prev) => ({
          ...prev,
          availableXP: data.availableXP || 0,
          level: data.level || 1,
        }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const progressRef = doc(db, 'users', user.uid, 'progress', 'chapters');
    const unsubscribe = onSnapshot(progressRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const completedLessons = data.completedLessons || [];
        setStats((prev) => ({
          ...prev,
          completedLessons: completedLessons.length,
        }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const dailyUsage = data.appUsage?.dailyUsage || [];
        setStats((prev) => ({
          ...prev,
          activeDays: dailyUsage.length,
        }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  const statItems = [
    {
      label: 'Available XP',
      value: stats.availableXP,
      icon: FaStar,
      color: '#FAAD14',
    },
    {
      label: 'Days Active',
      value: stats.activeDays,
      icon: FaCalendarCheck,
      color: '#52C41A',
    },
    {
      label: 'Lessons Completed',
      value: stats.completedLessons,
      icon: FaBookOpen,
      color: '#1890FF',
    },
    {
      label: 'Level',
      value: stats.level,
      icon: FaArrowUp,
      color: '#9254DE',
    },
  ];

  return (
    <div
      className="p-4 rounded-xl transition-colors duration-300"
      style={{ backgroundColor: 'var(--card-background)' }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex flex-col items-center justify-center gap-1">
              <div
                className="w-10 h-10 flex items-center justify-center rounded-full mb-1"
                style={{ backgroundColor: item.color + '33' }}
              >
                <Icon size={18} color={item.color} />
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>
                {item.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
