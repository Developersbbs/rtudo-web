"use client";

import { useRouter } from "next/navigation";
import { googleLogin } from "../utils/googleLogin";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaGoogle } from "react-icons/fa";

export default function GoogleLoginButton() {
  const router = useRouter();

  const handleLogin = async () => {
    const user = await googleLogin();
    if (!user) return;

    const nativeLang = localStorage.getItem("nativeLanguage");
    const motivation = localStorage.getItem("motivation");
    const level = localStorage.getItem("level");
    const source = localStorage.getItem("source");
    const learningTime = JSON.parse(localStorage.getItem("learningTime") || "{}");

    await setDoc(
      doc(db, "users", user.uid),
      {
        nativeLanguage: nativeLang,
        motivation,
        proficiencyLevel: level,
        source: source || null,
        reminderTime: learningTime?.reminderTime || "",
        dailyGoal: learningTime?.dailyGoal || 2,
        hasCompletedOnboarding: true,
      },
      { merge: true }
    );

    localStorage.clear();
    router.push("/dashboard");
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#DB4437] text-white font-semibold shadow-md hover:opacity-90 transition"
    >
      <FaGoogle className="text-lg" />
      Continue with Google
    </button>
  );
}
