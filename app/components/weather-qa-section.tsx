import { CloudSun, CloudRain, ThermometerSun, Wind } from "lucide-react";

const prompts = [
  {
    icon: CloudSun,
    title: "پیش‌بینی امروز",
    text: "از وضعیت آسمان، دما و شرایط کلی هوای امروز بپرسید."
  },
  {
    icon: CloudRain,
    title: "باران و برف",
    text: "احتمال بارش، شدت باران و زمان تغییرات آب‌وهوا را پیگیری کنید."
  },
  {
    icon: ThermometerSun,
    title: "دما و حس واقعی",
    text: "حداقل، حداکثر و دمایی که بدن واقعاً احساس می‌کند را بپرسید."
  },
  {
    icon: Wind,
    title: "باد و شرایط بیرون",
    text: "سرعت باد، رطوبت و مناسب بودن هوا برای بیرون رفتن را بررسی کنید."
  }
];

export function WeatherQaSection() {
  return (
    <section className="bg-[#071013] px-4 py-20 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#43e7ff]">
            Weather Q&A
          </p>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            پرسش و پاسخ تارتنک فقط درباره آب‌وهوا
          </h2>
          <p className="mt-5 text-lg leading-9 text-white/72">
            ابزار شناور گوشه صفحه برای سوال‌های آب‌وهوایی فعال شده است. سوال‌ها
            را درباره پیش‌بینی، بارش، دما، باد، رطوبت و شرایط مناسب سفر یا
            بیرون رفتن بپرسید.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <article
              key={prompt.title}
              className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
            >
              <prompt.icon className="h-7 w-7 text-[#43e7ff]" />
              <h3 className="mt-4 text-xl font-black">{prompt.title}</h3>
              <p className="mt-3 leading-8 text-white/68">{prompt.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
