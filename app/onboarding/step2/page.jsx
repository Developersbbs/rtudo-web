"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  GraduationCap,
  PlaneTakeoff,
  Earth,
  UserCheck,
} from "lucide-react";

const motivations = [
  {
    title: "Career Growth",
    description: "Improve job prospects and professional communication",
    icon: BriefcaseBusiness,
  },
  {
    title: "Education",
    description: "Study abroad or academic purposes",
    icon: GraduationCap,
  },
  {
    title: "Travel",
    description: "Explore the world and communicate with locals",
    icon: PlaneTakeoff,
  },
  {
    title: "Cultural Interest",
    description: "Connect with English-speaking culture",
    icon: Earth,
  },
  {
    title: "Personal Growth",
    description: "Self-improvement and confidence building",
    icon: UserCheck,
  },
];

export default function MotivationStep() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleContinue = () => {
    if (selected) {
      router.push("/onboarding/step3");
    }
  };

  const handleBack = () => router.back();
  const progress = 40;

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
          Why learn English?
        </h1>
        <p className="text-gray-500 mb-4">Choose your main motivation</p>

        {/* Motivation list */}
        <div className="space-y-4 mb-6 overflow-y-auto max-h-[400px] pr-1 min-h-[150px]">
          {motivations.map(({ title, description, icon: Icon }) => {
            const isSelected = selected === title;
            return (
              <button
                key={title}
                onClick={() => setSelected(title)}
                className={`w-full text-left p-4 rounded-lg border-2 flex items-start gap-4 transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                    : "bg-white text-gray-800 border-gray-200 hover:border-[var(--color-primary)] hover:bg-gray-50"
                }`}
              >
                <Icon
                  size={28}
                  className={`min-w-[28px] ${
                    isSelected ? "text-white" : "text-[var(--color-primary)]"
                  }`}
                />
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
