"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth } from "./firebase/firebaseConfig";

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleNext = () => {
    router.push("/onboarding/step1");
  };

  if (checkingAuth) return null;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-white text-center">
      <div className="mb-6">
        <Image
          src="/assets/logo.png"
          alt="R-Tudo Logo"
          width={120}
          height={120}
          priority    
        />
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-6 leading-snug">
        Join the English Learning Revolution
      </h2>

      <div className="w-full max-w-sm">
        <button
          onClick={handleNext}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-full font-semibold shadow-md hover:opacity-90 transition cursor-pointer"
        >
          Get Started
        </button>
      </div>

      <p className="mt-6 text-sm text-gray-600 font-bold">
        Already an R-Tudo user?{" "}
        <button
          onClick={() => router.push("/main")}
          className="text-[var(--color-primary)] underline font-bold cursor-pointer"
        >
          Login here
        </button>
      </p>

    </main>
  );
}
