"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  query,
  where,
  getDocs,
  collection,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import Loader from "@/app/components/Loader";
import { useAuth } from "@/app/context/AuthContext";
import {
  markChapterExamCompleted,
  markChapterCompletedIfEligible,
  getUserProgress,
} from "@/app/firebase/firestore";
import { BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";
import { IoTrophyOutline } from "react-icons/io5";
import { MdOutlineQuiz } from "react-icons/md";
import { toast } from "react-hot-toast";

export default function ChapterExamPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userProgress, setUserProgress] = useState(null);

  useEffect(() => {
    const fetchExamAndChapter = async () => {
      try {
        const examQuery = query(
          collection(db, "exams"),
          where("chapterId", "==", id)
        );
        const examSnapshot = await getDocs(examQuery);

        if (!examSnapshot.empty) {
          const examData = examSnapshot.docs[0].data();
          setExam({ ...examData, id: examSnapshot.docs[0].id });
        }

        const chapterDoc = await getDoc(doc(db, "chapters", id));
        if (chapterDoc.exists()) {
          const chapterData = chapterDoc.data();
          const lessonsSnapshot = await getDocs(
            collection(db, "chapters", id, "lessons")
          );
          setChapter({
            ...chapterData,
            id: chapterDoc.id,
            totalLessons: lessonsSnapshot.size,
          });
        }

        if (user?.uid) {
          const progress = await getUserProgress(user.uid);
          setUserProgress(progress);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    if (id && user) fetchExamAndChapter();
  }, [id, user]);

  const awardXP = async (uid, amount = 1) => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      availableXP: increment(amount),
      totalXP: increment(amount),
    });
  };

  const handleOptionSelect = async (questionId, selectedOption) => {
    if (selectedAnswers[questionId]) return;

    const question = exam.questions.find((q) => q.id === questionId);
    const isCorrect = selectedOption === question.correctAnswer;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption,
        correctOption: question.correctAnswer,
        isCorrect,
      },
    }));

    if (isCorrect && user?.uid) {
      try {
        await awardXP(user.uid, 1);
        toast.success("🎉 Correct! +1 XP");
      } catch (err) {
        toast.error("XP update failed.");
      }
    } else {
      toast("❌ Incorrect. Try next one!");
    }
  };

  const handleNext = () => setCurrentQuestion((prev) => prev + 1);
  const handlePrevious = () => setCurrentQuestion((prev) => prev - 1);

  const calculateResults = () => {
    let correct = 0;
    const results = exam.questions.map((q, i) => {
      const answer = selectedAnswers[q.id];
      const isCorrect = answer?.selectedOption === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        questionIndex: i,
        questionText: q.text,
        userAnswer: answer?.selectedOption,
        correctAnswer: q.correctAnswer,
        isCorrect,
        options: q.options,
      };
    });
    const percentage = Math.round((correct / exam.questions.length) * 100);
    return {
      correctAnswers: correct,
      totalQuestions: exam.questions.length,
      percentage,
      passed: percentage >= (exam.passingScore || 70),
      questionResults: results,
    };
  };

  const handleSubmit = async () => {
    if (!user?.uid || !id || !exam || !chapter) return;
    setSubmitting(true);
    try {
      const results = calculateResults();
      setExamResults(results);
      if (results.passed) {
        await markChapterExamCompleted(user.uid, id, chapter.totalLessons);
        const chapterCompleted = await markChapterCompletedIfEligible(user.uid, id, chapter.totalLessons);
        if (chapterCompleted) console.log("Chapter completed");
        const updatedProgress = await getUserProgress(user.uid);
        setUserProgress(updatedProgress);
      }
      setShowResults(true);
    } catch (err) {
      toast.error("Submit failed");
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

  const handleBackToChapters = () => router.push("/chapters");

  if (loading) return <Loader />;
  if (!exam) return <div>No exam found.</div>;

  const question = exam.questions[currentQuestion];
  const answer = selectedAnswers[question.id];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Chapter {id} Exam</h1>

      <div className="mb-6">
        <p className="text-lg font-medium mb-2">{question.text}</p>
        {question.image && <img src={question.image} className="mb-4 rounded-lg" />}

        <div className="space-y-3">
          {question.options.map((option, i) => {
            const isSelected = answer?.selectedOption === i;
            const isCorrect = answer?.correctOption === i;
            let style = "border px-4 py-3 rounded-lg w-full text-left";
            if (answer) {
              if (isCorrect) style += " bg-green-100 border-green-400";
              else if (isSelected) style += " bg-red-100 border-red-400";
            } else if (isSelected) {
              style += " bg-blue-500 text-white";
            }
            return (
              <button
                key={i}
                onClick={() => handleOptionSelect(question.id, i)}
                disabled={!!answer}
                className={style}
              >
                {option}
              </button>
            );
          })}
        </div>

        {answer && (
          <div className={`mt-4 p-3 text-sm rounded-lg font-medium ${
            answer.isCorrect
              ? "text-green-700 bg-green-50 border border-green-300"
              : "text-red-700 bg-red-50 border border-red-300"
          }`}>
            {answer.isCorrect
              ? "✅ Correct! You earned +1 XP."
              : `❌ Incorrect. Correct answer: ${question.options[answer.correctOption]}`}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button onClick={handlePrevious} disabled={currentQuestion === 0}>
            Previous
          </button>
          {currentQuestion === exam.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== exam.questions.length || submitting}
            >
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          ) : (
            <button onClick={handleNext} disabled={!selectedAnswers[question.id]}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}