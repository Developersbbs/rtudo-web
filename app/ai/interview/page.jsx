"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MdArrowBack, MdAccessTime } from "react-icons/md";
import { FaStar, FaMicrophone } from "react-icons/fa6";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";

export default function InterviewPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [xp, setXp] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const hasGreetedRef = useRef(false);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => {
    const fetchXP = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setXp(data.availableXP ?? 0);
        }
      }
    };
    fetchXP();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        const introText = `Hello, I am your interview assistant. What would you like to practice?\n1. Job Interview\n2. Academic Interview\n3. General Interview`;
        const aiMessage = {
          role: "assistant",
          text: introText,
          timestamp: getCurrentTime(),
        };
        setMessages([aiMessage]);
        speakText(introText);
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
      speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  useEffect(() => {
    if (!recognition) return;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false; // no auto restart after finish

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        setInterimTranscript("");
        setListening(false);
        handleVoiceInput(final);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };
  }, [recognition]);

  const handleMicClick = () => {
    if (!recognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
      setListening(true);
    }
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleVoiceInput = async (transcript) => {
    const userMsg = {
      role: "user",
      text: transcript,
      timestamp: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
        }),
      });

      const data = await res.json();

      const aiMsg = {
        role: "assistant",
        text: data.reply,
        timestamp: getCurrentTime(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(data.reply);
    } catch (error) {
      const errorMsg = {
        role: "assistant",
        text: "Sorry, I couldn't respond. Please try again.",
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      speakText(errorMsg.text);
    }
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center relative transition-colors duration-300"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--text-color)",
      }}
    >
      {/* Header */}
      <div
        className="fixed top-0 left-0 w-full z-10 border-b shadow-lg"
        style={{
          backgroundColor: "var(--card-background)",
          borderBottomColor: "var(--card-border)",
        }}
      >
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="transition-colors hover:opacity-70"
            style={{ color: "var(--text-color)" }}
          >
            <MdArrowBack size={24} />
          </button>
          <h1 className="font-semibold text-lg" style={{ color: "var(--text-color)" }}>
            Interview Mode
          </h1>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center px-2 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              <FaStar className="mr-1" />
              {xp !== null ? `${xp} XP` : "Loading..."}
            </div>
            <MdAccessTime size={22} style={{ color: "var(--text-color)" }} />
          </div>
        </div>
      </div>

      {/* Intro Box */}
      <div className="pt-28 px-4 w-full max-w-3xl">
        {(messages.length > 0 || interimTranscript) && (
          <div
            className="w-full text-center rounded-3xl py-16 px-6 border"
            style={{
              background: "var(--accent)",
              borderColor: "var(--card-border)",
              color: "var(--text-color)",
            }}
          >
            <h2 className="text-xl font-semibold mb-3 whitespace-pre-line">
              Hello, How can I help you?
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>
              Tap the microphone to answer
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.slice(1).map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className="max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-lg"
              style={{
                backgroundColor:
                  msg.role === "user" ? "var(--color-primary)" : "var(--card-background)",
                color: msg.role === "user" ? "#ffffff" : "var(--text-color)",
                border: msg.role === "assistant" ? "1px solid var(--card-border)" : "none",
                borderRadius:
                  msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              }}
            >
              {msg.text}
            </div>
            <span className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Interim speech while speaking */}
        {interimTranscript && (
          <div className="flex flex-col items-end">
            <div
              className="max-w-[75%] px-4 py-3 rounded-2xl text-sm italic border shadow"
              style={{
                borderColor: "var(--card-border)",
                backgroundColor: "var(--card-background)",
                color: "var(--muted-text)",
              }}
            >
              <span className="font-medium text-[var(--color-primary)]">You: </span>
              {interimTranscript}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic Button */}
      <div className="mt-6 mb-8">
        <button
          onClick={handleMicClick}
          className={`w-20 h-20 rounded-full shadow-2xl border-4 flex items-center justify-center transition-all duration-200 ${
            listening ? "bg-red-500 border-red-400" : ""
          }`}
          style={{
            backgroundColor: listening ? "red" : "var(--card-background)",
            borderColor: listening ? "rgb(239 68 68)" : "var(--card-border)",
          }}
        >
          <FaMicrophone
            size={28}
            className={listening ? "text-white" : ""}
            style={{
              color: listening ? "white" : "var(--color-primary)",
            }}
          />
        </button>
      </div>
    </div>
  );
}
