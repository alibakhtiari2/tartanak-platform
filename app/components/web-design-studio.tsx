"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  MessageSquare,
  MousePointer2,
  Palette,
  PanelLeft,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Workflow,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RegistryComponent = {
  name: string;
  author: string;
  slug: string;
  install: string;
  url: string;
  kind: string;
  style: string;
  category: string;
};

type Registry = {
  generated: string | null;
  total: number;
  components: RegistryComponent[];
};

type StudioProps = {
  registry: Registry;
};

type PreviewMode = "catalog" | "canvas";

const goals = [
  {
    id: "landing",
    label: "Landing page",
    description: "Hero, feature proof, pricing, testimonials, CTA.",
    kinds: [
      "hero",
      "animated-hero",
      "hero-section",
      "hero-with-mockup",
      "features",
      "feature-section",
      "pricing-section",
      "testimonials",
      "call-to-action",
      "footer"
    ],
    styles: ["Modern", "Gradient", "Animated", "Professional", "Glass"]
  },
  {
    id: "dashboard",
    label: "SaaS dashboard",
    description: "Navigation, cards, tables, forms, modals, empty states.",
    kinds: [
      "sidebar",
      "navbar-navigation",
      "card",
      "table",
      "tabs",
      "dropdown",
      "modal-dialog",
      "form",
      "input",
      "select",
      "empty-state"
    ],
    styles: ["Clean", "Professional", "Minimal", "Compact", "Responsive"]
  },
  {
    id: "ai",
    label: "AI assistant",
    description: "Chat, prompt controls, context cards, alerts, motion.",
    kinds: [
      "ai-chat",
      "textarea",
      "button",
      "card",
      "badge",
      "tooltip",
      "scroll-area",
      "spinner-loader",
      "notification",
      "toast"
    ],
    styles: ["Interactive", "Animated", "Glass", "Gradient", "Dark"]
  },
  {
    id: "commerce",
    label: "Commerce flow",
    description: "Products, forms, selectors, checkout signals, trust UI.",
    kinds: [
      "card",
      "image",
      "carousel",
      "form",
      "input",
      "select",
      "button",
      "badge",
      "pagination",
      "comparison"
    ],
    styles: ["Clean", "Filled", "Responsive", "Modern", "Subtle"]
  }
] as const;

const categoryOrder = ["All", "Sections", "Controls", "Structure", "Visuals", "Product", "Utilities"];

const previewThemes = [
  {
    name: "Operations",
    bg: "from-[#111817] via-[#24322e] to-[#0f1418]",
    accent: "bg-[#a7c957]",
    soft: "bg-[#dcecc2]"
  },
  {
    name: "Commerce",
    bg: "from-[#f8fafc] via-[#e8efe8] to-[#f7efe3]",
    accent: "bg-[#1f7a6b]",
    soft: "bg-[#dbeafe]"
  },
  {
    name: "AI",
    bg: "from-[#07100f] via-[#12332e] to-[#101827]",
    accent: "bg-[#f7c948]",
    soft: "bg-[#c7f9e9]"
  }
];

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function scoreComponent(component: RegistryComponent, goal: (typeof goals)[number]) {
  let score = 0;
  const goalKinds: readonly string[] = goal.kinds;
  const goalStyles: readonly string[] = goal.styles;

  if (goalKinds.includes(component.kind)) {
    score += 10;
  }
  if (goalStyles.includes(component.style)) {
    score += 4;
  }
  if (component.category === "Sections" && goal.id === "landing") {
    score += 3;
  }
  if (component.author === "shadcn" || component.author === "magicui") {
    score += 1;
  }

  return score;
}

function componentHash(value: string) {
  return Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function PreviewShell({
  component,
  mode,
  children
}: {
  component: RegistryComponent;
  mode: PreviewMode;
  children: React.ReactNode;
}) {
  const theme = previewThemes[componentHash(component.slug) % previewThemes.length];
  const dark = theme.name !== "Commerce";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border",
        mode === "canvas" ? "min-h-48" : "h-44",
        dark ? "border-white/10 text-white" : "border-[#e0d9cc] text-[#111817]",
        `bg-gradient-to-br ${theme.bg}`
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:24px_24px] opacity-35" />
      <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className={cn("rounded px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]", dark ? "bg-white/12 text-white/68" : "bg-white/70 text-[#5f5a52]")}>
            {component.kind}
          </span>
          <span className={cn("h-2 w-10 rounded-full", theme.accent)} />
        </div>
        {children}
      </div>
    </div>
  );
}

function Bars({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-2 rounded-full bg-current opacity-20"
          style={{ width: `${92 - index * 18}%` }}
        />
      ))}
    </div>
  );
}

function MiniPreview({
  component,
  mode = "catalog"
}: {
  component: RegistryComponent;
  mode?: PreviewMode;
}) {
  const kind = component.kind;
  const compact = mode === "catalog";

  if (kind.includes("hero")) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="mt-auto max-w-[82%]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{component.author}</p>
          <h3 className={cn("mt-2 font-black leading-tight", compact ? "text-xl" : "text-3xl")}>
            Launch-ready hero block
          </h3>
          <div className="mt-4 flex gap-2">
            <span className="h-8 w-24 rounded bg-current opacity-90" />
            <span className="h-8 w-12 rounded border border-current opacity-45" />
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["features", "feature-section", "clients", "testimonials", "pricing-section", "comparison"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="grid flex-1 content-end gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-lg border border-current/12 bg-white/14 p-3 backdrop-blur">
              <Star className="mb-3 h-4 w-4 opacity-70" />
              <Bars count={compact ? 2 : 3} />
            </div>
          ))}
        </div>
      </PreviewShell>
    );
  }

  if (["button", "link", "badge", "chip-tag", "toggle"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-lg bg-current px-5 py-3 text-sm font-black text-[#111817]">Primary</span>
            <span className="rounded-lg border border-current/35 px-4 py-2 text-xs font-black">Secondary</span>
            <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-black">New</span>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["input", "select", "textarea", "form", "date-picker", "calendar", "upload-download", "number"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="mt-auto grid gap-2">
          <div className="h-9 rounded-lg border border-current/18 bg-white/18 px-3 py-2">
            <div className="h-2 w-2/3 rounded-full bg-current opacity-30" />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="h-9 rounded-lg border border-current/18 bg-white/12" />
            <div className="grid h-9 w-10 place-items-center rounded-lg bg-current text-[#111817]">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["sidebar", "navbar-navigation", "menu", "dock"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="grid flex-1 grid-cols-[64px_1fr] gap-3">
          <div className="rounded-lg bg-black/18 p-2">
            <PanelLeft className="mb-4 h-4 w-4 opacity-70" />
            <Bars count={4} />
          </div>
          <div className="rounded-lg bg-white/14 p-3">
            <div className="mb-4 flex justify-between">
              <span className="h-3 w-20 rounded-full bg-current opacity-30" />
              <span className="h-5 w-5 rounded-full bg-current opacity-30" />
            </div>
            <Bars count={3} />
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["table", "tabs", "accordion", "dropdown", "popover", "tooltip", "modal-dialog", "scroll-area", "pagination"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="mt-auto rounded-lg border border-current/12 bg-white/16 p-3">
          <div className="mb-3 flex gap-2">
            {[0, 1, 2].map((item) => (
              <span key={item} className="h-6 w-14 rounded bg-current opacity-20" />
            ))}
          </div>
          <div className="grid gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="grid grid-cols-[1fr_56px_32px] gap-2">
                <span className="h-3 rounded bg-current opacity-20" />
                <span className="h-3 rounded bg-current opacity-15" />
                <ChevronDown className="h-3 w-3 opacity-45" />
              </div>
            ))}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["ai-chat", "notification", "toast", "alert", "empty-state"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="mt-auto grid gap-2">
          <div className="ml-auto max-w-[78%] rounded-lg bg-white/18 p-3">
            <MessageSquare className="mb-2 h-4 w-4 opacity-70" />
            <Bars count={2} />
          </div>
          <div className="mr-auto max-w-[78%] rounded-lg bg-current p-3 text-[#111817]">
            <Bell className="mb-2 h-4 w-4" />
            <div className="h-2 w-28 rounded-full bg-[#111817]/30" />
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["image", "video", "carousel", "background", "border", "icons", "avatar", "text"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="grid flex-1 place-items-center">
          <div className="relative h-24 w-full overflow-hidden rounded-lg border border-current/12 bg-white/18">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,0.65),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.2),transparent)]" />
            <ImageIcon className="absolute bottom-3 right-3 h-8 w-8 opacity-55" />
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (["card", "expandable-card"].includes(kind)) {
    return (
      <PreviewShell component={component} mode={mode}>
        <div className="mt-auto rounded-lg border border-current/12 bg-white/16 p-4 shadow-xl">
          <BadgeCheck className="mb-4 h-5 w-5 opacity-70" />
          <Bars count={3} />
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell component={component} mode={mode}>
      <div className="mt-auto grid gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/18">
            <Sparkles className="h-5 w-5" />
          </span>
          <Bars count={2} />
        </div>
        <div className="h-10 rounded-lg border border-current/12 bg-white/14" />
      </div>
    </PreviewShell>
  );
}

export function WebDesignStudio({ registry }: StudioProps) {
  const [activeGoalId, setActiveGoalId] = useState<(typeof goals)[number]["id"]>("dashboard");
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(120);

  const activeGoal = goals.find((goal) => goal.id === activeGoalId) ?? goals[1];
  const authors = useMemo(
    () => uniqueSorted(registry.components.map((component) => component.author)),
    [registry.components]
  );
  const kinds = useMemo(
    () => uniqueSorted(registry.components.map((component) => component.kind)),
    [registry.components]
  );

  const filteredComponents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return registry.components
      .map((component) => ({
        ...component,
        fit: scoreComponent(component, activeGoal)
      }))
      .filter((component) => activeCategory === "All" || component.category === activeCategory)
      .filter((component) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          component.name,
          component.author,
          component.slug,
          component.kind,
          component.style,
          component.category
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => b.fit - a.fit || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  }, [activeCategory, activeGoal, query, registry.components]);

  const matchedComponents = filteredComponents.slice(0, visibleLimit);

  const selectedComponents = useMemo(
    () =>
      selected
        .map((slug) => registry.components.find((component) => component.slug === slug))
        .filter((component): component is RegistryComponent => Boolean(component)),
    [registry.components, selected]
  );

  const recommendedStack = useMemo(() => {
    return activeGoal.kinds
      .map((kind) =>
        registry.components
          .filter((component) => component.kind === kind)
          .sort((a, b) => scoreComponent(b, activeGoal) - scoreComponent(a, activeGoal))[0]
      )
      .filter((component): component is RegistryComponent => Boolean(component))
      .slice(0, 8);
  }, [activeGoal, registry.components]);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function toggleSelected(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug].slice(0, 18)
    );
  }

  function resetFilters(category: string) {
    setActiveCategory(category);
    setVisibleLimit(120);
  }

  const installScript = selectedComponents.map((component) => component.install).join("\n");

  return (
    <main dir="ltr" className="min-h-screen bg-[#f4f2eb] text-[#171717]">
      <section className="bg-[#101614] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 text-[#a7c957]">
                <LayoutDashboard className="h-7 w-7" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">
                  Web Design Studio
                </p>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                Browse, preview, and compose every component.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                The download catalog is now visible as live component previews.
                Pick pieces, watch them appear in the website canvas, then copy
                the exact install plan.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Components
                </p>
                <p className="mt-2 text-3xl font-black">{registry.total}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Authors
                </p>
                <p className="mt-2 text-3xl font-black">{authors.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Types
                </p>
                <p className="mt-2 text-3xl font-black">{kinds.length}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/52">
                <Workflow className="h-4 w-4" />
                Flow
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["1", "Pick intent", "Goal presets rank the full registry."],
                  ["2", "Preview live", "Every visible card renders a working visual mock."],
                  ["3", "Use it", "Selected pieces become a website canvas and install plan."]
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-lg bg-black/18 p-4">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#a7c957] text-sm font-black text-[#101614]">
                      {step}
                    </div>
                    <h2 className="mt-4 text-lg font-black">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/52">
                <Eye className="h-4 w-4" />
                Website canvas
              </div>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#f8fafc] p-3 text-[#111817]">
                <div className="mb-3 flex items-center justify-between rounded bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#1f7a6b]" />
                    <span className="text-xs font-black">draft-site.local</span>
                  </div>
                  <div className="hidden gap-2 sm:flex">
                    <span className="h-2 w-12 rounded-full bg-[#d7d2c8]" />
                    <span className="h-2 w-12 rounded-full bg-[#d7d2c8]" />
                    <span className="h-2 w-12 rounded-full bg-[#d7d2c8]" />
                  </div>
                </div>
                <div className="grid max-h-[400px] gap-3 overflow-auto pr-1">
                  {(selectedComponents.length ? selectedComponents : recommendedStack.slice(0, 4)).map((component) => (
                    <MiniPreview key={`canvas-${component.slug}`} component={component} mode="canvas" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8d0c2] bg-[#f4f2eb]">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8">
          <div className="grid gap-3 lg:grid-cols-4">
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setActiveGoalId(goal.id);
                  setVisibleLimit(120);
                }}
                className={cn(
                  "min-h-32 rounded-lg border p-4 text-left transition",
                  activeGoalId === goal.id
                    ? "border-[#111817] bg-[#111817] text-white shadow-[0_16px_38px_rgba(17,24,23,0.18)]"
                    : "border-[#d8d0c2] bg-white text-[#171717] hover:border-[#111817]"
                )}
              >
                <MousePointer2 className="h-5 w-5" />
                <h2 className="mt-4 text-xl font-black">{goal.label}</h2>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6",
                    activeGoalId === goal.id ? "text-white/66" : "text-[#625b52]"
                  )}
                >
                  {goal.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-[#d8d0c2] bg-[#f4f2eb]/94 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {categoryOrder.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => resetFilters(category)}
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

            <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 lg:max-w-md">
              <Search className="h-5 w-5 text-[#6a655d]" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleLimit(120);
                }}
                placeholder="Search kind, author, style, component"
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#8a8378]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#746b60]">
            <Filter className="h-4 w-4" />
            <span>{matchedComponents.length} shown</span>
            <span className="text-[#b2a99b]">/</span>
            <span>{filteredComponents.length} matching</span>
            <span className="text-[#b2a99b]">/</span>
            <span>{selectedComponents.length} used in canvas</span>
            <span className="text-[#b2a99b]">/</span>
            <span>Generated {registry.generated ? new Date(registry.generated).toLocaleString() : "unknown"}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-8 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <div className="rounded-lg border border-[#d8d0c2] bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#1f7a6b]">
                  <Sparkles className="h-4 w-4" />
                  Suggested stack
                </div>
                <h2 className="mt-2 text-2xl font-black">
                  Start with these for {activeGoal.label.toLowerCase()}.
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    uniqueSorted([...selected, ...recommendedStack.map((component) => component.slug)]).slice(0, 18)
                  )
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#111817] px-4 text-sm font-black text-white transition hover:bg-[#22302c]"
              >
                <Download className="h-4 w-4" />
                Use Stack
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedStack.map((component) => (
                <button
                  key={component.slug}
                  type="button"
                  onClick={() => toggleSelected(component.slug)}
                  className={cn(
                    "rounded-lg border p-2 text-left transition",
                    selected.includes(component.slug)
                      ? "border-[#111817] bg-[#111817] text-white"
                      : "border-[#e4ded3] bg-[#faf8f3] hover:border-[#111817]"
                  )}
                >
                  <MiniPreview component={component} />
                  <div className="p-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] opacity-60">
                      {component.kind}
                    </p>
                    <h3 className="mt-2 text-base font-black">{component.name}</h3>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchedComponents.map((component) => {
              const selectedState = selected.includes(component.slug);
              const copyKey = `install-${component.slug}`;

              return (
                <article
                  key={component.slug}
                  className={cn(
                    "overflow-hidden rounded-lg border bg-white shadow-[0_18px_46px_rgba(23,23,23,0.06)] transition",
                    selectedState ? "border-[#111817]" : "border-[#d8d0c2]"
                  )}
                >
                  <MiniPreview component={component} />

                  <div className="border-b border-[#eee7dc] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a8378]">
                          {component.category} / {component.kind}
                        </p>
                        <h2 className="mt-2 text-xl font-black leading-tight">
                          {component.name}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelected(component.slug)}
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition",
                          selectedState
                            ? "border-[#111817] bg-[#111817] text-white"
                            : "border-[#d8d0c2] bg-white text-[#4c4841] hover:border-[#111817]"
                        )}
                        aria-label={selectedState ? "Remove from website canvas" : "Use in website canvas"}
                      >
                        {selectedState ? <Check className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-[#eef3df] px-3 py-1 text-xs font-black text-[#49621f]">
                        {component.author}
                      </span>
                      <span className="rounded-lg bg-[#f2f0ea] px-3 py-1 text-xs font-black text-[#615b51]">
                        {component.style}
                      </span>
                      <span className="rounded-lg bg-[#edf6f4] px-3 py-1 text-xs font-black text-[#1f7a6b]">
                        fit {component.fit}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="rounded-lg border border-[#e4ded3] bg-[#faf8f3] p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#8a6f35]">
                        <Code2 className="h-4 w-4" />
                        Ready install command
                      </div>
                      <p className="break-all font-mono text-xs leading-6 text-[#4d4740]">
                        {component.install}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelected(component.slug)}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1f7a6b] px-3 text-sm font-black text-white transition hover:bg-[#185f54]"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(copyKey, component.install)}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#111817] px-3 text-sm font-black text-white transition hover:bg-[#22302c]"
                      >
                        {copied === copyKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy
                      </button>
                      <a
                        href={component.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-black text-[#171717] transition hover:border-[#111817]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {matchedComponents.length < filteredComponents.length ? (
            <button
              type="button"
              onClick={() => setVisibleLimit((current) => current + 120)}
              className="mx-auto flex min-h-12 items-center justify-center rounded-lg border border-[#111817] bg-white px-6 text-sm font-black text-[#111817] transition hover:bg-[#111817] hover:text-white"
            >
              Show 120 more live previews
            </button>
          ) : null}

          {matchedComponents.length === 0 ? (
            <div className="rounded-lg border border-[#d8d0c2] bg-white p-8 text-center font-bold text-[#625b52]">
              No matching components.
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-[#d8d0c2] bg-white p-5 shadow-[0_18px_46px_rgba(23,23,23,0.06)] xl:sticky xl:top-36">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#1f7a6b]">
                <Palette className="h-4 w-4" />
                Website canvas
              </div>
              <h2 className="mt-2 text-2xl font-black">Used components</h2>
            </div>
            {selectedComponents.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8d0c2] text-[#6a655d] transition hover:border-[#111817] hover:text-[#111817]"
                aria-label="Clear website canvas"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2">
            {selectedComponents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#d8d0c2] bg-[#faf8f3] p-4 text-sm font-bold leading-6 text-[#625b52]">
                Use any preview card to place that component into the website canvas. The canvas is capped at 18 pieces so the page stays responsive.
              </p>
            ) : (
              selectedComponents.map((component) => (
                <div key={component.slug} className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f4ee] p-3">
                  <div>
                    <p className="text-sm font-black">{component.name}</p>
                    <p className="text-xs font-bold text-[#766f65]">
                      {component.author} / {component.kind}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelected(component.slug)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6a655d] transition hover:bg-white hover:text-[#111817]"
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            disabled={selectedComponents.length === 0}
            onClick={() => copyText("install-plan", installScript)}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#111817] px-4 text-sm font-black text-white transition hover:bg-[#22302c] disabled:cursor-not-allowed disabled:bg-[#b8b0a5]"
          >
            {copied === "install-plan" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            Copy Install Plan
          </button>

          <div className="mt-5 rounded-lg border border-[#e4ded3] bg-[#faf8f3] p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#8a6f35]">
              Command preview
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-[#4d4740]">
              {installScript || "No commands selected yet."}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}
