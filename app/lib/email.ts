import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass
    }
  });
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER;

  if (!from) {
    throw new Error("Email sender is not configured.");
  }

  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
}
