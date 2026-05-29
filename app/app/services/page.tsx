import Image from "next/image";
import { ArrowRight, Bot, CheckCircle2, ServerCog } from "lucide-react";
import { PremiumBottomNavShowcase } from "@/components/premium-bottom-nav-showcase";
import { Reveal } from "@/components/reveal";
import { NeuralNoise } from "@/components/ui/neural-noise";
import { infraCards, operationSteps } from "@/lib/site-content";

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#0b1110] text-white">
      <PremiumBottomNavShowcase />
      <section className="relative isolate overflow-hidden px-4 pb-20 pt-36 md:px-8">
        <NeuralNoise color={[0.35, 0.88, 0.76]} opacity={0.34} speed={0.0007} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1110]/60 via-[#0b1110]/88 to-[#0b1110]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <Reveal>
            <div className="flex items-center gap-3">
              <ServerCog className="h-8 w-8 text-[#59e1c2]" />
              <p className="text-sm font-black tracking-[0.22em] text-[#59e1c2]">
                SERVICES
              </p>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
              سرویس‌هایی برای سایتی که فقط زیبا نیست؛ کار می‌کند.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-white/68">
              تارتنک ترکیبی از تجربه کاربری، چت سفارش‌گیر، نمایش داده زنده،
              مانیتورینگ مفهومی و طراحی تصویری است. هر بخش با هدف مشخص ساخته
              شده: کمتر سردرگمی، بیشتر اقدام.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=85"
                alt="زیرساخت سرور"
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 to-transparent" />
              <div className="absolute bottom-5 right-5 rounded-lg bg-black/48 p-4 backdrop-blur">
                <p className="text-3xl font-black">99.9%</p>
                <p className="mt-1 text-sm text-white/64">هدف آرامش عملیاتی</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {infraCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.06}>
              <article className="min-h-[270px] rounded-lg border border-white/10 bg-white/[0.06] p-6">
                <card.icon className="h-9 w-9 text-[#a7c957]" />
                <h2 className="mt-6 text-2xl font-black">{card.title}</h2>
                <p className="mt-4 leading-8 text-white/64">{card.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-[#f4f1ea] px-4 py-20 text-[#171717] md:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-[#1f7a6b]" />
              <h2 className="text-3xl font-black md:text-5xl">
                معماری تجربه
              </h2>
            </div>
            <p className="mt-5 text-lg leading-9 text-[#5d5a52]">
              طراحی حرفه‌ای یعنی هر صفحه بداند چرا وجود دارد. این مسیرها
              ساختار پاسخ و اقدام را مشخص می‌کنند.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {operationSteps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05}>
                <div className="rounded-lg border border-[#ded6c9] bg-white p-5">
                  <step.icon className="h-7 w-7 text-[#1f7a6b]" />
                  <h3 className="mt-5 font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#625f58]">
                    {step.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <a
            href="/#tartanak-command-center"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#111817] px-5 py-3 text-sm font-black text-white"
          >
            برگشت به کنترل‌پنل
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </main>
  );
}
