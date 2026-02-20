import { Sparkles, Target, BookMarked, FlaskConical, ListChecks } from "lucide-react";
import { FeaturesModalProps } from "@/app/lib/types";

export default function FeaturesModal({ show, onClose }: FeaturesModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#232323] border border-[#2e2e2e] rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in duration-300">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[#ededed] mb-4">What You'll Get</h2>

          <div className="space-y-3 mb-6">
            <div className="flex gap-3">
              <Sparkles size={14} className="text-[#3ecf8e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Study Summary</p>
                <p className="text-xs text-[#a0a0a0]">Key concepts highlighted</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Target size={14} className="text-[#3ecf8e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Interactive Quizzes</p>
                <p className="text-xs text-[#a0a0a0]">MCQ and identification</p>
              </div>
            </div>

            <div className="flex gap-3">
              <BookMarked size={14} className="text-[#3ecf8e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Glossary</p>
                <p className="text-xs text-[#a0a0a0]">All key terms defined</p>
              </div>
            </div>

            <div className="flex gap-3">
              <FlaskConical size={14} className="text-[#3ecf8e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Case Studies</p>
                <p className="text-xs text-[#a0a0a0]">Real-world scenarios with key takeaways</p>
              </div>
            </div>

            <div className="flex gap-3">
              <ListChecks size={14} className="text-[#3ecf8e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Key Takeaways</p>
                <p className="text-xs text-[#a0a0a0]">Essential summary points to remember</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={onClose}
              className="w-full py-2 bg-[#3ecf8e] hover:bg-[#34b27b] text-black font-bold text-sm rounded-lg transition-all active:scale-95">
              Start
            </button>
            <button onClick={onClose}
              className="w-full py-1.5 bg-[#2e2e2e] hover:bg-[#3e3e3e] text-[#a0a0a0] text-sm rounded-lg transition-all border border-[#3e3e3e]">
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
