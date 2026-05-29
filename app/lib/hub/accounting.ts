/**
 * Accounting API client
 *
 * Integration point: replace the stub functions below with real fetch() calls
 * to your accounting/billing server once it's ready.
 *
 * Required env vars:
 *   ACCOUNTING_API_URL  e.g. https://billing.tartanak.com/api
 *   ACCOUNTING_API_KEY  shared secret or service token
 *
 * All functions accept a `customerId` (the `sub` claim from the hub token)
 * and return typed data. They throw on network/auth errors so callers can
 * catch and show an error state.
 */

const API_URL = (process.env.ACCOUNTING_API_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.ACCOUNTING_API_KEY ?? "";

// ── Data types ────────────────────────────────────────────────────────────────

export type PlanSlug = "free" | "starter" | "pro" | "enterprise";
export type SubStatus = "trialing" | "active" | "past_due" | "cancelled" | "paused";

export interface Subscription {
  customerId: string;
  plan: PlanSlug;
  status: SubStatus;
  trialEndsAt: string | null;    // ISO-8601 or null
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: {
    instances: number;            // max running containers
    aiRequestsPerMonth: number;   // max AI edit requests
    storageMb: number;
  };
  usage: {
    instances: number;
    aiRequestsThisPeriod: number;
    storageMb: number;
    resetAt: string;              // ISO-8601
  };
}

export interface ChangelogEntry {
  version: string;          // semver or date-based, e.g. "2026.5"
  date: string;             // ISO-8601 date
  type: "feature" | "fix" | "security" | "breaking";
  title: string;
  body: string;             // markdown
  affectsPlans?: PlanSlug[]; // if undefined → all plans
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
  url: string;              // link to the ticket in your support system
}

// ── Stub helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, customerId: string): Promise<T> {
  if (!API_URL) return stubFor<T>(path, customerId);
  const res = await fetch(`${API_URL}${path}?customerId=${encodeURIComponent(customerId)}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    next: { revalidate: 60 }, // cache 60 seconds
  });
  if (!res.ok) throw new Error(`Accounting API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getSubscription(customerId: string): Promise<Subscription> {
  return apiFetch<Subscription>("/subscriptions/current", customerId);
}

export async function getChangelog(limit = 20): Promise<ChangelogEntry[]> {
  // Changelog is public (not per-customer) — no customerId needed.
  if (!API_URL) return stubChangelog();
  const res = await fetch(`${API_URL}/changelog?limit=${limit}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Accounting API ${res.status}: /changelog`);
  return res.json() as Promise<ChangelogEntry[]>;
}

export async function getSupportTickets(customerId: string): Promise<SupportTicket[]> {
  return apiFetch<SupportTicket[]>("/support/tickets", customerId);
}

// ── Stubs (used when ACCOUNTING_API_URL is not set) ───────────────────────────
// Remove these once your billing server is live.

function stubFor<T>(path: string, customerId: string): T {
  if (path.includes("subscriptions")) return stubSubscription(customerId) as T;
  if (path.includes("tickets"))       return stubTickets() as T;
  throw new Error(`No stub for ${path}`);
}

function stubSubscription(customerId: string): Subscription {
  return {
    customerId,
    plan: "pro",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
    cancelAtPeriodEnd: false,
    limits: { instances: 5, aiRequestsPerMonth: 1000, storageMb: 2048 },
    usage:  { instances: 2, aiRequestsThisPeriod: 147, storageMb: 312, resetAt: new Date(Date.now() + 30 * 86400_000).toISOString() },
  };
}

function stubChangelog(): ChangelogEntry[] {
  return [
    {
      version: "2026.5",
      date: "2026-05-29",
      type: "feature",
      title: "Docker-based multi-instance deployment",
      body: "Each instance now runs as a single Docker container. One port, three paths: `/` website, `/tartanak/` dashboard, `/tartanak/edit/` CMS editor.",
    },
    {
      version: "2026.4",
      date: "2026-04-10",
      type: "feature",
      title: "Visual CMS editor with AI agent",
      body: "Right-click any element, describe the change, the AI agent edits the source file and hot-reloads the preview.",
    },
    {
      version: "2026.3",
      date: "2026-03-01",
      type: "fix",
      title: "Next.js cross-origin asset blocking resolved",
      body: "Added `allowedDevOrigins` config so assets load correctly when served through a reverse proxy.",
    },
  ];
}

function stubTickets(): SupportTicket[] {
  return [
    {
      id: "TKT-001",
      subject: "How do I add a new product category?",
      status: "resolved",
      priority: "normal",
      createdAt: "2026-05-20T10:00:00Z",
      updatedAt: "2026-05-21T14:30:00Z",
      url: "#",
    },
  ];
}
