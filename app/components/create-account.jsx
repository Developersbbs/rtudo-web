"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { registerUser } from "../firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import Image from "next/image";

export default function CreateAccount() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) router.replace("/dashboard");
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      const user = await registerUser(email, password);

      // ✅ Get onboarding data from localStorage
      const nativeLang = localStorage.getItem("nativeLanguage");
      const motivation = localStorage.getItem("motivation");
      const level = localStorage.getItem("level");
      const source = localStorage.getItem("source");
      const learningTime = JSON.parse(localStorage.getItem("learningTime") || "{}");
const hasCompletedOnboarding =
  nativeLang &&
  motivation &&
  level &&
  learningTime?.reminderTime &&
  learningTime?.dailyGoal;

await setDoc(
  doc(db, "users", user.uid),
  {
    nativeLanguage: nativeLang || "",
    motivation: motivation || "",
    proficiencyLevel: level || "",
    source: source || "",
    reminderTime: learningTime?.reminderTime || "",
    dailyGoal: learningTime?.dailyGoal || 2,
    hasCompletedOnboarding: Boolean(hasCompletedOnboarding),
  },
  { merge: true }
);


      localStorage.clear();
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-white text-center">
      <div className="mb-6">
        <Image src="/assets/logo.png" alt="R-Tudo Logo" width={120} height={120} priority />
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-6 leading-snug">
        Join the English Learning Revolution
      </h2>

      <div className="w-full max-w-md mt-4 text-left">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 text-sm">Create an account to start learning</p>
        </div>

        <form className="space-y-4" onSubmit={handleSignUp}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[var(--color-primary)]"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-10 text-black focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-gray-500"
            >
              {showPassword ? <AiOutlineEyeInvisible size={22} /> : <AiOutlineEye size={22} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-10 text-black focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3.5 text-gray-500"
            >
              {showConfirmPassword ? <AiOutlineEyeInvisible size={22} /> : <AiOutlineEye size={22} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-full font-semibold hover:opacity-90 transition"
          >
            Sign Up
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-[var(--color-primary)] font-bold">
          <button onClick={() => router.push("/login")} className="cursor-pointer">
            Already have an account? Sign In
          </button>
        </p>
      </div>
    </main>
  );
}
