"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveQuizData, loadQuizData, clearAllQuizData, saveQuizContent, saveQuizSettings, QuizData } from "@/lib/quiz-store";
import { Settings, ChatMessage, InputMode } from "@/app/lib/types";
import { supabase } from "@/lib/supabase-client";
import Navbar from "@/app/components/Navbar";
import HeroSection from "@/app/components/HeroSection";
import InputSection from "@/app/components/InputSection";
import SettingsSection from "@/app/components/Settings";
import ResultsPanel from "@/app/components/ResultsPanel";
import FAQSection from "@/app/components/FAQSection";
import PrivacyModal from "@/app/components/PrivacyModal";
import FeaturesModal from "@/app/components/FeaturesModal";

export default function StudyGenAI() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Settings>({
    type: "Mixed",
    difficulty: "Medium",
    count: "10",
  });
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable browser's automatic scroll restoration so page always starts at top
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    // Show modals only once per session
    const hasSeenModals = sessionStorage.getItem("hasSeenLeyaniModals");
    if (!hasSeenModals) {
      setShowPrivacyModal(true);
      sessionStorage.setItem("hasSeenLeyaniModals", "true");
    }

    // Restore file info, extracted text, and pasted text from session
    const savedFileName = sessionStorage.getItem("studygen_file_name");
    if (savedFileName) {
      // Create a lightweight placeholder File so the UI shows the name
      setFile(new File([], savedFileName));
    }
    const savedExtracted = sessionStorage.getItem("studygen_extracted_text");
    if (savedExtracted) setExtractedText(savedExtracted);
    const savedPasted = sessionStorage.getItem("studygen_pasted_text");
    if (savedPasted) {
      setPastedText(savedPasted);
      setInputMode("text");
    }
    // Load previously generated quiz data if available
    const savedQuizData = loadQuizData();
    if (savedQuizData) {
      setQuizData(savedQuizData);
      setShowResults(true);
    }

    // Force scroll to top after all state restoration and re-renders
    // Multiple calls at different timings to beat browser scroll restoration
    requestAnimationFrame(() => window.scrollTo(0, 0));
    setTimeout(() => window.scrollTo(0, 0), 0);
    setTimeout(() => window.scrollTo(0, 0), 50);
    setTimeout(() => window.scrollTo(0, 0), 150);
  }, []);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setExtractedText("");
    setError("");
    // Clear old quiz data so stale results never show
    clearAllQuizData();
    // Clear previous file session data (will be replaced after extraction)
    sessionStorage.removeItem("studygen_extracted_text");
    sessionStorage.removeItem("studygen_pasted_text");
    sessionStorage.setItem("studygen_file_name", uploadedFile.name);
    setQuizData(null);
    setShowResults(false);
    setChatMessages([]);

    const ext = uploadedFile.name.split(".").pop()?.toLowerCase();

    // For text files, read directly
    if (ext === "txt") {
      const text = await uploadedFile.text();
      setExtractedText(text);
      sessionStorage.setItem("studygen_extracted_text", text);
      sessionStorage.setItem("studygen_file_name", uploadedFile.name);
      return;
    }

    setIsExtracting(true);
    try {
      // Sanitize file name for storage path (remove special chars, spaces → underscores)
      const safeName = uploadedFile.name
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${Date.now()}-${safeName}`;

      // Always upload to Supabase Storage first (avoids server body size limits / 413 errors)
      const { error: uploadError } = await supabase.storage
        .from("LeyaAI")
        .upload(storagePath, uploadedFile, {
          contentType: uploadedFile.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Send only the storage path to the extract API (tiny JSON body)
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, fileName: uploadedFile.name }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data?.text) {
        setExtractedText(data.text);
        sessionStorage.setItem("studygen_extracted_text", data.text);
        sessionStorage.setItem("studygen_file_name", uploadedFile.name);
      } else {
        throw new Error("Failed to extract text from file");
      }
    } catch (err: any) {
      setError(`Could not read file: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    const content = inputMode === "text" ? pastedText : extractedText;
    if (!content || content.trim().length < 10) {
      setError("Please upload a file or paste your notes first!");
      return;
    }

    setIsGenerating(true);
    setError("");
    setQuizData(null);
    setShowResults(false);
    setChatMessages([]);
    clearAllQuizData();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, settings }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server error: ${response.status}. Try again with fewer questions.`);
      }
      if (!response.ok || data.error) throw new Error(data.error || "Generation failed");

      setQuizData(data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoToQuiz = () => {
    if (!quizData) return;
    const content = inputMode === "text" ? pastedText : extractedText;
    saveQuizData(quizData);
    saveQuizContent(content);
    saveQuizSettings(settings as unknown as Record<string, string>);
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

  const canGenerate = !isExtracting && !isGenerating && (
    inputMode === "text" ? pastedText.trim().length > 10 : extractedText.length > 10
  );

  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    if (text.trim()) {
      sessionStorage.setItem("studygen_pasted_text", text);
    } else {
      sessionStorage.removeItem("studygen_pasted_text");
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-[#ededed] font-sans selection:bg-[#3ecf8e]/30 tracking-tight">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 lg:py-16">
        <HeroSection topic={quizData ? (file?.name?.replace(/\.[^.]+$/, "") || quizData.key_concepts?.[0] || undefined) : undefined} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">
            <InputSection
              inputMode={inputMode}
              setInputMode={setInputMode}
              file={file}
              pastedText={pastedText}
              setPastedText={handlePastedTextChange}
              extractedText={extractedText}
              isExtracting={isExtracting}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              handleFileUpload={handleFileUpload}
            />

            <SettingsSection
              settings={settings}
              setSettings={setSettings}
              error={error}
              isGenerating={isGenerating}
              isExtracting={isExtracting}
              extractedText={extractedText}
              pastedText={pastedText}
              inputMode={inputMode}
              handleGenerate={handleGenerate}
            />
          </div>

          <ResultsPanel
            showResults={showResults}
            quizData={quizData}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            isChatting={isChatting}
            handleChat={handleChat}
            handleGoToQuiz={handleGoToQuiz}
            resultsRef={resultsRef}
          />
        </div>

        <FAQSection />
      </main>

      <PrivacyModal 
        show={showPrivacyModal} 
        onNext={() => {
          setShowPrivacyModal(false);
          setTimeout(() => setShowFeaturesModal(true), 200);
        }} 
      />

      <FeaturesModal 
        show={showFeaturesModal} 
        onClose={() => setShowFeaturesModal(false)} 
      />
    </div>
  );
}