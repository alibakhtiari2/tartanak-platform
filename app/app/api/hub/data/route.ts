/**
 * GET /api/hub/data
 * Returns subscription + changelog for the authenticated customer.
 * Full HMAC verification + accounting API call.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyHubSession } from "@/lib/hub/auth";
import { getSubscription, getChangelog } from "@/lib/hub/accounting";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyHubSession(cookieStore.get("hub-session")?.value ?? "");
  if (!session) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  try {
    const [subscription, changelog] = await Promise.all([
      getSubscription(session.customerId),
      getChangelog(10),
    ]);
    return NextResponse.json({ ok: true, session, subscription, changelog });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "accounting_error";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
