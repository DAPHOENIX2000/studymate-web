import type { Subject, ChatMessage, QuizQuestion, Flashcard, StudySession, Slide, SlideBlock } from "./types";

const ACCENTS = ["#00F5C4", "#A78BFA", "#FF6B9D", "#FBBF24", "#60A5FA", "#34D399"];

const SLIDE_TEMPLATES: Record<string, { title: string; blocks: SlideBlock[] }[]> = {
  biology: [
    {
      title: "The Cell Membrane",
      blocks: [
        { kind: "body", text: "The cell membrane is the boundary that separates the interior of a cell from its environment. It is built from two layers of phospholipids — a structure called a bilayer." },
        { kind: "subheading", text: "Key features:" },
        { kind: "bullet", text: "Hydrophilic heads face outward toward water" },
        { kind: "bullet", text: "Hydrophobic tails face inward, away from water" },
        { kind: "bullet", text: "Embedded proteins act as channels, receptors, and pumps" },
        { kind: "bullet", text: "Cholesterol molecules regulate fluidity" },
      ],
    },
    {
      title: "Stages of Mitosis",
      blocks: [
        { kind: "body", text: "Mitosis is the process by which a single cell divides into two identical daughter cells. It happens in four main phases:" },
        { kind: "numbered", text: "Prophase — chromosomes condense and become visible" },
        { kind: "numbered", text: "Metaphase — chromosomes align at the cell's equator" },
        { kind: "numbered", text: "Anaphase — sister chromatids separate and move to opposite poles" },
        { kind: "numbered", text: "Telophase — nuclear membranes reform around each set" },
      ],
    },
    {
      title: "DNA: The Blueprint of Life",
      blocks: [
        { kind: "quote", text: "It has not escaped our notice that the specific pairing we have postulated immediately suggests a possible copying mechanism for the genetic material." },
        { kind: "body", text: "Watson & Crick, 1953 — the announcement that changed biology forever. DNA's double helix encodes life's instructions in just four letters: A, T, G, and C." },
      ],
    },
    {
      title: "Photosynthesis",
      blocks: [
        { kind: "body", text: "Plants convert sunlight, water, and carbon dioxide into glucose and oxygen. The process happens in two stages, both inside the chloroplast." },
        { kind: "subheading", text: "Light reactions:" },
        { kind: "bullet", text: "Occur in the thylakoid membrane" },
        { kind: "bullet", text: "Capture light energy and split water" },
        { kind: "bullet", text: "Produce ATP and NADPH" },
        { kind: "subheading", text: "Calvin cycle:" },
        { kind: "bullet", text: "Happens in the stroma" },
        { kind: "bullet", text: "Uses ATP and NADPH to fix CO₂ into sugar" },
      ],
    },
  ],
  history: [
    {
      title: "The Renaissance",
      blocks: [
        { kind: "body", text: "Beginning in 14th-century Italy, the Renaissance was a cultural rebirth that emphasized humanism, scientific inquiry, and artistic mastery. It bridged the medieval world and the modern era." },
        { kind: "subheading", text: "Major centers:" },
        { kind: "bullet", text: "Florence — under the Medici patronage" },
        { kind: "bullet", text: "Venice — wealth from Mediterranean trade" },
        { kind: "bullet", text: "Rome — backed by the papacy" },
      ],
    },
    {
      title: "Causes of World War I",
      blocks: [
        { kind: "body", text: "Historians often summarize the underlying tensions with the acronym M.A.I.N." },
        { kind: "numbered", text: "Militarism — arms races and glorification of military power" },
        { kind: "numbered", text: "Alliances — interlocking treaties that pulled nations into conflict" },
        { kind: "numbered", text: "Imperialism — competition for colonies and resources" },
        { kind: "numbered", text: "Nationalism — ethnic tensions, especially in the Balkans" },
      ],
    },
    {
      title: "A Turning Point",
      blocks: [
        { kind: "quote", text: "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender." },
        { kind: "body", text: "Winston Churchill, 4 June 1940 — galvanizing Britain in its darkest hour." },
      ],
    },
  ],
  calculus: [
    {
      title: "The Derivative",
      blocks: [
        { kind: "body", text: "The derivative of a function measures its instantaneous rate of change. It's the slope of the tangent line at a point." },
        { kind: "subheading", text: "Three ways to think about it:" },
        { kind: "bullet", text: "Geometrically: slope of the tangent line" },
        { kind: "bullet", text: "Physically: instantaneous velocity" },
        { kind: "bullet", text: "Algebraically: limit of the difference quotient as h → 0" },
      ],
    },
    {
      title: "Chain Rule Applications",
      blocks: [
        { kind: "body", text: "When functions are composed, their derivatives multiply. If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x)." },
        { kind: "subheading", text: "Common applications:" },
        { kind: "numbered", text: "Differentiating exponential and logarithmic functions" },
        { kind: "numbered", text: "Implicit differentiation" },
        { kind: "numbered", text: "Related rates problems" },
        { kind: "numbered", text: "Optimization with constraints" },
      ],
    },
  ],
  chemistry: [
    {
      title: "Atomic Structure",
      blocks: [
        { kind: "body", text: "Every atom has a dense, positively-charged nucleus surrounded by a cloud of electrons. The number of protons defines what element it is." },
        { kind: "subheading", text: "Subatomic particles:" },
        { kind: "bullet", text: "Protons — positive charge, in the nucleus" },
        { kind: "bullet", text: "Neutrons — no charge, in the nucleus" },
        { kind: "bullet", text: "Electrons — negative charge, orbit the nucleus" },
      ],
    },
    {
      title: "Reaction Kinetics",
      blocks: [
        { kind: "body", text: "Reaction rate depends on four key factors. Understanding them lets us speed up or slow down reactions on demand." },
        { kind: "numbered", text: "Concentration — more collisions per unit time" },
        { kind: "numbered", text: "Temperature — faster molecules collide harder" },
        { kind: "numbered", text: "Surface area — more contact between reactants" },
        { kind: "numbered", text: "Catalysts — lower the activation energy" },
      ],
    },
  ],
  macro: [
    {
      title: "Supply and Demand",
      blocks: [
        { kind: "body", text: "The most fundamental model in economics: prices are determined by the interaction between what producers offer and what consumers want." },
        { kind: "subheading", text: "Key principles:" },
        { kind: "bullet", text: "Demand curves slope downward — lower price means more buyers" },
        { kind: "bullet", text: "Supply curves slope upward — higher price means more sellers" },
        { kind: "bullet", text: "Equilibrium is where the curves cross" },
      ],
    },
    {
      title: "Monetary Policy",
      blocks: [
        { kind: "body", text: "Central banks use several tools to influence the economy by managing the money supply and interest rates." },
        { kind: "numbered", text: "Open market operations — buying or selling government bonds" },
        { kind: "numbered", text: "Reserve requirements — how much banks must hold back" },
        { kind: "numbered", text: "Discount rate — interest charged to commercial banks" },
        { kind: "numbered", text: "Forward guidance — signaling future policy intentions" },
      ],
    },
  ],
};

function makeSlides(n: number, topic: string): Slide[] {
  const list = SLIDE_TEMPLATES[topic] || SLIDE_TEMPLATES.biology;
  return Array.from({ length: n }, (_, i) => {
    const template = list[i % list.length];
    const suffix = i >= list.length ? ` (continued ${Math.floor(i / list.length) + 1})` : "";
    return {
      index: i + 1,
      title: template.title + suffix,
      blocks: template.blocks,
      notes: "Emphasize real-world examples and connect to prior lecture.",
    };
  });
}

function detectKeywords(slides: Slide[]): string[] {
  const text = slides
    .map((s) => `${s.title} ${(s.blocks || []).map((b) => b.text).join(" ")}`)
    .join(" ")
    .toLowerCase();
  const stop = new Set(["the", "and", "of", "to", "a", "in", "is", "it", "that", "for", "on", "with", "as", "are", "this", "an", "be", "by", "from", "or", "at", "which"]);
  const words = text.match(/[a-z]{4,}/g) || [];
  const counts: Record<string, number> = {};
  for (const w of words) {
    if (stop.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: "bio-101",
    name: "Introduction to Biology",
    slideCount: 24,
    mastery: 0.85,
    accentColor: ACCENTS[0],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastStudied: new Date(Date.now() - 3 * 3600000).toISOString(),
    favorite: true,
    slides: makeSlides(24, "biology"),
    keywords: ["cells", "membrane", "phospholipid", "proteins", "permeability"],
  },
  {
    id: "calc-1",
    name: "Calculus I",
    slideCount: 32,
    mastery: 0.42,
    accentColor: ACCENTS[1],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastStudied: new Date(Date.now() - 86400000).toISOString(),
    slides: makeSlides(32, "calculus"),
    keywords: ["limits", "derivatives", "integrals", "continuity"],
  },
  {
    id: "hist-1500",
    name: "World History 1500–1900",
    slideCount: 18,
    mastery: 0.0,
    accentColor: ACCENTS[2],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    slides: makeSlides(18, "history"),
    keywords: ["renaissance", "industrial", "revolution", "colonial"],
  },
  {
    id: "chem-org",
    name: "Organic Chemistry",
    slideCount: 41,
    mastery: 0.67,
    accentColor: ACCENTS[3],
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    lastStudied: new Date(Date.now() - 6 * 3600000).toISOString(),
    favorite: true,
    slides: makeSlides(41, "chemistry"),
    keywords: ["bonds", "atoms", "reactions", "equilibrium"],
  },
  {
    id: "macro-101",
    name: "Macroeconomics",
    slideCount: 27,
    mastery: 0.21,
    accentColor: ACCENTS[4],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    lastStudied: new Date(Date.now() - 2 * 86400000).toISOString(),
    slides: makeSlides(27, "macro"),
    keywords: ["supply", "demand", "inflation", "policy", "growth"],
  },
];

export const MOCK_CHAT: Record<string, ChatMessage[]> = {
  "bio-101": [
    {
      id: "m1",
      role: "user",
      content: "What's the difference between mitosis and meiosis?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "Great question — both are forms of cell division, but they serve very different purposes.\n\n**Mitosis** produces *two* genetically identical daughter cells. It's how your body grows and repairs itself.\n\n**Meiosis** produces *four* genetically different daughter cells with half the chromosomes. It's used only for making gametes (sperm and eggs).\n\nThink of it this way: mitosis is **copying**, meiosis is **shuffling and dividing**.",
      createdAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      id: "m3",
      role: "user",
      content: "Can you give a real-world analogy?",
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
  ],
};

export const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    type: "mcq",
    difficulty: 2,
    question: "Which of the following is NOT a phase of mitosis?",
    options: ["Prophase", "Metaphase", "Anaphase", "Interphase"],
    correctAnswer: "Interphase",
    explanation:
      "Interphase is the resting phase between divisions where the cell grows and copies its DNA. It's not part of mitosis itself.",
    topic: "Cell Division",
    slideIndex: 4,
  },
  {
    id: "q2",
    type: "tf",
    difficulty: 1,
    question: "The cell membrane is made of a single layer of lipids.",
    options: ["True", "False"],
    correctAnswer: "False",
    explanation:
      "The cell membrane is a phospholipid *bilayer* — two layers, with hydrophilic heads facing outward and hydrophobic tails facing inward.",
    topic: "Cell Membrane",
    slideIndex: 1,
  },
  {
    id: "q3",
    type: "mcq",
    difficulty: 3,
    question:
      "If a researcher disrupts membrane proteins responsible for active transport, which process is most likely to fail?",
    options: [
      "Diffusion of oxygen",
      "Movement of glucose against its gradient",
      "Osmosis of water",
      "Passive movement of CO2",
    ],
    correctAnswer: "Movement of glucose against its gradient",
    explanation:
      "Active transport moves molecules against their concentration gradient using ATP and specific membrane proteins. The other options are passive.",
    topic: "Membrane Transport",
    slideIndex: 1,
  },
];

export const MOCK_FLASHCARDS: Flashcard[] = [
  {
    id: "f1",
    front: "What is photosynthesis?",
    back: "The process by which plants convert light energy into chemical energy stored in glucose, using carbon dioxide and water and releasing oxygen.",
    slideIndex: 3,
    ease: 2.5,
    intervalDays: 1,
    repetitions: 1,
    dueDate: new Date().toISOString(),
  },
  {
    id: "f2",
    front: "Define mitochondria",
    back: "Membrane-bound organelles that produce most of the cell's ATP through cellular respiration — often called 'the powerhouse of the cell.'",
    slideIndex: 5,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
  },
  {
    id: "f3",
    front: "What does 'selective permeability' mean?",
    back: "The ability of a membrane to allow some substances to pass while blocking others, controlling what enters and exits the cell.",
    slideIndex: 1,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
  },
];

// Last 12 weeks of study data for the heatmap
export const MOCK_STUDY_SESSIONS: StudySession[] = (() => {
  const sessions: StudySession[] = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Random study minutes, with realistic gaps
    const minutes = Math.random() > 0.35 ? Math.floor(Math.random() * 60 + 5) : 0;
    if (minutes > 0) {
      sessions.push({ date: d.toISOString().slice(0, 10), minutes });
    }
  }
  return sessions;
})();

export { ACCENTS };
