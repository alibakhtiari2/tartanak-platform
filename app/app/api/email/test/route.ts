import { NextRequest } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";

type TestEmailPayload = {
  to?: string;
  subject?: string;
  message?: string;
  secret?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as TestEmailPayload;
  const expectedSecret = process.env.EMAIL_TEST_SECRET;

  if (expectedSecret && payload.secret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return Response.json(
      {
        error:
          "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local."
      },
      { status: 500 }
    );
  }

  const to = payload.to?.trim();

  if (!to || !isValidEmail(to)) {
    return Response.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const subject = payload.subject?.trim() || "Tartanak test email";
  const message =
    payload.message?.trim() ||
    "This is a test email from the Tartanak website email service.";

  const result = await sendEmail({
    to,
    subject,
    text: message,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${subject}</h2><p>${message}</p></div>`
  });

  return Response.json({ ok: true, result });
}
