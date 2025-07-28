// app/exam/chapter/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, query, where, getDocs, collection } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import Loader from "@/app/components/Loader";
import { useRouter } from "next/navigation";
import { markChapterExamCompleted } from "@/app/firebase/firestore"; // ✅ Import
import { useAuth } from "@/app/context/AuthContext"; // ✅ User context



export default function ChapterExamPage() {
  const { id } = useParams(); // chapterId
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const router = useRouter();
const { user } = useAuth(); // ✅ Get user


  useEffect(() => {
    const fetchExam = async () => {
      const q = query(collection(db, "exams"), where("chapterId", "==", id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setExam(snapshot.docs[0].data());
      }
      setLoading(false);
    };

    fetchExam();
  }, [id]);

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

  const handleSubmit = async () => {
  try {
    if (user?.uid && id) {
      await markChapterExamCompleted(user.uid, id); // ✅ Save it
      router.push("/lessons"); // or show results
    }
  } catch (err) {
    console.error("Failed to mark chapter exam complete:", err);
  }
};


  if (loading) return <Loader />;
  if (!exam) return <p className="text-center mt-10">No exam found for this chapter.</p>;

  const question = exam.questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-[var(--text-color)]">
      <h1 className="text-xl font-bold text-[var(--color-primary)] mb-4">
        Chapter {id} Exam
      </h1>

      <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 shadow space-y-4">
        <p className="text-sm font-semibold">{question.text}</p>
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(question.id, i)}
              className={`w-full text-left px-4 py-2 rounded-lg border ${
                selectedAnswers[question.id] === i
                  ? "bg-[var(--color-primary)] text-white"
                  : "border-[var(--card-border)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="text-sm px-4 py-2 border rounded-lg"
          >
            Previous
          </button>
          {currentQuestion === exam.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Dot progress */}
      <div className="flex justify-center mt-6 gap-2">
        {exam.questions.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === currentQuestion
                ? "bg-[var(--color-primary)]"
                : "bg-[var(--muted-text)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
