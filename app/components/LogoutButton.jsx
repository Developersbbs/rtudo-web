'use client';

import { logoutUser } from '../firebase/auth';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function LogoutButton() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme(); // ✅ add resolvedTheme

  const handleLogout = async () => {
    await logoutUser();

    // ✅ Force light theme in both next-themes + DOM + localStorage
    setTheme("light");

    // 💡 Safety fallback (for rare hydration issues)
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }

    // ✅ Ensure app uses light theme after redirect
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="mt-4 text-sm text-red-500 underline"
    >
      Logout
    </button>
  );
}
