// app/hooks/useAuthRedirect.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase/firebaseConfig';

export const useAuthRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);
};
