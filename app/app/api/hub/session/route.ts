/**
 * GET /api/hub/session
 * Returns the current hub session info. Full HMAC verification using Node.js crypto.
 * Called by hub/support pages to get the authenticated customer context.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyHubSession } from "@/lib/hub/auth";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("hub-session")?.value ?? "";
  const session = verifyHubSession(raw);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, session });
}
