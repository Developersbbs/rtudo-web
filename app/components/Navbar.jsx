'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaBookOpen,
  FaRobot,
  FaHome,
  FaUser,
  FaCrown,
} from 'react-icons/fa';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: <FaHome className="text-lg" />, key: 'dashboard' },
    { href: '/lessons', icon: <FaBookOpen className="text-lg" />, key: 'lessons' },
    { href: '/ai', icon: <FaRobot className="text-lg" />, key: 'ai', isCenter: true },
    { href: '/subscription', icon: <FaCrown className="text-lg" />, key: 'subscription' },
    { href: '/profile', icon: <FaUser className="text-lg" />, key: 'profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card-background)] py-2 px-6 rounded-t-2xl shadow-inner flex justify-around items-center z-50 max-w-3xl mx-auto border-t border-[var(--card-border)]">
      {navItems.map(({ href, icon, key, isCenter }) => (
        <Link href={href} key={key}>
          <div
            className={`${
              isCenter
                ? 'p-3 -mt-5 shadow-md'
                : 'p-2'
            } rounded-full flex items-center justify-center transition-all duration-200 ${
              pathname === href
                ? 'bg-[var(--color-primary)] text-white'
                : isCenter
                  ? 'bg-[var(--color-primary)] text-white opacity-70'
                  : 'text-[var(--color-primary)]'
            }`}
          >
            {icon}
          </div>
        </Link>
      ))}
    </nav>
  );
}
