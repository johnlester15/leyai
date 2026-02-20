import { BookOpen, FileType, PresentationIcon, FileText, AlignLeft } from "lucide-react";
import { QuizData } from "@/lib/quiz-store";
import { ChatMessage } from "@/app/lib/types";
import ModuleOverview from "./ModuleOverview";

interface ResultsPanelProps {
  showResults: boolean;
  quizData: QuizData | null;
  chatInput: string;
  setChatInput: (text: string) => void;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  handleChat: (e: React.FormEvent) => Promise<void>;
  handleGoToQuiz: () => void;
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

export default function ResultsPanel({
  showResults,
  quizData,
  chatInput,
  setChatInput,
  chatMessages,
  isChatting,
  handleChat,
  handleGoToQuiz,
  resultsRef,
}: ResultsPanelProps) {
  return (
    <div className="lg:col-span-7" ref={resultsRef}>
      {!showResults ? (
        <div className="h-full min-h-[500px] border border-[#2e2e2e] rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-[#232323] to-[#1c1c1c] text-[#444] p-12 text-center shadow-xl">
          <BookOpen size={48} className="mb-4 opacity-10" />
          <h3 className="text-lg font-bold text-[#a0a0a0] mb-2">Results Panel</h3>
          <p className="text-sm mb-6">Upload a document or paste notes to generate your study kit</p>
          <div className="grid grid-cols-2 gap-3 text-xs text-[#555]">
            <div className="p-3 bg-[#232323] rounded-xl border border-[#2e2e2e] flex items-center gap-2"><FileType size={13} /> PDF files</div>
            <div className="p-3 bg-[#232323] rounded-xl border border-[#2e2e2e] flex items-center gap-2"><PresentationIcon size={13} /> PPTX slides</div>
            <div className="p-3 bg-[#232323] rounded-xl border border-[#2e2e2e] flex items-center gap-2"><FileText size={13} /> DOCX documents</div>
            <div className="p-3 bg-[#232323] rounded-xl border border-[#2e2e2e] flex items-center gap-2"><AlignLeft size={13} /> TXT files</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-700">
          <ModuleOverview
            quizData={quizData}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            isChatting={isChatting}
            handleChat={handleChat}
            handleGoToQuiz={handleGoToQuiz}
          />
        </div>
      )}
    </div>
  );
}
