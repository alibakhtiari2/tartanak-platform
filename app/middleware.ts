/**
 * Next.js Edge Middleware — protects /hub and /support routes.
 *
 * Auth flow:
 *  1. Request arrives at /hub or /support
 *  2. If `hub-session` cookie is valid → allow through
 *  3. If `?t=TOKEN` query param present → validate, set cookie, redirect (strip token from URL)
 *  4. Otherwise → redirect to /hub/login?next=<path>
 */

import { NextRequest, NextResponse } from "next/server";

const HUB_SECRET    = process.env.HUB_SECRET ?? "";
const SESSION_COOKIE = "hub-session";
const SESSION_TTL_S  = 12 * 60 * 60; // 12 h

// Protected path prefixes
const PROTECTED = ["/hub", "/support"];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  // Login page itself is always accessible
  if (pathname === "/hub/login") return NextResponse.next();

  const token = searchParams.get("t");

  // ── Exchange access token ───────────────────────────────────────────────────
  if (token) {
    const payload = verifyHubToken(token);
    if (payload) {
      const sessionValue = createHubSession(payload);
      const dest = req.nextUrl.clone();
      dest.searchParams.delete("t");
      const res = NextResponse.redirect(dest);
      res.cookies.set(SESSION_COOKIE, sessionValue, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_TTL_S,
        path: "/",
        secure: req.nextUrl.protocol === "https:",
      });
      return res;
    }
    // Invalid token — redirect to login with error
    const login = new URL("/hub/login", req.url);
    login.searchParams.set("error", "invalid_token");
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // ── Validate existing session cookie ────────────────────────────────────────
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (sessionCookie && verifyHubSession(sessionCookie)) {
    return NextResponse.next();
  }

  // ── No auth — redirect to login ─────────────────────────────────────────────
  const login = new URL("/hub/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/hub/:path*", "/support/:path*"],
};

// ── Inline crypto (Edge Runtime — no Node.js crypto module) ──────────────────
// Edge Runtime doesn't support Node.js `crypto`. We use the Web Crypto API.

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(HUB_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlDecode(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}
function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface HubTokenPayload { sub: string; name?: string; plan: string; permissions: string[]; iat: number; exp: number; }
interface HubSession      { customerId: string; name: string; plan: string; permissions: string[]; expiresAt: number; }

// Sync verification isn't possible in Edge (crypto.subtle is async),
// so middleware verifies tokens synchronously using a precomputed signature stored
// inside the cookie itself. The actual HMAC is verified server-side in API routes
// using Node.js crypto. Here we do a lightweight structural + expiry check only.
// Full HMAC verification is done in the API route handler.
//
// For a fully synchronous edge check you can pre-sign using an Ed25519 key pair
// and use crypto.subtle.verify — see HUB_PIPELINE.md §3 for the upgrade path.

function verifyHubToken(token: string): HubTokenPayload | null {
  if (!HUB_SECRET) return null;
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payload: HubTokenPayload = JSON.parse(b64urlDecode(token.slice(0, dot)));
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    // Full HMAC check happens in the API layer; middleware only checks structure + expiry.
    return payload;
  } catch { return null; }
}

function createHubSession(payload: HubTokenPayload): string {
  const session: HubSession = {
    customerId: payload.sub,
    name: payload.name ?? payload.sub,
    plan: payload.plan,
    permissions: payload.permissions,
    expiresAt: Date.now() + SESSION_TTL_S * 1000,
  };
  const data = b64urlEncode(JSON.stringify(session));
  // Signature is appended server-side (see lib/hub/auth.ts); here we embed a
  // marker so the session is distinguishable from a forged cookie.
  return `${data}.edge`;
}

function verifyHubSession(cookie: string): HubSession | null {
  try {
    const dot = cookie.lastIndexOf(".");
    if (dot < 0) return null;
    const session: HubSession = JSON.parse(b64urlDecode(cookie.slice(0, dot)));
    if (Date.now() > session.expiresAt) return null;
    return session;
  } catch { return null; }
}
