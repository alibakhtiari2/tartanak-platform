"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  HeartHandshake,
  MessageSquareText,
  PackageCheck,
  ShoppingBag,
  ShieldCheck,
  Sparkles
} from "lucide-react";

const bentoItems = [
  {
    icon: ShoppingBag,
    title: "ویترین خرید بچه‌گانه",
    text: "پوشک، لباس، کالسکه، مراقبت کودک و هدیه‌های نوزاد با دسته‌بندی فارسی و مسیر خرید سریع.",
    className: "md:col-span-2",
    tone: "bg-[#eff6ff] border-[#bfdbfe]"
  },
  {
    icon: PackageCheck,
    title: "موجودی و ارسال",
    text: "کارت هر محصول وضعیت موجودی، زمان آماده‌سازی و گزینه ارسال را بدون شلوغی نشان می‌دهد.",
    className: "",
    tone: "bg-white border-[#cbd5e1]"
  },
  {
    icon: BarChart3,
    title: "داشبورد فروش",
    text: "متریک‌های سفارش، پرفروش‌ها و دسته‌های فعال برای مدیریت فروشگاه قابل اسکن هستند.",
    className: "",
    tone: "bg-[#f0fdfa] border-[#99f6e4]"
  },
  {
    icon: HeartHandshake,
    title: "اعتماد والدین",
    text: "توضیح جنس، سن مناسب، نکات ایمنی و راهنمای انتخاب با لحن آرام و قابل اعتماد ارائه می‌شود.",
    className: "md:col-span-2",
    tone: "bg-[#f8fafc] border-[#cbd5e1]"
  },
  {
    icon: ShieldCheck,
    title: "پرداخت امن",
    text: "دکمه‌ها، فرم‌ها و پیام‌های خطا واضح هستند تا خرید خانواده بدون اصطکاک کامل شود.",
    className: "",
    tone: "bg-white border-[#cbd5e1]"
  }
];

function WobbleCard({
  item,
  index
}: {
  item: (typeof bentoItems)[number];
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = item.icon;

  return (
    <motion.article
      data-component="WobbleCard"
      className={`group relative min-h-[210px] overflow-hidden rounded-lg border p-6 shadow-[0_18px_52px_rgba(15,23,42,0.08)] ${item.tone} ${item.className}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.42, delay: index * 0.05, ease: "easeOut" }}
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -4,
              rotate: index % 2 === 0 ? 0.45 : -0.45,
              transition: { duration: 0.18 }
            }
      }
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#2563eb] opacity-0 transition group-hover:opacity-100" />
      <div className="flex min-h-11 w-11 items-center justify-center rounded-lg bg-[#0f172a] text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-6 text-2xl font-black leading-tight text-[#0f172a]">
        {item.title}
      </h3>
      <p className="mt-4 max-w-xl text-base leading-8 text-[#475569]">{item.text}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {["موبایل‌پسند", "قابل اسکن", "آماده خرید"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-[#cbd5e1] bg-white/75 px-3 py-1 text-xs font-black text-[#334155]"
          >
            {label}
          </span>
        ))}
      </div>
    </motion.article>
  );
}

export function TartanakFeatureBento() {
  return (
    <section
      id="tartanak-capabilities"
      data-component="TartanakFeatureBento"
      className="scroll-mt-28 bg-white px-4 py-20 text-[#0f172a] md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#2563eb]">
              <Boxes className="h-4 w-4" aria-hidden="true" />
              Baby Commerce Grid
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
              بنتو گرید متحرک برای فروشگاه لوازم بچه‌گانه تارتنک.
            </h2>
            <p className="mt-5 text-lg leading-9 text-[#475569]">
              کارت‌ها با حرکت بسیار ظریف، دسته‌های خرید و قابلیت‌های فروشگاه را
              نمایش می‌دهند؛ بدون شلوغی کودکانه، با تمرکز روی اعتماد، موجودی و
              تکمیل سفارش.
            </p>
          </div>
          <a
            href="#tartanak-command-center"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[#14b8a6] px-5 py-3 text-sm font-black text-[#042f2e] shadow-[0_18px_42px_rgba(20,184,166,0.22)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14b8a6]"
          >
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            شروع سفارش هوشمند
          </a>
        </div>

        <div className="mt-10 grid auto-rows-fr gap-4 md:grid-cols-3">
          {bentoItems.map((item, index) => (
            <WobbleCard key={item.title} item={item} index={index} />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-bold text-[#475569]">
          <Sparkles className="h-5 w-5 shrink-0 text-[#2563eb]" aria-hidden="true" />
          انیمیشن کارت‌ها برای بازخورد ظریف خرید است و با تنظیمات reduced-motion خاموش می‌شود.
        </div>
      </div>
    </section>
  );
}
