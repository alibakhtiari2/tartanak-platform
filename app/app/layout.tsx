import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ChatLauncher } from "@/components/chat-launcher";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazirmatn"
});

export const metadata: Metadata = {
  title: "Tartanak | فروشگاه لوازم بچه‌گانه",
  description:
    "فروشگاه فارسی لوازم بچه‌گانه تارتنک با دسته‌بندی روشن، سفارش سریع و خرید مطمئن برای خانواده‌ها"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} font-sans antialiased`}>
        {children}
        <ChatLauncher />
      </body>
    </html>
  );
}
