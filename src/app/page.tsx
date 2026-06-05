"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Splash } from "@/components/Splash";
import { LibraryView } from "@/components/LibraryView";
import { StudyView } from "@/components/StudyView";
import { QuizView } from "@/components/QuizView";
import { FlashcardsView } from "@/components/FlashcardsView";
import { NotesView } from "@/components/NotesView";
import { ProgressView } from "@/components/ProgressView";
import { SettingsView } from "@/components/SettingsView";
import { AboutModal } from "@/components/AboutModal";
import { useApp } from "@/lib/store";

export default function Home() {
  const view = useApp((s) => s.currentView);
  const currentSubjectId = useApp((s) => s.currentSubjectId);
  const [splashVisible, setSplashVisible] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Settings is always available, all other subject-scoped views need a subject
  const effectiveView =
    view === "settings"
      ? "settings"
      : !currentSubjectId && view !== "library"
        ? "library"
        : view;

  // views that require a subject
  const subjectViews = ["study", "quiz", "flashcards", "notes", "progress"];

  return (
    <main className="h-screen flex overflow-hidden aurora-bg">
      <Splash visible={splashVisible} onEnter={() => setSplashVisible(false)} />

      <Sidebar onAboutClick={() => setAboutOpen(true)} />

      <AnimatePresence mode="wait">
        <motion.div
          key={effectiveView + "-" + currentSubjectId}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
        >
          {effectiveView === "library" && <LibraryView />}
          {effectiveView === "study" && <StudyView />}
          {effectiveView === "quiz" && <QuizView />}
          {effectiveView === "flashcards" && <FlashcardsView />}
          {effectiveView === "notes" && <NotesView />}
          {effectiveView === "progress" && <ProgressView />}
          {effectiveView === "settings" && <SettingsView />}
        </motion.div>
      </AnimatePresence>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
