'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getChatHistoryList } from '@/app/utils/firebaseChatUtils';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MdArrowBack, MdChatBubbleOutline } from 'react-icons/md';
import Loader from '@/app/components/Loader';

export default function ChatHistoryPage() {
  const [history, setHistory] = useState([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      const data = await getChatHistoryList(user.uid);
      setHistory(data);
      setLoading(false);
    };

    fetchHistory();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative">
      {/* Header */}
      <div className="fixed top-0 left-0 w-full bg-background border-b border-muted z-10">
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-muted hover:text-foreground transition-colors"
          >
            <MdArrowBack size={24} />
          </button>
          <h2 className="text-lg font-semibold">Chat History</h2>
        </div>
      </div>

      {/* Chat List */}
      <div className="pt-[90px] pb-24 px-4 max-w-3xl mx-auto space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-muted mt-10 text-sm">
            No chats yet. Start a new conversation to see it here.
          </div>
        ) : (
          history.map((chat, index) => (
            <div
              key={index}
              onClick={() => router.push(`/ai/chat-detail?id=${chat.chatId}`)}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] border border-border rounded-xl p-4 shadow-sm transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-[var(--color-primary)] font-medium text-sm">
                  <MdChatBubbleOutline size={18} />
                  <span>AI Chat</span>
                </div>
                <span className="text-xs text-muted">
                  {format(chat.lastUpdated, 'MMM d, yyyy, hh:mm a')}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{chat.preview}</p>
              <p className="text-xs text-muted mt-1">
                {chat.messagesCount} message{chat.messagesCount !== 1 ? 's' : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
