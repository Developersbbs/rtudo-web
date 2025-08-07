"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBookOpen, FaRobot, FaHome, FaUser, FaCrown } from "react-icons/fa";
import Image from "next/image";
import geminiIcon from "../../public/icons/ai.png";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      icon: <FaHome className="text-lg" />,
      label: "Home",
      key: "dashboard",
    },
    {
      href: "/lessons",
      icon: <FaBookOpen className="text-lg" />,
      label: "Lessons",
      key: "lessons",
    },
    {
      href: "/ai",
      icon: (
        <Image
          src={geminiIcon}
          alt="Gemini"
          width={20}
          height={20}
          className="w-10 h-10 object-contain filter invert brightness-50"
        />
      ),
      label: "Ask AI",
      key: "ai",
      isCenter: true,
    },
    {
      href: "/subscription",
      icon: <FaCrown className="text-lg" />,
      label: "Subscription",
      key: "subscription",
    },
    { 
      href: "/profile", 
      icon: <FaUser className="text-lg" />, 
      label: "Profile",
      key: "profile" 
    },
    ,
    
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card-background)] py-2 px-6 rounded-t-2xl shadow-inner flex justify-around items-end z-50 max-w-3xl mx-auto border-t border-[var(--card-border)]">
      {navItems.map(({ href, icon, key, isCenter, label }) => (
        <Link href={href} key={key} className="flex flex-col items-center">
          <div
            className={`${
              isCenter ? "p-3 -mt-5 shadow-md" : "p-2"
            } rounded-full flex items-center justify-center transition-all duration-200 ${
              pathname === href
                ? "bg-[var(--color-primary)] text-white"
                : isCenter
                  ? "bg-[var(--color-primary)] text-white opacity-70"
                  : "text-[var(--color-primary)]"
            }`}
          >
            {icon}
          </div>
          <span className={`text-xs mt-1 ${pathname === href ? 'text-[var(--color-primary)]' : 'text-[var(--muted-text)]'}`}>
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
