"use client";

import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import { getChatById } from "@/app/utils/firebaseChatUtils";
import { MdArrowBack } from "react-icons/md";
import { BsRobot } from "react-icons/bs";

export default function ChatDetailPage() {
  const [chat, setChat] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchChat = async () => {
      const user = getAuth().currentUser;
      if (!user || !chatId) return;
      const data = await getChatById(user.uid, chatId);
      setChat(data);
    };
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div 
      className="min-h-screen font-sans relative transition-colors duration-300"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--text-color)'
      }}
    >
      {/* Fixed Header */}
      <div 
        className="fixed top-0 left-0 w-full z-10 border-b shadow-sm transition-colors duration-300"
        style={{ 
          backgroundColor: 'var(--card-background)',
          borderBottomColor: 'var(--card-border)'
        }}
      >
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="transition-colors duration-200 hover:opacity-70"
            style={{ color: 'var(--text-color)' }}
          >
            <MdArrowBack size={24} />
          </button>
          <h2 
            className="text-base font-semibold"
            style={{ color: 'var(--text-color)' }}
          >
            Chat Detail
          </h2>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="pt-[100px] pb-28 px-4 max-w-3xl mx-auto space-y-4">
        {chat?.messages?.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div 
                className="mr-2 text-white p-2 rounded-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <BsRobot size={16} />
              </div>
            )}
            <div className="max-w-[75%] flex flex-col space-y-1">
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm transition-colors duration-300 ${
                  msg.role === "user"
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
                style={{
                  backgroundColor: msg.role === "user" 
                    ? 'var(--color-primary)' 
                    : 'var(--accent)',
                  color: msg.role === "user" 
                    ? '#ffffff' 
                    : 'var(--text-color)'
                }}
              >
                {msg.text}
              </div>
              <span
                className={`text-[10px] ${
                  msg.role === "user" ? "text-right pr-1" : "text-left"
                }`}
                style={{ 
                  color: msg.role === "user" 
                    ? 'rgba(255, 255, 255, 0.7)' 
                    : 'var(--muted-text)' 
                }}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}