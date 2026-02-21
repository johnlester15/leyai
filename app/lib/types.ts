import { QuizData } from "@/lib/quiz-store";

export type QuizType = "Mixed" | "MCQ" | "Identification";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Settings {
  type: QuizType;
  difficulty: Difficulty;
  count: string;
}

export type InputMode = "file" | "text";

export interface InputSectionProps {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  file: File | null;
  pastedText: string;
  setPastedText: (text: string) => void;
  extractedText: string;
  isExtracting: boolean;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  handleFileUpload: (file: File) => Promise<void>;
}

export interface SettingsProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  error: string;
  isGenerating: boolean;
  isExtracting: boolean;
  extractedText: string;
  pastedText: string;
  inputMode: InputMode;
  handleGenerate: () => Promise<void>;
}

export interface ModuleOverviewProps {
  quizData: QuizData | null;
  chatInput: string;
  setChatInput: (text: string) => void;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  handleChat: (e: React.FormEvent) => Promise<void>;
  handleGoToQuiz: () => void;
}

export interface PrivacyModalProps {
  show: boolean;
  onNext: () => void;
}

export interface FeaturesModalProps {
  show: boolean;
  onClose: () => void;
}
