import Image from "next/image";
import type { CSSProperties } from "react";
import {
  Baby,
  HeartHandshake,
  PackageCheck,
  ShoppingBag
} from "lucide-react";
import { TartanakFeatureBento } from "@/components/tartanak-feature-bento";
import { TartanakFloatingHero } from "@/components/tartanak-floating-hero";

const categories = [
  {
    title: "پوشک و مراقبت روزانه",
    text: "محصولات مصرفی با موجودی روشن، قیمت قابل مقایسه و پیشنهادهای مناسب سن کودک.",
    image:
      "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "لباس و ست نوزاد",
    text: "لباس‌های نرم، قابل شست‌وشو و دسته‌بندی‌شده بر اساس فصل، سایز و کاربرد.",
    image:
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "کالسکه، کیف و سفر",
    text: "انتخاب‌های کاربردی برای بیرون رفتن، سفر کوتاه و خریدهای روزانه خانواده.",
    image:
      "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=900&q=85"
  }
];

const elegantPinkTokens = {
  primary: "#be185d",
  primaryHover: "#9f1239",
  accent: "#f9a8d4",
  background: "#fff7fb",
  surface: "#ffffff",
  foreground: "#4a102a",
  muted: "#fce7f3",
  border: "#fbcfe8",
  shadow: "0 22px 60px rgba(190, 24, 93, 0.12)"
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <TartanakFloatingHero />
      <TartanakFeatureBento />

      <section
        id="baby-categories"
        data-component="BabyCategoriesSection"
        style={
          {
            "--pink-primary": elegantPinkTokens.primary,
            "--pink-primary-hover": elegantPinkTokens.primaryHover,
            "--pink-accent": elegantPinkTokens.accent,
            "--pink-background": elegantPinkTokens.background,
            "--pink-surface": elegantPinkTokens.surface,
            "--pink-foreground": elegantPinkTokens.foreground,
            "--pink-muted": elegantPinkTokens.muted,
            "--pink-border": elegantPinkTokens.border,
            "--pink-shadow": elegantPinkTokens.shadow
          } as CSSProperties
        }
        className="scroll-mt-24 bg-[var(--pink-background)] px-4 py-20 text-[var(--pink-foreground)] md:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--pink-border)] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--pink-primary)] shadow-[0_12px_34px_rgba(190,24,93,0.08)]">
                <Baby className="h-4 w-4" aria-hidden="true" />
                Elegant Pink Tokens
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
                دسته‌بندی‌های اصلی با استایل صورتی و الگانت.
              </h2>
              <p className="mt-5 text-lg leading-9 text-[#7f5267]">
                خروجی MCP را به رنگ‌های معتبر CSS تبدیل کردم و این بخش را با
                همان ایده صورتی، نرم و شیک بازطراحی کردم؛ بدون استفاده از
                مقدارهای نامعتبر مثل <span dir="ltr">pink5f</span>.
              </p>
            </div>
            <div className="grid min-w-[260px] gap-2 rounded-lg border border-[var(--pink-border)] bg-white/80 p-4 shadow-[var(--pink-shadow)]">
              {[
                ["Primary", elegantPinkTokens.primary],
                ["Accent", elegantPinkTokens.accent],
                ["Muted", elegantPinkTokens.muted]
              ].map(([label, color]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#9d6b80]">
                    {label}
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold text-[#7f5267]">
                    <span
                      className="h-5 w-5 rounded-full border border-[var(--pink-border)]"
                      style={{ backgroundColor: color }}
                    />
                    <code dir="ltr">{color}</code>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {categories.map((category) => (
              <article
                key={category.title}
                className="group overflow-hidden rounded-lg border border-[var(--pink-border)] bg-[var(--pink-surface)] shadow-[var(--pink-shadow)] transition duration-300 hover:-translate-y-1 hover:border-[var(--pink-primary)]"
              >
                <div className="relative h-60">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#dc2626]/50 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black text-[var(--pink-foreground)]">
                    {category.title}
                  </h3>
                  <p className="mt-4 leading-8 text-[#7f5267]">{category.text}</p>
                  <a
                    href="#checkout-flow"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--pink-primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--pink-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pink-primary)]"
                  >
                    مشاهده محصولات
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="checkout-flow"
        data-component="CheckoutFlowSection"
        className="bg-[#0f172a] px-4 py-20 text-white md:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#14b8a6]">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Order Flow
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
              از انتخاب محصول تا ثبت سفارش، همه چیز کوتاه و قابل پیگیری است.
            </h2>
            <p className="mt-5 text-lg leading-9 text-white/72">
              فرم‌ها واضح‌اند، خطاها کنار همان فیلد نمایش داده می‌شوند، و دکمه
              اصلی همیشه به مرحله بعدی خرید اشاره می‌کند.
            </p>
            <a
              href="#tartanak-home"
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14b8a6] px-5 py-3 text-sm font-black text-[#042f2e] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14b8a6]"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              بازگشت به شروع خرید
            </a>
          </div>

          <div className="grid gap-4">
            {[
              "انتخاب دسته‌بندی و محصول",
              "بررسی موجودی، سایز و زمان ارسال",
              "ثبت اطلاعات و پرداخت امن",
              "پیگیری سفارش و پشتیبانی"
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-lg border border-white/12 bg-white/[0.06] p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-sm font-black text-[#0f172a]">
                  {index + 1}
                </span>
                <span className="text-lg font-black">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        data-component="FamilyTrustSection"
        className="bg-white px-4 py-12 md:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-[#2563eb]" />
            <div>
              <h2 className="text-xl font-black">تارتنک برای خرید مطمئن خانواده</h2>
              <p className="mt-2 leading-8 text-[#475569]">
                طراحی سایت روی سرعت تصمیم، خوانایی موبایل و اعتماد والدین
                متمرکز شده است.
              </p>
            </div>
          </div>
          <a
            href="#baby-categories"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
          >
            مشاهده دسته‌بندی‌ها
          </a>
        </div>
      </section>
    </main>
  );
}
