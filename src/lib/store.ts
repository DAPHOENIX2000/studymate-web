"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Subject, ChatMessage, QuizQuestion, Flashcard, StudySession } from "./types";
import {
  MOCK_SUBJECTS,
  MOCK_CHAT,
  MOCK_QUESTIONS,
  MOCK_FLASHCARDS,
  MOCK_STUDY_SESSIONS,
} from "./mock-data";

export type ViewName = "library" | "study" | "quiz" | "flashcards" | "progress" | "settings";

export type AIProvider = "ollama" | "gemini" | "claude";

export interface AppSettings {
  aiProvider: AIProvider;
  ollamaModel: string;
  geminiKey: string;
  claudeKey: string;
  voiceEnabled: boolean;
  voiceProvider: "browser" | "elevenlabs";
  elevenLabsKey: string;
  voiceRate: number;
}

interface AppState {
  subjects: Subject[];
  currentSubjectId: string | null;
  currentView: ViewName;
  sidebarCollapsed: boolean;

  chatBySubject: Record<string, ChatMessage[]>;
  questionsBySubject: Record<string, QuizQuestion[]>;
  flashcardsBySubject: Record<string, Flashcard[]>;
  /** Track which question IDs the user already answered in this session — never repeat */
  answeredInSession: Set<string>;

  studySessions: StudySession[];
  quizSessionCorrect: number;
  quizSessionTotal: number;

  settings: AppSettings;

  // Actions
  setView: (v: ViewName) => void;
  openSubject: (id: string) => void;
  closeSubject: () => void;
  toggleSidebar: () => void;
  addSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addChatMessage: (subjectId: string, m: ChatMessage) => void;
  addQuestions: (subjectId: string, qs: QuizQuestion[]) => void;
  addFlashcards: (subjectId: string, cards: Flashcard[]) => void;
  markAnswered: (questionId: string) => void;
  recordQuizAnswer: (correct: boolean) => void;
  resetQuizSession: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Default to Gemini since the hosted site can't reach the user's local Ollama.
  // If users prefer local Ollama, they switch in Settings (works in self-hosted dev only).
  aiProvider: "gemini",
  ollamaModel: "llama3.2:3b",
  geminiKey: "",
  claudeKey: "",
  voiceEnabled: true,
  voiceProvider: "browser",
  elevenLabsKey: "",
  voiceRate: 1.0,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      subjects: MOCK_SUBJECTS,
      currentSubjectId: null,
      currentView: "library",
      sidebarCollapsed: false,

      chatBySubject: MOCK_CHAT,
      questionsBySubject: { "bio-101": MOCK_QUESTIONS },
      flashcardsBySubject: { "bio-101": MOCK_FLASHCARDS },
      answeredInSession: new Set(),

      studySessions: MOCK_STUDY_SESSIONS,
      quizSessionCorrect: 0,
      quizSessionTotal: 0,

      settings: DEFAULT_SETTINGS,

      setView: (v) => set({ currentView: v }),
      openSubject: (id) => set({ currentSubjectId: id, currentView: "study" }),
      closeSubject: () => set({ currentSubjectId: null, currentView: "library" }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      addSubject: (s) => set((state) => ({ subjects: [s, ...state.subjects] })),
      deleteSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          currentSubjectId: state.currentSubjectId === id ? null : state.currentSubjectId,
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id ? { ...s, favorite: !s.favorite } : s,
          ),
        })),

      addChatMessage: (subjectId, m) =>
        set((state) => ({
          chatBySubject: {
            ...state.chatBySubject,
            [subjectId]: [...(state.chatBySubject[subjectId] || []), m],
          },
        })),

      addQuestions: (subjectId, qs) =>
        set((state) => ({
          questionsBySubject: {
            ...state.questionsBySubject,
            [subjectId]: [...(state.questionsBySubject[subjectId] || []), ...qs],
          },
        })),

      addFlashcards: (subjectId, cards) =>
        set((state) => ({
          flashcardsBySubject: {
            ...state.flashcardsBySubject,
            [subjectId]: [...(state.flashcardsBySubject[subjectId] || []), ...cards],
          },
        })),

      markAnswered: (questionId) =>
        set((state) => {
          const next = new Set(state.answeredInSession);
          next.add(questionId);
          return { answeredInSession: next };
        }),

      recordQuizAnswer: (correct) =>
        set((s) => ({
          quizSessionCorrect: s.quizSessionCorrect + (correct ? 1 : 0),
          quizSessionTotal: s.quizSessionTotal + 1,
        })),
      resetQuizSession: () => set({ quizSessionCorrect: 0, quizSessionTotal: 0, answeredInSession: new Set() }),

      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    {
      name: "studymate-app",
      storage: createJSONStorage(() => {
        // Wrap localStorage to gracefully recover from quota errors that
        // can happen if a previous version saved bloated data.
        const safe: Storage = {
          getItem: (key) => {
            try { return localStorage.getItem(key); } catch { return null; }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value);
            } catch (e) {
              // Quota exceeded → clear our slot and retry once. If still fails,
              // we just lose persistence this session — better than crashing.
              try {
                localStorage.removeItem(key);
                localStorage.setItem(key, value);
              } catch {
                console.warn("Could not persist app state — localStorage quota exceeded.");
              }
            }
          },
          removeItem: (key) => {
            try { localStorage.removeItem(key); } catch {}
          },
          clear: () => {
            try { localStorage.clear(); } catch {}
          },
          key: (i) => {
            try { return localStorage.key(i); } catch { return null; }
          },
          get length() {
            try { return localStorage.length; } catch { return 0; }
          },
        };
        return safe;
      }),
      // CRITICAL: only persist lightweight metadata, NOT slide content/images.
      // Slide images are base64 strings that can easily exceed localStorage's
      // 5-10 MB quota. Persist subject metadata (name, mastery, settings)
      // but drop slides/blocks/images — user re-uploads on refresh.
      partialize: (state) =>
        ({
          settings: state.settings,
          subjects: state.subjects
            .filter((s) => !s.id.startsWith("bio-101")) // keep mocks out
            .map((s) => ({
              // Lightweight metadata only
              id: s.id,
              name: s.name,
              slideCount: s.slideCount,
              mastery: s.mastery,
              accentColor: s.accentColor,
              createdAt: s.createdAt,
              lastStudied: s.lastStudied,
              favorite: s.favorite,
              keywords: s.keywords,
              // Slides intentionally omitted — too heavy for localStorage.
              slides: [],
            })),
          sidebarCollapsed: state.sidebarCollapsed,
          // Don't persist chat/quiz/flashcards — they reference slides we don't keep
        }) as any,
    },
  ),
);
