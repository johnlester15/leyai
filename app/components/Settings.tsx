import { Settings as SettingsIcon, AlertCircle, Loader2 } from "lucide-react";
import { SettingsProps } from "@/app/lib/types";

export default function Settings({
  settings,
  setSettings,
  error,
  isGenerating,
  isExtracting,
  extractedText,
  pastedText,
  inputMode,
  handleGenerate,
}: SettingsProps) {
  const canGenerate = !isExtracting && !isGenerating && (
    inputMode === "text" ? pastedText.trim().length > 10 : extractedText.length > 10
  );

  return (
    <section className="bg-[#232323] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl hover:shadow-[0_8px_32px_rgba(62,207,142,0.08)] transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-4 text-[#a0a0a0]">
        <SettingsIcon size={14} />
        <h3 className="text-xs font-bold uppercase tracking-widest">Configuration</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Type</label>
          <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
            aria-label="Quiz type"
            value={settings.type} onChange={(e) => setSettings({ ...settings, type: e.target.value as "Mixed" | "MCQ" | "Identification" })}>
            <option>Mixed</option><option>MCQ</option><option>Identification</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Difficulty</label>
          <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
            aria-label="Quiz difficulty"
            value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as "Easy" | "Medium" | "Hard" })}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Questions</label>
          <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
            aria-label="Number of questions"
            value={settings.count} onChange={(e) => setSettings({ ...settings, count: e.target.value })}>
            <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="30">30</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-2 items-start">
          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button onClick={handleGenerate} disabled={!canGenerate}
        className="w-full py-3.5 bg-[#3ecf8e] hover:bg-[#34b27b] text-black rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#3ecf8e]/20 hover:shadow-[#3ecf8e]/40 disabled:shadow-none active:scale-95">
        {isGenerating
          ? <><Loader2 className="animate-spin" size={18} /> Generating your study kit...</>
          : <>Generate Study Kit</>
        }
      </button>
    </section>
  );
}
