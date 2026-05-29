import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { operationSteps, servicePillars } from "@/lib/site-content";

export function ServicePillarsSection() {
  return (
    <section className="bg-[#f4f1ea] px-4 py-24 text-[#171717] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <div className="flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-[#6f8f35]" />
            <p className="text-sm font-black tracking-[0.22em] text-[#6f8f35]">
              WHAT TARTANAK DOES
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            چهار مسیر اصلی، یک تجربه منظم و قابل استفاده.
          </h2>
          <p className="mt-5 text-lg leading-9 text-[#5d5a52]">
            صفحه اصلی حالا مثل یک ورودی حرفه‌ای کار می‌کند: از معرفی سریع شروع
            می‌شود، بعد فروشگاه‌ها، چت، زیرساخت، خودرو، ماچا و آب‌وهوا را به
            مسیرهای مشخص وصل می‌کند.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {servicePillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.06}>
              <Link
                href={pillar.href}
                className="group grid min-h-[320px] overflow-hidden rounded-lg border border-[#ded6c9] bg-white shadow-[0_18px_55px_rgba(58,50,38,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(58,50,38,0.15)] md:grid-cols-[0.92fr_1.08fr]"
              >
                <div className="relative min-h-[210px] overflow-hidden">
                  <Image
                    src={pillar.image}
                    alt={pillar.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 520px"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                </div>
                <div className="flex flex-col justify-between p-6">
                  <div>
                    <pillar.icon className="h-8 w-8 text-[#1f7a6b]" />
                    <h3 className="mt-5 text-2xl font-black">
                      {pillar.title}
                    </h3>
                    <p className="mt-4 leading-8 text-[#5d5a52]">
                      {pillar.text}
                    </p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#1f7a6b]">
                    مشاهده مسیر
                    <ArrowUpLeft className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OperationsTimelineSection() {
  return (
    <section className="bg-[#101817] px-4 py-24 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-sm font-black tracking-[0.22em] text-[#a7c957]">
              FROM CHAT TO ACTION
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              هر پیام باید به یک قدم روشن تبدیل شود.
            </h2>
          </div>
          <p className="text-lg leading-9 text-white/64">
            هدف طراحی جدید این است که کاربر گم نشود. اگر سفارش می‌خواهد، مسیر
            سفارش را می‌بیند. اگر سوال فنی دارد، جواب کاربردی می‌گیرد. اگر فقط
            می‌خواهد کشف کند، صفحه مسیرهای مشخص دارد.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {operationSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <article className="relative min-h-[250px] rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#a7c957] text-sm font-black text-[#07100d]">
                    {index + 1}
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-[#59e1c2]" />
                </div>
                <step.icon className="mt-8 h-8 w-8 text-[#f7c948]" />
                <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                <p className="mt-4 leading-8 text-white/62">{step.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
