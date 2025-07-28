'use client';

import { useEffect, useState } from 'react';
import { BsSun, BsMoonStarsFill } from 'react-icons/bs';

export default function Preferences() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark =
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className="space-y-3">
      

      <div
        className="rounded-xl p-3 flex items-center gap-4 cursor-pointer"
        style={{
          backgroundColor: 'var(--accent)', // 👈 this must exist in CSS
        }}
      >
        <div
          className="min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full"
          style={{ backgroundColor: '#F6EAF2' }}
        >
          {isDark ? (
            <BsMoonStarsFill className="text-[var(--color-primary)]" />
          ) : (
            <BsSun className="text-yellow-500" />
          )}
        </div>

        <div className="flex justify-between items-center w-full">
          <span className="font-medium text-base" style={{ color: 'var(--text-color)' }}>
            Dark Mode
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            aria-label="Toggle Dark Mode"
            className={`relative w-12 h-6 flex items-center rounded-full transition-all duration-300 shadow-inner ${
              isDark ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-xs transition-transform duration-300 ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            >
              {isDark ? (
                <BsMoonStarsFill className="text-[var(--color-primary)]" size={12} />
              ) : (
                <BsSun className="text-yellow-400" size={12} />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
