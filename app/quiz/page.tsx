"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy, RotateCcw, CheckCircle2, XCircle, Check,
  ArrowLeft, BrainCircuit, Loader2, AlertCircle,
  PartyPopper, ThumbsUp, BookOpen, Dumbbell
} from "lucide-react";
import { loadQuizData, loadQuizState, saveQuizState, clearQuizState, QuizData } from "@/lib/quiz-store";

export default function QuizPage() {
  const router = useRouter();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [fillInputs, setFillInputs] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const questionsRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const data = loadQuizData();
    if (data) {
      setQuizData(data);
    }
    
    // Load saved quiz state if available
    const savedState = loadQuizState();
    if (savedState) {
      setUserAnswers(savedState.userAnswers);
      setFillInputs(savedState.fillInputs);
      setIsSubmitted(savedState.isSubmitted);
      setScore(savedState.score);
    }
    
    setIsLoading(false);
  }, []);

  // Save quiz state whenever it changes
  useEffect(() => {
    if (quizData) {
      saveQuizState({
        userAnswers,
        fillInputs,
        isSubmitted,
        score,
      });
    }
  }, [userAnswers, fillInputs, isSubmitted, score, quizData]);

  const handleSelectAnswer = (qi: number, opt: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qi]: opt }));
  };

  const findFirstUnansweredQuestion = () => {
    for (let i = 0; i < (quizData?.questions.length || 0); i++) {
      const q = quizData?.questions[i];
      const uAns = q?.type === "Identification" ? (fillInputs[i] || "") : (userAnswers[i] || "");
      if (!uAns || uAns.trim().length === 0) return i;
    }
    return -1;
  };

  const handleFinalSubmit = () => {
    const firstUnanswered = findFirstUnansweredQuestion();
    if (firstUnanswered !== -1) {
      setError("Please answer all questions before submitting!");
      setTimeout(() => {
        questionsRefs.current[firstUnanswered]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setError(""), 3000);
      return;
    }

    let finalScore = 0;
    quizData?.questions.forEach((q, i) => {
      const uAns = q.type === "Identification" ? (fillInputs[i] || "") : (userAnswers[i] || "");
      if (uAns.toLowerCase().trim() === q.answer.toLowerCase().trim()) finalScore++;
    });
    setScore(finalScore);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setUserAnswers({});
    setFillInputs({});
    setScore(0);
    setIsSubmitted(false);
    clearQuizState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalQuestions = quizData?.questions.length || 0;
  const answeredCount = Object.keys(userAnswers).length + Object.keys(fillInputs).filter(k => fillInputs[parseInt(k)]?.trim()).length;
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#3ecf8e]" />
      </div>
    );
  }

  if (!quizData || !quizData.questions?.length) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] text-[#ededed] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={48} className="text-[#555] mb-4" />
        <h2 className="text-xl font-bold mb-2">No Quiz Data Found</h2>
        <p className="text-[#555] mb-6">Please go back and generate a study kit first.</p>
        <button onClick={() => router.push("/")}
          className="flex items-center gap-2 px-6 py-3 bg-[#3ecf8e] text-black font-bold rounded-full hover:bg-[#34b27b] transition-all">
          <ArrowLeft size={16} /> Back to Study Kit
        </button>
      </div>
    );
  }

  const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const ScoreMessage = () => {
    if (pct === 100) return <span className="flex items-center gap-1 text-xs text-[#555] mt-1"><PartyPopper size={12} /> Perfect score! Incredible!</span>;
    if (pct >= 80) return <span className="flex items-center gap-1 text-xs text-[#555] mt-1"><ThumbsUp size={12} /> Great job! You know this well.</span>;
    if (pct >= 60) return <span className="flex items-center gap-1 text-xs text-[#555] mt-1"><BookOpen size={12} /> Good effort! Review the missed ones.</span>;
    return <span className="flex items-center gap-1 text-xs text-[#555] mt-1"><Dumbbell size={12} /> Keep studying! You'll get there.</span>;
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-[#ededed] font-sans tracking-tight">

      {/* NAV */}
      <nav className="border-b border-[#2e2e2e] bg-[#1c1c1c]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[#3ecf8e]"><BrainCircuit size={24} /></div>
            <span className="text-lg font-bold tracking-tighter">LEYANI<span className="text-[#3ecf8e]">AI</span></span>
          </div>

          {/* Progress pill - Center */}
          {!isSubmitted && (
            <div className="flex items-center gap-3 text-xs text-[#555]">
              <span className="font-bold">{answeredCount}/{totalQuestions} answered</span>
              <div className="w-24 h-1.5 bg-[#2e2e2e] rounded-full overflow-hidden">
                <div className="h-full bg-[#3ecf8e] rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Right side - Home Button */}
          <button onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 bg-[#2e2e2e] hover:bg-[#3e3e3e] text-[#ededed] rounded-lg text-xs font-bold transition-all border border-[#3e3e3e]">
            <ArrowLeft size={14} /> Home
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 pb-24">

        {/* SCORE BANNER */}
        {isSubmitted && (
          <div className="mb-8 flex items-center justify-between bg-[#232323] border border-[#3ecf8e]/30 p-6 rounded-2xl shadow-lg animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#3ecf8e]/10 rounded-xl">
                <Trophy size={28} className="text-[#3ecf8e]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#3ecf8e] mb-1 tracking-widest">Final Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{score}</span>
                  <span className="text-2xl text-[#555] font-bold mb-1">/ {totalQuestions}</span>
                  <span className="text-lg font-bold text-[#3ecf8e] mb-1 ml-1">({pct}%)</span>
                </div>
                <ScoreMessage />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-[#2e2e2e] hover:bg-[#3e3e3e] rounded-lg text-xs font-bold border border-[#3e3e3e] transition-all">
                <RotateCcw size={14} /> Retake
              </button>
              <button onClick={() => router.push("/")}
                className="flex items-center gap-2 px-4 py-2 bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 rounded-lg text-xs font-bold border border-[#3ecf8e]/30 text-[#3ecf8e] transition-all">
                <ArrowLeft size={14} /> Study More
              </button>
            </div>
          </div>
        )}

        {/* QUIZ HEADER */}
        {!isSubmitted && (
          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1">Quiz Time</h1>
            <p className="text-sm text-[#555]">{totalQuestions} questions — answer all before submitting</p>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/40 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-300">{error}</p>
          </div>
        )}

        {/* QUESTIONS */}
        <div className="space-y-5">
          {quizData.questions.map((q, i) => {
            const uAns = q.type === "Identification" ? (fillInputs[i] || "") : (userAnswers[i] || "");
            const isCorrect = uAns.toLowerCase().trim() === q.answer.toLowerCase().trim();

            return (
              <div ref={(el) => { questionsRefs.current[i] = el; }} key={i} className={`bg-[#232323] border rounded-2xl p-6 transition-all duration-300
                ${isSubmitted
                  ? isCorrect
                    ? 'border-[#3ecf8e]/50 shadow-[0_0_20px_-8px_#3ecf8e50]'
                    : 'border-red-400/40'
                  : 'border-[#2e2e2e] hover:border-[#3e3e3e]'
                }`}>

                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-[#1c1c1c] border border-[#2e2e2e] text-[#3ecf8e] rounded-md uppercase tracking-widest">{q.type}</span>
                    <span className="text-[10px] text-[#555] font-bold">Q{i + 1} of {totalQuestions}</span>
                  </div>
                  {isSubmitted && (
                    isCorrect
                      ? <div className="flex items-center gap-1 text-[#3ecf8e] text-xs font-bold"><CheckCircle2 size={16} /> Correct</div>
                      : <div className="flex items-center gap-1 text-red-400 text-xs font-bold"><XCircle size={16} /> Incorrect</div>
                  )}
                </div>

                {/* Question Text */}
                <h4 className="text-base font-bold mb-5 text-[#ededed] leading-relaxed">{q.question}</h4>

                {/* MCQ Options */}
                {q.type === "MCQ" && (
                  <div className="grid gap-2.5 mb-4">
                    {q.options?.map((opt, idx) => {
                      let cls = "w-full p-4 border rounded-xl text-left text-sm transition-all ";
                      if (!isSubmitted) {
                        cls += userAnswers[i] === opt
                          ? 'bg-[#3ecf8e]/10 border-[#3ecf8e] text-[#3ecf8e] font-bold'
                          : 'bg-[#1c1c1c] border-[#2e2e2e] hover:border-[#3ecf8e]/40 cursor-pointer';
                      } else {
                        if (opt === q.answer) cls += 'border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e] font-bold';
                        else if (userAnswers[i] === opt) cls += 'border-red-400 bg-red-400/10 text-red-300';
                        else cls += 'bg-[#1c1c1c] border-[#2e2e2e] opacity-40';
                      }

                      return (
                        <button key={idx} disabled={isSubmitted} onClick={() => handleSelectAnswer(i, opt)} className={cls}>
                          <span className="text-[#555] font-black mr-3">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Identification Input */}
                {q.type === "Identification" && (
                  <input type="text" disabled={isSubmitted}
                    value={fillInputs[i] || ""}
                    onChange={(e) => setFillInputs({ ...fillInputs, [i]: e.target.value })}
                    placeholder="Type your answer here..."
                    className={`w-full bg-[#1c1c1c] border rounded-xl px-4 py-4 text-sm outline-none transition-all mb-4
                      ${isSubmitted
                        ? isCorrect ? 'border-[#3ecf8e]/50 text-[#3ecf8e]' : 'border-red-400/50 text-red-300'
                        : 'focus:border-[#3ecf8e] border-[#2e2e2e]'}`}
                  />
                )}

                {/* Explanation (after submit) */}
                {isSubmitted && (
                  <div className="mt-3 p-4 bg-[#1c1c1c] rounded-xl border border-[#2e2e2e] animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Check size={13} className="text-[#3ecf8e]" />
                      <p className="text-sm font-bold text-[#3ecf8e]">Answer: {q.answer}</p>
                    </div>
                    <p className="text-xs text-[#707070] leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </main>

      {/* STICKY SUBMIT BUTTON */}
      {!isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1c1c1c] to-transparent pointer-events-none">
          <div className="max-w-7xl mx-auto px-6 pointer-events-auto flex justify-end">
            <button onClick={handleFinalSubmit}
              disabled={answeredCount < totalQuestions}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-95 shadow-lg ${
                answeredCount < totalQuestions
                  ? 'bg-[#2e2e2e] text-[#555] cursor-not-allowed opacity-50'
                  : 'bg-[#3ecf8e] hover:bg-[#34b27b] text-black'
              }`}>
              <Check size={15} /> Submit ({answeredCount}/{totalQuestions})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}