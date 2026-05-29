"use client";
/**
 * /support — Support portal
 * Shows: open tickets + documentation links + contact form
 */

import { useEffect, useState } from "react";
import type { SupportTicket } from "@/lib/hub/accounting";

interface SupportData { session: { name: string; plan: string }; tickets: SupportTicket[]; }

export default function SupportPage() {
  const [data, setData]   = useState<SupportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/support/data")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); else setError(d.error); })
      .catch(() => setError("Could not load support data."));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: POST to accounting server's ticket endpoint
    // fetch(`${ACCOUNTING_API_URL}/support/tickets`, { method: "POST", body: JSON.stringify({ subject, message }) })
    setSent(true);
  };

  if (error) return <ErrorState message={error} />;
  if (!data)  return <LoadingState />;
  const { tickets } = data;
  const open = tickets.filter((t) => t.status === "open" || t.status === "pending");

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logoRow}>
            <span style={s.logo}>T</span>
            <span style={s.siteName}>Tartanak Support</span>
          </div>
          <div style={s.navLinks}>
            <a href="/hub" style={s.navLink}>← Hub</a>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* Quick docs */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Documentation</h2>
          <div style={s.docGrid}>
            {[
              { icon: "🚀", title: "Getting Started", desc: "Deploy your first instance in 5 minutes.", href: "#docs/getting-started" },
              { icon: "✏️", title: "Visual Editor", desc: "Use the CMS editor to modify your site with AI.", href: "#docs/editor" },
              { icon: "⚙️", title: "Dashboard Guide", desc: "Configure agents, API keys, and messaging.", href: "#docs/dashboard" },
              { icon: "🐳", title: "Docker Deployment", desc: "Build and run your own instances.", href: "#docs/docker" },
            ].map((doc) => (
              <a key={doc.title} href={doc.href} style={s.docCard}>
                <span style={s.docIcon}>{doc.icon}</span>
                <div>
                  <div style={s.docTitle}>{doc.title}</div>
                  <div style={s.docDesc}>{doc.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Open tickets */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Open Tickets ({open.length})</h2>
          {open.length === 0 ? (
            <div style={s.emptyState}>No open tickets — all clear! 🎉</div>
          ) : (
            <div style={s.ticketList}>
              {open.map((t) => (
                <a key={t.id} href={t.url} target="_blank" rel="noreferrer" style={s.ticketCard}>
                  <div style={s.ticketTop}>
                    <span style={s.ticketId}>{t.id}</span>
                    <span style={{ ...s.ticketStatus, ...statusStyle(t.status) }}>{t.status}</span>
                    <span style={{ ...s.ticketPriority, ...priorityStyle(t.priority) }}>{t.priority}</span>
                  </div>
                  <div style={s.ticketSubject}>{t.subject}</div>
                  <div style={s.ticketDate}>Updated {new Date(t.updatedAt).toLocaleDateString()}</div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* New ticket form */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>New Ticket</h2>
          {sent ? (
            <div style={s.successCard}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>Ticket submitted</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>We&apos;ll get back to you within 24 hours.</div>
              <button style={s.btnSecondary} onClick={() => { setSent(false); setSubject(""); setMessage(""); }}>Submit another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={s.ticketForm}>
              <label style={s.label}>Subject</label>
              <input style={s.input} placeholder="Briefly describe your issue…" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              <label style={s.label}>Message</label>
              <textarea style={s.textarea} placeholder="Provide as much detail as possible…" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
              <button type="submit" style={s.btnPrimary}>Submit Ticket</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function LoadingState() { return <div style={s.center}><div style={s.spinner} /></div>; }
function ErrorState({ message }: { message: string }) {
  return <div style={s.center}><div style={{ color: "#f87171", textAlign: "center", padding: 32 }}>⚠ {message}<br /><button style={s.btnSecondary} onClick={() => window.location.reload()}>Retry</button></div></div>;
}

function statusStyle(s: string): React.CSSProperties {
  const c: Record<string, string> = { open: "#2dd4bf", pending: "#f59e0b", resolved: "#22c55e", closed: "#64748b" };
  return { background: `${c[s] ?? "#475569"}18`, color: c[s] ?? "#94a3b8", border: `1px solid ${c[s] ?? "#475569"}30` };
}
function priorityStyle(p: string): React.CSSProperties {
  const c: Record<string, string> = { low: "#64748b", normal: "#94a3b8", high: "#f59e0b", urgent: "#ef4444" };
  return { background: `${c[p] ?? "#475569"}18`, color: c[p] ?? "#94a3b8", border: `1px solid ${c[p] ?? "#475569"}30` };
}

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight: "100vh", background: "#08111f" },
  header:       { borderBottom: "1px solid rgba(148,163,184,.1)", background: "rgba(15,23,42,.8)", position: "sticky", top: 0, zIndex: 10 },
  headerInner:  { maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoRow:      { display: "flex", alignItems: "center", gap: 10 },
  logo:         { width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 9, border: "1px solid rgba(20,184,166,.4)", background: "rgba(15,23,42,.8)", color: "#fff", fontSize: 15, fontWeight: 950 },
  siteName:     { fontWeight: 800, fontSize: 16, color: "#ecfeff" },
  navLinks:     { display: "flex", gap: 16 },
  navLink:      { fontSize: 13, color: "#5eead4", textDecoration: "none" },
  main:         { maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 36 },
  section:      {},
  sectionTitle: { margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: ".7px" },
  docGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
  docCard:      { padding: "18px", border: "1px solid rgba(148,163,184,.1)", borderRadius: 10, background: "rgba(15,23,42,.6)", display: "flex", gap: 14, textDecoration: "none", cursor: "pointer", transition: "border-color .15s" },
  docIcon:      { fontSize: 22, flexShrink: 0 },
  docTitle:     { fontSize: 14, fontWeight: 700, color: "#ecfeff", marginBottom: 4 },
  docDesc:      { fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  emptyState:   { padding: "24px 20px", textAlign: "center", color: "#475569", fontSize: 14, border: "1px solid rgba(148,163,184,.08)", borderRadius: 10 },
  ticketList:   { display: "flex", flexDirection: "column", gap: 10 },
  ticketCard:   { padding: "16px 18px", border: "1px solid rgba(148,163,184,.1)", borderRadius: 10, background: "rgba(15,23,42,.6)", textDecoration: "none", display: "block" },
  ticketTop:    { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  ticketId:     { fontSize: 11, fontWeight: 700, color: "#475569", fontFamily: "monospace" },
  ticketStatus: { padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "capitalize" as const },
  ticketPriority: { padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "capitalize" as const },
  ticketSubject:  { fontSize: 14, fontWeight: 600, color: "#ecfeff", marginBottom: 6 },
  ticketDate:     { fontSize: 12, color: "#475569" },
  ticketForm:   { display: "flex", flexDirection: "column", gap: 14 },
  label:        { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: ".5px" },
  input:        { padding: "10px 14px", border: "1px solid rgba(148,163,184,.15)", borderRadius: 8, background: "rgba(2,6,23,.8)", color: "#f8fafc", fontSize: 14, outline: "none" },
  textarea:     { padding: "10px 14px", border: "1px solid rgba(148,163,184,.15)", borderRadius: 8, background: "rgba(2,6,23,.8)", color: "#f8fafc", fontSize: 14, outline: "none", resize: "vertical" as const, fontFamily: "inherit" },
  btnPrimary:   { padding: "11px 24px", border: "none", borderRadius: 8, background: "#2dd4bf", color: "#042f2e", fontWeight: 800, fontSize: 14, cursor: "pointer" },
  btnSecondary: { marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(148,163,184,.2)", background: "rgba(15,23,42,.8)", color: "#94a3b8", fontSize: 13, cursor: "pointer" },
  successCard:  { padding: "32px", textAlign: "center", border: "1px solid rgba(34,197,94,.2)", borderRadius: 12, background: "rgba(15,23,42,.7)" },
  center:       { minHeight: "100vh", display: "grid", placeItems: "center" },
  spinner:      { width: 28, height: 28, border: "3px solid rgba(45,212,191,.2)", borderTopColor: "#2dd4bf", borderRadius: "50%", animation: "spin 1s linear infinite" },
};
