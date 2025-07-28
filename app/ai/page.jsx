"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaMicrophone } from "react-icons/fa";
import { MdArrowBack, MdAccessTime, MdSend } from "react-icons/md";
import { FaStar } from "react-icons/fa6";
import { BiUserVoice } from "react-icons/bi";
import { BsRobot } from "react-icons/bs";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { createChatSession } from "../utils/createChatSession";
import { appendMessageToChat } from "../utils/appendMessageToChat";

export default function ChatPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const searchParams = useSearchParams();
  const [chatId, setChatId] = useState(searchParams.get("id"));
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [availableXP, setAvailableXP] = useState(0);

  const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  // Fetch XP
  const fetchXP = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setAvailableXP(snap.data().availableXP || 0);
  };

  // Initial fetch
  useEffect(() => {
    fetchXP();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatMessages = async () => {
      const user = getAuth().currentUser;
      if (!user || !chatId) return;

      const snap = await getDoc(doc(db, "users", user.uid, "chatHistory", chatId));
      if (snap.exists()) {
        const chat = snap.data();
        const chatMessages = chat.messages || [];

        if (chatMessages.length > 0) setMessages(chatMessages);
      }
    };
    fetchChatMessages();
  }, [chatId]);

  // Setup mic
  useEffect(() => {
    if (!recognition) return;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      sendMessage(transcript, true);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  }, [recognition]);

  const handleMicClick = () => {
    if (!recognition) return alert("Speech recognition not supported in this browser.");
    if (listening) recognition.stop();
    else {
      recognition.start();
      setListening(true);
    }
  };

  const deductXP = async (amount) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const current = snap.data().availableXP || 0;
    const updated = Math.max(current - amount, 0);
    await updateDoc(userRef, { availableXP: updated });
    await fetchXP();
  };

  const sendMessage = async (customInput, isVoiceInput = false) => {
    const finalInput = customInput || input.trim();
    if (!finalInput) return;

    if (availableXP < 1) {
      alert("You don't have enough XP to chat.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    let currentChatId = chatId;
    if (!currentChatId) {
      currentChatId = await createChatSession(user.uid);
      setChatId(currentChatId);
    }

    const userMessage = {
      role: "user",
      text: finalInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isVoice: isVoiceInput,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    await deductXP(1);

    if (currentChatId) await appendMessageToChat(user.uid, currentChatId, userMessage);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      const botMessage = {
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      if (isVoiceInput) {
        const utterance = new SpeechSynthesisUtterance(botMessage.text);
        utterance.lang = "en-US";
        speechSynthesis.speak(utterance);
      }

      setMessages((prev) => [...prev, botMessage]);
      if (currentChatId) await appendMessageToChat(user.uid, currentChatId, botMessage);
    } catch (err) {
      const failMessage = {
        role: "assistant",
        text: "Sorry, I couldn't respond. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, failMessage]);
      if (currentChatId) await appendMessageToChat(user.uid, currentChatId, failMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInterviewClick = async () => {
    if (availableXP < 5) {
      alert("Not enough XP to start the interview.");
      return;
    }
    await deductXP(5);
    router.push("/ai/interview");
  };

  return (
    <div className="min-h-screen font-sans relative" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-10 border-b shadow-lg" style={{ backgroundColor: 'var(--background)', borderBottomColor: 'var(--card-border)' }}>
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--foreground)' }}
          >
            <MdArrowBack size={24} />
          </button>
          <h1 className="font-semibold text-lg" style={{ color: 'var(--text-color)' }}>Ask AI</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center px-2 py-1 rounded-full text-sm font-medium border" style={{ backgroundColor: 'var(--accent)', color: 'var(--color-primary)', borderColor: 'var(--card-border)' }}>
              <FaStar className="mr-1" /> {availableXP} XP
            </div>
            <button 
              onClick={() => router.push("/ai/chat-history")}
              className="transition-colors hover:opacity-80"
              style={{ color: 'var(--foreground)' }}
            >
              <MdAccessTime size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="pt-[100px] pb-28 px-4 max-w-3xl mx-auto space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="mr-2 text-white p-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                <BsRobot size={18} />
              </div>
            )}
            <div className="max-w-[75%] flex flex-col space-y-1">
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-lg ${
                  msg.role === "user"
                    ? "text-white rounded-br-none"
                    : "card rounded-bl-none"
                }`}
                style={msg.role === "user" ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                {msg.text}
              </div>
              <span
                className={`text-[10px] ${
                  msg.role === "user" ? "text-right pr-1" : "text-left"
                } muted-text`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="mr-2 text-white p-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
              <BsRobot size={18} />
            </div>
            <div className="card px-4 py-3 rounded-2xl text-sm shadow-lg muted-text">
              Typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating Interview Button */}
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={handleInterviewClick}
          className="fixed bottom-24 right-6 text-white rounded-full px-4 py-2 shadow-xl flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <BiUserVoice size={18} />
          Interview
        </button>
      </div>

      {/* Input Box */}
      <div className="fixed bottom-0 left-0 w-full border-t" style={{ backgroundColor: 'var(--background)', borderTopColor: 'var(--card-border)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="flex-1 px-4 py-2 rounded-full flex items-center accent-bg border" style={{ borderColor: 'var(--card-border)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-color)' }}
            />
          </div>
          <button
            onClick={handleMicClick}
            className={`p-3 rounded-full transition-colors duration-200 text-white shadow-lg ${
              listening ? "bg-red-500 hover:bg-red-600" : "hover:opacity-90"
            }`}
            style={!listening ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            <FaMicrophone size={18} />
          </button>
          <button
            disabled={loading}
            onClick={() => sendMessage()}
            className="text-white p-3 rounded-full transition-all duration-200 shadow-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <MdSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}