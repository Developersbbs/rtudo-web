"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Loader from "../components/Loader";
import dayjs from "dayjs";
import { differenceInDays } from "date-fns";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userRef = doc(db, "users", uid);
        const now = new Date();
        const today = dayjs().format("YYYY-MM-DD");
        const nowISO = now.toISOString();

        let userDoc = await getDoc(userRef);

        // 👇 helper to check onboarding completion
        function checkOnboardingStatus(data) {
          const learningTime = data.learningTime || {};
          return Boolean(
            data.nativeLanguage?.trim() &&
            data.motivation?.trim() &&
            data.level?.trim() &&
            learningTime.time?.trim() &&
            learningTime.reminder?.trim()
          );
        }

        // 🔰 Create user if not exists
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL || "",
            availableXP: 250,
            totalXP: 250,
            lastLoginDate: nowISO,
            lastLoginXpDate: today,
            lastLogin: now,
            hasReceivedWelcomeBonus: true,
            streak: 1,
            hasCompletedOnboarding: false, // default false
            xpHistory: {
              [today]: {
                earned: 250,
                source: {
                  welcome_bonus: 250,
                },
              },
            },
            appUsage: {
              dailyUsage: [
                {
                  date: today,
                  sessionsCount: 1,
                  timeSpent: 0,
                  lastUpdated: nowISO,
                },
              ],
            },
            weeklyUsage: {
              weekStart: today,
              totalTime: 0,
              averageTime: 0,
              mostActiveDay: today,
              weeklyXPClaimed: false,
            },
            monthlyUsage: {
              month: today.slice(0, 7),
              totalTime: 0,
              averageTime: 0,
              mostActiveWeek: today,
            },
            updatedAt: nowISO,
          });
        } else {
          const data = userDoc.data();
          const lastLogin = data.lastLogin?.toDate?.() || new Date(0);

          // ✅ Recheck onboarding
          const hasCompletedOnboarding = checkOnboardingStatus(data);

          // Update appUsage.dailyUsage
          let dailyUsage = data.appUsage?.dailyUsage || [];
          let todayEntry = dailyUsage.find((entry) => entry.date === today);

          if (todayEntry) {
            todayEntry.sessionsCount += 1;
            todayEntry.lastUpdated = nowISO;
          } else {
            todayEntry = {
              date: today,
              sessionsCount: 1,
              timeSpent: 0,
              lastUpdated: nowISO,
            };
            dailyUsage.push(todayEntry);
          }

          let updates = {
            "appUsage.dailyUsage": dailyUsage,
            lastLoginDate: nowISO,
            updatedAt: nowISO,
            lastLogin: now,
            hasCompletedOnboarding, // 🟢 save the result
          };

          // Add daily XP if not already given today
          if (data.lastLoginXpDate !== today) {
            const availableXP = (data.availableXP || 0) + 10;
            const totalXP = (data.totalXP || 0) + 10;
            const xpToday = (data.xpHistory?.[today]?.earned || 0) + 10;

            updates = {
              ...updates,
              availableXP,
              totalXP,
              lastLoginXpDate: today,
              [`xpHistory.${today}.earned`]: xpToday,
              [`xpHistory.${today}.source.daily`]: 10,
            };

            const daysDiff = differenceInDays(now, lastLogin);
            let newStreak = daysDiff === 1 ? (data.streak || 0) + 1 : 1;
            updates.streak = newStreak;
          }

          await updateDoc(userRef, updates);
        }

        setUser(firebaseUser);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const fetchUserData = async (uid) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() }; // include plan in data
  }
  return null;
};

  if (loading) return <Loader />;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
