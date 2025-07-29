"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, query, where, getDocs, collection, updateDoc, increment } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import Loader from "@/app/components/Loader";
import { useAuth } from "@/app/context/AuthContext";
import { markChapterExamCompleted } from "@/app/firebase/firestore";
import { IoArrowBack } from "react-icons/io5";
import { AiFillStar } from "react-icons/ai";


export default function ChapterExamPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [xpEarned, setXpEarned] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      const q = query(collection(db, "exams"), where("chapterId", "==", id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setExam(data);
      }
      setLoading(false);
    };

    if (id) fetchExam();
  }, [id]);

  const handleOptionSelect = async (questionId, selectedIndex) => {
    if (selectedAnswers[questionId]) return;

    const question = exam.questions.find((q) => q.id === questionId);
    const isCorrect = selectedIndex === question.correctOption;
    const awardedPoints = isCorrect ? question.points || 1 : 0;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption: selectedIndex,
        isCorrect,
        points: awardedPoints,
      },
    }));

    if (isCorrect && user?.uid && awardedPoints > 0) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          totalXP: increment(awardedPoints),
          availableXP: increment(awardedPoints),
        });
        setXpEarned((prev) => prev + awardedPoints);
      } catch (err) {
        console.error("Failed to award XP:", err);
      }
    }
  };

  const handleNext = () => {
    setCurrentQuestion((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const earned = Object.values(selectedAnswers).reduce((sum, ans) => sum + (ans.isCorrect ? ans.points : 0), 0);
    const scorePercent = (earned / totalPoints) * 100;
    const passed = scorePercent >= (exam.passingScore || 40);

    setIsPassed(passed);
    setShowResult(true);

    if (passed && user?.uid && id) {
      await markChapterExamCompleted(user.uid, id);
      setTimeout(() => router.push("/lessons"), 2000);
    }
  };

  const handleTryAgain = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setXpEarned(0);
    setShowResult(false);
    setIsPassed(false);
  };

  const question = exam?.questions?.[currentQuestion];
  if (loading) return <Loader />;
  if (!exam) return <p className="text-center mt-10">No exam found for this chapter.</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-[var(--text-color)] relative">

      {/* ✅ Centered Leave Dialog */}
      {showConfirmExit && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--card-background)] border border-[var(--card-border)] p-6 rounded-xl shadow text-center">
            <h2 className="text-base font-semibold mb-1">Leave Exam?</h2>
            <p className="text-sm text-[var(--muted-text)] mb-4">Your progress will be lost.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowConfirmExit(false)}
                className="px-4 py-1 text-sm rounded-lg border"
              >
                Stay
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-1 text-sm bg-red-500 text-white rounded-lg"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Back Button */}
      <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setShowConfirmExit(true)}>
        <IoArrowBack className="text-xl text-[var(--text-color)]" />
        <span className="text-sm">Back</span>
      </div>

      <h1 className="text-xl font-bold text-[var(--color-primary)] mb-2">Chapter {id} Exam</h1>

      <div className="text-sm text-right mb-4 text-[var(--muted-text)] flex items-center justify-end gap-1">
  <AiFillStar className="text-yellow-400 text-base" />
  <span>{xpEarned}</span>
</div>


      <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 shadow space-y-4">
        <p className="text-sm font-semibold">{question.text}</p>

        <div className="space-y-2">
          {question.options.map((option, i) => {
            const userAnswer = selectedAnswers[question.id];
            const selected = userAnswer?.selectedOption;
            const isCorrect = userAnswer?.isCorrect;
            const isSelected = selected === i;

            return (
              <button
                key={i}
                onClick={() => handleOptionSelect(question.id, i)}
                disabled={!!userAnswer}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? isCorrect
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-red-500 text-white border-red-500"
                    : "border-[var(--card-border)] hover:bg-[var(--accent)]"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          {currentQuestion === exam.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswers[question.id]}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!selectedAnswers[question.id]}
              className={`text-sm px-4 py-2 rounded-lg ${
                !selectedAnswers[question.id]
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--color-primary)] text-white"
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Dot progress */}
      <div className="flex justify-center mt-6 gap-2">
        {exam.questions.map((q, index) => {
          const userAnswer = selectedAnswers[q.id];
          return (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestion
                  ? "bg-[var(--color-primary)] scale-125"
                  : userAnswer
                  ? userAnswer.isCorrect
                    ? "bg-green-500"
                    : "bg-red-500"
                  : "bg-[var(--muted-text)]"
              }`}
            />
          );
        })}
      </div>

      <div className="text-center mt-4 text-sm text-[var(--muted-text)]">
        Answered: {Object.keys(selectedAnswers).length}/{exam.questions.length}
      </div>

      {/* ✅ Passed Message */}
      {showResult && isPassed && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--card-background)] border border-[var(--card-border)] p-6 rounded-xl shadow text-center">
            <h2 className="text-lg font-bold text-green-500">🎉 You passed!</h2>
            <p className="text-sm text-[var(--muted-text)] mt-1">Redirecting to lessons...</p>
          </div>
        </div>
      )}

      {/* ✅ Failed Retry Dialog */}
      {showResult && !isPassed && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--card-background)] border border-[var(--card-border)] p-6 rounded-xl shadow text-center">
            <h2 className="text-lg font-bold text-red-500">❌ You didn’t pass</h2>
            <p className="text-sm text-[var(--muted-text)] mb-4">
              You need at least {exam.passingScore || 40}% to pass.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleTryAgain}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/lessons")}
                className="px-4 py-2 border rounded-lg"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
