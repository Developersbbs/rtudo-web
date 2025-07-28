"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDocs, collection, query, where } from "firebase/firestore";
import { db, storage } from "@/app/firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { updateXP } from "@/app/utils/updateXP";
import toast from "react-hot-toast";
import {
  FiMic,
  FiMicOff,
  FiArrowLeft,
  FiEdit3,
  FiBookOpen,
  FiHeadphones,
  FiMessageCircle,
  FiPlay,
  FiPause,
  FiVolume2,
  FiRadio,
  FiCopy,
  FiDownload,
  FiArrowRight,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import Loader from "@/app/components/Loader";

export default function ExamPage() {
  const { type } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [writingAnswers, setWritingAnswers] = useState([]);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const getSectionIcon = (type) => {
    switch (type) {
      case 'reading': return <FiBookOpen className="text-xl" />;
      case 'writing': return <FiEdit3 className="text-xl" />;
      case 'speaking': return <FiMessageCircle className="text-xl" />;
      case 'listening': return <FiHeadphones className="text-xl" />;
      default: return <FiBookOpen className="text-xl" />;
    }
  };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const q = query(collection(db, "practice-exams"), where("type", "==", type));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setExam(snapshot.docs[0].data());
        }
      } catch (err) {
        console.error("Failed to fetch exam:", err);
        toast.error("Failed to load exam. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [type]);

  const handleStartRecording = async () => {
    chunksRef.current = [];
    setTranscript("");
    setLiveTranscript("");
    setInterimTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        toast.success("🎤 Recording started! Start speaking...", {
          duration: 3000,
          position: 'top-center',
        });
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (finalTranscript) {
          setLiveTranscript(prev => (prev + " " + finalTranscript).trim());
          setTranscript(prev => (prev + " " + finalTranscript).trim());
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast.error('🎤 Microphone access error. Please allow microphone access and try again.');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript("");
        if (liveTranscript || transcript) {
          toast.success('✅ Recording stopped successfully!');
        }
      };

      recognition.start();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        setRecordedChunks(chunksRef.current);
        recognition.stop();
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast.error("🚫 Microphone access denied or not supported. Please allow microphone access.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const copyTranscript = () => {
    const fullTranscript = (liveTranscript + " " + interimTranscript).trim();
    navigator.clipboard.writeText(fullTranscript);
    toast.success("📋 Transcript copied to clipboard!");
  };
  const handleSubmit = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  const speakingTopic = exam.topics?.[0]?.topic;
  const speakingResponse = (transcript || liveTranscript || "").trim();

  if (!user) {
    toast.error("🔐 Please login first.");
    return;
  }

  if (!speakingResponse) {
    toast.error("❌ Please record and speak something first.");
    return;
  }

  if (hasSubmitted) {
    toast.error("⚠️ You have already submitted this exam.");
    return;
  }

  setHasSubmitted(true);
  toast.loading("🔄 Evaluating your response...", { id: "evaluation" });

  try {
    const res = await fetch("/api/evaluate-speaking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript: speakingResponse,
        topic: speakingTopic,
        evaluationPrompt: `You are a strict IELTS speaking examiner. Evaluate this speaking response step by step:

STEP 1 - RELEVANCE CHECK (CRITICAL):
First, determine if the response directly addresses the given speaking topic/question.
- If the response is completely off-topic, irrelevant, or doesn't address the topic at all, immediately return "FAIL" regardless of fluency or grammar.
- If the response talks about a completely different subject than what's asked, return "FAIL".
- Only proceed to Step 2 if the response is clearly relevant and on-topic.

STEP 2 - SPEAKING QUALITY:
If the response is relevant, then evaluate based on:
- Fluency and coherence
- Lexical resource (vocabulary)
- Grammatical range and accuracy
- Pronunciation and clarity
- Task fulfillment and development of ideas

SPEAKING TOPIC: ${speakingTopic}
RESPONSE: ${speakingResponse}

Return ONLY "PASS" or "FAIL" based on this strict evaluation. An irrelevant response should ALWAYS be "FAIL".`
      }),
    });

    const data = await res.json();
    setEvaluationResult(data);
    toast.dismiss("evaluation");

    if (data.result === "PASS") {
      await updateXP(user.uid, 15, "speaking");
      toast.success("🎉 Congratulations! You passed! 15 XP added.", {
        duration: 4000,
        position: "top-center",
      });
    } else {
      toast.error("❌ You did not pass. Stay focused on the topic and try again.", {
        duration: 4000,
        position: "top-center",
      });
    }

    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  } catch (err) {
    console.error("Evaluation failed:", err);
    toast.dismiss("evaluation");
    toast.error("❌ Evaluation failed. Please try again.");
    setHasSubmitted(false);
  }
};


  const handleWritingSubmit = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    toast.error("🔐 Please login first");
    return;
  }

  if (hasSubmitted) {
    toast.error("⚠️ You have already submitted this exam.");
    return;
  }

  setHasSubmitted(true);

  try {
    toast.loading("🔄 Evaluating your writing...", { id: "writing-eval" });
    const scores = [];

    for (let i = 0; i < writingAnswers.length; i++) {
      const answer = writingAnswers[i];
      const question = exam.questions[i]?.question;

      const res = await fetch("/api/evaluate-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      const data = await res.json();
      scores.push(data);
    }

    const passedAll = scores.every((s) => s.result === "PASS");

    toast.dismiss("writing-eval");

    if (passedAll) {
      await updateXP(user.uid, 15, "writing");
      toast.success("🎉 Excellent! All answers passed! 15 XP added.", {
        duration: 4000,
        position: "top-center",
      });
    } else {
      toast.error(
        "❌ Some answers failed. Make sure they are relevant and well-written.",
        {
          duration: 4000,
          position: "top-center",
        }
      );
    }

    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  } catch (err) {
    console.error("Evaluation failed:", err);
    toast.error("❌ Submission failed. Please try again.");
    setHasSubmitted(false);
  }
};


  const handleListeningSubmit = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    toast.error("🔐 Please login first");
    return;
  }

  if (hasSubmitted) {
    toast.error("⚠️ You have already submitted this exam.");
    return;
  }

  const totalQuestions = exam.questions.length;

  // ❌ Check if all answers are empty
  const allEmpty = answers.every((ans) => !ans || ans.trim() === "");
  if (allEmpty) {
    toast.error("❌ Please answer at least one question before submitting.");
    return;
  }

  // ❌ Check if any question is unanswered
  const unanswered = answers.filter((ans) => ans === null || ans === undefined).length;
  if (unanswered > 0) {
    toast.error(`❌ Please answer all ${totalQuestions} questions.`);
    return;
  }

  setHasSubmitted(true);

  try {
    toast.loading("🔄 Calculating your score...", { id: 'listening-eval' });

    let correctCount = 0;
    for (let i = 0; i < totalQuestions; i++) {
      const correctIndex = exam.questions[i].correctAnswer;
      const correctAnswerText = exam.questions[i].options[correctIndex];
      const selectedAnswer = answers[i];

      if (selectedAnswer === correctAnswerText) {
        correctCount++;
      }
    }

    const passed = correctCount / totalQuestions >= 0.5;

    toast.dismiss('listening-eval');

    if (passed) {
      await updateXP(user.uid, 15, "listening");
      toast.success(`🎉 Great job! You got ${correctCount}/${totalQuestions} correct! 15 XP added.`, {
        duration: 4000,
        position: 'top-center',
      });
    } else {
      toast.error(`❌ You got ${correctCount}/${totalQuestions} correct. You need at least 50% to pass.`, {
        duration: 4000,
        position: 'top-center',
      });
    }

    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  } catch (err) {
    console.error("Listening submit failed:", err);
    toast.error("❌ Submission failed. Please try again.");
    setHasSubmitted(false);
  }
};

  const handleReadingSubmit = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    toast.error("🔐 Please login first");
    return;
  }

  if (hasSubmitted) {
    toast.error("⚠️ You have already submitted this exam.");
    return;
  }

  const totalQuestions = exam.questions.length;

  // ❌ Check if all answers are empty
  const allEmpty = answers.every((ans) => !ans || ans.trim() === "");
  if (allEmpty) {
    toast.error("❌ Please answer at least one question before submitting.");
    return;
  }

  // ❌ Check if any question is unanswered
  const unanswered = answers.filter((ans) => ans === null || ans === undefined).length;
  if (unanswered > 0) {
    toast.error(`❌ Please answer all ${totalQuestions} questions.`);
    return;
  }

  setHasSubmitted(true);

  try {
    toast.loading("🔄 Calculating your score...", { id: 'reading-eval' });

    let correctCount = 0;
    for (let i = 0; i < totalQuestions; i++) {
      const selectedAnswer = answers[i];
      const correctAnswer = exam.questions[i].correctAnswer; // assuming string match
      if (selectedAnswer === correctAnswer) {
        correctCount++;
      }
    }

    const passed = correctCount / totalQuestions >= 0.5;

    toast.dismiss('reading-eval');

    if (passed) {
      await updateXP(user.uid, 15, "reading");
      toast.success(`🎉 You got ${correctCount}/${totalQuestions} correct! 15 XP added.`, {
        duration: 4000,
        position: 'top-center',
      });
    } else {
      toast.error(`❌ You got ${correctCount}/${totalQuestions} correct. You need at least 50% to pass.`, {
        duration: 4000,
        position: 'top-center',
      });
    }

    setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
  } catch (err) {
    console.error("Reading submit failed:", err);
    toast.error("❌ Submission failed. Please try again.");
    setHasSubmitted(false);
  }
};



  if (loading) return <Loader/>;
  
  if (!exam) return <Loader/>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-primary)' }}
      >
        <div className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-opacity-10 hover:bg-current transition-colors"
             style={{ borderColor: 'var(--card-border)' }}>
          <FiArrowLeft className="text-lg" />
        </div>
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        {getSectionIcon(type)}
        <h1 className="text-2xl font-bold capitalize" style={{ color: 'var(--color-primary)' }}>
          {exam.title}
        </h1>
      </div>

      {/* SPEAKING */}
      {type === "speaking" && (
        <div className="mt-6 flex flex-col justify-between px-2 pb-4">
          <div className="accent-bg rounded-xl p-4 shadow mb-6">
            <p className="text-md font-medium mb-3" style={{ color: 'var(--text-color)' }}>
              {exam.topics?.[0]?.topic}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center text-3xl text-white transition-all duration-200 hover:scale-105 ${
                isRecording ? "bg-red-600 animate-pulse" : ""
              }`}
              style={{ backgroundColor: isRecording ? undefined : 'var(--color-primary)' }}
              aria-label="Toggle Recording"
            >
              {isRecording ? <FiMicOff /> : <FiMic />}
            </button>

            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>
                {isRecording ? "🔴 Recording in progress..." : "Press to start recording"}
              </p>
              {isRecording && (
                <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                  Speak clearly into your microphone
                </p>
              )}
            </div>
            {(liveTranscript || interimTranscript || transcript) && (
  <div className="w-full mt-4">
    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--color-primary)' }}>
      <FiRadio className="text-sm" />
      Live Transcript
    </h4>

    <p className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--text-color)]">
      <span className="font-medium">{liveTranscript || transcript}</span>
      {interimTranscript && (
        <span className="italic text-[var(--muted-text)]"> {interimTranscript}</span>
      )}
      {!liveTranscript && !transcript && !interimTranscript && (
        <span className="italic text-[var(--muted-text)]">
          🎤 Start speaking to see your words appear here...
        </span>
      )}
    </p>
  </div>
)}


            <button
              onClick={handleSubmit}
              disabled={hasSubmitted || (!transcript.trim() && !liveTranscript.trim())}
              className={`w-full text-white text-lg py-3 rounded-xl shadow-md mt-4 transition-all duration-200 flex items-center justify-center gap-2 ${
                hasSubmitted || (!transcript.trim() && !liveTranscript.trim()) 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "hover:opacity-90"
              }`}
              style={{ 
                backgroundColor: hasSubmitted || (!transcript.trim() && !liveTranscript.trim()) 
                  ? undefined 
                  : 'var(--color-primary)' 
              }}
            >
              {hasSubmitted ? (
                <>
                  <FiCheckCircle />
                  Submitted
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  Submit Recording
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* WRITING */}
      {type === "writing" && (
        <div className="mt-4 space-y-6">
          {exam.questions?.map((q, i) => {
            const answer = writingAnswers[i] || "";
            const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

            return (
              <div key={i} className="accent-bg rounded-xl p-4 shadow">
                

                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    alt="writing prompt"
                    className="w-full h-40 object-contain rounded-md mb-4"
                  />
                )}

                <p className="text-md font-medium mb-3" style={{ color: 'var(--text-color)' }}>
                  {q.question}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm" style={{ color: 'var(--muted-text)' }}>
                    📝 Word count: {wordCount} / {q.minWords} minimum
                  </span>
                  {wordCount >= q.minWords && (
                    <FiCheckCircle className="text-green-500 text-sm" />
                  )}
                </div>

                <textarea
                  value={answer}
                  onChange={(e) => {
                    const updated = [...writingAnswers];
                    updated[i] = e.target.value;
                    setWritingAnswers(updated);
                  }}
                  placeholder="Write your answer here..."
                  className="w-full min-h-[150px] border p-3 rounded-lg text-sm focus:outline-none focus:ring-2 card resize-none"
                  style={{ 
                    borderColor: wordCount >= q.minWords ? 'var(--color-primary)' : 'var(--card-border)',
                    focusRingColor: 'var(--color-primary)'
                  }}
                />
              </div>
            );
          })}

          <div className="text-center">
            <button
              onClick={handleWritingSubmit}
              disabled={hasSubmitted || exam.questions?.some((q, i) => {
                const ans = writingAnswers[i] || "";
                const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
                return wordCount < q.minWords;
              })}
              className={`mt-6 w-full py-3 rounded-xl text-white text-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                hasSubmitted || exam.questions?.some((q, i) => {
                  const ans = writingAnswers[i] || "";
                  const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
                  return wordCount < q.minWords;
                }) ? "bg-gray-400 cursor-not-allowed" : "hover:opacity-90"
              }`}
              style={{ 
                backgroundColor: hasSubmitted || exam.questions?.some((q, i) => {
                  const ans = writingAnswers[i] || "";
                  const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
                  return wordCount < q.minWords;
                }) ? undefined : 'var(--color-primary)'
              }}
            >
              {hasSubmitted ? (
                <>
                  <FiCheckCircle />
                  Submitted
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  Submit Writing
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* READING */}
      {type === "reading" && (
  <div className="mt-6 flex flex-col px-4 pb-6 space-y-6 max-w-2xl mx-auto">

    {/* Show Passage First */}
    {!showQuestions && (
      <>
        <div
          className="p-4 rounded-xl shadow"
          style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-primary)' }}
          >
            <FiBookOpen />
            Reading Passage
          </h2>
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text-color)' }}
          >
            {exam.passage}
          </p>
        </div>

        <button
          onClick={() => setShowQuestions(true)}
          className="py-3 px-4 rounded-xl shadow flex items-center justify-center gap-2 font-medium hover:opacity-80 transition-opacity"
          style={{
            border: '1px solid var(--color-primary)',
            color: 'var(--color-primary)',
            backgroundColor: 'transparent',
          }}
        >
          <span className="text-xl">❓</span>
          View Questions
          <FiArrowRight />
        </button>
      </>
    )}

    {/* Question by Question UI */}
    {showQuestions && (
      <div className="space-y-4">
        {/* Question Card */}
        <div
          className="p-5 rounded-xl shadow-md"
          style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
          }}
        >
          <p
            className="text-base font-medium mb-4 flex items-start gap-2"
            style={{ color: 'var(--text-color)' }}
          >
            <span
              className="px-2 py-1 rounded text-xs font-semibold"
              style={{
                backgroundColor: 'var(--badge-background)',
                color: 'var(--color-primary)',
              }}
            >
              Q{currentQuestion + 1}
            </span>
            {exam.questions[currentQuestion].question}
          </p>

          <div className="space-y-3">
            {exam.questions[currentQuestion].options.map((opt, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: '1px solid var(--card-border)',
                  backgroundColor: 'var(--card-background)',
                  color: 'var(--text-color)',
                }}
              >
                <input
                  type="radio"
                  name={`reading-q${currentQuestion}`}
                  value={opt}
                  checked={answers[currentQuestion] === opt}
                  onChange={() => {
                    const updated = [...answers];
                    updated[currentQuestion] = opt;
                    setAnswers(updated);
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 text-sm rounded-xl flex items-center gap-2 transition-colors"
            style={{
              color: currentQuestion === 0 ? 'var(--muted-text)' : 'var(--color-primary)',
              backgroundColor: currentQuestion === 0 ? 'var(--button-disabled)' : 'transparent',
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <FiArrowLeft />
            Previous
          </button>

          {currentQuestion < exam.questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentQuestion((prev) =>
                  Math.min(exam.questions.length - 1, prev + 1)
                )
              }
              className="px-4 py-2 text-sm rounded-xl text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Next
              <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleReadingSubmit}
              disabled={hasSubmitted}
              className="px-6 py-2 text-sm rounded-xl text-white flex items-center gap-2 transition-opacity"
              style={{
                backgroundColor: hasSubmitted
                  ? 'var(--button-disabled)'
                  : 'var(--color-primary)',
                cursor: hasSubmitted ? 'not-allowed' : 'pointer',
              }}
            >
              <FiCheckCircle />
              {hasSubmitted ? "Submitted" : "Submit"}
            </button>
          )}
        </div>
      </div>
    )}
  </div>
)}

      {/* LISTENING */}
      {type === "listening" && (
  <div className="mt-6 space-y-6 px-4 max-w-2xl mx-auto">

    {/* 🎧 Audio Player + Instruction */}
    <div
      className="rounded-xl p-6 shadow text-center"
      style={{
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--card-border)',
      }}
    >
      <h3
        className="text-lg font-semibold mb-2 flex items-center justify-center gap-2"
        style={{ color: 'var(--color-primary)' }}
      >
        <FiVolume2 />
        Listening Comprehension Test
      </h3>
      <p
        className="text-sm mb-4"
        style={{ color: 'var(--muted-text)' }}
      >
        Listen carefully to the audio. Questions will appear after it finishes.
      </p>

      <audio
        controls
        onEnded={() => {
          setShowQuestions(true);
          setAnswers(new Array(exam.questions.length).fill(""));
          toast.success("🎧 Audio finished! Now answer the questions.", {
            duration: 3000,
            position: 'top-center',
          });
        }}
        className="w-full max-w-md mx-auto"
      >
        <source src={exam.audioUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>

    {/* ❓ Show Questions One by One */}
    {showQuestions && (
      <div
        className="rounded-xl p-5 shadow space-y-6"
        style={{
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Question Header */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{
              backgroundColor: 'var(--badge-background)',
              color: 'var(--color-primary)',
            }}
          >
            Q{currentQuestion + 1}
          </span>
          <p
            className="font-medium text-base"
            style={{ color: 'var(--text-color)' }}
          >
            {exam.questions[currentQuestion]?.question}
          </p>
        </div>

        {/* Options */}
        <ul className="space-y-3">
          {exam.questions[currentQuestion]?.options.map((opt, idx) => (
            <li key={idx}>
              <label
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: '1px solid var(--card-border)',
                  backgroundColor: 'var(--card-background)',
                  color: 'var(--text-color)',
                }}
              >
                <input
                  type="radio"
                  name={`q${currentQuestion}`}
                  value={opt}
                  checked={answers[currentQuestion] === opt}
                  onChange={() => {
                    const updated = [...answers];
                    updated[currentQuestion] = opt;
                    setAnswers(updated);
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            </li>
          ))}
        </ul>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          {/* Previous */}
          <button
  onClick={() => setCurrentQuestion((prev) => prev - 1)}
  disabled={currentQuestion === 0}
  className="px-4 py-2 text-sm rounded-xl flex items-center gap-2 transition-opacity"
  style={{
    border: '1px solid var(--color-primary)',
    backgroundColor: 'transparent',
    color: currentQuestion === 0 ? 'var(--muted-text)' : 'var(--color-primary)',
    cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
    opacity: currentQuestion === 0 ? 0.5 : 1,
  }}
>
  <FiArrowLeft />
  Previous
</button>


          {/* Next or Submit */}
          {currentQuestion < exam.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
              className="px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Next
              <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleListeningSubmit}
              disabled={hasSubmitted}
              className={`px-6 py-2 text-sm rounded-xl text-white flex items-center gap-2 transition-opacity ${
                hasSubmitted ? "bg-gray-400 cursor-not-allowed" : "hover:opacity-90"
              }`}
              style={{
                backgroundColor: hasSubmitted
                  ? 'var(--button-disabled)'
                  : 'var(--color-primary)',
              }}
            >
              <FiCheckCircle />
              {hasSubmitted ? "Submitted" : "Submit"}
            </button>
          )}
        </div>
      </div>
    )}
  </div>
)}

    </div>
  );
}