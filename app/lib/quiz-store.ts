// lib/quiz-store.ts
// Shared utility to store/retrieve quiz data between pages using sessionStorage

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface CaseStudy {
  title: string;
  scenario: string;
  lesson: string;
}

export interface Question {
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  type: string;
}

export interface QuizData {
  summary: string;
  objectives: string[];
  key_concepts: string[];
  glossary: GlossaryItem[];
  case_studies: CaseStudy[];
  questions: Question[];
}

export const QUIZ_STORE_KEY = "studygen_quiz_data";

export function saveQuizData(data: QuizData): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(QUIZ_STORE_KEY, JSON.stringify(data));
  }
}

export function loadQuizData(): QuizData | null {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(QUIZ_STORE_KEY);
      if (raw) return JSON.parse(raw) as QuizData;
    } catch {
      return null;
    }
  }
  return null;
}