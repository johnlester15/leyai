import { Upload, CheckCircle2, FileType, PresentationIcon, FileText, AlignLeft, Loader2 } from "lucide-react";
import { InputSectionProps } from "@/app/lib/types";

export default function InputSection({
  inputMode,
  setInputMode,
  file,
  pastedText,
  setPastedText,
  extractedText,
  isExtracting,
  isDragging,
  setIsDragging,
  handleFileUpload,
}: InputSectionProps) {
  return (
    <section className="bg-[#232323] border border-[#2e2e2e] rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_8px_32px_rgba(62,207,142,0.08)] transition-shadow duration-300">
      <div className="flex border-b border-[#2e2e2e] bg-[#1c1c1c]">
        <button onClick={() => setInputMode("file")} className={`flex-1 py-3 text-xs font-bold transition-all ${inputMode === "file" ? 'bg-[#2e2e2e] text-[#3ecf8e]' : 'text-[#707070] hover:text-white'}`}>
          Upload File
        </button>
        <button onClick={() => setInputMode("text")} className={`flex-1 py-3 text-xs font-bold transition-all ${inputMode === "text" ? 'bg-[#2e2e2e] text-[#3ecf8e]' : 'text-[#707070] hover:text-white'}`}>
          Paste Notes
        </button>
      </div>

      <div className="p-6">
        {inputMode === "file" ? (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileUpload(f);
                setIsDragging(false);
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-[#1c1c1c] ${isDragging ? 'border-[#3ecf8e] bg-[#3ecf8e]/5' : 'border-[#2e2e2e]'}`}
            >
              <input type="file" className="hidden" id="f" accept=".pdf,.pptx,.ppt,.docx,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <label htmlFor="f" className="cursor-pointer">
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-[#3ecf8e]" />
                    <p className="text-sm font-bold text-[#3ecf8e]">Reading file...</p>
                    <p className="text-xs text-[#555]">Extracting text content</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto mb-3 text-[#707070]" />
                    <p className="text-sm font-bold">{file ? file.name : "Drop your file here"}</p>
                    <p className="text-xs text-[#555] mt-1">or click to browse</p>
                  </>
                )}
              </label>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {[
                { fmt: "PDF", icon: <FileType size={11} /> },
                { fmt: "PPTX", icon: <PresentationIcon size={11} /> },
                { fmt: "DOCX", icon: <FileText size={11} /> },
                { fmt: "TXT", icon: <AlignLeft size={11} /> },
              ].map(({ fmt, icon }) => (
                <span key={fmt} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-[#2e2e2e] rounded text-[#555] font-bold">{icon} {fmt}</span>
              ))}
            </div>

            {extractedText && !isExtracting && (
              <div className="mt-3 p-3 bg-[#1c1c1c] border border-[#3ecf8e]/30 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={13} className="text-[#3ecf8e]" />
                  <p className="text-xs font-bold text-[#3ecf8e]">Text extracted! ({extractedText.length.toLocaleString()} chars)</p>
                </div>
                <p className="text-[10px] text-[#555] line-clamp-2">{extractedText.slice(0, 120)}...</p>
              </div>
            )}
          </div>
        ) : inputMode === "text" ? (
          <textarea
            className="w-full h-48 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-4 text-sm text-[#ededed] outline-none focus:border-[#3ecf8e] resize-none"
            placeholder="Paste your notes, lecture content, or study material here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
        ) : null}
      </div>
    </section>
  );
}
