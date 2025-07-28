"use client";

import { useEffect, useState } from "react";
import {
  FaClock,
  FaStar,
  FaFire,
  FaBookOpen,
  FaMicrophone,
  FaRobot,
} from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import dayjs from "dayjs";

export default function TodayProgressCard() {
  const { user } = useAuth();
  const [minutesToday, setMinutesToday] = useState(0);
  const [dailyXP, setDailyXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalMinutes, setGoalMinutes] = useState(30); // Default goal

  const progressPercent = Math.min((minutesToday / goalMinutes) * 100, 100);
  const minutesLeft = Math.max(goalMinutes - minutesToday, 0);

  useEffect(() => {
    if (!user) return;

    const todayStr = dayjs().format("YYYY-MM-DD");
    const userRef = doc(db, "users", user.uid);

    const fetchData = async () => {
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;

      const data = snap.data();

      // Set minutesToday
      const savedMinutes = data.minutesToday || 0;
      const lastDate = data.minutesDate || "";
      if (lastDate === todayStr) {
        setMinutesToday(savedMinutes);
      } else {
        await updateDoc(userRef, {
          minutesToday: 0,
          minutesDate: todayStr,
        });
        setMinutesToday(0);
      }

      // Set XP
      setDailyXP(10); // fixed daily XP

      // Calculate streak
      const dailyUsage = data.appUsage?.dailyUsage || [];
      const dates = dailyUsage
        .map((d) => d.date)
        .filter(Boolean)
        .sort((a, b) => dayjs(a).diff(dayjs(b)));

      let current = dayjs();
      let tempStreak = 0;

      for (let i = dates.length - 1; i >= 0; i--) {
        const date = dayjs(dates[i]);
        if (date.isSame(current, "day")) {
          tempStreak++;
          current = current.subtract(1, "day");
        } else {
          break;
        }
      }

      setStreak(tempStreak);

      // Get learningTime (e.g., "15 minutes", "1 hour")
      const learningTimeRaw = data.learningTime || "30 minutes";
      const learningTime = String(learningTimeRaw).toLowerCase();

      if (learningTime.includes("hour")) {
        setGoalMinutes(60);
      } else {
        const num = parseInt(learningTime.split(" ")[0]);
        setGoalMinutes(isNaN(num) ? 30 : num);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Track session time every 30s
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const todayStr = dayjs().format("YYYY-MM-DD");
    let lastSavedAt = Date.now();

    const saveProgress = async () => {
      const now = Date.now();
      const elapsedMin = Math.floor((now - lastSavedAt) / 60000);
      if (elapsedMin <= 0) return;

      lastSavedAt = now;

      const snap = await getDoc(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const saved = data.minutesToday || 0;
      const isToday = data.minutesDate === todayStr;

      await updateDoc(userRef, {
        minutesToday: isToday ? saved + elapsedMin : elapsedMin,
        minutesDate: todayStr,
      });

      setMinutesToday((prev) => (isToday ? prev + elapsedMin : elapsedMin));
    };

    const interval = setInterval(saveProgress, 30000);
    window.addEventListener("beforeunload", saveProgress);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", saveProgress);
      saveProgress(); // final save
    };
  }, [user]);

  if (loading) return <Loader />;

  return (
    <section
      className="p-4 rounded-xl shadow space-y-6 mt-5 transition-all duration-300"
      style={{ backgroundColor: "var(--accent)" }}
    >
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-color)" }}>
        Today's Progress
      </h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<FaClock />} value={minutesToday} label="Minutes Today" />
        <StatCard icon={<FaStar />} value={dailyXP} label="Daily XP" />
        <StatCard icon={<FaFire />} value={streak} label="Day Streak" />
      </div>

      <div
        className="p-4 rounded-xl shadow w-full transition-all duration-300"
        style={{ backgroundColor: "var(--card-background)" }}
      >
        <div
          className="flex justify-between mb-2 text-sm font-medium"
          style={{ color: "var(--muted-text)" }}
        >
          <span>Daily Progress</span>
          <span>{minutesLeft} min left</span>
        </div>

        <div
          className="w-full rounded-full h-3 overflow-hidden"
          style={{ backgroundColor: "var(--secondary-background)" }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              backgroundColor: "var(--color-primary)",
              width: `${progressPercent}%`,
            }}
          ></div>
        </div>

        <p className="mt-2 text-sm" style={{ color: "var(--muted-text)" }}>
          {minutesToday} / {goalMinutes} minutes
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TaskItem icon={<FaBookOpen />} label="Complete Lesson" xp={25} path="/lessons" />
        <TaskItem icon={<FaMicrophone />} label="Practice Skills" xp={15} path="/practice/exam/speaking" />
        <TaskItem icon={<FaRobot />} label="Talk with AI" xp={10} path="/ai" />
      </div>
    </section>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div
      className="p-4 rounded-xl shadow flex flex-col items-center text-center transition-all duration-300"
      style={{ backgroundColor: "var(--card-background)" }}
    >
      <div className="text-2xl mb-2" style={{ color: "var(--color-primary)" }}>
        {icon}
      </div>
      <div className="text-xl font-bold" style={{ color: "var(--text-color)" }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: "var(--muted-text)" }}>
        {label}
      </div>
    </div>
  );
}

function TaskItem({ icon, label, xp, path }) {
  const router = useRouter();
  const { user } = useAuth();

  const handleClick = async () => {
    if (!user) return router.push("/login");

    const userRef = doc(db, "users", user.uid);
    const todayStr = dayjs().format("YYYY-MM-DD");
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const availableXP = data.availableXP || 0;
      const totalXP = data.totalXP || 0;
      const xpHistory = data.xpHistory || {};
      const todayXP = xpHistory[todayStr] || { source: {} };

      if (!todayXP.source?.[label]) {
        const updatedXP = availableXP + xp;
        const updatedTotalXP = totalXP + xp;

        const updatedXPHistory = {
          ...xpHistory,
          [todayStr]: {
            ...todayXP,
            date: todayStr,
            source: {
              ...todayXP.source,
              [label]: xp,
            },
          },
        };

        await updateDoc(userRef, {
          availableXP: updatedXP,
          totalXP: updatedTotalXP,
          xpHistory: updatedXPHistory,
        });
      }
    }

    router.push(path);
  };

  return (
    <button
      onClick={handleClick}
      className="p-4 rounded-xl shadow text-center flex flex-col items-center justify-center w-full transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      style={{ backgroundColor: "var(--card-background)" }}
    >
      <div className="text-2xl mb-2" style={{ color: "var(--color-primary)" }}>
        {icon}
      </div>
      <h4 className="font-medium" style={{ color: "var(--text-color)" }}>
        {label}
      </h4>
      <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-primary)" }}>
        {xp} XP
      </p>
    </button>
  );
}
