"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { useAuth } from "@/app/context/AuthContext";
import { FaLock, FaUnlock, FaFilePdf, FaDownload } from "react-icons/fa";
import { PiNotebookDuotone } from "react-icons/pi";
import { MdOutlineAccessTime } from "react-icons/md";
import { BsCheckCircleFill, BsCheck2 } from "react-icons/bs";
import { IoTrophyOutline } from "react-icons/io5";
import { FiFileText, FiClock, FiPlay } from "react-icons/fi";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import { useRouter } from "next/navigation";
import { markLessonCompleted, markChapterCompletedIfEligible, getUserProgress } from "../firebase/firestore";
import toast from "react-hot-toast";

export default function ChaptersPage() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [finalExams, setFinalExams] = useState([]);

  const [userProgress, setUserProgress] = useState({
    completedLessons: [],
    completedExams: [],
    completedChapters: []
  });
  const router = useRouter();

  const checkSubscription = async () => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "users", user.uid, "subscriptions", "details");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        if (data.status === "active" && new Date(data.endDate) > now) {
          setSubscription(data);
          setUserPlan(data.plan);
        }
      }
    } catch (err) {
      console.error("Subscription check failed", err);
    }
  };

  const loadUserProgress = async () => {
    if (!user?.uid) return;
    try {
      const progress = await getUserProgress(user.uid);
      if (progress) {
        // Normalize completedLessons array
        const normalizedLessons = progress.completedLessons?.map((item) =>
          typeof item === 'string' ? { key: item, completedAt: null } : item
        ) || [];

        setUserProgress({
          ...progress,
          completedLessons: normalizedLessons,
          completedChapters: progress.completedChapters || [],
          completedExams: progress.completedExams || [],
        });

        console.log("📊 User progress loaded:", normalizedLessons);
      }
    } catch (err) {
      console.error("Failed to load user progress:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchChapters = async () => {
      await checkSubscription();
      await loadUserProgress();

      // 🔹 Fetch Chapters with proper duration and documents
      const snapshot = await getDocs(collection(db, "chapters"));
      const fetched = [];

      for (const docSnap of snapshot.docs) {
        const chapterData = docSnap.data();
        const lessonsSnap = await getDocs(collection(db, "chapters", docSnap.id, "lessons"));
        
        const lessons = lessonsSnap.docs.map((d, index) => {
          const lessonData = d.data();
          return {
            ...lessonData,
            id: d.id || `lesson${index + 1}`,
            docId: d.id,
            // Use duration from database or fallback to default
            duration: lessonData.duration || 15,
            // Include documents array from database
            documents: lessonData.documents || [],
            // Ensure other fields are preserved
            title: lessonData.title || `Lesson ${index + 1}`,
            description: lessonData.description || "",
            videoUrl: lessonData.videoUrl || "",
          };
        });
        
        lessons.sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

        // Calculate total chapter duration from lessons
        const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 15), 0);

        fetched.push({ 
          ...chapterData, 
          lessons,
          id: chapterData.id || docSnap.id,
          duration: totalDuration // Use calculated duration
        });
      }

      fetched.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setChapters(fetched);

      // 🔹 Fetch Final Exams
      try {
        const examsSnap = await getDocs(collection(db, "final-exams"));
        const exams = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFinalExams(exams);
      } catch (err) {
        console.error("Failed to load final exams:", err);
      }

      setLoading(false);
    };

    fetchChapters();
  }, [user]);

  const isChapterLocked = (index) => {
    if (!userPlan) return true; // No plan
    if (userPlan === "basic") return index >= 5;
    return false; // pro = all unlocked
  };

  const isLessonCompleted = (chapterId, lessonId) => {
    const lessonKey = `${chapterId}-${lessonId}`;
    return userProgress.completedLessons.some(
      (item) => typeof item === 'object' && item.key === lessonKey
    );
  };

  const handlePdfDownload = (document) => {
    if (document.url) {
      window.open(document.url, '_blank');
      toast.success(`📄 Opening ${document.title}`);
    } else {
      toast.error("PDF not available");
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const handleLessonClick = async (lesson, chapter, lessonIndex) => {
    const chapterLocked = isChapterLocked(chapters.indexOf(chapter));
    
    if (chapterLocked) {
      toast.error("🔒 This chapter is locked. Upgrade your plan to access it.");
      return;
    }

    if (!lesson.videoUrl) {
      console.error("No video URL found for lesson");
      toast.error("Video not available for this lesson");
      return;
    }

    console.log("🎬 Starting lesson:", { lesson, chapter });
    toast.success(`▶️ Starting: ${lesson.title}`);

    const video = document.createElement("video");
    video.src = lesson.videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.style.display = "none";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.backgroundColor = "black";

    document.body.appendChild(video);

    try {
      await video.requestFullscreen();
      video.style.display = "block";
      await video.play();

      const handleEnded = async () => {
        console.log("🎬 Video ended, marking lesson as completed");
        toast.success("🎉 Lesson completed! Great job!");

        try {
          const lessonId = lesson.id || lesson.docId || `lesson${lessonIndex + 1}`;
          const chapterId = chapter.id;
          const lessonKey = `${chapterId}-${lessonId}`;

          const success = await markLessonCompleted(
            user?.uid,
            lessonId,
            chapterId,
            chapter.lessons.length
          );

          if (success) {
            // ✅ Update local state
            setUserProgress(prev => ({
              ...prev,
              completedLessons: prev.completedLessons.some(item => item.key === lessonKey)
                ? prev.completedLessons
                : [...prev.completedLessons, { key: lessonKey, completedAt: new Date().toISOString() }]
            }));

            // ✅ Check chapter completion
            await markChapterCompletedIfEligible(user?.uid, chapterId, chapter.lessons.length);
            await loadUserProgress();

            console.log("✅ Lesson completion process finished successfully");
          }
        } catch (error) {
          console.error("❌ Failed to mark lesson as completed:", error);
          toast.error("Failed to save progress. Please try again.");
        }
      };

      const cleanup = () => {
        console.log("🧹 Cleaning up video element");
        video.pause();
        video.remove();
        video.removeEventListener("ended", handleEnded);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };

      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          console.log("👋 Exited fullscreen");
          cleanup();
        }
      };

      video.addEventListener("ended", handleEnded);
      document.addEventListener("fullscreenchange", handleFullscreenChange);

    } catch (err) {
      console.error("❌ Failed to enter fullscreen or play video:", err);
      video.remove();
      toast.error("Failed to play video. Please try again.");
    }
  };

  return loading ? (
    <Loader />
  ) : (
  <div className="relative bg-[var(--background)] text-[var(--text-color)] transition-all duration-300">
    {/* Header */}
    <div className="fixed top-0 left-0 w-full bg-[var(--background)] z-10 border-b border-[var(--card-border)]">
      <div className="p-2 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-1">Chapters</h1>
        <p className="text-sm muted-text mb-4">Master English step by step</p>

        {/* Subscription CTA Section */}
        {(!subscription || userPlan === 'basic') && (
          <div className="space-y-4 mt-4">
            {!subscription && (
              <div className="card rounded-xl px-4 py-6 text-center shadow-sm">
                <p className="text-[var(--color-primary)] font-bold mb-3 text-base">Subscribe to Start Learning</p>
                <button
                  onClick={() => router.push('/subscription')}
                  className="bg-[var(--color-primary)] text-white font-semibold py-2 px-6 rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Subscribe Now
                </button>
              </div>
            )}

            {subscription && userPlan === 'basic' && (
              <div className="card rounded-xl px-4 py-6 text-center shadow-sm">
                <p className="text-[var(--color-primary)] font-bold mb-3 text-base">Unlock All Chapters with Pro Plan</p>
                <button
                  onClick={() => router.push('/subscription')}
                  className="bg-[var(--color-primary)] text-white font-semibold py-2 px-6 rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Chapters Section */}
    <div className={`px-4 max-w-2xl mx-auto hide-scrollbar ${(!subscription || userPlan === 'basic') ? 'pt-[250px]' : 'pt-[140px]'}`}>
      {chapters.map((chapter, idx) => {
        const chapterLocked = isChapterLocked(idx);
        return (
          <div
            key={chapter.id || idx}
            className={`mb-6 card rounded-xl shadow-sm p-4 transition-all duration-300 ${chapterLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex-1">
                <h2 className="font-bold text-lg text-[var(--color-primary)] flex items-center gap-2">
                  {chapter.title}
                  {chapterLocked && <FaLock className="text-sm" />}
                </h2>
                <div className="flex items-center gap-4 text-xs muted-text mt-1">
                  <span className="flex items-center gap-1">
                    <FiFileText className="text-xs" />
                    {chapter.lessons?.length} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <FiClock className="text-xs" />
                    {formatDuration(chapter.duration)}
                  </span>
       

                </div>
                {userPlan === 'basic' && idx >= 5 && (
                  <span className="inline-block mt-1 text-xs text-[var(--color-primary)] bg-[var(--accent)] px-2 py-1 rounded">
                    Upgrade Required
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {chapter.lessons.map((lesson, i) => {
                const lessonId = lesson.id || lesson.docId || `lesson${i + 1}`;
                const isCompleted = isLessonCompleted(chapter.id, lessonId);

                return (
                  <div
                    key={lesson.docId || i}
                    className={`card rounded-xl px-4 py-3 transition-all duration-200 ${
                      chapterLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                    }`}
                    onClick={() => !chapterLocked && handleLessonClick(lesson, chapter, i)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`rounded-full p-2 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-[var(--color-primary)]'
                            : chapterLocked
                            ? 'bg-[var(--muted-text)]'
                            : 'bg-[var(--color-primary)]'
                        }`}
                      >
                        {isCompleted ? (
  <BsCheckCircleFill className="text-white text-lg" />
) : chapterLocked ? (
  <FaLock className="text-white text-base" />
) : (
  <FiPlay className="text-white text-lg" />
)}


                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
                            {lesson.title || `Lesson ${i + 1}`}
                            {isCompleted && (
                              <span className="text-xs text-[var(--color-primary)] font-medium bg-[var(--accent)] px-2 py-0.5 rounded-full">
                                ✓ Completed
                              </span>
                            )}
                          </p>
                        </div>


                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs muted-text flex items-center gap-1">
                              <MdOutlineAccessTime className="inline" />
                              {formatDuration(lesson.duration)}
                            </span>

                            {lesson.documents?.length > 0 && (
                              <div className="flex items-center gap-1">
                                {lesson.documents.map((doc, docIdx) => (
                                  <button
                                    key={docIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!chapterLocked) handlePdfDownload(doc);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                      chapterLocked
                                        ? 'text-[var(--muted-text)] cursor-not-allowed'
                                        : 'text-[var(--color-primary)] hover:bg-[var(--accent)]'
                                    }`}
                                    title={chapterLocked ? 'Locked' : `Download ${doc.title}`}
                                  >
                                    <FaFilePdf className="text-xs" />
                                    <span>{doc.title?.replace('.pdf', '') || 'PDF'}</span>
                                    {!chapterLocked && <FaDownload className="text-xs" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Chapter Exam */}
              {chapter.examEnabled && (() => {
  const allLessonsCompleted = chapter.lessons.every((lesson) => {
    const lessonId = lesson.id || lesson.docId;
    const key = `${chapter.id}-${lessonId}`;
    return userProgress.completedLessons.some((item) => item.key === key);
  });

  const isExamCompleted = (userProgress.completedExams || []).includes(chapter.id);

  return (
    <div
      className={`card flex items-center justify-between px-4 py-3 rounded-xl relative transition-all duration-200 ${
        !allLessonsCompleted ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md cursor-pointer'
      }`}
      onClick={() => {
        if (!allLessonsCompleted) {
          toast.error("Complete all lessons to unlock this exam.");
          return;
        }
        if (!isExamCompleted) {
          router.push(`/exam/chapter/${chapter.id}`);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 ${
            isExamCompleted
              ? 'bg-[var(--color-primary)]'
              : 'bg-[var(--accent)]'
          }`}
        >
          <BsCheckCircleFill
            className={`text-lg ${
              isExamCompleted
                ? 'text-white'
                : 'text-[var(--color-primary)]'
            }`}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
            Chapter Exam
            {isExamCompleted && (
              <span className="flex items-center gap-1 text-[var(--color-primary)] text-xs">
                <BsCheck2 className="text-sm" />
                Completed
              </span>
            )}
          </p>

          <p className="text-xs muted-text">
            {!allLessonsCompleted
              ? 'Complete all lessons first'
              : isExamCompleted
              ? 'Already completed'
              : 'Tap to begin'}
          </p>
        </div>
      </div>
    </div>
  );
})()}

            </div>
          </div>
        );
      })}

      {/* Final Assessment */}
      <div className="mb-32">
  <h2 className="text-xl font-bold text-[var(--color-primary)] mb-2">Final Assessment</h2>
  <div className="relative secondary-bg card rounded-2xl p-4 shadow-sm muted-text">
    <div className="flex gap-3 items-center mb-2">
      <div className="theme-icon-bg p-2 rounded-full">
        <IoTrophyOutline className="text-[var(--color-primary)] text-xl" />
      </div>
      <div>
        <p className="font-semibold text-[var(--text-color)]">Certification Exam</p>
        <p className="text-xs flex gap-3">
          <span>{userPlan === 'pro' ? 'Unlocked' : 'Pro Required'}</span>
        </p>
      </div>
    </div>

    <p className="text-xs accent-bg text-[var(--color-primary)] px-3 py-2 rounded-lg mt-2 mb-4 flex items-center gap-2">
      {userPlan === 'pro' ? (
        <>
          <BsCheck2 className="text-sm" />
          Completed {(userProgress.completedChapters || []).length} of {chapters.length} chapters
        </>
      ) : (
        <>
          <FaLock className="text-sm" />
          Upgrade to Pro plan for certification access
        </>
      )}
    </p>

    {userPlan !== 'pro' && (
      <div className="absolute top-6 right-6 card shadow-md px-4 py-2 rounded-xl text-center">
        <FaLock className="mx-auto mb-1 text-[var(--color-primary)]" />
        <p className="text-xs font-medium text-[var(--color-primary)]">Pro Required</p>
      </div>
    )}

    <button
      disabled={
        userPlan !== 'pro' ||
        // 🔒 Any lesson incomplete?
        chapters.some((chapter) =>
          chapter.lessons.some((lesson) => {
            const lessonId = lesson.id || lesson.docId;
            return !isLessonCompleted(chapter.id, lessonId);
          })
        ) ||
        // 🔒 Any chapter exam not completed?
        chapters.some((chapter) => !(userProgress.completedExams || []).includes(chapter.id)) ||
        // 🔒 No final exam created
        finalExams.length === 0
      }
      onClick={() => {
        if (finalExams.length > 0) {
          router.push(`/exam/final/${finalExams[0].id}`);
        }
      }}
      className={`w-full py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
        userPlan !== 'pro' ||
        chapters.some((chapter) =>
          chapter.lessons.some((lesson) => {
            const lessonId = lesson.id || lesson.docId;
            return !isLessonCompleted(chapter.id, lessonId);
          })
        ) ||
        chapters.some((chapter) => !(userProgress.completedExams || []).includes(chapter.id)) ||
        finalExams.length === 0
          ? 'bg-[var(--muted-text)] text-white cursor-not-allowed'
          : 'bg-[var(--color-primary)] text-white hover:opacity-90'
      }`}
    >
      {userPlan !== 'pro'
        ? 'Pro Required'
        : chapters.some((chapter) =>
            chapter.lessons.some((lesson) => {
              const lessonId = lesson.id || lesson.docId;
              return !isLessonCompleted(chapter.id, lessonId);
            })
          )
        ? 'Complete All Lessons to Unlock'
        : chapters.some((chapter) => !(userProgress.completedExams || []).includes(chapter.id))
        ? 'Complete All Chapter Exams to Unlock'
        : finalExams.length === 0
        ? 'No Exam Found'
        : 'Start Final Assessment'}
    </button>
  </div>
</div>


    </div>

    <Navbar />
  </div>

  );
}