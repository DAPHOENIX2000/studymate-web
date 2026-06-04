# StudyMate AI — Latest update

## ✨ Big fixes this round

### Parser: the slide-rendering disaster from your screenshots is fixed
The 4 broken slides you showed me (giant "1 2 3" tiles, empty circle decorations,
pie chart fragments, "every word on its own line") were ALL caused by my parser
being too clueless. Rewrote it from scratch:

- **Decoration filter**: pure decorative glyphs (○●▪) get dropped. Tiny images
  (< 80×80 px) are skipped — those are nearly always design accents.
- **Lonely-number pairing**: when the PPT has a standalone "1" shape next to a
  text shape, they're merged into one numbered card (number AND text together,
  not two separate orphans).
- **Position-aware reading order**: shapes are sorted by Y, then X, so content
  comes in proper top-to-bottom order regardless of XML order.
- **Paragraph joining**: text runs within one paragraph stay together
  ("Engineering Ethics, edited by Li Zhengfeng" reads as ONE line, not four).

Re-upload your Engineering Ethics PPT to see the difference.

### 4 new creative features per slide
Toolbar at the bottom of every slide:

- 🪄 **Simplify** — Dusty rewrites the slide at a 5th-grade level
- 🧠 **Quiz me** — 3 quick questions generated just from the current slide,
  with submit / explanation / next flow
- 📝 **Notes** — your own per-slide notes, auto-saved to localStorage
- ⏱ **Pomodoro** — 25/5 focus timer with Dusty (thinking while you focus,
  happy on break)
- ▶ **YouTube** — opens YouTube search for the slide topic in a new tab

### Hover-to-explain (glossary)
When you upload a PowerPoint, Dusty extracts 20-40 key terms in the background
(takes ~30-60 seconds). After that, those terms appear with a subtle dotted
underline in the slide text — hover over one to see a definition popover, click
"Tell me more" to open Dusty's chat with that term as context.

Glossary requires the AI provider to be working (Ollama running, or Gemini/Claude
key set in Settings).

### Other fixes
- Fixed `<circle>` console warnings from Dusty's pupil animations
- E2E test infrastructure: I can now run a real browser against the app
  before sending you builds. No more "guess and check."
  Run it yourself: `npm run e2e`

## Setup

1. Stop the dev server (Ctrl+C)
2. Delete the old `studymate-web` folder
3. Unzip the new one
4. `cd studymate-web` → `npm install` → `npm run dev`
5. **Clear browser data**: at http://localhost:3000, open DevTools (F12) →
   Console tab → paste `localStorage.clear(); location.reload();`
6. Re-upload your Engineering Ethics PPT to see the parser improvements

## Honest limits

- Glossary generation needs the AI working. If Ollama is slow or offline, you
  just won't get hover-explain — the rest of the app works fine.
- "Simplify" and "Quiz me on this slide" also call the AI. With small local
  models like `llama3.2:3b`, results are decent but not great. Upgrade to
  `llama3.1:8b`, or switch to Gemini (free) for better quality.
- YouTube: search-link only for now, no embedded videos. To embed real videos
  we'd need a YouTube Data API key.
