"use client";

import { useEffect, useState, useRef } from "react";
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
import { FaPlay, FaLock, FaTimes, FaPause } from "react-icons/fa";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchedTime, setWatchedTime] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const intervalRef = useRef(null);
  const router = useRouter();

  const TOTAL_LESSONS = 33;
  const REQUIRED_WATCH_TIME = 60; // seconds

  // Cleanup function to stop video and clear intervals
  const cleanupVideo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    
    setIsPlaying(false);
    setVideoProgress(0);
    setWatchedTime(0);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupVideo();
    };
  }, []);

  useEffect(() => {
    const fetchNextLesson = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  try {
    const [userSnap, subSnap, progressSnap] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "users", user.uid, "subscriptions", "details")),
      getDoc(doc(db, "users", user.uid, "progress", "chapters")),
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
    const count = progressData.completedLessonsCount || 0;
    const completedLessons = progressData.completedLessons || [];

    setFullyCompleted(count >= TOTAL_LESSONS);
    if (count >= TOTAL_LESSONS) {
      setLoading(false);
      return;
    }

    const current = userData.currentLesson;
    const currentKey = current ? `${current.chapterId}-${current.lessonId}` : null;
    const isCurrentDone = completedLessons.some(
      (item) => (typeof item === "object" ? item.key === currentKey : item === currentKey)
    );

    // 🔹 Load current or next lesson
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

  const isChapterLocked = (chapterId) => {
    const chapterNumber = parseInt(chapterId) || 0;
    
    if (!userPlan) return true;
    if (userPlan === "basic") return chapterNumber > 5;
    return false;
  };

  const handlePlayLesson = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    if (!subscribed) {
      toast.error("🔒 Subscribe to start learning");
      router.push("/subscription");
      return;
    }

    if (!lesson?.videoUrl) {
      toast.error("Video not available for this lesson");
      return;
    }

    if (isChapterLocked(lesson.chapterId)) {
      toast.error("🔒 This chapter is locked. Upgrade your plan to access it.");
      router.push("/subscription");
      return;
    }

    console.log("🎬 Starting lesson:", lesson);
    toast.success(`▶️ Starting: ${lesson.title}`);

    // Set up video
    if (videoRef.current) {
      videoRef.current.src = lesson.videoUrl;
      setIsPlaying(true);
      
      try {
        await videoRef.current.play();
        
        // Start tracking watch time
        intervalRef.current = setInterval(() => {
          if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            
            setWatchedTime(currentTime);
            setVideoProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
          }
        }, 1000);

      } catch (error) {
        console.error("Failed to play video:", error);
        toast.error("Failed to play video. Please try again.");
        setIsPlaying(false);
      }
    }
  };

  const handleVideoEnded = async () => {
    console.log("🎬 Video ended, checking completion criteria");
    
    if (watchedTime >= REQUIRED_WATCH_TIME) {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user && lesson) {
          const lessonKey = `${lesson.chapterId}-${lesson.lessonId}`;
          const progressRef = doc(db, "users", user.uid, "progress", "chapters");
          
          await updateDoc(progressRef, {
            completedLessons: arrayUnion({ 
              key: lessonKey, 
              completedAt: new Date().toISOString() 
            }),
            completedLessonsCount: increment(1),
          });
          
          setIsCompleted(true);
          toast.success("🎉 Lesson completed! Great job!");
          console.log("✅ Lesson marked as completed successfully");
        }
      } catch (error) {
        console.error("❌ Failed to mark lesson as completed:", error);
        toast.error("Failed to save progress. Please try again.");
      }
    } else {
      toast.error(`Watch at least ${REQUIRED_WATCH_TIME} seconds to complete the lesson`);
    }
    
    cleanupVideo();
  };

  const handleStopVideo = () => {
    cleanupVideo();
    toast.info("Video stopped");
  };

  const handlePauseResume = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

      {/* Video Player (shown when playing) */}
      {isPlaying && (
        <div 
          ref={videoContainerRef}
          className="fixed inset-0 bg-black z-50 flex flex-col"
          style={{ zIndex: 9999 }}
        >
          {/* Video Controls Header */}
          <div className="bg-black bg-opacity-75 p-4 flex justify-between items-center text-white">
            <div>
              <h4 className="font-semibold">{lesson?.title}</h4>
              <p className="text-sm opacity-75">{chapterTitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {formatTime(watchedTime)} / {formatTime(videoRef.current?.duration || 0)}
              </span>
              <button
                onClick={handlePauseResume}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
              >
                <FaPause className="text-sm" />
              </button>
              <button
                onClick={handleStopVideo}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-all"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          </div>

          {/* Video Element */}
          <div className="flex-1 flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              onEnded={handleVideoEnded}
              onError={(e) => {
                console.error("Video error:", e);
                toast.error("Video playback error");
                cleanupVideo();
              }}
            />
          </div>

          {/* Progress Bar */}
          <div className="bg-black bg-opacity-75 p-4">
            <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
              <div
                className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-white text-sm">
              <span>Watch at least {REQUIRED_WATCH_TIME}s to complete</span>
              <span className={watchedTime >= REQUIRED_WATCH_TIME ? "text-green-400" : "text-white"}>
                {watchedTime >= REQUIRED_WATCH_TIME ? "✓ Completion criteria met" : `${Math.max(0, REQUIRED_WATCH_TIME - Math.floor(watchedTime))}s remaining`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Card Content */}
      <div className="p-4 rounded-lg flex flex-col gap-2" style={{ backgroundColor: "var(--accent)" }}>
        {/* Chapter Title Inside Card */}
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
            onClick={handlePlayLesson}
            disabled={isPlaying}
            className={`text-sm font-semibold py-1 px-3 rounded-full text-white transition-all ${
              isPlaying
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'hover:opacity-90'
            }`}
            style={{ 
              backgroundColor: isPlaying ? '#9CA3AF' : "var(--color-primary)" 
            }}
          >
            {isPlaying ? (
              <>
                <FaPause className="inline mr-1" /> Playing...
              </>
            ) : !subscribed ? (
              <>
                <FaPlay className="inline mr-1" /> Start
              </>
            ) : chapterLocked ? (
              <>
                <FaLock className="inline mr-1" /> Locked
              </>
            ) : (
              <>
                <FaPlay className="inline mr-1" /> Start
              </>
            )}
          </button>
        </div>

        {/* Show upgrade message only if subscribed but chapter is locked */}
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