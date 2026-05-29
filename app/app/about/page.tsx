import Image from "next/image";
import { Bot, HeartHandshake, Sparkles } from "lucide-react";
import { PremiumBottomNavShowcase } from "@/components/premium-bottom-nav-showcase";
import { Reveal } from "@/components/reveal";

const values = [
  "طراحی باید کاربر را به اقدام روشن برساند.",
  "چت باید طبیعی حرف بزند و اطلاعات لازم را مرحله‌ای جمع کند.",
  "ظاهر سایت باید با موضوع فنی و عملیاتی هماهنگ باشد.",
  "هر بخش باید دلیل وجود داشته باشد؛ تزئین تنها کافی نیست."
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#171717]">
      <PremiumBottomNavShowcase />
      <section className="px-4 pb-20 pt-36 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <Reveal>
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-8 w-8 text-[#1f7a6b]" />
              <p className="text-sm font-black tracking-[0.22em] text-[#1f7a6b]">
                ABOUT TARTANAK
              </p>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
              تارتنک یک سایت زنده، فارسی و فنی است.
            </h1>
            <p className="mt-6 text-lg leading-9 text-[#5d5a52]">
              این پروژه از چند علاقه شروع شد: فروشگاه و سفارش، سرور و زیرساخت،
              خودرو، آب‌وهوا، ماچا و حتی کوکاکولای بنفش. نسخه جدید آن‌ها را در
              یک تجربه مرتب‌تر کنار هم قرار می‌دهد.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="relative min-h-[440px] overflow-hidden rounded-lg">
              <Image
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85"
                alt="فضای کاری مدرن"
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-5 right-5 rounded-lg bg-white/90 p-4 backdrop-blur">
                <Bot className="h-7 w-7 text-[#1f7a6b]" />
                <p className="mt-2 font-black">C-3PO approved interface</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#101817] px-4 py-20 text-white md:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-[#a7c957]" />
              <h2 className="text-3xl font-black md:text-5xl">
                اصول طراحی
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {values.map((value, index) => (
              <Reveal key={value} delay={index * 0.05}>
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6 text-lg font-bold leading-9 text-white/76">
                  {value}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
