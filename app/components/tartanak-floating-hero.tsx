"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowDown,
  BarChart3,
  CheckCircle2,
  PackageCheck,
  MessageSquareText,
  ShoppingBag,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useRef } from "react";

const floatingImages = [
  {
    src: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1000&q=85",
    alt: "اتاق کودک با وسایل مرتب و روشن",
    label: "ویترین لوازم کودک",
    className:
      "left-3 top-7 h-36 w-44 sm:left-8 sm:top-10 sm:h-44 sm:w-56 lg:h-52 lg:w-64",
    motion: -38
  },
  {
    src: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85",
    alt: "لباس و وسایل نوزاد برای فروشگاه کودک",
    label: "دسته‌بندی سریع",
    className:
      "right-3 top-24 h-32 w-40 sm:right-10 sm:top-28 sm:h-40 sm:w-52 lg:h-48 lg:w-60",
    motion: 44
  },
  {
    src: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85",
    alt: "محصولات نرم و رنگی کودک",
    label: "سفارش مطمئن",
    className:
      "bottom-5 left-12 h-32 w-48 sm:bottom-8 sm:left-20 sm:h-40 sm:w-60 lg:h-48 lg:w-72",
    motion: 30
  }
];

const metrics = [
  { icon: PackageCheck, value: "۲۴ساعته", label: "آماده ارسال" },
  { icon: BarChart3, value: "۳۵۰+", label: "محصول کودک" },
  { icon: ShieldCheck, value: "امن", label: "پرداخت و سفارش" }
];

function FloatingImageCard({
  image,
  scrollYProgress,
  shouldReduceMotion
}: {
  image: (typeof floatingImages)[number];
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  shouldReduceMotion: boolean | null;
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, shouldReduceMotion ? 0 : image.motion]
  );

  return (
    <motion.div
      data-component="FloatingImageCard"
      style={{ y }}
      className={`absolute z-10 hidden overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)] sm:block ${image.className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(max-width: 768px) 45vw, 280px"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f172a]/80 to-transparent p-3 text-xs font-black text-white">
        {image.label}
      </div>
    </motion.div>
  );
}

export function TartanakFloatingHero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  const heroLift = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -56]);
  const proofDrift = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 34]);

  return (
    <section
      ref={sectionRef}
      id="tartanak-home"
      data-component="TartanakFloatingHero"
      className="relative isolate overflow-hidden bg-[#f8fafc] text-[#0f172a]"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_48%,#ffffff_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 border-b border-[#cbd5e1] bg-white/70" />

      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-16 md:py-20 lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
        <motion.div
          style={{ y: heroLift }}
          className="relative z-10 max-w-3xl pt-8 lg:pt-0"
        >
          <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#2563eb] shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            فروشگاه کودک تارتنک
          </div>

          <h1 className="mt-7 max-w-4xl text-3xl font-black leading-[1.12] text-[#0f172a] sm:text-5xl sm:leading-[1.08] lg:text-7xl">
            فروشگاه لوازم بچه‌گانه تارتنک؛ خرید آرام برای خانواده‌های دقیق.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-[#475569] sm:text-lg">
            یک ویترین فارسی برای پوشک، لباس، کالسکه، مراقبت کودک و هدیه‌های
            نوزادی؛ با دسته‌بندی روشن، سفارش سریع، وضعیت موجودی و مسیر خریدی
            که برای والدین خسته هم قابل اسکن است.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#tartanak-command-center"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#dc2626] px-5 py-3 text-sm font-black text-white shadow-[0_18px_42px_rgba(220,38,38,0.24)] transition hover:-translate-y-0.5 hover:bg-[#b91c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]"
            >
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
              مشاوره خرید کودک
            </a>
            <a
              href="#tartanak-capabilities"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-black text-[#0f172a] shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#14b8a6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14b8a6]"
            >
              <Sparkles className="h-5 w-5 text-[#14b8a6]" aria-hidden="true" />
              دیدن دسته‌بندی‌ها
            </a>
          </div>

          <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-[#cbd5e1] bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)]"
              >
                <metric.icon className="h-5 w-5 text-[#14b8a6]" aria-hidden="true" />
                <div className="mt-3 text-2xl font-black text-[#0f172a]">{metric.value}</div>
                <div className="mt-1 text-sm font-bold text-[#64748b]">{metric.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative min-h-[430px] sm:min-h-[520px] lg:min-h-[680px]">
          <motion.div
            style={{ y: proofDrift }}
            className="absolute inset-x-0 top-8 z-20 mx-auto w-[min(100%,640px)] rounded-lg border border-[#cbd5e1] bg-white p-4 shadow-[0_32px_90px_rgba(15,23,42,0.16)] sm:inset-x-2 sm:top-16 sm:w-[min(92%,640px)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#2563eb]">
                  Store Proof
                </div>
                <div className="mt-1 text-lg font-black">داشبورد فروشگاه کودک</div>
              </div>
              <div className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-black text-[#166534]">
                Live
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg bg-[#0f172a] p-4 text-white">
                <div className="flex items-center gap-2 text-sm font-black text-[#14b8a6]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  مسیر سفارش
                </div>
                <div className="mt-4 space-y-3">
                  {["انتخاب دسته‌بندی", "بررسی موجودی", "ثبت سفارش", "پیگیری ارسال"].map(
                    (step, index) => (
                      <div key={step} className="flex items-center gap-3">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-xs font-black">
                          {index + 1}
                        </span>
                        <span className="text-sm text-white/82">{step}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="text-xs font-bold text-[#64748b]">Order readiness</div>
                  <div className="mt-2 text-3xl font-black text-[#0f172a]">۹۲٪</div>
                  <div className="mt-3 h-2 rounded-full bg-[#e2e8f0]">
                    <div className="h-2 w-4/5 rounded-full bg-[#14b8a6]" />
                  </div>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="text-xs font-bold text-[#64748b]">Current focus</div>
                  <div className="mt-2 text-sm font-black text-[#0f172a]">
                    پوشک، لباس و مراقبت روزانه
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {floatingImages.map((image) => (
            <FloatingImageCard
              key={image.src}
              image={image}
              scrollYProgress={scrollYProgress}
              shouldReduceMotion={shouldReduceMotion}
            />
          ))}

          <div className="absolute inset-x-2 bottom-0 z-0 h-44 rounded-[1.5rem] bg-[#dbeafe] sm:inset-x-8 sm:h-56 sm:rounded-[2rem]" />
        </div>
      </div>

      <div className="mx-auto -mt-8 hidden w-fit items-center gap-2 pb-8 text-sm font-bold text-[#64748b] md:flex">
        <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        اسکرول کنید
      </div>
    </section>
  );
}
