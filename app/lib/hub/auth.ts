/**
 * Hub / Support authentication
 *
 * Auth flow:
 *  1. Accounting server generates a signed token and redirects the customer to:
 *       https://name.tartanak.com/hub?t=<TOKEN>
 *  2. Next.js middleware (middleware.ts) validates the token.
 *  3. On success → set `hub-session` cookie, strip `?t=` from URL.
 *  4. Subsequent requests are validated by the cookie alone.
 *
 * Token format: <base64url(payload)>.<hmac-sha256-hex>
 *   payload: { sub, plan, permissions, iat, exp }
 *   signature: HMAC-SHA256(base64url(payload), HUB_SECRET)
 *
 * The accounting server and this app share HUB_SECRET.
 */

import crypto from "node:crypto";

const HUB_SECRET = process.env.HUB_SECRET ?? "";
export const HUB_SESSION_COOKIE = "hub-session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// ── Token types ───────────────────────────────────────────────────────────────

export interface HubTokenPayload {
  sub: string;         // customer ID
  name?: string;       // customer display name
  plan: string;        // subscription plan slug
  permissions: string[]; // e.g. ["hub:read", "support:write"]
  iat: number;         // issued-at  (unix seconds)
  exp: number;         // expires-at (unix seconds)
}

export interface HubSession {
  customerId: string;
  name: string;
  plan: string;
  permissions: string[];
  expiresAt: number;   // ms
}

// ── Token verification ────────────────────────────────────────────────────────

function b64urlEncode(s: string): string {
  return Buffer.from(s).toString("base64url");
}
function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", HUB_SECRET).update(data).digest("hex");
}

/** Verify a token string and return its payload, or null on failure. */
export function verifyHubToken(token: string): HubTokenPayload | null {
  if (!HUB_SECRET) return null; // misconfigured — reject all
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    if (!crypto.timingSafeEqual(Buffer.from(sign(payloadB64)), Buffer.from(sig))) return null;
    const payload: HubTokenPayload = JSON.parse(b64urlDecode(payloadB64));
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Create a session token from a validated hub payload (stored in cookie). */
export function createHubSession(payload: HubTokenPayload): string {
  const session: HubSession = {
    customerId: payload.sub,
    name: payload.name ?? payload.sub,
    plan: payload.plan,
    permissions: payload.permissions,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const data = b64urlEncode(JSON.stringify(session));
  return `${data}.${sign(data)}`;
}

/** Verify a session cookie value and return the session, or null. */
export function verifyHubSession(cookie: string): HubSession | null {
  if (!HUB_SECRET) return null;
  try {
    const dotIdx = cookie.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const data = cookie.slice(0, dotIdx);
    const sig  = cookie.slice(dotIdx + 1);
    if (!crypto.timingSafeEqual(Buffer.from(sign(data)), Buffer.from(sig))) return null;
    const session: HubSession = JSON.parse(b64urlDecode(data));
    if (Date.now() > session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

/** Build a Set-Cookie header value for a hub session. */
export function makeSessionCookie(sessionToken: string, secure: boolean): string {
  const ttlSecs = Math.floor(SESSION_TTL_MS / 1000);
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSecs}${secure ? "; Secure" : ""}`;
  return `${HUB_SESSION_COOKIE}=${sessionToken}; ${flags}`;
}

// ── Token generation (for the accounting server / testing) ────────────────────

/**
 * Generate a signed token. Used by the accounting server to create deep-links.
 *
 * Example:
 *   const token = generateHubToken({ sub: "cus_123", plan: "pro", permissions: ["hub:read","support:write"] });
 *   const url = `https://myshop.tartanak.com/hub?t=${token}`;
 */
export function generateHubToken(
  payload: Omit<HubTokenPayload, "iat" | "exp">,
  ttlSeconds = 300,
): string {
  const now = Math.floor(Date.now() / 1000);
  const full: HubTokenPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const data = b64urlEncode(JSON.stringify(full));
  return `${data}.${sign(data)}`;
}
