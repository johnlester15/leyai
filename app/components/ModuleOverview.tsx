import { useState } from "react";
import { FileText, FlaskConical, CheckCircle2, Layers, Target, ListChecks, FlaskConical as CaseIcon } from "lucide-react";
import { QuizData } from "@/lib/quiz-store";
import { ChatMessage } from "@/app/lib/types";
import ChatSection from "./ChatSection";

interface ModuleOverviewProps {
  quizData: QuizData | null;
  chatInput: string;
  setChatInput: (text: string) => void;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  handleChat: (e: React.FormEvent) => Promise<void>;
  handleGoToQuiz: () => void;
}

export default function ModuleOverview({
  quizData,
  chatInput,
  setChatInput,
  chatMessages,
  isChatting,
  handleChat,
  handleGoToQuiz,
}: ModuleOverviewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "cases">("overview");

  return (
    <div className="bg-[#232323] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden hover:shadow-[0_12px_48px_rgba(62,207,142,0.12)] transition-shadow duration-300">

      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-[#3ecf8e]/10 rounded-lg"><Layers size={20} className="text-[#3ecf8e]" /></div>
          <h2 className="text-2xl font-bold tracking-tight">Module Overview</h2>
        </div>

        {/* Tabs — Overview + Cases only */}
        <div className="flex gap-1 border-b border-[#2e2e2e] overflow-x-auto scrollbar-hide">
          {([
            { id: "overview", label: "Overview", icon: <FileText size={12} /> },
            { id: "cases",    label: "Cases",    icon: <CaseIcon size={12} /> },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === tab.id ? 'border-[#3ecf8e] text-[#3ecf8e]' : 'border-transparent text-[#555] hover:text-[#a0a0a0]'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="text-[10px] font-black text-[#707070] uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText size={11} /> Summary
              </h3>
              <div className="text-[#b0b0b0] leading-relaxed text-sm space-y-3">
                {quizData?.summary?.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Learning Objectives */}
            {quizData?.objectives && quizData.objectives.length > 0 && (
              <div className="bg-[#1c1c1c] p-5 rounded-xl border border-[#2e2e2e] shadow-lg shadow-[#3ecf8e]/5">
                <h3 className="text-[10px] font-black text-[#3ecf8e] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Target size={11} /> Learning Objectives
                </h3>
                <ul className="space-y-3">
                  {quizData.objectives.map((obj, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#ededed]">
                      <CheckCircle2 size={15} className="text-[#3ecf8e] shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Concepts */}
            <div>
              <h3 className="text-[10px] font-black text-[#707070] uppercase tracking-widest mb-3 flex items-center gap-2">
                <ListChecks size={11} /> Key Concepts
              </h3>
              <div className="flex flex-wrap gap-2">
                {quizData?.key_concepts?.map((concept, i) => (
                  <span key={i} className="px-3 py-1 bg-[#2e2e2e] rounded-full text-[10px] font-bold text-[#3ecf8e] border border-[#3e3e3e] uppercase tracking-wide">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CASES TAB — simplified */}
        {activeTab === "cases" && (
          <div>
            {(!quizData?.case_studies || quizData.case_studies.length === 0) ? (
              <div className="text-center py-10 text-[#444]">
                <CaseIcon size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No case studies generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizData.case_studies.map((cs, i) => (
                  <div key={i} className="p-4 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl hover:border-[#3ecf8e]/30 transition-all">
                    <p className="text-sm font-black text-[#3ecf8e] mb-2">{cs.title}</p>
                    <p className="text-xs text-[#a0a0a0] leading-relaxed">{cs.scenario}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT */}
      <ChatSection
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatMessages={chatMessages}
        isChatting={isChatting}
        handleChat={handleChat}
      />

      {/* GO TO QUIZ CTA */}
      <div className="px-6 pb-8 flex justify-center">
        <button onClick={handleGoToQuiz}
          className="px-6 py-3 bg-[#3ecf8e] text-black font-bold rounded-xl text-sm hover:bg-[#34b27b] transition-all flex items-center gap-2 shadow-xl shadow-[#3ecf8e]/30 hover:shadow-[#3ecf8e]/50 active:scale-95">
          Take the Quiz
        </button>
      </div>
    </div>
  );
}