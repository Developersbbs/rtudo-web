"use client";

import { useState } from "react";
import { FaMicrophone, FaStop } from "react-icons/fa";

export default function MicButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      onResult(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  return (
    <button
      onClick={listening ? () => setListening(false) : startListening}
      disabled={disabled}
      className={`p-4 rounded-full text-white ${listening ? "bg-red-500" : "bg-[var(--color-primary)]"} shadow-xl`}
    >
      {listening ? <FaStop size={20} /> : <FaMicrophone size={20} />}
    </button>
  );
}
