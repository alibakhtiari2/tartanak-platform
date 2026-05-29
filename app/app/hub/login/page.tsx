/**
 * /hub/login — shown when a user reaches /hub without a valid session.
 * Normally users arrive via a signed link from the accounting server.
 * This page explains what to do if the link is missing or expired.
 */

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in — Tartanak Hub" };

export default async function HubLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>T</div>
        <h1 style={styles.h1}>Tartanak Hub</h1>
        <p style={styles.sub}>Your subscription &amp; platform portal</p>

        {error === "invalid_token" && (
          <div style={styles.error}>
            This link has expired or is invalid. Please request a new one.
          </div>
        )}

        <div style={styles.info}>
          <p>To access the Hub, open the link sent to you by the Tartanak platform.</p>
          <p>
            The link looks like:<br />
            <code style={styles.code}>https://yoursite.tartanak.com/hub?t=…</code>
          </p>
          <p>
            If you don&apos;t have a link, contact your account manager or visit{" "}
            <a style={styles.link} href="https://tartanak.com/support">tartanak.com/support</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root:  { minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" },
  card:  { width: "min(440px, 100%)", padding: "40px 36px", border: "1px solid rgba(20,184,166,.25)", borderRadius: "16px", background: "rgba(15,23,42,.9)", boxShadow: "0 24px 70px rgba(2,6,23,.5)" },
  logo:  { width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 14, border: "1px solid rgba(20,184,166,.4)", background: "rgba(15,23,42,.8)", color: "#fff", fontSize: 22, fontWeight: 950, margin: "0 auto 20px" },
  h1:    { margin: "0 0 6px", fontSize: 24, textAlign: "center", color: "#ecfeff" },
  sub:   { margin: "0 0 24px", color: "#64748b", fontSize: 14, textAlign: "center" },
  error: { marginBottom: 20, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", fontSize: 14 },
  info:  { color: "#94a3b8", fontSize: 14, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 },
  code:  { display: "block", marginTop: 6, padding: "8px 12px", borderRadius: 7, background: "rgba(2,6,23,.8)", border: "1px solid rgba(148,163,184,.15)", color: "#5eead4", fontSize: 12, wordBreak: "break-all" },
  link:  { color: "#2dd4bf" },
};
