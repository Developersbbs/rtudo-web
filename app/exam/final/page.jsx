"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

export default function FinalExamListPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const querySnap = await getDocs(collection(db, "final-exams"));
        const allExams = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSections(allExams);
      } catch (err) {
        console.error("❌ Error loading final exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) return <Loader />;
  if (sections.length === 0)
    return <p className="text-center p-6 text-red-500">No final exam sections found.</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-6">Final Assessment</h1>

      {sections.map((exam, index) => (
        <div
          key={exam.id}
          onClick={() => router.push(`/exam/final/${exam.id}`)}
          className="cursor-pointer border border-[var(--card-border)] rounded-xl bg-[var(--card-background)] p-4 hover:shadow"
        >
          <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-2">
            {exam.title || `Section ${index + 1}`}
          </h2>
          <p className="text-sm text-[var(--muted-text)]">{exam.instructions}</p>
        </div>
      ))}
    </div>
  );
}
