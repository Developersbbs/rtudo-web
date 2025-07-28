"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig"; // adjust path if different

import {
  ArrowLeft,
  Sprout,
  BookText,
  MessageSquareText,
  Rocket,
  Award,
} from "lucide-react";

const levels = [
  {
    title: "Absolute Beginner",
    description: "Starting from scratch",
    icon: Sprout,
  },
  {
    title: "Basic Knowledge",
    description: "Can understand simple phrases",
    icon: BookText,
  },
  {
    title: "Intermediate",
    description: "Can handle everyday conversations",
    icon: MessageSquareText,
  },
  {
    title: "Advanced",
    description: "Can express complex ideas",
    icon: Rocket,
  },
  {
    title: "Proficient/Fluent",
    description: "Near-native level",
    icon: Award,
  },
];

export default function LevelStep() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleContinue = async () => {
    if (selected) {
      localStorage.setItem("proficiencyLevel", selected);

      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          proficiencyLevel: selected,
        });
      }

      router.push("/onboarding/step4");
    }
  };

  const handleBack = () => router.back();
  const progress = 60;

  return (
    <div className="min-h-screen bg-white flex justify-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col justify-between">
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded mb-6 overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          className="mb-4 text-[var(--color-primary)] hover:opacity-80 transition"
        >
          <ArrowLeft />
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
          What's your English level?
        </h1>
        <p className="text-gray-500 mb-4">
          Select your current proficiency level
        </p>

        {/* Scrollable Options */}
        <div className="space-y-4 mb-6 overflow-y-auto max-h-[400px] pr-1 min-h-[150px]">
          {levels.map(({ title, description, icon: Icon }) => {
            const isSelected = selected === title;
            return (
              <button
                key={title}
                onClick={() => setSelected(title)}
                className={`w-full text-left p-4 rounded-lg border-2 flex items-start gap-4 transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                    : "bg-white text-gray-800 border-gray-50 hover:border-[var(--color-primary)] hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                    isSelected
                      ? "bg-white/20 border-white"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  <Icon
                    size={20}
                    className={`${
                      isSelected
                        ? "text-white"
                        : "text-[var(--color-primary)]"
                    }`}
                  />
                </div>

                <div>
                  <h2
                    className={`font-semibold text-lg ${
                      isSelected ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {title}
                  </h2>
                  <p
                    className={`text-sm ${
                      isSelected ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          disabled={!selected}
          onClick={handleContinue}
          className={`w-full mt-2 py-3 rounded-full text-white font-bold ${
            selected ? "bg-[var(--color-primary)]" : "bg-gray-300"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
