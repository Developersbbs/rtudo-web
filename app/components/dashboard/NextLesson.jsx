"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { FaPlay } from "react-icons/fa";
import { BsCheckCircleFill, BsMortarboardFill } from "react-icons/bs";

export default function NextLessonCard() {
  const [lesson, setLesson] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [fullyCompleted, setFullyCompleted] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const TOTAL_LESSONS = 33;

  useEffect(() => {
    const fetchNextLesson = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const subscriptionRef = doc(db, "users", user.uid, "subscriptions", "details");
      const subSnap = await getDoc(subscriptionRef);
      let isActive = false;

      if (subSnap.exists()) {
        const sub = subSnap.data();
        if (sub.status === "active" && new Date(sub.endDate) > new Date()) {
          isActive = true;
          setSubscribed(true);
        }
      }

      const progressRef = doc(db, "users", user.uid, "progress", "chapters");
      const progressSnap = await getDoc(progressRef);
      const progressData = progressSnap.exists() ? progressSnap.data() : {};

      const count = progressData.completedLessonsCount || 0;
      setFullyCompleted(count >= TOTAL_LESSONS);

      const completedLessons = progressData.completedLessons || [];
      const current = userData.currentLesson;

      if (count >= TOTAL_LESSONS) {
        setLoading(false);
        return;
      }

      
      if (isActive && current) {
  const lessonKey = `${current.chapterId}-${current.lessonId}`;
  const completedMatch = completedLessons.some(
    (item) =>
      (typeof item === "string" && item === lessonKey) ||
      (typeof item === "object" && item.key === lessonKey)
  );

  if (!completedMatch) {
    // Still in progress
    setLesson(current);
    setIsCompleted(false);
    const chapterSnap = await getDoc(doc(db, "chapters", current.chapterId));
    if (chapterSnap.exists()) setChapterTitle(chapterSnap.data().title || "");
  } else {
    // Current is already completed → show next uncompleted lesson
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
  }
}
else {
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
      }

      setLoading(false);
    };

    fetchNextLesson();
  }, []);

  const handlePlayLesson = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !lesson?.videoUrl) return;

    const video = document.createElement("video");
    video.src = lesson.videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.style.display = "none";
    document.body.appendChild(video);

    try {
      await video.requestFullscreen();
      video.style.display = "block";

      let watchedTime = 0;
      const interval = setInterval(() => {
        watchedTime = video.currentTime;
        if (watchedTime >= 60) {
          clearInterval(interval);
        }
      }, 1000);

      video.onended = async () => {
        if (watchedTime >= 60) {
          const lessonKey = `${lesson.chapterId}-${lesson.lessonId}`;
          const progressRef = doc(db, "users", user.uid, "progress", "chapters");
          await updateDoc(progressRef, {
            completedLessons: arrayUnion({ key: lessonKey, completedAt: new Date().toISOString() }),
            completedLessonsCount: increment(1),
          });
          setIsCompleted(true);
        }
        video.remove();
      };
    } catch (err) {
      console.error("Error playing video:", err);
      video.remove();
    }
  };

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
        {/* Chapter Title Inside Card */}
        {chapterTitle && (
          <span className="text-sm font-medium text-[var(--color-primary)] mb-1">
            {chapterTitle}
          </span>
        )}

        <div className="flex justify-between items-center">
          <h4 className="text-lg font-semibold text-[var(--text-color)]">
            {lesson?.title || "Lesson Title"}
          </h4>
          <button
            onClick={handlePlayLesson}
            className="text-sm font-semibold py-1 px-3 rounded-full text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <FaPlay className="inline mr-1" /> Start
          </button>
        </div>

        <div className="w-full h-1 rounded-full" style={{ backgroundColor: "var(--secondary-background)" }}>
          <div
            className="h-1 rounded-full"
            style={{
              width: isCompleted ? "100%" : "0%",
              backgroundColor: "var(--color-primary)",
            }}
          ></div>
        </div>

        <p className="text-sm text-[var(--muted-text)]">
          {isCompleted ? "100% Complete" : "0% Complete"}
        </p>
      </div>
    </div>
  );
}
