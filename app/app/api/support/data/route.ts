/**
 * GET /api/support/data
 * Returns support tickets for the authenticated customer.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyHubSession } from "@/lib/hub/auth";
import { getSupportTickets } from "@/lib/hub/accounting";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyHubSession(cookieStore.get("hub-session")?.value ?? "");
  if (!session) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  try {
    const tickets = await getSupportTickets(session.customerId);
    return NextResponse.json({ ok: true, session, tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "accounting_error";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
