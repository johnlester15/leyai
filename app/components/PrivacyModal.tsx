import { CheckCircle2 } from "lucide-react";
import { PrivacyModalProps } from "@/app/lib/types";

export default function PrivacyModal({ show, onNext }: PrivacyModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#232323] border border-[#2e2e2e] rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in duration-300">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[#ededed] mb-4">Privacy First</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex gap-3">
              <CheckCircle2 size={16} className="text-[#3ecf8e] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Files Never Stored</p>
                <p className="text-xs text-[#a0a0a0]">Processed instantly and deleted</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 size={16} className="text-[#3ecf8e] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Instant Processing</p>
                <p className="text-xs text-[#a0a0a0]">Deleted right after generation</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 size={16} className="text-[#3ecf8e] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#3ecf8e]">Your Control</p>
                <p className="text-xs text-[#a0a0a0]">Stored locally on your device</p>
              </div>
            </div>
          </div>

          <button onClick={onNext}
            className="w-full py-2 bg-[#3ecf8e] hover:bg-[#34b27b] text-black font-bold text-sm rounded-lg transition-all active:scale-95">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
