'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/app/firebase/firebaseConfig';
import Loader from '@/app/components/Loader';

import {
  FiMic,
  FiStopCircle,
  FiCheckCircle,
  FiXCircle,
  FiBarChart2,
  FiLock,
} from 'react-icons/fi';

const SECTION_ORDER = ['reading', 'writing', 'speaking', 'listening'];

export default function FinalExamPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [recording, setRecording] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const router = useRouter();

  const currentType = SECTION_ORDER[currentSectionIndex];
  const exam = sections[currentType];

  useEffect(() => {
    const fetchExams = async () => {
      const snapshot = await getDocs(collection(db, 'final-exams'));
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

      const resultRef = doc(db, `users/${user.uid}/final-exam`, 'result');
      const resultSnap = await getDoc(resultRef);

      if (resultSnap.exists()) {
        const data = resultSnap.data();
        if (data.result === 'passed') {
          setBlocked(true);
        }
      }
    };

    if (!loading) checkIfAlreadyPassed();
  }, [loading]);

  useEffect(() => {
    if (blocked) {
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [blocked]);

  useEffect(() => {
    if (currentSectionIndex >= SECTION_ORDER.length) {
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentSectionIndex]);

  const startLiveTranscript = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Live speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    finalTranscriptRef.current = '';
    recognitionRef.current = recognition;

    recognition.onstart = () => setRecording(true);

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const combinedTranscript = (finalTranscriptRef.current + interimTranscript).trim();

      setSubmittedAnswers((prev) => ({
        ...prev,
        speaking: combinedTranscript,
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      alert('Microphone access error. Please allow mic access and try again.');
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert('Login required');

    let score = 0;
    let totalScore = { ...scores };

    if (exam.type === 'reading' || exam.type === 'listening') {
      const correct = exam.questions?.[0]?.correctAnswer;
      const userAnswer = submittedAnswers[exam.type];
      score = userAnswer === correct ? 100 : 0;
    }

    if (exam.type === 'writing' || exam.type === 'speaking') {
      const response = submittedAnswers[exam.type];
      const question =
        exam.type === 'writing'
          ? exam.questions?.[0]?.question
          : exam.topics?.[0]?.topic;

      if (response && question) {
        const aiRes = await fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                text: `You are an IELTS examiner. Evaluate the following ${exam.type} response.

Step 1: Determine if the answer is relevant to the question. If it's off-topic or irrelevant, give a score below 20.

Step 2: If relevant, evaluate based on grammar, vocabulary, fluency, and coherence.

Return ONLY a number score out of 100. No explanation.

Question: ${question}
Answer: ${response}`,
              },
            ],
          }),
        });

        const data = await aiRes.json();
        const reply = data.reply || '';
        const match = reply.match(/\d{1,3}/);
        score = match ? Math.min(parseInt(match[0]), 100) : 0;
      }
    }

    totalScore[exam.type] = score;
    setScores(totalScore);

    if (currentSectionIndex < SECTION_ORDER.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
    } else {
      const total = Math.round(
        Object.values(totalScore).reduce((a, b) => a + b, 0) / 4
      );
      const passedAll = Object.values(totalScore).every((s) => s >= 50);

      const resultRef = doc(db, `users/${user.uid}/final-exam`, 'result');
      await setDoc(resultRef, {
        ...totalScore,
        total,
        result: passedAll ? 'passed' : 'failed',
        submittedAt: new Date(),
      });

      setCurrentSectionIndex(SECTION_ORDER.length);
    }
  };

  if (loading) return <Loader />;

  if (blocked) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-green-600 mb-4 flex justify-center items-center gap-2">
          <FiCheckCircle className="text-xl" /> You’ve Already Passed!
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          Congratulations! You don’t need to retake the final exam.
        </p>
        <p className="text-xs text-gray-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  if (!exam && currentSectionIndex < SECTION_ORDER.length)
    return <p className="text-center text-red-500">No exam found</p>;

  if (currentSectionIndex >= SECTION_ORDER.length) {
    const passedAll = Object.values(scores).every((s) => s >= 50);
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center justify-center gap-2">
          <FiBarChart2 /> Final Exam Result
        </h2>
        <div className="mt-4 space-y-2 text-sm">
          {SECTION_ORDER.map((type) => (
            <p key={type}>
              <strong>{type.toUpperCase()}:</strong> {scores[type] || 0} / 100
            </p>
          ))}
        </div>
        <div
          className={`mt-6 text-xl font-bold flex items-center justify-center gap-2 ${
            passedAll ? 'text-green-600' : 'text-red-500'
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
        <p className="text-xs text-gray-400 mt-2">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-primary)]">
        {exam.title}
      </h1>
      <p className="text-sm text-[var(--muted-text)]">{exam.instructions}</p>

      {/* Reading */}
      {exam.type === 'reading' && (
        <>
          <div className="bg-[var(--accent)] p-3 rounded-xl text-sm mb-4">
            <strong>Passage:</strong> {exam.passage}
          </div>
          {exam.questions?.[0] && (
            <div>
              <p className="font-medium mb-1">1. {exam.questions[0].question}</p>
              {exam.questions[0].options.map((opt, i) => (
                <label key={i} className="block text-sm">
                  <input
                    type="radio"
                    name="reading"
                    className="mr-2"
                    onChange={() =>
                      setSubmittedAnswers({ ...submittedAnswers, reading: i })
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {/* Writing */}
      {exam.type === 'writing' && (
        <div className="space-y-4">
          {exam.questions?.[0]?.imageUrl && (
            <img
              src={exam.questions[0].imageUrl}
              alt="Writing prompt"
              className="rounded-xl max-w-full max-h-64 object-contain"
            />
          )}
          <p className="font-medium">1. {exam.questions?.[0]?.question}</p>
          <textarea
            rows={4}
            placeholder="Write your answer..."
            className="w-full border rounded-xl p-2 text-sm"
            onChange={(e) =>
              setSubmittedAnswers({
                ...submittedAnswers,
                writing: e.target.value,
              })
            }
          />
        </div>
      )}

      {/* Speaking */}
      {exam.type === 'speaking' && (
        <div>
          <p className="font-medium">1. {exam.topics?.[0]?.topic}</p>
          <p className="text-sm text-[var(--muted-text)]">{exam.topics?.[0]?.instructions}</p>

          {recording ? (
            <button
              onClick={stopRecording}
              className="mt-2 w-full bg-red-600 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <FiStopCircle /> Stop Recording
            </button>
          ) : (
            <button
              onClick={startLiveTranscript}
              className="mt-2 w-full bg-[var(--color-primary)] text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <FiMic /> Start Speaking
            </button>
          )}

          <div className="mt-4 border border-[var(--card-border)] bg-[var(--card-background)] p-3 rounded-xl text-sm min-h-[100px]">
            <p className="text-[var(--muted-text)] font-medium mb-1">
              Live Transcript:
            </p>
            <p className="text-[var(--text-color)] whitespace-pre-wrap">
              {submittedAnswers.speaking || '🎤 Start speaking to see transcript...'}
            </p>
          </div>
        </div>
      )}

      {/* Listening */}
      {exam.type === 'listening' && (
        <>
          <audio controls className="w-full mb-4">
            <source src={exam.audioUrl} type="audio/mpeg" />
          </audio>
          {exam.questions?.[0] && (
            <div>
              <p className="font-medium mb-1">1. {exam.questions[0].question}</p>
              {exam.questions[0].options.map((opt, i) => (
                <label key={i} className="block text-sm">
                  <input
                    type="radio"
                    name="listening"
                    className="mr-2"
                    onChange={() =>
                      setSubmittedAnswers({ ...submittedAnswers, listening: i })
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={handleSubmit}
        className="mt-4 w-full px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold"
      >
        {currentSectionIndex === SECTION_ORDER.length - 1
          ? 'Submit'
          : 'Next'}
      </button>
    </div>
  );
}
