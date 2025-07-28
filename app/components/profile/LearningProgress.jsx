'use client';

import { useEffect, useState } from 'react';
import { FaMicrophone, FaHeadphones, FaBook, FaLanguage } from 'react-icons/fa';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/app/firebase/firebaseConfig';

export default function LearningProgress() {
  const [xp, setXp] = useState({
    speaking: 0,
    listening: 0,
    grammar: 0,      // grammar == writing
    vocabulary: 0,   // manually updated or tracked differently
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for user XP updates
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setXp({
          speaking: data?.xp?.speaking || 0,
          listening: data?.xp?.listening || 0,
          grammar: data?.xp?.writing || 0,
          vocabulary: data?.xp?.vocabulary || 0,
        });
      }
    }, (error) => {
      console.error('Error listening to XP updates:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const skills = [
    {
      label: 'Speaking',
      icon: <FaMicrophone size={18} />,
      color: '#F87171', // red
      value: xp.speaking,
    },
    {
      label: 'Listening',
      icon: <FaHeadphones size={18} />,
      color: '#60A5FA', // blue
      value: xp.listening,
    },
    {
      label: 'Grammar',
      icon: <FaBook size={18} />,
      color: '#A78BFA', // purple
      value: xp.grammar,
    },
    {
      label: 'Vocabulary',
      icon: <FaLanguage size={18} />,
      color: '#34D399', // green
      value: xp.vocabulary,
    },
  ];

  // Don't render anything if user is not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="space-y-2 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {skills.map((skill, index) => {
        const percentage = Math.min(100, (skill.value / 100) * 100);
        return (
          <div key={index} className="space-y-2">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ backgroundColor: `${skill.color}33`, color: skill.color }}
              >
                {skill.icon}
              </div>
              <div>
                <p className="font-bold text-[var(--text-color)]">{skill.label}</p>
                <p className="text-sm text-[var(--muted-text)]">{skill.value}/100 XP</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: skill.color,
                }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}