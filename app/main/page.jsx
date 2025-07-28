'use client';

import { useState } from 'react';
import CreateAccount from '../components/create-account';
import Login from '../components/Login';
import { IoMail } from 'react-icons/io5';
import GoogleLoginButton from '../components/GoogleLoginButton';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFormType = searchParams.get('formType');
  const [formType, setFormType] = useState(
    initialFormType === 'login' || initialFormType === 'signup' ? initialFormType : null
  );

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/logo.png"
            alt="R-Tudo Logo"
            width={120}
            height={120}
            priority
          />
        </div>

        {!formType ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Join the English Learning Revolution
            </h2>
            <p className="text-gray-500 mb-8">
              Create an account to start your journey
            </p>

            <div className="space-y-4 w-full">
              <button
                onClick={() => {router.push("/signup")}}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-md hover:opacity-90 transition"
              >
                <IoMail size={20} />
                Continue with Email
              </button>

              <GoogleLoginButton />
            </div>

            <p className="text-xs text-gray-500 mt-6">
              By continuing, you agree to our{' '}
              <a
                href="https://r-tudo.com/privacy-policy.html"
                className="text-[var(--color-primary)] underline"
              >
                Privacy Policy
              </a>
            </p>
          </>
        ) : formType === 'signup' ? (
          <CreateAccount
            onClose={() => {
              setFormType(null);
              router.push('/');
            }}
            switchToLogin={() => {
              setFormType('login');
              router.push('/?formType=login');
            }}
          />
        ) : (
          <Login
            onClose={() => {
              setFormType(null);
              router.push('/');
            }}
            switchToSignup={() => {
              setFormType('signup');
              router.push('/?formType=signup');
            }}
          />
        )}
      </div>
    </main>
  );
}
