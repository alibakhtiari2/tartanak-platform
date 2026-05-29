import Image from "next/image";
import { CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";
import { PremiumBottomNavShowcase } from "@/components/premium-bottom-nav-showcase";
import { Reveal } from "@/components/reveal";

const orderExamples = [
  "سفارش: ۲ پیتزا، یک ماچا و کوکاکولای بنفش",
  "نام: علی رضایی",
  "تلفن: 09123456789",
  "آدرس: خیابان تست، پلاک ۱۲، واحد ۳",
  "تایید سفارش"
];

const menuHighlights = [
  {
    title: "ماچا سبز",
    text: "برای مکث‌های دقیق بین کار و تصمیم.",
    image:
      "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "پیتزا و غذای گرم",
    text: "مسیر سفارش نمایشی آماده اتصال به فروشگاه واقعی.",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "کوکاکولای بنفش",
    text: "آیتم playful سایت برای تجربه متفاوت.",
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=85"
  }
];

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#171717]">
      <PremiumBottomNavShowcase />
      <section className="px-4 pb-16 pt-36 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <Reveal>
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-[#1f7a6b]" />
              <p className="text-sm font-black tracking-[0.22em] text-[#1f7a6b]">
                ORDER EXPERIENCE
              </p>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
              سفارش‌گیری ساده، مرحله‌ای و قابل فهم.
            </h1>
            <p className="mt-6 text-lg leading-9 text-[#5d5a52]">
              چت سایت حالا فقط پیام ثابت نمی‌دهد. اطلاعات سفارش را جمع می‌کند،
              کمبودها را می‌پرسد، خلاصه می‌سازد و بعد منتظر تایید می‌ماند.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-[28px] border border-[#ded6c9] bg-white p-4 shadow-[0_24px_70px_rgba(58,50,38,0.14)]">
              <div className="rounded-2xl bg-[#101817] p-4 text-white">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <MessageCircle className="h-5 w-5 text-[#a7c957]" />
                  <span className="font-black">نمونه مکالمه سفارش</span>
                </div>
                <div className="mt-4 space-y-3">
                  {orderExamples.map((example, index) => (
                    <div
                      key={example}
                      className={
                        index % 2 === 0
                          ? "mr-auto max-w-[82%] rounded-lg bg-[#0f766e] px-3 py-2 text-sm leading-7"
                          : "ml-auto max-w-[82%] rounded-lg bg-white px-3 py-2 text-sm leading-7 text-[#101817]"
                      }
                    >
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {menuHighlights.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <article className="overflow-hidden rounded-lg bg-white shadow-[0_18px_55px_rgba(58,50,38,0.1)]">
                <div className="relative h-56">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <CheckCircle2 className="h-6 w-6 text-[#1f7a6b]" />
                  <h2 className="mt-4 text-2xl font-black">{item.title}</h2>
                  <p className="mt-3 leading-8 text-[#625f58]">{item.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
