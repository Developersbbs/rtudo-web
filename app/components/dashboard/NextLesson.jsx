"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { FaPlay, FaLock } from "react-icons/fa";
import { BsCheckCircleFill, BsMortarboardFill } from "react-icons/bs";
import toast from "react-hot-toast";

export default function NextLessonCard() {
  const [lesson, setLesson] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [fullyCompleted, setFullyCompleted] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchNextLesson = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const [userSnap, subSnap, progressSnap, chaptersSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "users", user.uid, "subscription", "details")),
          getDoc(doc(db, "users", user.uid, "progress", "chapters")),
          getDocs(collection(db, "chapters")),
        ]);

        // 🔹 SUBSCRIPTION
        let isActive = false;
        let currentPlan = null;
        if (subSnap.exists()) {
          const sub = subSnap.data();
          const validUntil = new Date(sub.endDate);
          if (sub.status === "active" && validUntil > new Date()) {
            isActive = true;
            currentPlan = sub.plan;
            setSubscribed(true);
            setUserPlan(sub.plan);
          }
        }

        // 🔹 USER DATA & PROGRESS
        const userData = userSnap.exists() ? userSnap.data() : {};
        const progressData = progressSnap.exists() ? progressSnap.data() : {};
        const completedLessons = progressData.completedLessons || [];

        // Get all chapters and their lessons
        const chapters = chaptersSnap.docs;
        let allChaptersCompleted = true;

        for (const chapterDoc of chapters) {
          const lessonsSnap = await getDocs(collection(db, "chapters", chapterDoc.id, "lessons"));
          const lessons = lessonsSnap.docs.filter(doc => doc.data().videoUrl); // Only video lessons
          
          // Check if all video lessons in this chapter are completed
          const chapterCompleted = lessons.every(lessonDoc => {
            const lessonKey = `${chapterDoc.id}-${lessonDoc.id}`;
            return completedLessons.some(item => 
              (typeof item === "object" ? item.key : item) === lessonKey
            );
          });

          if (!chapterCompleted) {
            allChaptersCompleted = false;
            break;
          }
        }

        setFullyCompleted(allChaptersCompleted);
        if (allChaptersCompleted) {
          setLoading(false);
          return;
        }

        const current = userData.currentLesson;
        const currentKey = current ? `${current.chapterId}-${current.lessonId}` : null;
        const isCurrentDone = completedLessons.some(
          (item) => (typeof item === "object" ? item.key === currentKey : item === currentKey)
        );

        if (isActive && current && !isCurrentDone) {
          setLesson(current);
          setIsCompleted(false);
          const chapterSnap = await getDoc(doc(db, "chapters", current.chapterId));
          if (chapterSnap.exists()) {
            setChapterTitle(chapterSnap.data().title || "");
          }
        } else {
          await findNextUncompletedLesson(completedLessons);
        }
      } catch (error) {
        console.error("Error loading lesson:", error);
        toast.error("Failed to load lesson");
      }

      setLoading(false);
    };

    const findNextUncompletedLesson = async (completedLessons) => {
      const chaptersSnap = await getDocs(collection(db, "chapters"));
      let chapters = await Promise.all(
        chaptersSnap.docs.map(async (chapterDoc) => {
          const lessonsSnap = await getDocs(
            collection(db, "chapters", chapterDoc.id, "lessons")
          );
          const lessons = lessonsSnap.docs.map((doc) => ({
            ...doc.data(),
            chapterId: chapterDoc.id,
            lessonId: doc.id,
            chapterTitle: chapterDoc.data().title,
          }));
          return lessons;
        })
      );
      chapters = chapters.flat();

      const next = chapters.find((lesson) => {
        const key = `${lesson.chapterId}-${lesson.lessonId}`;
        return !completedLessons.some((item) =>
          typeof item === "object" ? item.key === key : item === key
        );
      });

      if (next) {
        setLesson(next);
        setIsCompleted(false);
        setChapterTitle(next.chapterTitle || "");
      }
    };

    fetchNextLesson();
  }, []);

  const isChapterLocked = useCallback((chapterId) => {
    if (!subscribed) return true;
    if (userPlan === "pro") return false;
    if (userPlan === "basic") {
      const chapterNumber = parseInt(chapterId);
      return isNaN(chapterNumber) || chapterNumber >= 5;
    }
    return true;
  }, [subscribed, userPlan]);

  if (loading) {
    return (
      <div className="rounded-xl shadow p-4" style={{ backgroundColor: "var(--card-background)" }}>
        <h3 className="text-lg font-bold mb-2 text-[var(--text-color)]">Current Lesson</h3>
        <p className="text-sm text-[var(--muted-text)]">Loading...</p>
      </div>
    );
  }

  if (fullyCompleted) {
    return (
      <div className="rounded-xl shadow p-4" style={{ backgroundColor: "var(--card-background)" }}>
        <div className="flex items-center gap-2 text-[var(--text-color)] mb-2">
          <BsMortarboardFill className="text-xl" />
          <h3 className="text-lg font-bold">All lessons completed</h3>
        </div>
        <p className="text-sm text-[var(--muted-text)] mb-4">Explore other features to keep improving.</p>
        <div className="flex items-center justify-between bg-[var(--accent)] px-4 py-3 rounded-xl">
          <span className="text-[var(--color-primary)] font-semibold text-sm">Completed</span>
          <BsCheckCircleFill className="text-xl text-green-600" />
        </div>
      </div>
    );
  }

  const chapterLocked = lesson ? isChapterLocked(lesson.chapterId) : false;

  return (
    <div className="rounded-xl shadow p-4" style={{ backgroundColor: "var(--card-background)" }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-[var(--text-color)]">Current Lesson</h3>
        <button
          onClick={() => router.push("/lessons")}
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          View All
        </button>
      </div>

      <div className="p-4 rounded-lg flex flex-col gap-2" style={{ backgroundColor: "var(--accent)" }}>
        {chapterTitle && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-primary)] mb-1">
              {chapterTitle}
            </span>
            {chapterLocked && <FaLock className="text-xs text-[var(--color-primary)]" />}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h4 className="text-lg font-semibold text-[var(--text-color)]">
            {lesson?.title || "Lesson Title"}
          </h4>
          <button
            onClick={() => router.push("/lessons")}
            className="text-sm font-semibold py-1 px-3 rounded-full text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <FaPlay className="inline mr-1" /> Start
          </button>
        </div>

        {subscribed && chapterLocked && userPlan === 'basic' && (
          <div className="text-center mt-2">
            <p className="text-xs text-[var(--muted-text)] mb-2">
              This chapter requires a Pro subscription
            </p>
            <button
              onClick={() => router.push("/subscription")}
              className="bg-[var(--color-primary)] text-white font-semibold py-1 px-3 rounded-lg text-xs hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        <div className="w-full h-1 rounded-full" style={{ backgroundColor: "var(--secondary-background)" }}>
          <div
            className="h-1 rounded-full"
            style={{
              width: isCompleted ? "100%" : "0%",
              backgroundColor: "var(--color-primary)",
            }}
          />
        </div>

        <p className="text-sm text-[var(--muted-text)]">
          {isCompleted ? "100% Complete" : "0% Complete"}
        </p>
      </div>
    </div>
  );
}
