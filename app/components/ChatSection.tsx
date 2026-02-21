import { useRef, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";
import { ChatMessage } from "@/app/lib/types";

interface ChatSectionProps {
  chatInput: string;
  setChatInput: (text: string) => void;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  handleChat: (e: React.FormEvent) => Promise<void>;
}

export default function ChatSection({
  chatInput,
  setChatInput,
  chatMessages,
  isChatting,
  handleChat,
}: ChatSectionProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatMessages]);

  return (
    <div className="border-t border-[#2e2e2e] p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={14} className="text-[#3ecf8e]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#707070]">Deep Dive Chat</span>
      </div>
      <div className="bg-[#1c1c1c] rounded-xl h-48 overflow-y-auto p-4 mb-3 space-y-3 text-xs border border-[#2e2e2e] chat-scrollbar">
        {chatMessages.length === 0 && (
          <p className="text-[#555] italic text-center mt-8">Ask "Why is this important?" or "Give me more examples"</p>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-[#3ecf8e] text-black font-bold' : 'bg-[#2e2e2e] border border-[#3e3e3e] text-[#a0a0a0]'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isChatting && <div className="text-[#3ecf8e] animate-pulse text-[10px] font-bold">AI is thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleChat} className="flex gap-2">
        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask anything about the lesson..."
          className="flex-1 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-4 py-2 text-xs outline-none focus:border-[#3ecf8e]" />
        <button type="submit" disabled={isChatting} title="Send message"
          className="p-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#34b27b] transition-colors disabled:opacity-50">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
