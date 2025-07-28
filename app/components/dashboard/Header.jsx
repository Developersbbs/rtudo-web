"use client";
import Image from "next/image";
import { MdOutlineWbSunny, MdOutlineDarkMode } from "react-icons/md";
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl shadow-sm" 
           style={{ background: 'linear-gradient(to right, var(--background), var(--accent))' }}>
        <Image
          src="/assets/logo.png"
          alt="R-Tudo Logo"
          width={120}
          height={120}
        />
        <div className="text-2xl p-2">
          <MdOutlineWbSunny />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-xl shadow-sm" 
         style={{ 
           background: `linear-gradient(to right, var(--background), var(--accent))`,
           borderColor: 'var(--card-border)'
         }}>
      <Image
        src="/assets/logo.png"
        alt="R-Tudo Logo"
        width={120}
        height={120}
      />
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="text-2xl p-2 rounded-full transition-all duration-200 hover:scale-110"
        style={{ 
          color: 'var(--color-primary)',
          backgroundColor: 'transparent'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        {theme === 'dark' ? <MdOutlineWbSunny /> : <MdOutlineDarkMode />}
      </button>
    </div>
  );
}