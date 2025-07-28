'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import {
  FaFire,
  FaBookOpen,
  FaStar,
  FaMedal,
} from 'react-icons/fa';

export default function Achievements() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [totalSkillPoints, setTotalSkillPoints] = useState(0);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const progressRef = doc(db, 'users', user.uid, 'progress', 'chapters');

        const [userSnap, progressSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(progressRef),
        ]);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setStreak(data.streak || 0);
          setTotalXP(data.totalXP || 0);
          setTotalSkillPoints(data.totalSkillPoints || 0);
        }

        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          const lessons = progressData.completedLessons || [];

          // Handle array of objects with .key
          const validLessons = Array.isArray(lessons)
            ? lessons.filter((l) => typeof l === 'object' && l.key)
            : [];

          setCompletedLessons(validLessons.length);
        }
      } catch (err) {
        console.error('❌ Error fetching achievements:', err);
      }
    };

    fetchAchievements();
  }, [user]);

  const achievements = [
    {
      title: '7 Day Streak',
      description: 'Practice 7 days in a row',
      icon: FaFire,
      progress: Math.min(streak, 7),
      total: 7,
      color: '#FF4D4F',
    },
    {
      title: 'Quick Learner',
      description: 'Complete 10 lessons',
      icon: FaBookOpen,
      progress: Math.min(completedLessons, 10),
      total: 10,
      color: '#52C41A',
    },
    {
      title: 'XP Master',
      description: 'Earn 1000 XP points',
      icon: FaStar,
      progress: Math.min(totalXP, 1000),
      total: 1000,
      color: '#FAAD14',
    },
    {
      title: 'Skill Champion',
      description: 'Reach 100 skill points',
      icon: FaMedal,
      progress: Math.min(totalSkillPoints, 100),
      total: 100,
      color: '#9254DE',
    },
  ];

  return (
    <div
      className="p-4 rounded-xl transition-colors duration-300"
      style={{ backgroundColor: 'var(--card-background)' }}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {achievements.map((achieve, index) => {
          const Icon = achieve.icon;
          const percentage = (achieve.progress / achieve.total) * 100;

          return (
            <div
              key={index}
              className="min-w-[220px] flex-shrink-0 p-4 rounded-xl shadow transition-colors duration-300"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-color)',
              }}
            >
              <div className="flex justify-center mb-3">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: achieve.color + '33',
                  }}
                >
                  <Icon size={24} color={achieve.color} />
                </div>
              </div>

              <h3 className="text-center font-semibold text-base mb-1">
                {achieve.title}
              </h3>

              <p
                className="text-xs text-center mb-3"
                style={{ color: 'var(--muted-text)' }}
              >
                {achieve.description}
              </p>

              <div className="w-full bg-gray-300 rounded-full h-2 mb-1">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: achieve.color,
                  }}
                ></div>
              </div>
              <p
                className="text-xs text-right"
                style={{ color: 'var(--muted-text)' }}
              >
                {achieve.progress}/{achieve.total}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
