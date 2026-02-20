"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveQuizData, loadQuizData, QuizData } from "@/lib/quiz-store";
import { Settings, ChatMessage } from "@/app/lib/types";
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
  const [useTextMode, setUseTextMode] = useState(false);
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
    // Show modals only once per session
    const hasSeenModals = sessionStorage.getItem("hasSeenLeyaniModals");
    if (!hasSeenModals) {
      setShowPrivacyModal(true);
      sessionStorage.setItem("hasSeenLeyaniModals", "true");
    }
    // Load previously generated quiz data if available
    const savedQuizData = loadQuizData();
    if (savedQuizData) {
      setQuizData(savedQuizData);
      setShowResults(true);
    }
  }, []);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setExtractedText("");
    setError("");

    const ext = uploadedFile.name.split(".").pop()?.toLowerCase();

    // For text files, read directly
    if (ext === "txt") {
      const text = await uploadedFile.text();
      setExtractedText(text);
      return;
    }

    setIsExtracting(true);
    try {
      const MAX_DIRECT_SIZE = 3.5 * 1024 * 1024; // 3.5MB safe limit for Vercel

      if (uploadedFile.size <= MAX_DIRECT_SIZE) {
        // Small file: send directly to API route (fast, no Supabase needed)
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("fileName", uploadedFile.name);

        const res = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (res.status === 413) {
          // Hit Vercel limit unexpectedly — fall through to Supabase path
          throw new Error("FALLBACK_TO_SUPABASE");
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }

        const data = await res.json().catch(() => {
          throw new Error("Invalid response from server");
        });

        if (data.error) throw new Error(data.error);
        setExtractedText(data.text);
      } else {
        throw new Error("FALLBACK_TO_SUPABASE");
      }
    } catch (err: any) {
      if (err.message === "FALLBACK_TO_SUPABASE") {
        // Large file or 413: upload to Supabase, then extract server-side
        try {
          const storagePath = `${Date.now()}-${uploadedFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from("LeyaAI")
            .upload(storagePath, uploadedFile, {
              contentType: uploadedFile.type || "application/octet-stream",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const res = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storagePath, fileName: uploadedFile.name }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
            throw new Error(errorData.error || `Server error: ${res.status}`);
          }

          const data = await res.json().catch(() => {
            throw new Error("Invalid response from server");
          });

          if (data.error) throw new Error(data.error);
          setExtractedText(data.text);
        } catch (supaErr: any) {
          setError(`Could not read file: ${supaErr.message}`);
        }
      } else {
        setError(`Could not read file: ${err.message}`);
      }
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
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 lg:py-16">
        <HeroSection />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">
            <InputSection
              useTextMode={useTextMode}
              setUseTextMode={setUseTextMode}
              file={file}
              pastedText={pastedText}
              setPastedText={setPastedText}
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
              useTextMode={useTextMode}
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