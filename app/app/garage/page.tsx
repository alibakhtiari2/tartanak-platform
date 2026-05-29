import Image from "next/image";
import { Car, Gauge, Wrench } from "lucide-react";
import { PremiumBottomNavShowcase } from "@/components/premium-bottom-nav-showcase";
import { Reveal } from "@/components/reveal";
import { garageChecks } from "@/lib/site-content";

export default function GaragePage() {
  return (
    <main className="min-h-screen bg-[#111817] text-white">
      <PremiumBottomNavShowcase />
      <section className="px-4 pb-20 pt-36 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <Reveal>
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-[#ff8f5a]" />
              <p className="text-sm font-black tracking-[0.22em] text-[#ff8f5a]">
                GARAGE
              </p>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
              گاراژ فنی برای تصمیم‌های مطمئن‌تر.
            </h1>
            <p className="mt-6 text-lg leading-9 text-white/68">
              این صفحه برای سوال‌های خودرو ساخته شده: تشخیص اولیه، ریسک‌های
              رایج، سرویس دوره‌ای و توضیح فنی بدون پیچیدگی بی‌دلیل.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="relative min-h-[440px] overflow-hidden rounded-lg border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1400&q=85"
                alt="تعمیرگاه خودرو"
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 to-transparent" />
              <div className="absolute bottom-5 right-5 rounded-lg bg-black/50 p-4 backdrop-blur">
                <Gauge className="h-7 w-7 text-[#ff8f5a]" />
                <p className="mt-3 text-xl font-black">Drive-ready checks</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#f4f1ea] px-4 py-20 text-[#171717] md:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-[#1f7a6b]" />
              <h2 className="text-3xl font-black md:text-5xl">
                چک‌لیست نگهداری
              </h2>
            </div>
            <p className="mt-5 text-lg leading-9 text-[#5d5a52]">
              کاربر می‌تواند مشکل را در چت توضیح دهد و مسیر بررسی اولیه بگیرد.
              این بخش تصویر واضح‌تری از همان منطق می‌دهد.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {garageChecks.map((check, index) => (
              <Reveal key={check} delay={index * 0.05}>
                <div className="min-h-[150px] rounded-lg border border-[#ded6c9] bg-white p-5 shadow-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#111817] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="mt-5 font-black leading-7">{check}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
