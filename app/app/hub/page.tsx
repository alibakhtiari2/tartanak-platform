"use client";
/**
 * /hub — Customer portal
 * Shows: subscription status + usage meters + changelog
 */

import { useEffect, useState } from "react";
import type { Subscription, ChangelogEntry } from "@/lib/hub/accounting";

interface HubSession { customerId: string; name: string; plan: string; permissions: string[]; }
interface HubData    { session: HubSession; subscription: Subscription; changelog: ChangelogEntry[]; }

export default function HubPage() {
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hub/data")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); else setError(d.error); })
      .catch(() => setError("Could not load hub data."));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data)  return <LoadingState />;
  const { session, subscription: sub, changelog } = data;

  const pct = (used: number, max: number) => (max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100)));

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logoRow}>
            <span style={s.logo}>T</span>
            <span style={s.siteName}>Tartanak Hub</span>
          </div>
          <div style={s.customerInfo}>
            <span style={{ ...s.badge, ...planBadge(sub.plan) }}>{sub.plan}</span>
            <span style={s.customerName}>{session.name}</span>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* Subscription card */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Subscription</h2>
          <div style={s.subCard}>
            <div style={s.subRow}>
              <div>
                <div style={s.planName}>{sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan</div>
                <div style={s.planStatus}>{statusLabel(sub.status)}</div>
              </div>
              <span style={{ ...s.statusDot, background: statusColor(sub.status) }} />
            </div>
            {sub.currentPeriodEnd && (
              <div style={s.renewDate}>
                Renews {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>
        </section>

        {/* Usage meters */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Usage</h2>
          <div style={s.usageGrid}>
            <UsageMeter label="Instances" used={sub.usage.instances} max={sub.limits.instances} unit="" />
            <UsageMeter label="AI Requests" used={sub.usage.aiRequestsThisPeriod} max={sub.limits.aiRequestsPerMonth} unit="req" />
            <UsageMeter label="Storage" used={sub.usage.storageMb} max={sub.limits.storageMb} unit="MB" />
          </div>
          <p style={s.resetNote}>Resets {new Date(sub.usage.resetAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
        </section>

        {/* Changelog */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>What&apos;s New</h2>
          <div style={s.changelogList}>
            {changelog.map((entry) => (
              <div key={entry.version} style={s.changelogEntry}>
                <div style={s.changelogHeader}>
                  <span style={{ ...s.changelogBadge, ...typeBadge(entry.type) }}>{entry.type}</span>
                  <span style={s.changelogVersion}>{entry.version}</span>
                  <span style={s.changelogDate}>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div style={s.changelogTitle}>{entry.title}</div>
                <div style={s.changelogBody}>{entry.body}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function UsageMeter({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e";
  return (
    <div style={s.meter}>
      <div style={s.meterHeader}>
        <span style={s.meterLabel}>{label}</span>
        <span style={s.meterValue}>{used.toLocaleString()}{unit && ` ${unit}`} / {max.toLocaleString()}{unit && ` ${unit}`}</span>
      </div>
      <div style={s.meterTrack}>
        <div style={{ ...s.meterFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={{ ...s.meterPct, color }}>{pct}%</div>
    </div>
  );
}

function LoadingState() {
  return <div style={s.center}><div style={s.spinner} /></div>;
}
function ErrorState({ message }: { message: string }) {
  return (
    <div style={s.center}>
      <div style={s.errorCard}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
        <div style={{ color: "#f87171", marginBottom: 8 }}>{message}</div>
        <button style={s.retryBtn} onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  return { trialing: "Trial", active: "Active", past_due: "Payment due", cancelled: "Cancelled", paused: "Paused" }[status] ?? status;
}
function statusColor(status: string) {
  return { trialing: "#f59e0b", active: "#22c55e", past_due: "#ef4444", cancelled: "#64748b", paused: "#94a3b8" }[status] ?? "#64748b";
}
function planBadge(plan: string): React.CSSProperties {
  const colors: Record<string, string> = { free: "#475569", starter: "#2563eb", pro: "#7c3aed", enterprise: "#b45309" };
  return { background: `${colors[plan] ?? "#475569"}22`, color: colors[plan] ?? "#94a3b8", border: `1px solid ${colors[plan] ?? "#475569"}44` };
}
function typeBadge(type: string): React.CSSProperties {
  const c: Record<string, string> = { feature: "#2dd4bf", fix: "#22c55e", security: "#f59e0b", breaking: "#ef4444" };
  return { background: `${c[type] ?? "#94a3b8"}15`, color: c[type] ?? "#94a3b8", border: `1px solid ${c[type] ?? "#94a3b8"}30` };
}

const s: Record<string, React.CSSProperties> = {
  page:            { minHeight: "100vh", background: "#08111f" },
  header:          { borderBottom: "1px solid rgba(148,163,184,.1)", background: "rgba(15,23,42,.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 },
  headerInner:     { maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoRow:         { display: "flex", alignItems: "center", gap: 10 },
  logo:            { width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 9, border: "1px solid rgba(20,184,166,.4)", background: "rgba(15,23,42,.8)", color: "#fff", fontSize: 15, fontWeight: 950 },
  siteName:        { fontWeight: 800, fontSize: 16, color: "#ecfeff" },
  customerInfo:    { display: "flex", alignItems: "center", gap: 10 },
  badge:           { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize" as const },
  customerName:    { fontSize: 13, color: "#94a3b8" },
  main:            { maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 36 },
  section:         {},
  sectionTitle:    { margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: ".7px" },
  subCard:         { padding: "20px 22px", border: "1px solid rgba(148,163,184,.1)", borderRadius: 12, background: "rgba(15,23,42,.7)" },
  subRow:          { display: "flex", alignItems: "center", justifyContent: "space-between" },
  planName:        { fontSize: 18, fontWeight: 800, color: "#ecfeff" },
  planStatus:      { fontSize: 13, color: "#94a3b8", marginTop: 3 },
  statusDot:       { width: 12, height: 12, borderRadius: "50%" },
  renewDate:       { marginTop: 12, fontSize: 13, color: "#64748b" },
  usageGrid:       { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  meter:           { padding: "16px 18px", border: "1px solid rgba(148,163,184,.1)", borderRadius: 10, background: "rgba(15,23,42,.7)" },
  meterHeader:     { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  meterLabel:      { fontSize: 13, fontWeight: 700, color: "#cbd5e1" },
  meterValue:      { fontSize: 12, color: "#64748b" },
  meterTrack:      { height: 6, borderRadius: 3, background: "rgba(148,163,184,.12)", overflow: "hidden" },
  meterFill:       { height: "100%", borderRadius: 3, transition: "width .3s" },
  meterPct:        { marginTop: 6, fontSize: 12, fontWeight: 700 },
  resetNote:       { marginTop: 10, fontSize: 12, color: "#475569" },
  changelogList:   { display: "flex", flexDirection: "column", gap: 14 },
  changelogEntry:  { padding: "18px 20px", border: "1px solid rgba(148,163,184,.08)", borderRadius: 10, background: "rgba(15,23,42,.6)" },
  changelogHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" as const },
  changelogBadge:  { padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "capitalize" as const },
  changelogVersion:{ fontSize: 12, fontWeight: 700, color: "#5eead4" },
  changelogDate:   { fontSize: 12, color: "#475569", marginLeft: "auto" },
  changelogTitle:  { fontSize: 15, fontWeight: 700, color: "#ecfeff", marginBottom: 6 },
  changelogBody:   { fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  center:          { minHeight: "100vh", display: "grid", placeItems: "center" },
  spinner:         { width: 28, height: 28, border: "3px solid rgba(45,212,191,.2)", borderTopColor: "#2dd4bf", borderRadius: "50%", animation: "spin 1s linear infinite" },
  errorCard:       { textAlign: "center", padding: 32, border: "1px solid rgba(239,68,68,.2)", borderRadius: 12, background: "rgba(15,23,42,.7)" },
  retryBtn:        { marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(148,163,184,.2)", background: "rgba(15,23,42,.8)", color: "#94a3b8", cursor: "pointer", fontSize: 13 },
};
