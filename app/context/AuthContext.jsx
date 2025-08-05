"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Loader from "../components/Loader";
import dayjs from "dayjs";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefetchedLessonsData, setPrefetchedLessonsData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔐 Auth state changed:", firebaseUser?.uid);

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userRef = doc(db, "users", uid);
        const nowISO = new Date().toISOString();
        const today = dayjs().format("YYYY-MM-DD");

        // ✅ Try loading cached lessons first
        const cachedLessons = localStorage.getItem("cachedLessons");
        const cachedLessonsDate = localStorage.getItem("cachedLessonsDate");

        if (cachedLessons && cachedLessonsDate) {
          const cachedAgeInDays = dayjs().diff(dayjs(cachedLessonsDate), "day");
          if (cachedAgeInDays < 7) {
            console.log("⚡ Using cached lessons from localStorage");
            setPrefetchedLessonsData(JSON.parse(cachedLessons));
          }
        }

        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          console.log("🆕 Creating new user document...");
          await setDoc(userRef, {
            uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL || "",
            hasCompletedOnboarding: false,
            currentPlan: "Free",
            currentSubscriptionId: "",
            lastLogin: nowISO,
            updatedAt: nowISO,
          });
        } else {
          // Fetch order ID from subscriptions/details if exists
          const subscriptionSnap = await getDocs(
            collection(db, "users", uid, "subscription")
          );

          let currentPlan = "Free";
          let currentSubscriptionId = "";

          if (!subscriptionSnap.empty) {
            const subDoc = subscriptionSnap.docs[0]; // Assuming latest is first
            const subData = subDoc.data();
            currentPlan = subData.planName || "Free";
            currentSubscriptionId = subData.details?.orderID || "";
          }

          await updateDoc(userRef, {
            lastLogin: nowISO,
            updatedAt: nowISO,
            currentPlan,
            currentSubscriptionId,
          });
        }

        setUser(firebaseUser);

        // 🧠 Prefetch chapters and lessons in background
        console.log("🚀 Prefetching chapters and lessons...");
        try {
          const chaptersSnap = await getDocs(collection(db, "chapters"));
          const chapterPromises = chaptersSnap.docs.map(async (chapterDoc) => {
            const chapterData = chapterDoc.data();
            const lessonsSnap = await getDocs(
              collection(db, "chapters", chapterDoc.id, "lessons")
            );

            const lessons = lessonsSnap.docs.map((d, i) => {
              const data = d.data();
              return {
                ...data,
                id: d.id,
                docId: d.id,
                duration: data.duration || 15,
                title: data.title || `Lesson ${i + 1}`,
                description: data.description || "",
                videoUrl: data.videoUrl || "",
                documents: data.documents || [],
                createdAt: data.createdAt || null,
              };
            });

            const totalDuration = lessons.reduce(
              (sum, l) => sum + (l.duration || 15),
              0
            );

            return {
              ...chapterData,
              id: chapterData.id || chapterDoc.id,
              lessons,
              duration: totalDuration,
            };
          });

          const chaptersData = await Promise.all(chapterPromises);
          chaptersData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

          console.log("📦 Prefetched chapters and lessons:", chaptersData);
          setPrefetchedLessonsData(chaptersData);

          // ✅ Save to localStorage
          localStorage.setItem("cachedLessons", JSON.stringify(chaptersData));
          localStorage.setItem("cachedLessonsDate", new Date().toISOString());
        } catch (err) {
          console.error("❌ Failed to prefetch chapters:", err);
        }
      } else {
        console.log("👋 User signed out");
        setUser(null);
        setPrefetchedLessonsData(null);
        localStorage.removeItem("cachedLessons");
        localStorage.removeItem("cachedLessonsDate");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    }
    return null;
  };

  if (loading) return <Loader />;

  return (
    <AuthContext.Provider
      value={{ user, loading, prefetchedLessonsData, fetchUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
