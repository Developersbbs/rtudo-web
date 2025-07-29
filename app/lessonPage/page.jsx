"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

// Lazy load components
const Loader = dynamic(() => import("../components/Loader"), { ssr: false });

// Icons
import { 
  FaArrowLeft, 
  FaPlay, 
  FaPause, 
  FaFilePdf,
  FaCheck,
  FaClock
} from "react-icons/fa";
import { MdOutlineAccessTime } from "react-icons/md";
import { BsCheckCircleFill } from "react-icons/bs";

import { 
  markLessonCompleted, 
  markChapterCompletedIfEligible, 
  getUserProgress 
} from "../firebase/firestore";

export default function LessonPage({ params }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const lessonId = params?.lessonId;
  const chapterId = searchParams.get('chapterId');
  const chapterTitle = searchParams.get('chapterTitle');
  const lessonTitle = searchParams.get('lessonTitle');
  const lessonIndex = searchParams.get('lessonIndex');
  const totalLessons = searchParams.get('totalLessons');

  const [state, setState] = useState({
    lesson: null,
    loading: true,
    isCompleted: false,
    videoEnded: false,
    activeTab: 'video' // 'video' or 'pdf'
  });

  const { lesson, loading, isCompleted, videoEnded, activeTab } = state;

  // Check if lesson is completed
  const checkLessonCompletion = useCallback(async () => {
    if (!user?.uid || !chapterId || !lessonId) return;

    try {
      const userProgress = await getUserProgress(user.uid);
      if (userProgress) {
        const lessonKey = `${chapterId}-${lessonId}`;
        const completed = userProgress.completedLessons?.some(
          (item) => typeof item === 'object' && item.key === lessonKey
        );
        setState(prev => ({ ...prev, isCompleted: completed }));
      }
    } catch (error) {
      console.error("Error checking lesson completion:", error);
    }
  }, [user?.uid, chapterId, lessonId]);

  // Fetch lesson data
  const fetchLessonData = useCallback(async () => {
    if (!chapterId || !lessonId) {
      toast.error("Invalid lesson parameters");
      router.push('/lessons');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Get lesson document
      const lessonDoc = await getDoc(doc(db, "chapters", chapterId, "lessons", lessonId));
      
      if (!lessonDoc.exists()) {
        toast.error("Lesson not found");
        router.push('/lessons');
        return;
      }

      const lessonData = {
        id: lessonDoc.id,
        ...lessonDoc.data()
      };

      setState(prev => ({
        ...prev,
        lesson: lessonData,
        loading: false
      }));

      // Check completion status
      await checkLessonCompletion();

    } catch (error) {
      console.error("Error fetching lesson data:", error);
      toast.error("Failed to load lesson");
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [chapterId, lessonId, router, checkLessonCompletion]);

  useEffect(() => {
    if (user?.uid) {
      fetchLessonData();
    }
  }, [user?.uid, fetchLessonData]);

  // Handle video end
  const handleVideoEnd = useCallback(async () => {
    if (isCompleted || !user?.uid) return;

    try {
      setState(prev => ({ ...prev, videoEnded: true }));
      toast.success("🎉 Lesson completed!");

      // Mark lesson as completed
      const success = await markLessonCompleted(
        user.uid,
        lessonId,
        chapterId,
        parseInt(totalLessons) || 1
      );

      if (success) {
        setState(prev => ({ ...prev, isCompleted: true }));
        
        // Check if chapter should be marked as completed
        await markChapterCompletedIfEligible(user.uid, chapterId, parseInt(totalLessons) || 1);
        
        toast.success("Progress saved!");
      }
    } catch (error) {
      console.error("Error marking lesson as completed:", error);
      toast.error("Failed to save progress");
    }
  }, [isCompleted, user?.uid, lessonId, chapterId, totalLessons]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/lessons');
  }, [router]);

  // Format duration
  const formatDuration = useCallback((minutes) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-color)] mb-4">Lesson not found</p>
          <button
            onClick={handleBack}
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg"
          >
            Back to Chapters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-color)]">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--card-border)] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-[var(--accent)] rounded-full transition-colors"
            >
              <FaArrowLeft className="text-[var(--color-primary)]" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold text-[var(--text-color)]">
                  {lessonTitle || lesson.title || `Lesson ${parseInt(lessonIndex) + 1}`}
                </h1>
                {isCompleted && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    <BsCheckCircleFill />
                    Completed
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-[var(--muted-text)]">
                <span>{chapterTitle}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MdOutlineAccessTime />
                  {formatDuration(lesson.duration || 15)}
                </span>
                <span>•</span>
                <span>
                  Lesson {parseInt(lessonIndex) + 1} of {totalLessons}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'video' }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'video'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--accent)] text-[var(--text-color)] hover:bg-[var(--card-border)]'
            }`}
          >
            <FaPlay className="text-xs" />
            Video Lesson
          </button>
          
          {lesson.documents && lesson.documents.length > 0 && (
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'pdf' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--accent)] text-[var(--text-color)] hover:bg-[var(--card-border)]'
              }`}
            >
              <FaFilePdf className="text-xs" />
              Study Materials ({lesson.documents.length})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {activeTab === 'video' && (
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden shadow-lg">
              {lesson.videoUrl ? (
                <video
                  controls
                  className="w-full aspect-video"
                  onEnded={handleVideoEnd}
                  controlsList="nodownload"
                  disablePictureInPicture
                >
                  <source src={lesson.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="aspect-video flex items-center justify-center text-white">
                  <div className="text-center">
                    <FaPlay className="text-4xl mb-2 mx-auto opacity-50" />
                    <p>Video not available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Description */}
            {lesson.description && (
              <div className="card rounded-xl p-6">
                <h3 className="font-semibold text-[var(--color-primary)] mb-3">About This Lesson</h3>
                <p className="text-[var(--text-color)] leading-relaxed">
                  {lesson.description}
                </p>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-[var(--color-primary)]'}`}>
                    {isCompleted ? (
                      <FaCheck className="text-white text-sm" />
                    ) : (
                      <FaClock className="text-white text-sm" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-color)]">
                      {isCompleted ? 'Lesson Completed' : 'In Progress'}
                    </p>
                    <p className="text-xs text-[var(--muted-text)]">
                      {isCompleted 
                        ? 'You can proceed to the next lesson' 
                        : 'Watch the complete video to mark as completed'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="space-y-4">
            {lesson.documents && lesson.documents.length > 0 ? (
              lesson.documents.map((document, index) => (
                <div key={index} className="card rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-[var(--accent)] px-4 py-3 border-b border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                      <FaFilePdf className="text-[var(--color-primary)]" />
                      <h3 className="font-medium text-[var(--text-color)]">
                        {document.title || `Study Material ${index + 1}`}
                      </h3>
                    </div>
                  </div>
                  
                  {document.url ? (
                    <div className="h-[600px]">
                      <iframe
                        src={`${document.url}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full"
                        title={document.title || `PDF ${index + 1}`}
                        style={{
                          border: 'none',
                          pointerEvents: 'auto' // Disable interactions to prevent downloading
                        }}
                        onLoad={(e) => {
                          // Additional security to disable right-click and selection
                          const iframe = e.target;
                          try {
                            iframe.contentDocument.addEventListener('contextmenu', (e) => e.preventDefault());
                            iframe.contentDocument.addEventListener('selectstart', (e) => e.preventDefault());
                          } catch (err) {
                            // Cross-origin restrictions may prevent this
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-[var(--muted-text)]">
                      <div className="text-center">
                        <FaFilePdf className="text-4xl mb-2 mx-auto opacity-50" />
                        <p>PDF not available</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="card rounded-xl p-8 text-center">
                <FaFilePdf className="text-4xl text-[var(--muted-text)] mx-auto mb-4 opacity-50" />
                <p className="text-[var(--muted-text)]">No study materials available for this lesson</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}