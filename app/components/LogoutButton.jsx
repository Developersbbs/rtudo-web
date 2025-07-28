'use client';
import { logoutUser } from '../firebase/auth';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  return (
    <button onClick={handleLogout} className="mt-4 text-sm text-red-500 underline">
      Logout
    </button>
  );
}
