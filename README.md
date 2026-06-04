# StudyMate AI — Web

The cinematic redesign of StudyMate, built as a Next.js web app.
Crafted by Yassine Achouak.

![StudyMate](public/preview.png)

## What's in this version

- 🎨 **New visual identity**: deep navy + electric teal + warm rose accents, Satoshi display font, animated aurora background
- 👀 **Dusty mascot** is now alive — his pupils follow your cursor, he blinks, he reacts to right/wrong answers
- ⚡ **Framer Motion** animations everywhere — page transitions, sliding active indicator in the sidebar, card hover lifts, flashcard 3D flip
- 🌓 **Light/dark mode** toggle with persistence
- 🔍 **Search + filter** across your subjects
- 📂 **Drag & drop** PowerPoint upload (real parsing — extracts titles, body text, speaker notes)
- 📝 **Real Ollama streaming chat** — talks to your local Ollama, streams responses token-by-token
- 🎯 **Gamified quizzes** — XP bar, level progression, streak counter, confetti on correct
- 🃏 **3D flashcard flip** with SM-2 spaced repetition rating
- 📊 **Progress dashboard** — animated mastery hero, study heatmap (12 weeks), mastery radar chart, achievement badges
- ⌨️ **Keyboard shortcuts**: ← → to navigate slides, F for fullscreen, Esc to exit
- 📱 **Responsive design** — works on laptops, big screens, and tablets

## How to run it (Windows)

### 1. Install Node.js

If you don't have it: download from https://nodejs.org/ (LTS version, currently 20.x or 22.x).
Confirm it works in a terminal:

```
node --version
npm --version
```

### 2. Install Ollama

Download from https://ollama.com/download — this is the local AI engine.

After installing, open a terminal and run:

```
ollama pull llama3.2:3b
```

This downloads the AI model (~2 GB, one-time).

Ollama runs automatically in the background after install. Look for its icon in the system tray.

### 3. Run the app

In the `studymate-web` folder, open a terminal and run:

```
npm install
npm run dev
```

The app will be available at **http://localhost:3000**.

Open that URL in your browser (Chrome, Edge, Firefox — any modern one).

### 4. Production build (optional)

To run the app like it would in production:

```
npm run build
npm start
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx           ← Theme provider, fonts
│   ├── page.tsx             ← Main page: splash + sidebar + view switcher
│   ├── globals.css          ← Tailwind + custom utilities (glass, aurora, grain)
│   └── api/
│       ├── parse-pptx/      ← .pptx → slides JSON (pure JS, no Python)
│       └── chat/            ← Streaming proxy to local Ollama
├── components/
│   ├── Dusty.tsx            ← The mascot — SVG with live pupils, variants
│   ├── Splash.tsx           ← Boot screen
│   ├── Sidebar.tsx          ← Collapsible nav with animated active pill
│   ├── LibraryView.tsx      ← Subject grid, search, drag-drop upload
│   ├── StudyView.tsx        ← Slide viewer + Dusty chat panel
│   ├── QuizView.tsx         ← Gamified quiz with confetti
│   ├── FlashcardsView.tsx   ← 3D flip cards, SM-2 quality buttons
│   ├── ProgressView.tsx     ← Mastery hero, heatmap, radar, badges
│   └── AboutModal.tsx       ← About / credits dialog
└── lib/
    ├── store.ts             ← Zustand global state
    ├── types.ts             ← Shared TypeScript types
    ├── mock-data.ts         ← Demo data for the UI
    └── utils.ts             ← cn(), formatRelativeTime(), pct()
```

## What's still mock data (Phase 2)

In this Phase 1 release, these areas use mock data — they look real but reset on refresh:

- **Subjects you upload**: parsed correctly and shown immediately, but not persisted to disk yet
- **Quiz questions and flashcards**: Phase 2 will have Dusty auto-generate them from your slides
- **Progress data**: the heatmap, radar, and stats are demo data
- **Study sessions**: not tracked yet

**What's real already**:
- ✅ PowerPoint parsing (your real `.pptx` files get parsed correctly)
- ✅ AI chat with Ollama (real streaming responses)
- ✅ All UI animations, transitions, design system
- ✅ Light/dark mode persistence
- ✅ Search, filter, favorite

## Phase 2 roadmap

- SQLite persistence so subjects/progress survive refresh
- Real quiz + flashcard generation from PPT content via Ollama
- Tauri packaging → single ~30 MB `.exe` you can share with friends
- Real progress tracking (study time, mastery per topic)
- Text-to-speech narration
- Pomodoro timer

## Credits

- **Idea & vision**: Yassine Achouak
- **Stack**: Next.js 14 · Tailwind CSS · Framer Motion · Zustand · Recharts · JSZip · Ollama · Lucide icons · React Markdown
- **Fonts**: Satoshi (Fontshare), Inter (Google), JetBrains Mono (Google)
