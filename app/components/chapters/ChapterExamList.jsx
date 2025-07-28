// app/exam/chapter/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, query, where, getDocs, collection } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import Loader from "@/app/components/Loader";
import { useRouter } from "next/navigation";
import { markChapterExamCompleted, markChapterCompletedIfEligible, getUserProgress } from "@/app/firebase/firestore";
import { useAuth } from "@/app/context/AuthContext";
import { BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";
import { IoTrophyOutline } from "react-icons/io5";
import { MdOutlineQuiz } from "react-icons/md";

export default function ChapterExamPage() {
  const { id } = useParams(); // chapterId
  const [exam, setExam] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchExamAndChapter = async () => {
      try {
        // Fetch exam data
        const examQuery = query(collection(db, "exams"), where("chapterId", "==", id));
        const examSnapshot = await getDocs(examQuery);
        
        if (!examSnapshot.empty) {
          const examData = examSnapshot.docs[0].data();
          setExam({
            ...examData,
            id: examSnapshot.docs[0].id
          });
        }

        // Fetch chapter data to get total lessons count
        const chapterDoc = await getDoc(doc(db, "chapters", id));
        if (chapterDoc.exists()) {
          const chapterData = chapterDoc.data();
          
          // Get lessons count
          const lessonsSnapshot = await getDocs(collection(db, "chapters", id, "lessons"));
          const lessonsCount = lessonsSnapshot.size;
          
          setChapter({
            ...chapterData,
            id: chapterDoc.id,
            totalLessons: lessonsCount
          });
        }

        // Fetch user progress
        if (user?.uid) {
          const progress = await getUserProgress(user.uid);
          setUserProgress(progress);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching exam/chapter data:", error);
        setLoading(false);
      }
    };

    if (id && user) {
      fetchExamAndChapter();
    }
  }, [id, user]);

  const handleOptionSelect = (questionId, selectedOption) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOption,
    }));
  };

  const handleNext = () => {
    setCurrentQuestion((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentQuestion((prev) => prev - 1);
  };

  const calculateResults = () => {
    if (!exam || !exam.questions) return null;

    let correctAnswers = 0;
    const questionResults = exam.questions.map((question, index) => {
      const userAnswer = selectedAnswers[question.id];
      const correctAnswer = question.correctAnswer;
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex: index,
        questionText: question.text,
        userAnswer,
        correctAnswer,
        isCorrect,
        options: question.options
      };
    });

    const totalQuestions = exam.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = percentage >= (exam.passingScore || 70); // Default passing score 70%

    return {
      correctAnswers,
      totalQuestions,
      percentage,
      passed,
      questionResults
    };
  };

  const handleSubmit = async () => {
    if (!user?.uid || !id || !exam || !chapter) {
      console.error("Missing required data for exam submission");
      return;
    }

    setSubmitting(true);

    try {
      // Calculate exam results
      const results = calculateResults();
      setExamResults(results);

      console.log("🎯 Exam Results:", results);

      // Only mark as completed if passed
      if (results.passed) {
        console.log("🎉 Exam passed! Marking as completed...");
        
        // Mark exam as completed
        await markChapterExamCompleted(user.uid, id, chapter.totalLessons); // ✅ pass totalLessons here

        const chapterCompleted = await markChapterCompletedIfEligible(user.uid, id, chapter.totalLessons); // ✅ correct args



        if (chapterCompleted) {
          console.log("🏆 Entire chapter completed!");
        }

        // Update local progress
        const updatedProgress = await getUserProgress(user.uid);
        setUserProgress(updatedProgress);
      }

      setShowResults(true);
    } catch (error) {
      console.error("❌ Failed to submit exam:", error);
      alert("Failed to submit exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeExam = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setExamResults(null);
  };

  const handleBackToChapters = () => {
    router.push("/chapters");
  };

  if (loading) return <Loader />;
  if (!exam) return (
    <div className="text-center mt-10">
      <p>No exam found for this chapter.</p>
      <button 
        onClick={handleBackToChapters}
        className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
      >
        Back to Chapters
      </button>
    </div>
  );

  // Show results screen
  if (showResults && examResults) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-[var(--text-color)]">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            examResults.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {examResults.passed ? (
              <IoTrophyOutline className="text-4xl text-green-600" />
            ) : (
              <BsXCircleFill className="text-4xl text-red-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            {examResults.passed ? 'Congratulations!' : 'Exam Not Passed'}
          </h1>
          
          <p className="text-lg mb-4">
            You scored {examResults.correctAnswers}/{examResults.totalQuestions} ({examResults.percentage}%)
          </p>
          
          {examResults.passed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                🎉 Great job! You've successfully completed the Chapter {id} exam.
                {userProgress?.completedChapters?.includes(id) && (
                  <span className="block mt-2 font-semibold">
                    🏆 Entire chapter completed!
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                You need {exam.passingScore || 70}% to pass. Review the material and try again.
              </p>
            </div>
          )}
        </div>

        {/* Question Results */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold">Review Your Answers</h2>
          {examResults.questionResults.map((result, index) => (
            <div 
              key={index}
              className={`border rounded-lg p-4 ${
                result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {result.isCorrect ? <BsCheckCircleFill /> : <BsXCircleFill />}
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Q{index + 1}: {result.questionText}</p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">Your answer:</span> {
                      result.options[result.userAnswer] || 'No answer selected'
                    }
                  </p>
                  {!result.isCorrect && (
                    <p className="text-sm text-green-700">
                      <span className="font-medium">Correct answer:</span> {
                        result.options[result.correctAnswer]
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!examResults.passed && (
            <button
              onClick={handleRetakeExam}
              className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-semibold"
            >
              Retake Exam
            </button>
          )}
          <button
            onClick={handleBackToChapters}
            className="w-full border border-[var(--card-border)] py-3 rounded-lg font-semibold"
          >
            Back to Chapters
          </button>
        </div>
      </div>
    );
  }

  // Show exam questions
  const question = exam.questions[currentQuestion];
  const isLastQuestion = currentQuestion === exam.questions.length - 1;
  const allQuestionsAnswered = exam.questions.every(q => selectedAnswers[q.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-[var(--text-color)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-primary)] mb-2">
          Chapter {id} Exam
        </h1>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
          <MdOutlineQuiz />
          <span>Question {currentQuestion + 1} of {exam.questions.length}</span>
          <span>•</span>
          <span>Passing Score: {exam.passingScore || 70}%</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-6 shadow-sm space-y-6">
        <div>
          <p className="text-lg font-medium mb-4">{question.text}</p>
          
          {/* Question Image (if exists) */}
          {question.image && (
            <img 
              src={question.image} 
              alt="Question image" 
              className="w-full max-w-md mx-auto rounded-lg mb-4"
            />
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(question.id, i)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                selectedAnswers[question.id] === i
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md"
                  : "border-[var(--card-border)] hover:border-[var(--color-primary)] hover:bg-[var(--accent)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswers[question.id] === i
                    ? "border-white bg-white"
                    : "border-[var(--muted-text)]"
                }`}>
                  {selectedAnswers[question.id] === i && (
                    <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-[var(--card-border)]">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              currentQuestion === 0
                ? "text-[var(--muted-text)] cursor-not-allowed"
                : "text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
            }`}
          >
            Previous
          </button>
          
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || submitting}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                !allQuestionsAnswered || submitting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--color-primary)] text-white hover:bg-opacity-90"
              }`}
            >
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={selectedAnswers[question.id] === undefined}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedAnswers[question.id] === undefined
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--color-primary)] text-white hover:bg-opacity-90"
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center mt-6 gap-2">
        {exam.questions.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentQuestion
                ? "bg-[var(--color-primary)] scale-125"
                : selectedAnswers[exam.questions[index].id] !== undefined
                ? "bg-green-500"
                : "bg-[var(--muted-text)]"
            }`}
          />
        ))}
      </div>

      {/* Progress Summary */}
      <div className="text-center mt-4 text-sm text-[var(--muted-text)]">
        Answered: {Object.keys(selectedAnswers).length}/{exam.questions.length} questions
        {!allQuestionsAnswered && (
          <p className="text-orange-500 mt-1">
            Please answer all questions before submitting
          </p>
        )}
      </div>
    </div>
  );
}