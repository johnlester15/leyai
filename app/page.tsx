"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Sparkles, Settings, CheckCircle2,
  BookOpen, BrainCircuit, MessageSquare, Send, Layers,
  ChevronRight, AlertCircle, Loader2, ListChecks, Target,
  BookMarked, FlaskConical, FileType, PresentationIcon,
  FileCode, AlignLeft
} from "lucide-react";
import { saveQuizData, loadQuizData, QuizData } from "@/lib/quiz-store";

type QuizType = "Mixed" | "MCQ" | "Identification";
type Difficulty = "Easy" | "Medium" | "Hard";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function StudyGenAI() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    type: "Mixed" as QuizType,
    difficulty: "Medium" as Difficulty,
    count: "10",
  });
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "glossary" | "cases">("overview");

  const resultsRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load previously generated quiz data if available
    const savedQuizData = loadQuizData();
    if (savedQuizData) {
      setQuizData(savedQuizData);
      setShowResults(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setExtractedText("");
    setError("");

    const ext = uploadedFile.name.split(".").pop()?.toLowerCase();

    if (ext === "txt") {
      const text = await uploadedFile.text();
      setExtractedText(text);
      return;
    }

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json().catch(() => {
        throw new Error("Invalid response from server");
      });
      
      if (data.error) throw new Error(data.error);
      setExtractedText(data.text);
    } catch (err: any) {
      setError(`Could not read file: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    const content = useTextMode ? pastedText : extractedText;
    if (!content || content.trim().length < 10) {
      setError("Please upload a file or paste your notes first!");
      return;
    }

    setIsGenerating(true);
    setError("");
    setQuizData(null);
    setShowResults(false);
    setChatMessages([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, settings }),
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Generation failed");

      setQuizData(data);
      setShowResults(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      setError(err.message || "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoToQuiz = () => {
    if (!quizData) return;
    saveQuizData(quizData);
    router.push("/quiz");
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatting(true);

    try {
      const response = await fetch("/api/studychat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          history: chatMessages.slice(-6).map(m => ({ role: m.role === "assistant" ? "bot" : "user", text: m.content })),
          context: `This is a study assistant. Summary: ${quizData?.summary}. Key concepts: ${quizData?.key_concepts?.join(", ")}`,
        }),
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply || "I'm here to help! Ask me anything about the lesson." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Let me think about that... Based on what we've covered, this is an important concept to understand." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const canGenerate = !isExtracting && !isGenerating && (useTextMode ? pastedText.trim().length > 10 : extractedText.length > 10);

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-[#ededed] font-sans selection:bg-[#3ecf8e]/30 tracking-tight">

      {/* NAV */}
      <nav className="border-b border-[#2e2e2e] bg-[#1c1c1c]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[#3ecf8e]"><BrainCircuit size={24} /></div>
            <span className="text-lg font-bold tracking-tighter">LEYANI<span className="text-[#3ecf8e]">AI</span></span>
          </div>
          <p className="text-xs text-[#555] hidden md:block">Upload → Learn → Quiz</p>
        </div>
      </nav>


      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">

            {/* INPUT */}
            <section className="bg-[#232323] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
              <div className="flex border-b border-[#2e2e2e] bg-[#1c1c1c]">
                <button onClick={() => setUseTextMode(false)} className={`flex-1 py-3 text-xs font-bold transition-all ${!useTextMode ? 'bg-[#2e2e2e] text-[#3ecf8e]' : 'text-[#707070] hover:text-white'}`}>
                  Upload File
                </button>
                <button onClick={() => setUseTextMode(true)} className={`flex-1 py-3 text-xs font-bold transition-all ${useTextMode ? 'bg-[#2e2e2e] text-[#3ecf8e]' : 'text-[#707070] hover:text-white'}`}>
                  Paste Notes
                </button>
              </div>

              <div className="p-6">
                {!useTextMode ? (
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
                ) : (
                  <textarea
                    className="w-full h-48 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-4 text-sm text-[#ededed] outline-none focus:border-[#3ecf8e] resize-none"
                    placeholder="Paste your notes, lecture content, or study material here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                )}
              </div>
            </section>

            {/* SETTINGS */}
            <section className="bg-[#232323] border border-[#2e2e2e] rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-[#a0a0a0]">
                <Settings size={14} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Configuration</h3>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Type</label>
                  <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
                    value={settings.type} onChange={(e) => setSettings({ ...settings, type: e.target.value as QuizType })}>
                    <option>Mixed</option><option>MCQ</option><option>Identification</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Difficulty</label>
                  <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
                    value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as Difficulty })}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#555] uppercase block mb-1">Questions</label>
                  <select className="w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#3ecf8e]"
                    value={settings.count} onChange={(e) => setSettings({ ...settings, count: e.target.value })}>
                    <option value="5">5</option><option value="10">10</option><option value="15">15</option>
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
  className="w-full py-3 bg-[#3ecf8e] hover:bg-[#34b27b] text-black rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
  {isGenerating
    ? <><Loader2 className="animate-spin" size={16} /> Generating...</>
    : "Generate Study Kit"
  }
</button>
            </section>
          </div>

          {/* RIGHT — Module Overview Panel */}
          <div className="lg:col-span-7" ref={resultsRef}>
            {!showResults ? (
              <div className="h-full min-h-[500px] border border-[#2e2e2e] rounded-2xl flex flex-col items-center justify-center bg-[#1c1c1c] text-[#444] p-12 text-center">
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

                {/* MODULE OVERVIEW CARD */}
                <div className="bg-[#232323] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden">

                  {/* Header */}
                  <div className="p-6 pb-0">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-[#3ecf8e]/10 rounded-lg"><Layers size={20} className="text-[#3ecf8e]" /></div>
                      <h2 className="text-2xl font-bold tracking-tight">Module Overview</h2>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-[#2e2e2e]">
                      {([
                        { id: "overview", label: "Overview", icon: <FileText size={12} /> },
                        { id: "glossary", label: "Glossary", icon: <BookMarked size={12} /> },
                        { id: "cases", label: "Case Studies", icon: <FlaskConical size={12} /> },
                      ] as const).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px
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
                          <div className="bg-[#1c1c1c] p-5 rounded-xl border border-[#2e2e2e]">
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

                    {/* GLOSSARY TAB */}
                    {activeTab === "glossary" && (
                      <div>
                        <p className="text-xs text-[#555] mb-4">Key terms and definitions from the material.</p>
                        {(!quizData?.glossary || quizData.glossary.length === 0) ? (
                          <div className="text-center py-10 text-[#444]">
                            <BookMarked size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No glossary generated yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {quizData.glossary.map((item, i) => (
                              <div key={i} className="p-4 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl hover:border-[#3ecf8e]/30 transition-all">
                                <p className="text-sm font-black text-[#3ecf8e] mb-1">{item.term}</p>
                                <p className="text-xs text-[#a0a0a0] leading-relaxed">{item.definition}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE STUDIES TAB */}
                    {activeTab === "cases" && (
                      <div>
                        <p className="text-xs text-[#555] mb-4">Real-world scenarios to deepen your understanding.</p>
                        {(!quizData?.case_studies || quizData.case_studies.length === 0) ? (
                          <div className="text-center py-10 text-[#444]">
                            <FlaskConical size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No case studies generated yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {quizData.case_studies.map((cs, i) => (
                              <div key={i} className="p-5 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl hover:border-[#3ecf8e]/30 transition-all">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="p-1.5 bg-[#3ecf8e]/10 rounded-lg shrink-0">
                                    <FlaskConical size={14} className="text-[#3ecf8e]" />
                                  </div>
                                  <p className="text-sm font-black text-[#ededed]">{cs.title}</p>
                                </div>
                                <p className="text-xs text-[#a0a0a0] leading-relaxed mb-3">{cs.scenario}</p>
                                <div className="p-3 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-lg">
                                  <p className="text-[10px] font-black text-[#3ecf8e] uppercase tracking-widest mb-1">Key Takeaway</p>
                                  <p className="text-xs text-[#b0b0b0] leading-relaxed">{cs.lesson}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CHAT */}
                  <div className="border-t border-[#2e2e2e] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare size={14} className="text-[#3ecf8e]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-[#707070]">Deep Dive Chat</span>
                    </div>
                    <div className="bg-[#1c1c1c] rounded-xl h-48 overflow-y-auto p-4 mb-3 space-y-3 text-xs border border-[#2e2e2e]">
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
                      <button type="submit" disabled={isChatting}
                        className="p-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#34b27b] transition-colors disabled:opacity-50">
                        <Send size={14} />
                      </button>
                    </form>
                  </div>

                  {/* GO TO QUIZ CTA */}
                  <div className="px-6 pb-8 flex justify-center">
                    <button onClick={handleGoToQuiz}
  className="px-5 py-2.5 bg-[#3ecf8e] text-black font-bold rounded-xl text-sm hover:bg-[#34b27b] transition-all flex items-center gap-2 shadow-lg shadow-[#3ecf8e]/20">
  Take the Quiz <ChevronRight size={14} />
</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      
    </div>
  );
}