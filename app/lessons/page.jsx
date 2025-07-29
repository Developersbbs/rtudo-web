"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Lazy load heavy components
const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });
const Loader = dynamic(() => import("../components/Loader"), { ssr: false });

// Lazy load icons to reduce bundle size
import { 
  FaLock, 
  FaFilePdf, 
  FaDownload 
} from "react-icons/fa";
import { PiNotebookDuotone } from "react-icons/pi";
import { MdOutlineAccessTime } from "react-icons/md";
import { BsCheckCircleFill, BsCheck2 } from "react-icons/bs";
import { IoTrophyOutline } from "react-icons/io5";
import { FiFileText, FiClock, FiPlay } from "react-icons/fi";

import { 
  markLessonCompleted, 
  markChapterCompletedIfEligible, 
  getUserProgress 
} from "../firebase/firestore";

// Memoized lesson component for better performance
const LessonItem = memo(({ 
  lesson, 
  lessonIndex, 
  chapterId, 
  chapterLocked, 
  isCompleted, 
  formatDuration, 
  onClick 
}) => {
  const lessonId = lesson.id || lesson.docId || `lesson${lessonIndex + 1}`;
  
  return (
    <div
      className={`card rounded-xl px-4 py-3 transition-all duration-200 ${
        chapterLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
      }`}
      onClick={() => !chapterLocked && onClick(lesson, lessonIndex)}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-full p-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-green-500'
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
              {lesson.title || `Lesson ${lessonIndex + 1}`}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs muted-text flex items-center gap-1">
                <MdOutlineAccessTime className="inline" />
                {formatDuration(lesson.duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Memoized chapter exam component
const ChapterExam = memo(({ 
  chapter, 
  allLessonsCompleted, 
  isExamCompleted, 
  router 
}) => {
  const handleExamClick = useCallback(() => {
    if (!allLessonsCompleted) {
      toast.error("Complete all lessons to unlock this exam.");
      return;
    }
    
    if (isExamCompleted) {
      toast.info("You have already completed this exam.");
      return;
    }
    
    // Navigate to chapter exam
    router.push(`/exam/chapter/${chapter.id}`);
  }, [allLessonsCompleted, isExamCompleted, router, chapter.id]);

  return (
    <div
      className={`card flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
        !allLessonsCompleted ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md cursor-pointer'
      }`}
      onClick={handleExamClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 ${
            isExamCompleted ? 'bg-green-500' : 'bg-[var(--accent)]'
          }`}
        >
          <BsCheckCircleFill
            className={`text-lg ${
              isExamCompleted ? 'text-white' : 'text-[var(--color-primary)]'
            }`}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
            Chapter Exam
          </p>
          <p className="text-xs muted-text">
            {!allLessonsCompleted
              ? 'Complete all lessons first'
              : isExamCompleted
              ? 'Already completed - Tap to retake'
              : 'Tap to begin'}
          </p>
        </div>
      </div>
    </div>
  );
});

// Memoized subscription CTA component
const SubscriptionCTA = memo(({ subscription, userPlan, router }) => {
  // Only show CTA if user has basic plan or no subscription
  if (subscription && userPlan === 'pro') return null;

  return (
    <div className="space-y-4 mt-4">
      {!subscription && (
        <div className="card rounded-xl px-4 py-6 text-center shadow-sm">
          <p className="text-[var(--color-primary)] font-bold mb-3 text-base">Subscribe to Get Premium Features</p>
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
  );
});

// Memoized chapter component
const ChapterItem = memo(({ 
  chapter, 
  chapterIndex, 
  chapterLocked, 
  userPlan, 
  userProgress, 
  isLessonCompleted, 
  formatDuration, 
  handleLessonClick,
  router 
}) => {
  const allLessonsCompleted = useMemo(() => 
    chapter.lessons.every((lesson) => {
      const lessonId = lesson.id || lesson.docId;
      return isLessonCompleted(chapter.id, lessonId);
    }), 
    [chapter.lessons, chapter.id, isLessonCompleted]
  );

  // Better exam completion check
  const isExamCompleted = useMemo(() => {
    // Check if exam is in completed exams array
    const examCompleted = userProgress.completedExams?.includes(chapter.id);
    return examCompleted;
  }, [userProgress.completedExams, chapter.id]);

  return (
    <div
      className={`mb-6 card rounded-xl shadow-sm p-4 transition-all duration-300 ${
        chapterLocked ? 'opacity-60' : ''
      }`}
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
          {userPlan === 'basic' && chapterIndex >= 5 && (
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
            <LessonItem
              key={lesson.docId || i}
              lesson={lesson}
              lessonIndex={i}
              chapterId={chapter.id}
              chapterLocked={chapterLocked}
              isCompleted={isCompleted}
              formatDuration={formatDuration}
              onClick={(lesson, index) => handleLessonClick(lesson, chapter, index)}
            />
          );
        })}

        {chapter.examEnabled && chapter.lessons.length > 0 && (
          <ChapterExam
            chapter={chapter}
            allLessonsCompleted={allLessonsCompleted}
            isExamCompleted={isExamCompleted}
            router={router}
          />
        )}
      </div>
    </div>
  );
});

export default function ChaptersPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Consolidated state with better initial structure
  const [state, setState] = useState({
    chapters: [],
    loading: true,
    subscription: null,
    userPlan: null,
    finalExams: [],
    userProgress: {
      completedLessons: [],
      completedExams: [],
      completedChapters: []
    }
  });

  // Extract values for easier access
  const { chapters, loading, subscription, userPlan, finalExams, userProgress } = state;

  // Memoized calculations with better dependencies
  const isChapterLocked = useCallback((index) => {
    // If no subscription or inactive subscription, unlock all chapters
    if (!subscription || !userPlan) return true;
    
    // If basic plan, lock chapters after index 4 (first 5 are unlocked: 0,1,2,3,4)
    if (userPlan === "basic" && index >= 5) return true;
    
    // If pro plan or any other plan, unlock all
    return false;
  }, [subscription, userPlan]);

  const isLessonCompleted = useCallback((chapterId, lessonId) => {
    const lessonKey = `${chapterId}-${lessonId}`;
    return userProgress.completedLessons.some(
      (item) => (typeof item === 'object' ? item.key : item) === lessonKey
    );
  }, [userProgress.completedLessons]);

  const formatDuration = useCallback((minutes) => {
    if (!minutes || minutes < 60) return `${minutes || 15} mins`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }, []);

  // Optimized data processing functions
  const processUserProgress = useCallback((userProgressData) => {
    if (!userProgressData) {
      return {
        completedLessons: [],
        completedExams: [],
        completedChapters: []
      };
    }

    const normalizedLessons = userProgressData.completedLessons?.map((item) =>
      typeof item === "string" ? { key: item, completedAt: null } : item
    ) || [];

    return {
      ...userProgressData,
      completedLessons: normalizedLessons,
      completedChapters: userProgressData.completedChapters || [],
      completedExams: userProgressData.completedExams || [],
    };
  }, []);

  const processChapterData = useCallback(async (docSnap) => {
    const chapterData = docSnap.data();
    
    try {
      const lessonsSnap = await getDocs(collection(db, "chapters", docSnap.id, "lessons"));
      
      const lessons = lessonsSnap.docs
        .map((d, index) => {
          const lessonData = d.data();
          return {
            ...lessonData,
            id: d.id || `lesson${index + 1}`,
            docId: d.id,
            duration: lessonData.duration || 15,
            documents: lessonData.documents || [],
            title: lessonData.title || `Lesson ${index + 1}`,
            description: lessonData.description || "",
            videoUrl: lessonData.videoUrl || "",
          };
        })
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

      const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 15), 0);

      return {
        ...chapterData,
        lessons,
        id: chapterData.id || docSnap.id,
        duration: totalDuration,
      };
    } catch (error) {
      console.error(`Error processing chapter ${docSnap.id}:`, error);
      return {
        ...chapterData,
        lessons: [],
        id: chapterData.id || docSnap.id,
        duration: 0,
      };
    }
  }, []);

  // Optimized data fetching with better error handling
  const fetchAllData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Parallel requests for better performance
      const promises = [
        getDocs(collection(db, "chapters")),
        getDocs(collection(db, "final-exams")),
        getUserProgress(user.uid),
        getDoc(doc(db, "users", user.uid, "subscriptions", "details"))
      ];

      const [chaptersSnap, examsSnap, userProgressData, subSnap] = await Promise.allSettled(promises);

      // Process subscription safely
      let subscriptionData = null;
      let planData = null;
      
      if (subSnap.status === 'fulfilled' && subSnap.value.exists()) {
        const data = subSnap.value.data();
        const now = new Date();
        if (data.status === "active" && new Date(data.endDate) > now) {
          subscriptionData = data;
          planData = data.plan;
        }
      }

      // Process user progress safely
      const processedProgress = userProgressData.status === 'fulfilled' 
        ? processUserProgress(userProgressData.value)
        : processUserProgress(null);

      // Process chapters with error handling
      let processedChapters = [];
      if (chaptersSnap.status === 'fulfilled') {
        const chaptersPromises = chaptersSnap.value.docs.map(processChapterData);
        const chaptersResults = await Promise.allSettled(chaptersPromises);
        
        processedChapters = chaptersResults
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value)
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));
      }

      // Process final exams safely
      const processedExams = examsSnap.status === 'fulfilled'
        ? examsSnap.value.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        : [];

      // Update state once with all data
      setState(prev => ({
        ...prev,
        chapters: processedChapters,
        subscription: subscriptionData,
        userPlan: planData,
        finalExams: processedExams,
        userProgress: processedProgress,
        loading: false
      }));

    } catch (err) {
      console.error("⚠️ Error loading data:", err);
      toast.error("Failed to load content. Please refresh.");
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.uid, processUserProgress, processChapterData]);

  // Effect with proper dependency management
  useEffect(() => {
    if (user?.uid) {
      fetchAllData();
    }
  }, [user?.uid, fetchAllData]);

  // Updated lesson click handler with better error handling
  const handleLessonClick = useCallback((lesson, chapter, lessonIndex) => {
    const chapterLocked = isChapterLocked(chapters.indexOf(chapter));
    
    if (chapterLocked) {
      toast.error("🔒 This chapter is locked. Upgrade your plan to access it.");
      return;
    }

    if (!lesson.videoUrl) {
      toast.error("Video not available for this lesson");
      return;
    }

    try {
      const lessonId = lesson.id || lesson.docId || `lesson${lessonIndex + 1}`;
      const queryParams = new URLSearchParams({
        chapterId: chapter.id,
        lessonId: lessonId,
        chapterTitle: chapter.title,
        lessonTitle: lesson.title,
        lessonIndex: lessonIndex.toString(),
        totalLessons: chapter.lessons.length.toString()
      });

      router.push(`/lesson/${lessonId}?${queryParams.toString()}`);
    } catch (error) {
      console.error("Error navigating to lesson:", error);
      toast.error("Failed to open lesson");
    }
  }, [chapters, isChapterLocked, router]);

  // Memoized final assessment logic
  const finalAssessmentState = useMemo(() => {
    const hasIncompleteLesson = chapters.some((chapter) =>
      chapter.lessons.some((lesson) => {
        const lessonId = lesson.id || lesson.docId;
        return !isLessonCompleted(chapter.id, lessonId);
      })
    );

    const hasIncompleteExam = chapters.some((chapter) => 
      !userProgress.completedExams?.includes(chapter.id)
    );

    const isDisabled = userPlan !== 'pro' || hasIncompleteLesson || hasIncompleteExam || finalExams.length === 0;

    let buttonText = 'Start Final Assessment';
    if (userPlan !== 'pro') buttonText = 'Pro Required';
    else if (hasIncompleteLesson) buttonText = 'Complete All Lessons to Unlock';
    else if (hasIncompleteExam) buttonText = 'Complete All Chapter Exams to Unlock';
    else if (finalExams.length === 0) buttonText = 'No Exam Found';

    return { isDisabled, buttonText };
  }, [chapters, userPlan, userProgress.completedExams, finalExams.length, isLessonCompleted]);

  // Memoized chapters list with better performance
  const ChaptersList = useMemo(() => {
    return chapters.map((chapter, idx) => (
      <ChapterItem
        key={chapter.id || idx}
        chapter={chapter}
        chapterIndex={idx}
        chapterLocked={isChapterLocked(idx)}
        userPlan={userPlan}
        userProgress={userProgress}
        isLessonCompleted={isLessonCompleted}
        formatDuration={formatDuration}
        handleLessonClick={handleLessonClick}
        router={router}
      />
    ));
  }, [chapters, userPlan, userProgress, isChapterLocked, isLessonCompleted, formatDuration, handleLessonClick, router]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="relative bg-[var(--background)] text-[var(--text-color)] transition-all duration-300">
      {/* Header */}
      <div className="fixed top-0 left-0 w-full bg-[var(--background)] z-10 border-b border-[var(--card-border)]">
        <div className="p-2 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-1">Chapters</h1>
          <p className="text-sm muted-text mb-4">Master English step by step</p>

          <SubscriptionCTA 
            subscription={subscription} 
            userPlan={userPlan} 
            router={router} 
          />
        </div>
      </div>

      {/* Chapters Section */}
      <div
  className={`px-4 max-w-2xl mx-auto hide-scrollbar ${
    !subscription
      ? 'pt-[230px]' // for users with no subscription at all
      : userPlan === 'basic'
      ? 'pt-[250px]' // for basic users with banner
      : 'pt-[110px]' // for pro users, only header spacing
  }`}
>

        {ChaptersList}

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
                  Completed {userProgress.completedChapters?.length || 0} of {chapters.length} chapters
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
              disabled={finalAssessmentState.isDisabled}
              onClick={() => {
                if (finalExams.length > 0 && !finalAssessmentState.isDisabled) {
                  router.push(`/exam/final/${finalExams[0].id}`);
                }
              }}
              className={`w-full py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                finalAssessmentState.isDisabled
                  ? 'bg-[var(--muted-text)] text-white cursor-not-allowed'
                  : 'bg-[var(--color-primary)] text-white hover:opacity-90'
              }`}
            >
              {finalAssessmentState.buttonText}
            </button>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}