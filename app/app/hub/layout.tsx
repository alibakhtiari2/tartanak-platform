import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub — Tartanak",
  description: "Manage your Tartanak subscription, usage, and updates.",
};

// Hub/Support use LTR layout (platform management, not RTL store content)
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body style={{ margin: 0, background: "#08111f", color: "#ecfeff", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
