"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Car,
  CheckCircle2,
  CloudSun,
  Cpu,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Radio,
  Sparkles,
  Utensils
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommandMode = {
  key: "order" | "weather" | "infra" | "garage";
  label: string;
  title: string;
  text: string;
  icon: typeof Utensils;
  accent: string;
  glow: string;
  stat: string;
  statLabel: string;
  steps: string[];
  sample: string;
};

const commandModes: CommandMode[] = [
  {
    key: "order",
    label: "Order",
    title: "سفارش‌گیری مرحله‌ای",
    text: "چت تارتنک حالا سفارش را مثل یک اپ واقعی جمع می‌کند: آیتم‌ها، نام، تلفن، آدرس و تایید نهایی.",
    icon: Utensils,
    accent: "#a7c957",
    glow: "rgba(167,201,87,0.36)",
    stat: "4-step",
    statLabel: "order flow",
    steps: ["آیتم‌ها", "نام", "تلفن", "آدرس", "تایید"],
    sample: "سفارش: ۲ پیتزا، یک ماچا و کوکاکولای بنفش"
  },
  {
    key: "weather",
    label: "Weather",
    title: "پاسخ‌های آب‌وهوا",
    text: "برای دما، بارش، باد و تصمیم بیرون رفتن، کاربر فقط شهر و سوالش را می‌نویسد و مسیر پاسخ روشن می‌شود.",
    icon: CloudSun,
    accent: "#59e1c2",
    glow: "rgba(89,225,194,0.32)",
    stat: "live",
    statLabel: "forecast intent",
    steps: ["شهر", "زمان", "دما", "بارش", "پیشنهاد"],
    sample: "هوای وین امروز برای بیرون رفتن خوبه؟"
  },
  {
    key: "infra",
    label: "Infra",
    title: "اتاق کنترل سرورها",
    text: "زیرساخت، مانیتورینگ، بکاپ و uptime در یک زبان ساده توضیح داده می‌شوند تا کاربر گیر نکند.",
    icon: Cpu,
    accent: "#f7c948",
    glow: "rgba(247,201,72,0.32)",
    stat: "99.9%",
    statLabel: "calm target",
    steps: ["لاگ", "هشدار", "بکاپ", "شبکه", "اقدام"],
    sample: "برای بکاپ سرور چه پیشنهادی داری؟"
  },
  {
    key: "garage",
    label: "Garage",
    title: "گاراژ فنی خودرو",
    text: "سوال‌های خودرو به زبان فنی اما قابل فهم پاسخ می‌گیرند: ترمز، موتور، برق، مصرف و سرویس دوره‌ای.",
    icon: Car,
    accent: "#ff8f5a",
    glow: "rgba(255,143,90,0.3)",
    stat: "check",
    statLabel: "drive ready",
    steps: ["مدل", "علامت", "ریسک", "چک", "اقدام"],
    sample: "ماشین موقع ترمز لرزش دارد، از کجاست؟"
  }
];

export function TartanakCommandCenter() {
  const [activeKey, setActiveKey] = useState<CommandMode["key"]>("order");

  const activeMode = useMemo(
    () => commandModes.find((mode) => mode.key === activeKey) ?? commandModes[0],
    [activeKey]
  );

  const ActiveIcon = activeMode.icon;

  return (
    <section
      id="tartanak-command-center"
      className="relative overflow-hidden bg-[#0b1110] py-24 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(167,201,87,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(89,225,194,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/12" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-[#a7c957]" />
            <p className="text-sm font-black tracking-[0.22em] text-[#a7c957]">
              TARTANAK AGENT LAYER
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            یک لایه هوشمند که سایت را از بروشور به ابزار تبدیل می‌کند.
          </h2>
          <p className="mt-6 text-lg leading-9 text-white/68">
            این بخش مثل کنترل‌پنل زنده تارتنک کار می‌کند: کاربر می‌تواند سفارش
            را شروع کند، درباره هوا بپرسد، مشکل سرور را توضیح دهد یا سراغ خودرو
            برود. هر مسیر واضح، سریع و قابل ادامه است.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {commandModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeKey === mode.key;

              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setActiveKey(mode.key)}
                  className={cn(
                    "group flex min-h-[92px] flex-col items-start justify-between rounded-lg border p-4 text-left transition duration-300",
                    isActive
                      ? "border-white/24 bg-white text-[#0b1110]"
                      : "border-white/10 bg-white/[0.06] text-white/70 hover:border-white/22 hover:bg-white/[0.1]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 transition",
                      isActive ? "text-[#6f8f35]" : "text-white/58"
                    )}
                  />
                  <span className="text-sm font-black">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <motion.div
            className="absolute -inset-4 rounded-[28px] blur-3xl"
            animate={{ backgroundColor: activeMode.glow }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />

          <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#111817]/92 p-4 shadow-[0_34px_90px_rgba(0,0,0,0.42)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-full"
                  style={{ backgroundColor: activeMode.accent }}
                >
                  <ActiveIcon className="h-6 w-6 text-[#07100d]" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                    command center
                  </p>
                  <h3 className="text-xl font-black">{activeMode.title}</h3>
                </div>
              </div>
              <Radio className="h-5 w-5 animate-pulse text-[#a7c957]" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeMode.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="grid gap-4 pt-5"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_148px]">
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                    <p className="leading-8 text-white/70">{activeMode.text}</p>
                    <div className="mt-5 flex items-center gap-2 rounded-lg bg-black/24 p-3 text-sm text-white/78">
                      <MessageSquareText className="h-5 w-5 shrink-0 text-[#a7c957]" />
                      <span>{activeMode.sample}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                      signal
                    </p>
                    <div className="mt-3 text-3xl font-black">
                      {activeMode.stat}
                    </div>
                    <p className="mt-2 text-sm font-bold text-white/50">
                      {activeMode.statLabel}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-5">
                  {activeMode.steps.map((step, index) => (
                    <motion.div
                      key={step}
                      className="rounded-lg border border-white/10 bg-white/[0.05] p-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035, duration: 0.22 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-black">
                          {index + 1}
                        </span>
                        {index < activeMode.steps.length - 1 ? (
                          <CheckCircle2 className="h-4 w-4 text-[#a7c957]" />
                        ) : (
                          <PackageCheck className="h-4 w-4 text-[#f7c948]" />
                        )}
                      </div>
                      <p className="mt-3 text-sm font-black">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/56">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#a7c957]" />
                آماده اتصال به چت، سفارش و پنل مدیریت
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#59e1c2]" />
                Tartanak / Vienna-ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
