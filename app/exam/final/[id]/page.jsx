"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import Loader from "@/app/components/Loader";

import {
  FiMic,
  FiMicOff,
  FiStopCircle,
  FiCheckCircle,
  FiXCircle,
  FiBarChart2,
  FiArrowRight,
  FiArrowLeft,
  FiBook,
  FiHeadphones,
  FiEdit3,
  FiMessageCircle,
  FiVolume2,
  FiRadio,
} from "react-icons/fi";

const SECTION_ORDER = ["reading", "writing", "speaking", "listening"];

export default function FinalExamPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [recording, setRecording] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const audioRef = useRef(null);
  const router = useRouter();

  const currentType = SECTION_ORDER[currentSectionIndex];
  const exam = sections[currentType];
  const totalQuestions = exam?.questions?.length || exam?.topics?.length || 1;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isLastSection = currentSectionIndex === SECTION_ORDER.length - 1;

  const getSectionIcon = (type) => {
    switch (type) {
      case "reading":
        return <FiBook className="text-xl" />;
      case "writing":
        return <FiEdit3 className="text-xl" />;
      case "speaking":
        return <FiMessageCircle className="text-xl" />;
      case "listening":
        return <FiHeadphones className="text-xl" />;
      default:
        return <FiBook className="text-xl" />;
    }
  };

  useEffect(() => {
    const fetchExams = async () => {
      const snapshot = await getDocs(collection(db, "final-exams"));
      const exams = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const grouped = {};
      SECTION_ORDER.forEach((type) => {
        const exam = exams.find((e) => e.type === type);
        if (exam) grouped[type] = exam;
      });
      setSections(grouped);
      setLoading(false);
    };
    fetchExams();
  }, []);

  useEffect(() => {
    const checkIfAlreadyPassed = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const resultRef = doc(db, `users/${user.uid}/final-exam`, "result");
      const resultSnap = await getDoc(resultRef);

      if (resultSnap.exists()) {
        const data = resultSnap.data();
        if (data.result === "passed") {
          setBlocked(true);
        }
      }
    };

    if (!loading) checkIfAlreadyPassed();
  }, [loading]);

  useEffect(() => {
    if (blocked) {
      const timeout = setTimeout(() => {
        router.push("/dashboard");
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [blocked]);

  useEffect(() => {
    if (currentSectionIndex >= SECTION_ORDER.length) {
      const timeout = setTimeout(() => {
        router.push("/dashboard");
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentSectionIndex]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Reset section-specific state when changing sections
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setShowQuestions(false);
    setAudioPlayed(false);
    setRecording(false);
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";

    // Stop any ongoing recording
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [currentSectionIndex]);

  const startLiveTranscript = async () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Live speech recognition not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      finalTranscriptRef.current = "";
      liveTranscriptRef.current = "";
      recognitionRef.current = recognition;

      recognition.onstart = () => setRecording(true);

      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscriptRef.current += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const combinedTranscript = (
          finalTranscriptRef.current + interimTranscript
        ).trim();
        liveTranscriptRef.current = interimTranscript;

        setSubmittedAnswers((prev) => ({
          ...prev,
          speaking: combinedTranscript,
        }));
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        alert(
          "Microphone access error. Please allow mic access and try again."
        );
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
        liveTranscriptRef.current = "";
      };

      recognition.start();
    } catch (err) {
      alert(
        "Microphone access denied or not supported. Please allow microphone access."
      );
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleNext = () => {
    if (exam.type === "reading" || exam.type === "listening") {
      const currentAnswer =
        submittedAnswers?.[exam.type]?.[currentQuestionIndex];
      if (currentAnswer === undefined) {
        alert("Please answer the current question before proceeding.");
        return;
      }
    } else if (exam.type === "writing" || exam.type === "speaking") {
      const currentAnswer = submittedAnswers?.[exam.type];
      if (!currentAnswer || currentAnswer.trim() === "") {
        alert("Please provide an answer before proceeding.");
        return;
      }
    }

    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("Login required");

    let score = 0;
    let totalScore = { ...scores };

    if (exam.type === "reading" || exam.type === "listening") {
      const userAnswers = submittedAnswers[exam.type];
      let correctCount = 0;

      exam.questions.forEach((q, i) => {
        if (userAnswers?.[i] === q.correctAnswer) {
          correctCount++;
        }
      });

      score = Math.round((correctCount / exam.questions.length) * 100);
    }

    if (exam.type === "writing" || exam.type === "speaking") {
      const response = submittedAnswers[exam.type];
      const question =
        exam.type === "writing"
          ? exam.questions?.[0]?.question
          : exam.topics?.[0]?.topic;

      if (response && question) {
        const aiRes = await fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                text: `You are an IELTS ${exam.type} examiner. Follow these strict rules:

Step 1: Relevance Check  
Compare the topic of the question and the topic of the answer.  
- If they are unrelated or the response is off-topic (e.g., question is about technology, but answer is about Japan),  
- OR if the response contains only a URL,  
- OR is mostly blank or gibberish,  

→ Return exactly: **0**

Step 2: If the response is clearly related to the question,  
Evaluate it based on grammar, vocabulary, fluency, and coherence. Return only a number score between 1 and 100.

Return only the final score. No explanation. No words. Only the number.

Question: ${question}
Answer: ${response}`,
              },
            ],
          }),
        });

        const data = await aiRes.json();
        const reply = data.reply || "";
        const match = reply.match(/\d{1,3}/);
        score = match ? Math.min(parseInt(match[0]), 100) : 0;
      }
    }

    totalScore[exam.type] = score;
    setScores(totalScore);

    if (currentSectionIndex < SECTION_ORDER.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      const total = Math.round(
        Object.values(totalScore).reduce((a, b) => a + b, 0) / 4
      );
      const passedAll = Object.values(totalScore).every((s) => s >= 80);

      const resultRef = doc(db, `users/${user.uid}/final-exam`, "result");
      await setDoc(resultRef, {
        ...totalScore,
        total,
        result: passedAll ? "passed" : "failed",
        submittedAt: new Date(),
      });

      setCurrentSectionIndex(SECTION_ORDER.length);
    }
  };

  if (loading) return <Loader />;

  if (blocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="text-center py-16 card rounded-2xl shadow-xl max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="text-2xl text-green-600" />
          </div>
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: "var(--text-color)" }}
          >
            You've Already Passed!
          </h2>
          <p className="muted-text mb-2">
            Congratulations! You don't need to retake the final exam.
          </p>
          <p className="text-sm muted-text">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (!exam && currentSectionIndex < SECTION_ORDER.length)
    return <p className="text-center text-red-500">No exam found</p>;

  if (currentSectionIndex >= SECTION_ORDER.length) {
    const passedAll = Object.values(scores).every((s) => s >= 80);
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="w-full max-w-xl mx-4 bg-white rounded-3xl shadow-lg p-8 md:p-10 border border-[var(--card-border)]">
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                passedAll ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <FiBarChart2
                className={`text-3xl ${
                  passedAll ? "text-green-600" : "text-red-600"
                }`}
              />
            </div>

            <h2
              className="text-3xl font-bold mb-6"
              style={{ color: "var(--text-color)" }}
            >
              Final Exam Result
            </h2>

            <div className="w-full space-y-4 mb-6">
              {SECTION_ORDER.map((type) => (
                <div
                  key={type}
                  className="flex justify-between items-center bg-[var(--accent)] px-5 py-3 rounded-xl text-sm md:text-base"
                >
                  <span
                    className="capitalize font-medium"
                    style={{ color: "var(--text-color)" }}
                  >
                    {type}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: "var(--text-color)" }}
                  >
                    {scores[type] || 0} / 100
                  </span>
                </div>
              ))}
            </div>

            <div
              className={`text-2xl font-bold flex items-center justify-center gap-2 mb-2 ${
                passedAll ? "text-green-600" : "text-red-500"
              }`}
            >
              {passedAll ? (
                <>
                  <FiCheckCircle /> Passed
                </>
              ) : (
                <>
                  <FiXCircle /> Failed
                </>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="container p-6 max-w-3xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={() => setShowConfirmExit(true)}
          className="flex items-center gap-2 mb-4 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-primary)" }}
        >
          <div
            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-opacity-10 hover:bg-current transition-colors"
            style={{ borderColor: "var(--card-border)" }}
          >
            <FiArrowLeft className="text-lg" />
          </div>
          Exit Exam
        </button>

        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          {getSectionIcon(currentType)}
          <div>
            <h1
              className="text-2xl font-bold capitalize"
              style={{ color: "var(--color-primary)" }}
            >
              {exam.title}
            </h1>
            <p className="text-sm muted-text">
              Section {currentSectionIndex + 1} of {SECTION_ORDER.length} •
              Final Exam
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                background: "var(--color-primary)",
                width: `${(currentSectionIndex / SECTION_ORDER.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Progress: {currentSectionIndex}/{SECTION_ORDER.length} sections
            </span>
            <span>
              {Math.round((currentSectionIndex / SECTION_ORDER.length) * 100)}%
              complete
            </span>
          </div>
        </div>

        {/* READING SECTION */}
        {exam.type === "reading" && (
          <div className="mt-6 space-y-6">
            {!showQuestions ? (
              <>
                <div className="card rounded-xl p-6 shadow">
                  <h2
                    className="text-lg font-semibold mb-3 flex items-center gap-2"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <FiBook />
                    Reading Passage
                  </h2>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--text-color)" }}
                  >
                    {exam.passage}
                  </p>
                </div>

                <button
                  onClick={() => setShowQuestions(true)}
                  className="w-full py-3 px-4 rounded-xl shadow flex items-center justify-center gap-2 font-medium hover:opacity-80 transition-opacity"
                  style={{
                    border: "1px solid var(--color-primary)",
                    color: "var(--color-primary)",
                    backgroundColor: "transparent",
                  }}
                >
                  <span className="text-xl">❓</span>
                  View Questions
                  <FiArrowRight />
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="card rounded-xl p-5 shadow-md">
                  <p
                    className="text-base font-medium mb-4 flex items-start gap-2"
                    style={{ color: "var(--text-color)" }}
                  >
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--color-primary)",
                      }}
                    >
                      Q{currentQuestionIndex + 1}
                    </span>
                    {exam.questions[currentQuestionIndex].question}
                  </p>

                  <div className="space-y-3">
                    {exam.questions[currentQuestionIndex].options.map(
                      (opt, idx) => {
                        const isSelected =
                          submittedAnswers?.reading?.[currentQuestionIndex] ===
                          idx;
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                              isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                : "border-[var(--card-border)]"
                            }`}
                            style={{
                              backgroundColor: "var(--card-background)",
                              color: "var(--text-color)",
                            }}
                          >
                            <input
                              type="radio"
                              name={`reading-q${currentQuestionIndex}`}
                              checked={isSelected}
                              onChange={() =>
                                setSubmittedAnswers((prev) => ({
                                  ...prev,
                                  reading: {
                                    ...(prev.reading || {}),
                                    [currentQuestionIndex]: idx,
                                  },
                                }))
                              }
                              className="w-4 h-4"
                              style={{ accentColor: "var(--color-primary)" }}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WRITING SECTION */}
        {exam.type === "writing" && (
          <div className="mt-6 space-y-6">
            {exam.questions?.map((q, i) => {
              const answer = submittedAnswers.writing || "";
              const wordCount = answer
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;

              return (
                <div key={i} className="card rounded-xl p-6 shadow">
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="writing prompt"
                      className="w-full h-40 object-contain rounded-md mb-4"
                    />
                  )}

                  <p
                    className="text-md font-medium mb-3"
                    style={{ color: "var(--text-color)" }}
                  >
                    {q.question}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-sm"
                      style={{ color: "var(--muted-text)" }}
                    >
                      📝 Word count: {wordCount} / {q.minWords || 150} minimum
                    </span>
                    {wordCount >= (q.minWords || 150) && (
                      <FiCheckCircle className="text-green-500 text-sm" />
                    )}
                  </div>

                  <textarea
                    value={answer}
                    onChange={(e) =>
                      setSubmittedAnswers((prev) => ({
                        ...prev,
                        writing: e.target.value,
                      }))
                    }
                    placeholder="Write your answer here..."
                    className="w-full min-h-[150px] border p-3 rounded-lg text-sm focus:outline-none focus:ring-2 card resize-none"
                    style={{
                      borderColor:
                        wordCount >= (q.minWords || 150)
                          ? "var(--color-primary)"
                          : "var(--card-border)",
                      color: "var(--text-color)",
                      backgroundColor: "var(--card-background)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* SPEAKING SECTION */}
        {exam.type === "speaking" && (
          <div className="mt-6 space-y-6">
            <div className="card rounded-xl p-6 shadow">
              <h3
                className="font-bold mb-3"
                style={{ color: "var(--text-color)" }}
              >
                Speaking Task
              </h3>
              <p
                className="leading-relaxed mb-3"
                style={{ color: "var(--text-color)" }}
              >
                {exam.topics?.[0]?.topic}
              </p>
              <p className="text-sm muted-text">
                {exam.topics?.[0]?.instructions}
              </p>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={recording ? stopRecording : startLiveTranscript}
                className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center text-3xl text-white transition-all duration-200 hover:scale-105 ${
                  recording ? "bg-red-600 animate-pulse" : ""
                }`}
                style={{
                  backgroundColor: recording
                    ? undefined
                    : "var(--color-primary)",
                }}
              >
                {recording ? <FiMicOff /> : <FiMic />}
              </button>

              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-color)" }}
              >
                {recording
                  ? "🔴 Recording in progress..."
                  : "Press to start recording"}
              </p>
            </div>

            {(submittedAnswers.speaking || liveTranscriptRef.current) && (
              <div className="card rounded-xl p-4">
                <h4
                  className="font-semibold text-sm flex items-center gap-2 mb-3"
                  style={{ color: "var(--color-primary)" }}
                >
                  <FiRadio />
                  Live Transcript
                </h4>
                <p
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: "var(--text-color)" }}
                >
                  <span className="font-medium">
                    {submittedAnswers.speaking}
                  </span>
                  {liveTranscriptRef.current && (
                    <span className="italic text-[var(--muted-text)]">
                      {" "}
                      {liveTranscriptRef.current}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* LISTENING SECTION */}
        {exam.type === "listening" && (
          <div className="mt-6 space-y-6">
            {!showQuestions ? (
              <div className="card rounded-xl p-6 shadow text-center">
                <h3
                  className="text-lg font-semibold mb-2 flex items-center justify-center gap-2"
                  style={{ color: "var(--color-primary)" }}
                >
                  <FiVolume2 />
                  Listening Comprehension Test
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--muted-text)" }}
                >
                  Listen carefully to the audio. Questions will appear after it
                  finishes.
                </p>

                <audio
                  controls
                  onEnded={() => {
                    setShowQuestions(true);
                    setAudioPlayed(true);
                  }}
                  onPlay={(e) => {
                    if (audioPlayed) {
                      e.preventDefault();
                      e.target.pause();
                      alert("You can only play the audio once.");
                    }
                  }}
                  className="w-full max-w-md mx-auto"
                  ref={audioRef}
                >
                  <source src={exam.audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : (
              <div className="card rounded-xl p-5 shadow space-y-6">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--color-primary)",
                    }}
                  >
                    Q{currentQuestionIndex + 1}
                  </span>
                  <p
                    className="font-medium text-base"
                    style={{ color: "var(--text-color)" }}
                  >
                    {exam.questions[currentQuestionIndex]?.question}
                  </p>
                </div>

                <ul className="space-y-3">
                  {exam.questions[currentQuestionIndex]?.options.map(
                    (opt, idx) => {
                      const isSelected =
                        submittedAnswers?.listening?.[currentQuestionIndex] ===
                        idx;
                      return (
                        <li key={idx}>
                          <label
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                              isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                : "border-[var(--card-border)]"
                            }`}
                            style={{
                              backgroundColor: "var(--card-background)",
                              color: "var(--text-color)",
                            }}
                          >
                            <input
                              type="radio"
                              name={`listening-q${currentQuestionIndex}`}
                              checked={isSelected}
                              onChange={() =>
                                setSubmittedAnswers((prev) => ({
                                  ...prev,
                                  listening: {
                                    ...(prev.listening || {}),
                                    [currentQuestionIndex]: idx,
                                  },
                                }))
                              }
                              className="w-4 h-4"
                              style={{ accentColor: "var(--color-primary)" }}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Navigation Controls */}
        {showQuestions &&
          (exam.type === "reading" || exam.type === "listening") && (
            <div className="flex justify-between mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 text-sm rounded-xl flex items-center gap-2 transition-opacity"
                style={{
                  border: "1px solid var(--color-primary)",
                  backgroundColor: "transparent",
                  color:
                    currentQuestionIndex === 0
                      ? "var(--muted-text)"
                      : "var(--color-primary)",
                  cursor:
                    currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                  opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                }}
              >
                <FiArrowLeft />
                Previous
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-xl text-white text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {isLastQuestion && isLastSection
                  ? "Submit Exam"
                  : isLastQuestion
                  ? "Next Section"
                  : "Next"}
                <FiArrowRight />
              </button>
            </div>
          )}

        {/* Submit Button for Writing/Speaking */}
        {(exam.type === "writing" || exam.type === "speaking") && (
          <div className="text-center mt-6">
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl text-white text-lg shadow-md transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <FiCheckCircle className="inline mr-2" />
              {isLastSection ? "Submit Final Exam" : "Submit & Next Section"}
            </button>
          </div>
        )}

        {/* Confirm Exit Modal */}
        {showConfirmExit && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiXCircle className="text-2xl text-red-500" />
                </div>
                <h2
                  className="text-2xl font-bold mb-3"
                  style={{ color: "var(--text-color)" }}
                >
                  Leave Exam?
                </h2>
                <p className="muted-text mb-8">
                  Are you sure you want to leave? All your progress will be lost
                  and you'll need to start over.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmExit(false)}
                    className="flex-1 px-6 py-3 border-2 rounded-xl font-semibold hover:opacity-80 transition-colors duration-200"
                    style={{
                      borderColor: "var(--card-border)",
                      color: "var(--text-color)",
                      backgroundColor: "var(--card-background)",
                    }}
                  >
                    Stay in Exam
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors duration-200"
                  >
                    Leave Exam
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
