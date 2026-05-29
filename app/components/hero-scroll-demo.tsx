"use client";

import React from "react";
import Image from "next/image";
import {
  ArrowDown,
  Bot,
  Gauge,
  MessageSquareText,
  Server,
  ShieldCheck,
  ShoppingBag,
  Wrench
} from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { NeuralNoise } from "@/components/ui/neural-noise";

const stats = [
  { icon: Server, label: "زیرساخت پایدار", value: "۹۹.۹٪" },
  { icon: Gauge, label: "مانیتورینگ سریع", value: "۲۴/۷" },
  { icon: Wrench, label: "نگهداری خودرو", value: "دقیق" },
  { icon: ShieldCheck, label: "امنیت داده", value: "لایه‌ای" }
];

export function HeroScrollDemo() {
  return (
    <section
      id="tartanak-home"
      className="relative isolate scroll-mt-28 overflow-hidden bg-[#09100f] text-white"
    >
      <NeuralNoise color={[0.66, 0.79, 0.34]} opacity={0.5} speed={0.00082} />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_16%_18%,rgba(89,225,194,0.22),transparent_30%),linear-gradient(180deg,rgba(9,16,15,0.48),#09100f_78%)]" />
      <div className="absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />

      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-5xl px-4">
            <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#a7c957] backdrop-blur">
              <Bot className="h-4 w-4" />
              TARTANAK LIVE OPERATIONS
            </div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-7xl">
              یک سایت زنده برای سفارش، سرور، خودرو و تصمیم‌های سریع.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/68 md:text-xl">
              تارتنک فقط صفحه معرفی نیست؛ یک تجربه تعاملی است که API فروشگاه‌ها،
              چت سفارش‌گیر، آب‌وهوا، زیرساخت و گاراژ فنی را در یک مسیر مرتب
              کنار هم می‌گذارد.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3">
              <a
                href="#tartanak-command-center"
                className="inline-flex items-center gap-2 rounded-full bg-[#a7c957] px-5 py-3 text-sm font-black text-[#07100d] shadow-[0_16px_44px_rgba(167,201,87,0.24)] transition hover:-translate-y-0.5"
              >
                <MessageSquareText className="h-5 w-5" />
                شروع از کنترل‌پنل
              </a>
              <a
                href="#snap-food-stores"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                <ShoppingBag className="h-5 w-5" />
                دیدن فروشگاه‌ها
              </a>
            </div>
            <div className="mx-auto mt-8 flex w-fit items-center gap-2 text-sm font-bold text-white/48">
              <ArrowDown className="h-4 w-4 animate-bounce" />
              اسکرول کنید
            </div>
          </div>
        }
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#101820]">
          <Image
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85"
            alt="اتاق سرور مدرن"
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07100d] via-[#101820]/58 to-transparent" />
          <div className="absolute left-6 top-6 rounded-full border border-white/12 bg-black/38 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#a7c957] backdrop-blur">
            Agent-ready dashboard
          </div>
          <div className="absolute inset-x-0 bottom-0 grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-4 md:p-8">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/15 bg-white/12 p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur"
              >
                <item.icon className="mb-3 h-6 w-6 text-[#f7c948]" />
                <div className="text-2xl font-black">{item.value}</div>
                <div className="mt-1 text-sm text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}
