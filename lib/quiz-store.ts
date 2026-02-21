// lib/quiz-store.ts
// Shared utility to store/retrieve quiz data and quiz state between pages using sessionStorage

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

export interface QuizState {
  userAnswers: Record<number, string>;
  fillInputs: Record<number, string>;
  isSubmitted: boolean;
  score: number;
}

export const QUIZ_STORE_KEY = "studygen_quiz_data";
export const QUIZ_STATE_KEY = "studygen_quiz_state";
export const QUIZ_CONTENT_KEY = "studygen_quiz_content";
export const QUIZ_SETTINGS_KEY = "studygen_quiz_settings";

// Quiz Data Management
export function saveQuizData(data: QuizData): void {
  if (typeof window !== "undefined") {
    // Clear any previous quiz state (answers/score) when saving new quiz data
    sessionStorage.removeItem(QUIZ_STATE_KEY);
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

// Quiz State Management (for preserving quiz progress)
export function saveQuizState(state: QuizState): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
  }
}

export function loadQuizState(): QuizState | null {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(QUIZ_STATE_KEY);
      if (raw) return JSON.parse(raw) as QuizState;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearQuizState(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(QUIZ_STATE_KEY);
  }
}

export function saveQuizContent(content: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(QUIZ_CONTENT_KEY, content);
  }
}

export function loadQuizContent(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(QUIZ_CONTENT_KEY);
  }
  return null;
}

export function saveQuizSettings(settings: Record<string, string>): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(QUIZ_SETTINGS_KEY, JSON.stringify(settings));
  }
}

export function loadQuizSettings(): Record<string, string> | null {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(QUIZ_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { return null; }
  }
  return null;
}

export function clearAllQuizData(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(QUIZ_STORE_KEY);
    sessionStorage.removeItem(QUIZ_STATE_KEY);
    sessionStorage.removeItem(QUIZ_CONTENT_KEY);
    sessionStorage.removeItem(QUIZ_SETTINGS_KEY);
  }
}
