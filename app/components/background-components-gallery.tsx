"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Code2,
  Copy,
  Layers3,
  Palette,
  Search,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

type BackgroundComponent = {
  name: string;
  category: "Grid" | "Gradient" | "Noise" | "Light" | "Motion" | "Texture";
  mood: string;
  prompt: string;
  recipe: string;
  style: React.CSSProperties;
  overlay:
    | "none"
    | "grid"
    | "dots"
    | "beams"
    | "rings"
    | "scan"
    | "mesh"
    | "stars";
};

const backgroundComponents: BackgroundComponent[] = [
  {
    name: "Signal Mesh",
    category: "Grid",
    mood: "Infra dashboard",
    prompt:
      "Create a precise technical background with soft green signal nodes, thin grid lines, and a quiet operational feel for a server control panel.",
    recipe:
      "radial gradients for nodes + linear grid overlay + dark neutral base",
    overlay: "mesh",
    style: {
      background:
        "radial-gradient(circle at 18% 24%, rgba(82, 211, 156, 0.34), transparent 24%), radial-gradient(circle at 74% 38%, rgba(249, 197, 86, 0.22), transparent 22%), linear-gradient(135deg, #07110f, #15201b 48%, #090c10)"
    }
  },
  {
    name: "Ivory Topography",
    category: "Texture",
    mood: "Editorial calm",
    prompt:
      "Design a warm off-white topographic background with subtle contour lines, low contrast, and premium documentation energy.",
    recipe: "repeating radial contours + warm paper base",
    overlay: "rings",
    style: {
      background:
        "radial-gradient(circle at 20% 20%, rgba(31, 122, 107, 0.12), transparent 28%), radial-gradient(circle at 82% 76%, rgba(240, 93, 35, 0.12), transparent 30%), #f4f1ea"
    }
  },
  {
    name: "Ruby Console",
    category: "Light",
    mood: "Critical alert",
    prompt:
      "Build a dramatic dark red console background for incident response with faint vertical beams and a clear center reading zone.",
    recipe: "linear red wash + vignette + beam overlay",
    overlay: "beams",
    style: {
      background:
        "radial-gradient(circle at 50% 12%, rgba(255, 91, 91, 0.3), transparent 30%), linear-gradient(145deg, #19070b, #321016 54%, #09090b)"
    }
  },
  {
    name: "Aurora Terminal",
    category: "Gradient",
    mood: "AI workspace",
    prompt:
      "Create a dark aurora background with teal and amber ribbons, suitable for an AI agent terminal without overwhelming text.",
    recipe: "soft diagonal aurora bands + dark base",
    overlay: "scan",
    style: {
      background:
        "linear-gradient(120deg, rgba(42, 217, 194, 0.28), transparent 34%), linear-gradient(300deg, rgba(247, 201, 72, 0.24), transparent 42%), #07100f"
    }
  },
  {
    name: "Blueprint Field",
    category: "Grid",
    mood: "Engineering",
    prompt:
      "Generate a blueprint-style background with measured grid lines, pale cyan detail, and enough empty space for product UI.",
    recipe: "blue-black base + two grid scales",
    overlay: "grid",
    style: {
      background:
        "linear-gradient(135deg, #08121d, #11283a 52%, #071018)"
    }
  },
  {
    name: "Matcha Static",
    category: "Noise",
    mood: "Fresh product",
    prompt:
      "Make a matcha green background with fine grain, soft cream highlights, and a modern food-app feel.",
    recipe: "green radial gradients + dot texture",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 28% 24%, rgba(226, 238, 191, 0.5), transparent 26%), radial-gradient(circle at 76% 70%, rgba(82, 126, 79, 0.45), transparent 34%), #9bb26b"
    }
  },
  {
    name: "Obsidian Threads",
    category: "Texture",
    mood: "Premium SaaS",
    prompt:
      "Create a black glass background crossed by very subtle woven charcoal threads and a restrained silver highlight.",
    recipe: "dark base + crosshatch overlay",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 72% 26%, rgba(209, 213, 219, 0.18), transparent 22%), linear-gradient(135deg, #080808, #171717 48%, #050505)"
    }
  },
  {
    name: "Solar Ledger",
    category: "Light",
    mood: "Finance",
    prompt:
      "Design a warm gold-on-graphite background with ledger-like precision, restrained contrast, and a trustworthy enterprise tone.",
    recipe: "gold radial light + fine line field",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 58% 18%, rgba(250, 204, 21, 0.36), transparent 28%), linear-gradient(160deg, #12100a, #242016 56%, #0b0c0e)"
    }
  },
  {
    name: "Neon Lane",
    category: "Motion",
    mood: "Automotive",
    prompt:
      "Create a kinetic night-road background with red and cyan lane light streaks, made for an automotive technology section.",
    recipe: "diagonal light streaks + asphalt base",
    overlay: "beams",
    style: {
      background:
        "linear-gradient(115deg, rgba(239, 68, 68, 0.32), transparent 24%), linear-gradient(292deg, rgba(34, 211, 238, 0.28), transparent 30%), #080b0f"
    }
  },
  {
    name: "Cloud Chamber",
    category: "Gradient",
    mood: "Weather app",
    prompt:
      "Build a bright atmospheric background with layered cloud color, pale blue air, and usable contrast for forecast widgets.",
    recipe: "sky gradients + soft white bloom",
    overlay: "none",
    style: {
      background:
        "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.78), transparent 28%), radial-gradient(circle at 78% 58%, rgba(125, 211, 252, 0.5), transparent 32%), linear-gradient(135deg, #e0f2fe, #bae6fd 46%, #fef3c7)"
    }
  },
  {
    name: "Copper Matrix",
    category: "Grid",
    mood: "Hardware",
    prompt:
      "Generate a copper circuit-board background with matte black substrate, precise traces, and a hardware lab mood.",
    recipe: "copper glow + orthogonal trace grid",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 18% 82%, rgba(251, 146, 60, 0.36), transparent 28%), linear-gradient(145deg, #0d0b08, #22160f 52%, #070707)"
    }
  },
  {
    name: "Violet Pop",
    category: "Gradient",
    mood: "Experimental",
    prompt:
      "Create a playful violet soda-inspired background with carbonated bubbles, magenta light, and a dark readable center.",
    recipe: "violet radial gradients + bubble dots",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 24% 22%, rgba(236, 72, 153, 0.42), transparent 27%), radial-gradient(circle at 76% 70%, rgba(168, 85, 247, 0.48), transparent 32%), #1d1028"
    }
  },
  {
    name: "Paper Console",
    category: "Texture",
    mood: "Docs",
    prompt:
      "Design a documentation background that feels like warm paper with faint terminal blocks and very soft ink shadows.",
    recipe: "paper color + faint rectangular gradients",
    overlay: "scan",
    style: {
      background:
        "linear-gradient(135deg, rgba(23,23,23,0.06), transparent 28%), radial-gradient(circle at 84% 18%, rgba(31, 122, 107, 0.13), transparent 24%), #f7f1e3"
    }
  },
  {
    name: "Deep Radar",
    category: "Motion",
    mood: "Monitoring",
    prompt:
      "Create a dark radar sweep background for monitoring software with green scanning rings and subtle movement cues.",
    recipe: "green center glow + ring overlay",
    overlay: "rings",
    style: {
      background:
        "radial-gradient(circle at 50% 52%, rgba(34, 197, 94, 0.36), transparent 34%), linear-gradient(135deg, #03100a, #061916 52%, #020405)"
    }
  },
  {
    name: "Frosted Data",
    category: "Light",
    mood: "Analytics",
    prompt:
      "Make a cool frosted glass background with pale blue data-light accents and a calm analytics workspace feel.",
    recipe: "ice gradient + subtle dots",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.22), transparent 30%), radial-gradient(circle at 82% 20%, rgba(20, 184, 166, 0.18), transparent 24%), #edf7fb"
    }
  },
  {
    name: "Terminal Rain",
    category: "Motion",
    mood: "CLI",
    prompt:
      "Create a terminal-inspired background with vertical code rain hints, green phosphor glow, and modern restraint.",
    recipe: "dark green base + vertical scan columns",
    overlay: "scan",
    style: {
      background:
        "radial-gradient(circle at 50% 18%, rgba(132, 204, 22, 0.28), transparent 28%), linear-gradient(135deg, #041006, #0b1f0c 52%, #030403)"
    }
  },
  {
    name: "Desert Instrument",
    category: "Texture",
    mood: "Field ops",
    prompt:
      "Design a sand-colored field instrument background with subtle measurement marks and rugged utility.",
    recipe: "sand base + measurement grid",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 24% 72%, rgba(180, 83, 9, 0.18), transparent 30%), linear-gradient(135deg, #eee0c4, #d8bc86 56%, #f6eddc)"
    }
  },
  {
    name: "Marine Console",
    category: "Gradient",
    mood: "Logistics",
    prompt:
      "Generate a deep marine dashboard background with navy water tones, cyan route lines, and quiet command-center energy.",
    recipe: "navy base + cyan grid overlay",
    overlay: "mesh",
    style: {
      background:
        "radial-gradient(circle at 80% 24%, rgba(45, 212, 191, 0.26), transparent 28%), radial-gradient(circle at 18% 72%, rgba(59, 130, 246, 0.28), transparent 30%), #071522"
    }
  },
  {
    name: "Studio Charcoal",
    category: "Light",
    mood: "Portfolio",
    prompt:
      "Create a charcoal studio background with a single softbox glow and enough tonal range to frame product photography.",
    recipe: "charcoal gradient + softbox light",
    overlay: "none",
    style: {
      background:
        "radial-gradient(circle at 34% 22%, rgba(255,255,255,0.2), transparent 28%), linear-gradient(145deg, #111111, #2b2b2b 50%, #050505)"
    }
  },
  {
    name: "Rose Quartz Grid",
    category: "Grid",
    mood: "Creator tool",
    prompt:
      "Make a soft rose quartz grid background for a creator tool with delicate pink surfaces and thin burgundy structure.",
    recipe: "rose surface + fine line overlay",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 74% 28%, rgba(244, 114, 182, 0.22), transparent 30%), linear-gradient(135deg, #fff1f2, #fce7f3 48%, #fff7ed)"
    }
  },
  {
    name: "Plasma Tile",
    category: "Gradient",
    mood: "Generative UI",
    prompt:
      "Create a high-energy plasma background with orange, cyan, and violet fields while keeping a dark UI-safe center.",
    recipe: "multi-color radial plasma + dark vignette",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 22% 22%, rgba(249, 115, 22, 0.52), transparent 28%), radial-gradient(circle at 76% 30%, rgba(6, 182, 212, 0.42), transparent 26%), radial-gradient(circle at 54% 78%, rgba(139, 92, 246, 0.38), transparent 28%), #0f1020"
    }
  },
  {
    name: "Quiet Ledger",
    category: "Texture",
    mood: "Back office",
    prompt:
      "Design a restrained back-office background with faint ruled-paper lines, neutral ink, and high readability.",
    recipe: "neutral surface + ruled horizontal lines",
    overlay: "scan",
    style: {
      background:
        "linear-gradient(135deg, rgba(31,41,55,0.08), transparent 26%), #f5f5f0"
    }
  },
  {
    name: "Orbit Lab",
    category: "Motion",
    mood: "Research",
    prompt:
      "Create a research-lab background with orbital rings, soft blue-white stars, and a precise scientific mood.",
    recipe: "space base + orbit rings + stars",
    overlay: "stars",
    style: {
      background:
        "radial-gradient(circle at 48% 48%, rgba(96, 165, 250, 0.34), transparent 28%), linear-gradient(135deg, #030712, #101827 56%, #050816)"
    }
  },
  {
    name: "Mint Receipt",
    category: "Texture",
    mood: "Commerce",
    prompt:
      "Make a clean mint commerce background with receipt-like line rhythm and soft trustworthy greens.",
    recipe: "mint surface + thin ruled lines",
    overlay: "scan",
    style: {
      background:
        "radial-gradient(circle at 80% 18%, rgba(16, 185, 129, 0.2), transparent 24%), linear-gradient(135deg, #ecfdf5, #d1fae5 54%, #f0fdfa)"
    }
  },
  {
    name: "Infra Ember",
    category: "Light",
    mood: "Maintenance",
    prompt:
      "Generate a dark infrastructure maintenance background with ember highlights, cable-like lines, and urgent but controlled tone.",
    recipe: "ember glow + dark cable field",
    overlay: "beams",
    style: {
      background:
        "radial-gradient(circle at 72% 72%, rgba(248, 113, 113, 0.32), transparent 28%), radial-gradient(circle at 22% 22%, rgba(251, 146, 60, 0.28), transparent 24%), #100b09"
    }
  },
  {
    name: "Sage Blueprint",
    category: "Grid",
    mood: "Planning",
    prompt:
      "Create a sage-green planning board background with blueprint precision and a softer operational personality.",
    recipe: "sage base + blueprint grid",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.28), transparent 26%), linear-gradient(135deg, #526f5a, #29483b 54%, #10251f)"
    }
  },
  {
    name: "Night Market",
    category: "Gradient",
    mood: "Food discovery",
    prompt:
      "Design a night-market background with warm vendor lights, deep teal shadows, and appetite-friendly color contrast.",
    recipe: "warm lantern glows + teal base",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 22% 28%, rgba(251, 191, 36, 0.44), transparent 22%), radial-gradient(circle at 70% 42%, rgba(244, 63, 94, 0.3), transparent 26%), #06201d"
    }
  },
  {
    name: "Code Frost",
    category: "Noise",
    mood: "Developer docs",
    prompt:
      "Create a cold developer documentation background with frosted blue panels, tiny dot noise, and crisp contrast.",
    recipe: "icy gradients + dot matrix",
    overlay: "dots",
    style: {
      background:
        "radial-gradient(circle at 28% 26%, rgba(147, 197, 253, 0.32), transparent 28%), linear-gradient(135deg, #eff6ff, #dbeafe 48%, #f8fafc)"
    }
  },
  {
    name: "Graphite Rings",
    category: "Texture",
    mood: "Audio tool",
    prompt:
      "Make a graphite background with concentric ring texture, like a precise audio or signal-analysis interface.",
    recipe: "graphite base + ring overlay",
    overlay: "rings",
    style: {
      background:
        "radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.26), transparent 32%), linear-gradient(135deg, #111827, #1f2937 52%, #030712)"
    }
  },
  {
    name: "Lavender Glass",
    category: "Light",
    mood: "Personal AI",
    prompt:
      "Create a light lavender glass background for a personal AI app with translucent surfaces and subtle colorful refractions.",
    recipe: "lavender base + glassy radial light",
    overlay: "none",
    style: {
      background:
        "radial-gradient(circle at 22% 28%, rgba(129, 140, 248, 0.24), transparent 28%), radial-gradient(circle at 80% 24%, rgba(45, 212, 191, 0.18), transparent 24%), #f5f3ff"
    }
  },
  {
    name: "Data Orchard",
    category: "Gradient",
    mood: "Knowledge base",
    prompt:
      "Generate a knowledge-base background with green and amber data clusters, organic structure, and clear reading space.",
    recipe: "organic nodes + warm neutral base",
    overlay: "mesh",
    style: {
      background:
        "radial-gradient(circle at 26% 34%, rgba(132, 204, 22, 0.28), transparent 28%), radial-gradient(circle at 78% 62%, rgba(245, 158, 11, 0.22), transparent 30%), #f7f6ef"
    }
  },
  {
    name: "Steel Shop",
    category: "Texture",
    mood: "Automotive service",
    prompt:
      "Design a steel workshop background with brushed-metal lines, blue-gray shadows, and a clean garage-service feel.",
    recipe: "steel gradient + brushed scan lines",
    overlay: "scan",
    style: {
      background:
        "linear-gradient(135deg, #d1d5db, #94a3b8 50%, #e5e7eb)"
    }
  },
  {
    name: "Packet Flow",
    category: "Motion",
    mood: "Networking",
    prompt:
      "Create a network packet-flow background with small luminous points, directional lines, and a calm systems aesthetic.",
    recipe: "dark base + mesh node overlay",
    overlay: "mesh",
    style: {
      background:
        "radial-gradient(circle at 16% 20%, rgba(45, 212, 191, 0.3), transparent 24%), radial-gradient(circle at 82% 74%, rgba(96, 165, 250, 0.24), transparent 28%), #060b12"
    }
  },
  {
    name: "Warm Kernel",
    category: "Light",
    mood: "System core",
    prompt:
      "Generate a warm kernel background with amber core glow, dark shell, and subtle circular system architecture.",
    recipe: "amber center + system rings",
    overlay: "rings",
    style: {
      background:
        "radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.48), transparent 30%), linear-gradient(135deg, #160f05, #30200b 54%, #080604)"
    }
  },
  {
    name: "Civic Map",
    category: "Grid",
    mood: "Local services",
    prompt:
      "Make a civic map background with pale streets, muted green blocks, and a clean local-service interface tone.",
    recipe: "map-like grid + green zones",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 82% 22%, rgba(34, 197, 94, 0.14), transparent 26%), linear-gradient(135deg, #f8fafc, #e7efe9 50%, #f1f5f9)"
    }
  },
  {
    name: "Prism Queue",
    category: "Motion",
    mood: "Workflow",
    prompt:
      "Create a workflow queue background with prism-colored diagonal lanes and a dark stable center for task cards.",
    recipe: "diagonal prism lanes + dark surface",
    overlay: "beams",
    style: {
      background:
        "linear-gradient(115deg, rgba(34,197,94,0.26), transparent 22%), linear-gradient(135deg, rgba(59,130,246,0.28), transparent 35%), linear-gradient(300deg, rgba(236,72,153,0.22), transparent 28%), #090b10"
    }
  },
  {
    name: "Ash Calendar",
    category: "Texture",
    mood: "Scheduling",
    prompt:
      "Design an ash-gray scheduling background with faint calendar grid rhythm, soft shadows, and high legibility.",
    recipe: "ash surface + calendar grid",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 28%), #e5e7eb"
    }
  },
  {
    name: "Magnetic Field",
    category: "Motion",
    mood: "Science UI",
    prompt:
      "Create a magnetic field background with flowing contour energy, blue and copper accents, and a dark technical base.",
    recipe: "field gradients + contour rings",
    overlay: "rings",
    style: {
      background:
        "radial-gradient(circle at 26% 30%, rgba(14, 165, 233, 0.3), transparent 26%), radial-gradient(circle at 74% 70%, rgba(251, 146, 60, 0.32), transparent 30%), #080b13"
    }
  },
  {
    name: "Milk Glass Grid",
    category: "Light",
    mood: "Clean app",
    prompt:
      "Make a milk-glass app background with thin neutral grid lines, delicate shadows, and a calm product surface.",
    recipe: "white base + soft grid + cool highlights",
    overlay: "grid",
    style: {
      background:
        "radial-gradient(circle at 74% 28%, rgba(14, 165, 233, 0.13), transparent 28%), linear-gradient(135deg, #ffffff, #f3f4f6 54%, #eef2ff)"
    }
  },
  {
    name: "Comet Log",
    category: "Noise",
    mood: "Observability",
    prompt:
      "Generate an observability background with comet-like log trails, dark blue-black space, and restrained telemetry points.",
    recipe: "comet streaks + star dots",
    overlay: "stars",
    style: {
      background:
        "linear-gradient(120deg, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at 74% 24%, rgba(250, 204, 21, 0.2), transparent 20%), #020617"
    }
  },
  {
    name: "Harbor Slate",
    category: "Gradient",
    mood: "Operations",
    prompt:
      "Create a harbor-slate operations background with blue-gray depth, teal status light, and sober enterprise polish.",
    recipe: "slate depth + teal status glow",
    overlay: "scan",
    style: {
      background:
        "radial-gradient(circle at 84% 18%, rgba(20, 184, 166, 0.28), transparent 24%), linear-gradient(135deg, #0f172a, #334155 56%, #020617)"
    }
  }
];

const categories = ["All", "Grid", "Gradient", "Noise", "Light", "Motion", "Texture"] as const;

function PreviewOverlay({ type }: { type: BackgroundComponent["overlay"] }) {
  if (type === "none") {
    return null;
  }

  const shared = "pointer-events-none absolute inset-0";

  if (type === "grid") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
    );
  }

  if (type === "dots") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.24) 1px, transparent 1px)",
          backgroundSize: "14px 14px"
        }}
      />
    );
  }

  if (type === "beams") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 0 18%, rgba(255,255,255,0.2) 19%, transparent 21% 46%, rgba(255,255,255,0.12) 47%, transparent 49% 100%)"
        }}
      />
    );
  }

  if (type === "rings") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16) 0 1px, transparent 1px 18px)"
        }}
      />
    );
  }

  if (type === "scan") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.13) 0 1px, transparent 1px 9px)"
        }}
      />
    );
  }

  if (type === "mesh") {
    return (
      <div
        className={shared}
        style={{
          backgroundImage:
            "linear-gradient(30deg, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(150deg, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "54px 54px, 54px 54px, 27px 27px"
        }}
      />
    );
  }

  return (
    <div
      className={shared}
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.78) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.34) 1px, transparent 1px)",
        backgroundPosition: "0 0, 11px 17px",
        backgroundSize: "31px 31px, 47px 47px"
      }}
    />
  );
}

export function BackgroundComponentsGallery() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filteredComponents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return backgroundComponents.filter((component) => {
      const matchesCategory =
        activeCategory === "All" || component.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [component.name, component.category, component.mood, component.prompt]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <main dir="ltr" className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <section className="border-b border-[#d8d0c2] bg-[#111817] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.95fr_1.05fr] md:items-end md:px-8 lg:py-16">
          <div>
            <div className="flex items-center gap-3 text-[#a7c957]">
              <Layers3 className="h-7 w-7" />
              <p className="text-sm font-black uppercase tracking-[0.2em]">
                Background Registry
              </p>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              40 original React background ideas with prompts.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              A local, original gallery for Tartanak: preview the background,
              filter by style, copy the prompt, then turn the recipe into a
              Tailwind or CSS component.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#a7c957] text-[#111817]">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white/42">
                  Components
                </p>
                <p className="text-3xl font-black">40</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm font-bold text-white/72">
              <span className="rounded-lg bg-white/[0.07] px-3 py-2">Prompts</span>
              <span className="rounded-lg bg-white/[0.07] px-3 py-2">Recipes</span>
              <span className="rounded-lg bg-white/[0.07] px-3 py-2">Previews</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-[#d8d0c2] bg-[#f6f4ef]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-black transition",
                  activeCategory === category
                    ? "border-[#111817] bg-[#111817] text-white"
                    : "border-[#d8d0c2] bg-white text-[#4c4841] hover:border-[#111817]"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 md:max-w-sm">
            <Search className="h-5 w-5 text-[#6a655d]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search backgrounds"
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#8a8378]"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredComponents.map((component, index) => {
            const promptKey = `${component.name}-prompt`;
            const recipeKey = `${component.name}-recipe`;

            return (
              <article
                key={component.name}
                className="overflow-hidden rounded-lg border border-[#d8d0c2] bg-white shadow-[0_18px_46px_rgba(23,23,23,0.07)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden" style={component.style}>
                  <PreviewOverlay type={component.overlay} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_105%,rgba(0,0,0,0.34),transparent_42%)]" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/68">
                        {String(index + 1).padStart(2, "0")} / {component.category}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-white drop-shadow">
                        {component.name}
                      </h2>
                    </div>
                    <Sparkles className="h-6 w-6 shrink-0 text-white/78" />
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#eef3df] px-3 py-1 text-xs font-black text-[#49621f]">
                      {component.mood}
                    </span>
                    <span className="rounded-lg bg-[#f2f0ea] px-3 py-1 text-xs font-black text-[#615b51]">
                      {component.overlay} overlay
                    </span>
                  </div>

                  <p className="min-h-[96px] text-sm leading-7 text-[#555047]">
                    {component.prompt}
                  </p>

                  <div className="rounded-lg border border-[#e4ded3] bg-[#faf8f3] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#8a6f35]">
                      <Code2 className="h-4 w-4" />
                      Recipe
                    </div>
                    <p className="text-sm font-bold leading-6 text-[#4d4740]">
                      {component.recipe}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(promptKey, component.prompt)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#111817] px-3 text-sm font-black text-white transition hover:bg-[#22302c]"
                    >
                      {copied === promptKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(recipeKey, component.recipe)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-black text-[#171717] transition hover:border-[#111817]"
                    >
                      {copied === recipeKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                      Recipe
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredComponents.length === 0 ? (
          <div className="rounded-lg border border-[#d8d0c2] bg-white p-8 text-center font-bold text-[#625b52]">
            No matching backgrounds.
          </div>
        ) : null}
      </section>
    </main>
  );
}
