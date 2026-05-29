"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock3,
  Home,
  Leaf,
  Search,
  Sparkles,
  UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";

type MatchaNavItem = {
  key: "home" | "explore" | "matcha" | "ritual" | "profile";
  label: string;
  icon: typeof Home;
  title: string;
  eyebrow: string;
  text: string;
  metric: string;
  accent: string;
  center?: boolean;
};

const navItems: MatchaNavItem[] = [
  {
    key: "home",
    label: "Tartanak",
    icon: Home,
    title: "خانه تارتنک",
    eyebrow: "SERVER ROOM",
    text: "نمای کلی تارتنک با همان ترکیب آشنا: زیرساخت، خودرو، خوراکی‌های زنده و کمی کنجکاوی رنگی.",
    metric: "uptime calm",
    accent: "#64d2c0"
  },
  {
    key: "explore",
    label: "Explore",
    icon: Search,
    title: "کاوش بین بخش‌ها",
    eyebrow: "LIVE DISCOVERY",
    text: "مسیرهای صفحه، API فروشگاه‌ها و ایده‌های تازه را مثل یک داشبورد کوچک قابل لمس می‌کند.",
    metric: "fresh routes",
    accent: "#f7c948"
  },
  {
    key: "matcha",
    label: "Matcha",
    icon: Leaf,
    title: "ماچای سبز",
    eyebrow: "CENTER ACTION",
    text: "یک مکث سبز و نرم وسط روز؛ برای وقتی که لاگ‌ها زیاد شده‌اند و ذهن به کمی کافئین دقیق نیاز دارد.",
    metric: "matcha ready",
    accent: "#a7c957",
    center: true
  },
  {
    key: "ritual",
    label: "Logs",
    icon: Clock3,
    title: "آیین روزانه",
    eyebrow: "ACTIVE TAB",
    text: "چک‌کردن وضعیت، مرور مسیرها، نوشیدن ماچا و برگشتن به کار با تمرکز بیشتر. بسیار منظم؛ تقریبا آرامش‌بخش.",
    metric: "17:00 focus",
    accent: "#ffffff"
  },
  {
    key: "profile",
    label: "Profile",
    icon: UserRound,
    title: "پروفایل تارتنک",
    eyebrow: "IDENTITY",
    text: "جایی برای شخصیت پروژه: فارسی، فنی، کمی شوخ، و آماده برای اینکه بخش بعدی صفحه را به چیزی بهتر تبدیل کند.",
    metric: "identity set",
    accent: "#43e7ff"
  }
];

export function MatchaBottomNavSection() {
  const [activeKey, setActiveKey] = useState<MatchaNavItem["key"]>("ritual");
  const [matchaLevel, setMatchaLevel] = useState(2);

  const activeItem = useMemo(
    () => navItems.find((item) => item.key === activeKey) ?? navItems[3],
    [activeKey]
  );

  const activeIndex = navItems.findIndex((item) => item.key === activeKey);
  const tiltByIndex = [-2.2, -1.2, 0, 1.1, 2.1][activeIndex] ?? 0;

  const handleSelect = (key: MatchaNavItem["key"]) => {
    setActiveKey(key);

    if (key === "matcha") {
      setMatchaLevel((currentLevel) =>
        currentLevel === 4 ? 1 : currentLevel + 1
      );
    }
  };

  return (
    <section
      id="matcha-green-tea"
      className="scroll-mt-28 bg-[#f0f0f0] px-4 py-24 text-[#1b1b1b] md:px-8"
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-[#6f8f35]" />
            <p className="text-sm font-black tracking-[0.22em] text-[#6f8f35]">
              TARTANAK MATCHA MODE
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            چای سبز ماچا برای لحظه‌ای آرام بین سرور، خودرو و کنجکاوی.
          </h2>
          <p className="mt-6 text-lg leading-9 text-[#595a51]">
            این بخش، نوار پایین تارتنک را مثل یک شیء واقعی نشان می‌دهد: تیره،
            شناور، کمی ایزومتریک و آماده برای یک مسیر تازه. دکمه وسط به ماچا
            اختصاص دارد؛ همان مکث سبزی که وسط روز پر از لاگ، مسیر و ایده لازم
            می‌شود.
          </p>
          <div className="mt-7 min-h-[220px] rounded-lg border border-[#d6dcc8] bg-white/75 p-5 shadow-[0_18px_45px_rgba(83,94,67,0.12)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                aria-live="polite"
              >
                <p className="text-xs font-black tracking-[0.2em] text-[#7fa23b]">
                  {activeItem.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  {activeItem.title}
                </h3>
                <p className="mt-3 leading-8 text-[#626358]">
                  {activeItem.text}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#1e1e24] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                    {activeItem.metric}
                  </span>
                  <span className="rounded-full bg-[#dfe9c6] px-4 py-2 text-xs font-black text-[#536d20]">
                    matcha level {matchaLevel}/4
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden rounded-lg bg-[#f0f0f0] px-3 py-16">
          <motion.div
            className="absolute right-8 top-12 h-24 w-24 rounded-full opacity-65 blur-2xl"
            animate={{ backgroundColor: activeItem.accent, scale: activeKey === "matcha" ? 1.18 : 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ backgroundColor: activeItem.accent }}
          />
          <div className="absolute left-8 top-10 h-2 w-24 rounded-full bg-[#dbe3cf]" />
          <div className="absolute left-8 top-10 h-2 rounded-full bg-[#7fa23b] transition-[width] duration-300" style={{ width: `${(matchaLevel / 4) * 96}px` }} />
          <div className="absolute bottom-16 h-10 w-[min(78vw,390px)] rounded-full bg-black/22 blur-2xl" />

          <div
            className="relative w-[min(92vw,420px)] max-w-full"
            dir="ltr"
            style={{ perspective: "980px" }}
          >
            <motion.div
              className="relative h-[110px] rounded-[32px] bg-[#1e1e24] px-4 pt-5 shadow-[0_34px_42px_rgba(24,24,28,0.34)] sm:px-5"
              animate={{
                rotateX: 16,
                rotateZ: tiltByIndex,
                y: activeKey === "matcha" ? -3 : 0
              }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
              style={{
                transformStyle: "preserve-3d"
              }}
            >
              <div className="pointer-events-none absolute inset-y-2 -left-2 w-6 rounded-l-[30px] bg-[#15151a]" />
              <div className="pointer-events-none absolute inset-y-2 -right-2 w-6 rounded-r-[30px] bg-[#2a2a31]" />
              <div className="relative z-10 flex h-[74px] items-start justify-between">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isCenter = item.center === true;
                  const isActive = item.key === activeKey;

                  if (isCenter) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleSelect(item.key)}
                        className="-mt-7 flex w-[66px] flex-col items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a7c957] sm:w-[68px]"
                        aria-label="Matcha action"
                        aria-pressed={isActive}
                      >
                        <motion.span
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7fa23b] text-white shadow-[0_14px_28px_rgba(127,162,59,0.36),inset_0_1px_0_rgba(255,255,255,0.35)]"
                          animate={{
                            scale: isActive ? 1.1 : 1,
                            y: isActive ? -3 : 0
                          }}
                          whileHover={{ scale: isActive ? 1.12 : 1.05 }}
                          whileTap={{ scale: 0.96 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        >
                          <Icon
                            className={cn(
                              "h-8 w-8",
                              isActive ? "animate-pulse" : ""
                            )}
                            strokeWidth={2.4}
                          />
                        </motion.span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelect(item.key)}
                      className="group flex w-[56px] flex-col items-center gap-2 rounded-lg pt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-[62px]"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <motion.span
                        animate={{ y: isActive ? -3 : 0 }}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      >
                        <Icon
                          className={cn(
                            "h-7 w-7 transition-colors duration-300",
                            isActive
                              ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.42)]"
                              : "text-[#888888] group-hover:text-white/80"
                          )}
                          strokeWidth={isActive ? 2.45 : 1.85}
                        />
                      </motion.span>
                      <span
                        className={cn(
                          "max-w-full truncate text-[10px] leading-none transition-colors duration-300 sm:text-[11px]",
                          isActive
                            ? "font-black text-white"
                            : "font-bold text-[#888888] group-hover:text-white/80"
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="absolute bottom-3 left-1/2 h-[5px] w-[120px] -translate-x-1/2 rounded-full bg-[#8d8d93]" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
