import { ListChecks } from "lucide-react";
import { QuizData } from "@/lib/quiz-store";

interface StudySummaryCardProps {
  quizData: QuizData | null;
}

export default function StudySummaryCard({ quizData }: StudySummaryCardProps) {
  if (!quizData) return null;

  return (
    <div className="bg-gradient-to-br from-[#3ecf8e]/10 to-[#232323] border border-[#3ecf8e]/30 rounded-2xl shadow-2xl overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#3ecf8e]/20 rounded-lg"><ListChecks size={20} className="text-[#3ecf8e]" /></div>
        <h2 className="text-xl font-bold text-[#ededed]">Study Summary</h2>
      </div>
      <p className="text-xs text-[#707070] mb-4">Key concepts and important points to remember</p>
      <div className="space-y-2">
        {quizData.key_concepts?.slice(0, 5).map((concept, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-[#3ecf8e] font-bold text-sm flex-shrink-0 mt-0.5">•</span>
            <p className="text-sm text-[#b0b0b0]">{concept}</p>
          </div>
        ))}
      </div>
      {quizData.key_concepts && quizData.key_concepts.length > 5 && (
        <p className="text-xs text-[#555] mt-3 font-bold">+ {quizData.key_concepts.length - 5} more concepts</p>
      )}
    </div>
  );
}
