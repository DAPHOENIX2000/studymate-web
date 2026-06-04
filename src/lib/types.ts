export interface SlideBlock {
  kind: "title" | "subheading" | "body" | "bullet" | "numbered" | "quote";
  text: string;
  level?: number;
}

export interface SlideImage {
  src: string; // data:image/... or URL
  alt?: string;
}

export interface Slide {
  index: number;
  title: string;
  /** Legacy single-string body (kept for backwards compat) */
  body?: string;
  /** New structured blocks — preferred over body */
  blocks?: SlideBlock[];
  images?: SlideImage[];
  notes: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Subject {
  id: string;
  name: string;
  slideCount: number;
  mastery: number; // 0..1
  accentColor: string;
  createdAt: string;
  lastStudied?: string;
  favorite?: boolean;
  slides: Slide[];
  /** Auto-detected keywords from content */
  keywords?: string[];
  /** Pre-extracted glossary for hover-to-explain */
  glossary?: GlossaryTerm[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  slideIndex?: number;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "tf";
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  slideIndex: number;
}

export interface QuizAttempt {
  questionId: string;
  correct: boolean;
  answeredAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  slideIndex: number;
  /** SM-2 fields */
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewed?: string;
}

export interface StudySession {
  date: string; // YYYY-MM-DD
  minutes: number;
}
