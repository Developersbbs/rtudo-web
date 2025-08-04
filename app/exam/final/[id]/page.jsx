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
  FiArrowRight,
  FiArrowLeft,
  FiBook,
  FiHeadphones,
} from 'react-icons/fi';

const SECTION_ORDER = ['reading', 'writing', 'speaking', 'listening'];

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
  const [showPassage, setShowPassage] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const router = useRouter();

  const currentType = SECTION_ORDER[currentSectionIndex];
  const exam = sections[currentType];
  const totalQuestions = exam?.questions?.length || exam?.topics?.length || 1;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isLastSection = currentSectionIndex === SECTION_ORDER.length - 1;
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

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  const handleNext = () => {
    if (exam.type === 'reading' || exam.type === 'listening') {
      const currentAnswer = submittedAnswers?.[exam.type]?.[currentQuestionIndex];
      if (currentAnswer === undefined) {
        alert('Please answer the current question before proceeding.');
        return;
      }
    } else if (exam.type === 'writing' || exam.type === 'speaking') {
      const currentAnswer = submittedAnswers?.[exam.type];
      if (!currentAnswer || currentAnswer.trim() === '') {
        alert('Please provide an answer before proceeding.');
        return;
      }
    }

    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert('Login required');

    let score = 0;
    let totalScore = { ...scores };

    if (exam.type === 'reading' || exam.type === 'listening') {
      const userAnswers = submittedAnswers[exam.type];
      let correctCount = 0;

      exam.questions.forEach((q, i) => {
        if (userAnswers?.[i] === q.correctAnswer) {
          correctCount++;
        }
      });

      score = Math.round((correctCount / exam.questions.length) * 100);
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
              }
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
      setCurrentQuestionIndex(0);
    } else {
      const total = Math.round(
        Object.values(totalScore).reduce((a, b) => a + b, 0) / 4
      );
      const passedAll = Object.values(totalScore).every((s) => s >= 80);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center py-16 card rounded-2xl shadow-xl max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="text-2xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>
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
    const passedAll = Object.values(scores).every((s) => s >= 50);
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="w-full max-w-xl mx-4 bg-white rounded-3xl shadow-lg p-8 md:p-10 border border-[var(--card-border)]">
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${passedAll ? 'bg-green-100' : 'bg-red-100'}`}>
              <FiBarChart2 className={`text-3xl ${passedAll ? 'text-green-600' : 'text-red-600'}`} />
            </div>

            <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>
              Final Exam Result
            </h2>

            <div className="w-full space-y-4 mb-6">
              {SECTION_ORDER.map((type) => (
                <div key={type} className="flex justify-between items-center bg-[var(--accent)] px-5 py-3 rounded-xl text-sm md:text-base">
                  <span className="capitalize font-medium" style={{ color: 'var(--text-color)' }}>
                    {type}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--text-color)' }}>
                    {scores[type] || 0} / 100
                  </span>
                </div>
              ))}
            </div>

            <div className={`text-2xl font-bold flex items-center justify-center gap-2 mb-2 ${passedAll ? 'text-green-600' : 'text-red-500'}`}>
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

            <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: 'var(--card-background)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {exam.title}
              </h1>
              <p className="text-sm muted-text">Section {currentSectionIndex + 1} of {SECTION_ORDER.length} • {currentType.charAt(0).toUpperCase() + currentType.slice(1)}</p>
            </div>
            <button
              onClick={() => setShowConfirmExit(true)}
              className="px-4 py-2 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
            >
              Exit
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                background: 'var(--color-primary)',
                width: `${((currentSectionIndex) / SECTION_ORDER.length) * 100}%` 
              }}
            ></div>
          </div>

          {/* Question Progress for Reading/Listening */}
          {(exam.type === 'reading' || exam.type === 'listening') && (
            <div className="flex justify-between items-center text-sm">
              <span className="muted-text">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <div className="flex gap-1">
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: i < currentQuestionIndex 
                        ? '#10b981' 
                        : i === currentQuestionIndex 
                        ? 'var(--color-primary)' 
                        : '#e5e7eb'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar for Reading/Listening */}
        {(exam.type === 'reading' || exam.type === 'listening') && (
          <div className="w-1/2 border-r overflow-y-auto" style={{ borderColor: 'var(--card-border)' }}>
            <div className="p-6">
              {exam.type === 'reading' && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FiBook className="text-lg" style={{ color: 'var(--color-primary)' }} />
                    <h3 className="font-bold" style={{ color: 'var(--color-primary)' }}>Reading Passage</h3>
                  </div>
                  <div className="prose max-w-none">
                    <p className="leading-relaxed text-sm" style={{ color: 'var(--text-color)' }}>
                      {exam.passage}
                    </p>
                  </div>
                </div>
              )}
              
              {exam.type === 'listening' && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FiHeadphones className="text-lg" style={{ color: 'var(--color-primary)' }} />
                    <h3 className="font-bold" style={{ color: 'var(--color-primary)' }}>Audio Recording</h3>
                  </div>
                  <audio controls className="w-full mb-4">
                    <source src={exam.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-sm muted-text">
                    Listen to the audio carefully before answering the questions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Panel */}
        <div className={`${(exam.type === 'reading' || exam.type === 'listening') ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div className="flex-1 overflow-y-auto p-6">
            {/* Reading Questions */}
            {exam.type === 'reading' && exam.questions?.[currentQuestionIndex] && (
              <div className="space-y-6">
                <div className="bg-[var(--accent)] rounded-lg p-4">
                  <h3 className="font-bold mb-3" style={{ color: 'var(--text-color)' }}>
                    Question {currentQuestionIndex + 1}
                  </h3>
                  <p className="leading-relaxed" style={{ color: 'var(--text-color)' }}>
                    {exam.questions[currentQuestionIndex].question}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {exam.questions[currentQuestionIndex].options.map((opt, i) => {
                    const isSelected = submittedAnswers?.reading?.[currentQuestionIndex] === i;
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--card-border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <span className={`flex-1 ${isSelected ? 'font-medium' : ''}`} style={{ color: 'var(--text-color)' }}>
                          {opt}
                        </span>
                        <input
                          type="radio"
                          name={`reading-${currentQuestionIndex}`}
                          className="sr-only"
                          checked={isSelected}
                          onChange={() =>
                            setSubmittedAnswers((prev) => ({
                              ...prev,
                              reading: {
                                ...(prev.reading || {}),
                                [currentQuestionIndex]: i,
                              },
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Listening Questions */}
            {exam.type === 'listening' && exam.questions?.[currentQuestionIndex] && (
              <div className="space-y-6">
                <div className="bg-[var(--accent)] rounded-lg p-4">
                  <h3 className="font-bold mb-3" style={{ color: 'var(--text-color)' }}>
                    Question {currentQuestionIndex + 1}
                  </h3>
                  <p className="leading-relaxed" style={{ color: 'var(--text-color)' }}>
                    {exam.questions[currentQuestionIndex].question}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {exam.questions[currentQuestionIndex].options.map((opt, i) => {
                    const isSelected = submittedAnswers?.listening?.[currentQuestionIndex] === i;
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--card-border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <span className={`flex-1 ${isSelected ? 'font-medium' : ''}`} style={{ color: 'var(--text-color)' }}>
                          {opt}
                        </span>
                        <input
                          type="radio"
                          name={`listening-${currentQuestionIndex}`}
                          className="sr-only"
                          checked={isSelected}
                          onChange={() =>
                            setSubmittedAnswers((prev) => ({
                              ...prev,
                              listening: {
                                ...(prev.listening || {}),
                                [currentQuestionIndex]: i,
                              },
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Writing */}
            {exam.type === 'writing' && (
  <div className="space-y-5">
    {/* Image (if available) */}
    {exam.questions?.[0]?.imageUrl && (
      <div className="text-center">
        <img
          src={exam.questions[0].imageUrl}
          alt="Writing prompt"
          className="rounded-xl max-w-full max-h-40 object-cover mx-auto shadow-md"
        />
      </div>
    )}

    {/* Task Box */}
    <div className="bg-[var(--accent)] rounded-xl p-3 shadow-sm">
      <h3 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-color)' }}>
        Writing Task
      </h3>
      <p className="text-sm leading-snug" style={{ color: 'var(--text-color)' }}>
        {exam.questions?.[0]?.question}
      </p>
    </div>

    {/* Answer Input */}
    <div className="space-y-2">
      <textarea
        rows={6}
        placeholder="Write your response..."
        className="w-full border rounded-lg p-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors duration-200 resize-none"
        style={{
          backgroundColor: 'var(--card-background)',
          borderColor: 'var(--card-border)',
          color: 'var(--text-color)'
        }}
        value={submittedAnswers.writing || ''}
        onChange={(e) =>
          setSubmittedAnswers({
            ...submittedAnswers,
            writing: e.target.value,
          })
        }
      />
      <div className="text-right text-xs text-gray-500">
        {(submittedAnswers.writing || '').length} characters
      </div>
    </div>
  </div>
)}


            {/* Speaking */}
            {exam.type === 'speaking' && (
              <div className="space-y-6">
                <div className="bg-[var(--accent)] rounded-lg p-4">
                  <h3 className="font-bold mb-3" style={{ color: 'var(--text-color)' }}>Speaking Task</h3>
                  <p className="leading-relaxed mb-3" style={{ color: 'var(--text-color)' }}>
                    {exam.topics?.[0]?.topic}
                  </p>
                  <p className="text-sm muted-text">
                    {exam.topics?.[0]?.instructions}
                  </p>
                </div>

                <div className="text-center">
                  {recording ? (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors duration-200"
                    >
                      <FiStopCircle className="text-lg" /> Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={startLiveTranscript}
                      className="px-6 py-3 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-all duration-200 hover:opacity-90"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <FiMic className="text-lg" /> Start Speaking
                    </button>
                  )}
                </div>

                <div className="border-2 rounded-lg p-4 min-h-[150px]" style={{ 
                  backgroundColor: 'var(--secondary-background)',
                  borderColor: 'var(--card-border)'
                }}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                    <div className={`w-3 h-3 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    Live Transcript
                  </h4>
                  <div className="leading-relaxed whitespace-pre-wrap text-sm" style={{ color: 'var(--text-color)' }}>
                    {submittedAnswers.speaking || (
                      <span className="muted-text italic">
                        🎤 Click "Start Speaking" to begin recording your response...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Navigation Footer */}
          <div className="border-t p-4" style={{ backgroundColor: 'var(--card-background)', borderColor: 'var(--card-border)' }}>
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  currentQuestionIndex === 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
                }`}
              >
                <FiArrowLeft className="text-sm" />
                Previous
              </button>

              <div className="text-sm muted-text">
                {(exam.type === 'reading' || exam.type === 'listening') 
                  ? `${currentQuestionIndex + 1} / ${totalQuestions}` 
                  : `Section ${currentSectionIndex + 1} / ${SECTION_ORDER.length}`
                }
              </div>

              <button
                onClick={handleNext}
                className="px-6 py-2 text-white rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isLastQuestion && isLastSection ? 'Submit Exam' : 
                 isLastQuestion ? 'Next Section' : 'Next'}
                <FiArrowRight className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Exit Modal */}
      {showConfirmExit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiXCircle className="text-2xl text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-color)' }}>Leave Exam?</h2>
              <p className="muted-text mb-8">
                Are you sure you want to leave? All your progress will be lost and you'll need to start over.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmExit(false)}
                  className="flex-1 px-6 py-3 border-2 rounded-xl font-semibold hover:opacity-80 transition-colors duration-200"
                  style={{ 
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--secondary-background)'
                  }}
                >
                  Stay in Exam
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
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
  );
}