"use client";
import { use } from "react";
import LessonPage from "@/app/lessonPage/page";
import { useSearchParams } from "next/navigation";

export default function Page({ params }) {
  const { lessonId } = use(params); // ✅ unwrap the `params` Promise
  const searchParams = useSearchParams();

  const chapterId = searchParams.get("chapterId");
  const chapterTitle = searchParams.get("chapterTitle");
  const lessonTitle = searchParams.get("lessonTitle");
  const lessonIndex = searchParams.get("lessonIndex");
  const totalLessons = searchParams.get("totalLessons");

  return (
    <LessonPage
      params={{ lessonId }} // ✅ pass unwrapped params explicitly
      chapterId={chapterId}
      lessonId={lessonId}
      chapterTitle={chapterTitle}
      lessonTitle={lessonTitle}
      lessonIndex={lessonIndex}
      totalLessons={totalLessons}
    />
  );
}
