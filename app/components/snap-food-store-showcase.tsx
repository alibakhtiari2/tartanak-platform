"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bike, Clock3, MapPin, Star, Store } from "lucide-react";

export type SnapFoodStore = {
  id: number;
  name: string;
  image: string;
  category: string;
  address: string;
  score: number;
  reviewCount: number;
  deliveryCost: number;
  timeToDeliver: number;
  minCardPrice: number;
  timingStatus: number;
};

type SnapFoodStoreShowcaseProps = {
  stores: SnapFoodStore[];
};

function formatMoney(value: number) {
  if (value === 0) {
    return "رایگان";
  }

  return `€${value.toFixed(value % 1 === 0 ? 0 : 1)}`;
}

function getStatusLabel(status: number) {
  if (status === 2) {
    return "باز";
  }

  if (status === 3) {
    return "بسته";
  }

  return "زمان‌بندی";
}

export function SnapFoodStoreShowcase({ stores }: SnapFoodStoreShowcaseProps) {
  if (stores.length === 0) {
    return null;
  }

  const featuredStores = stores.slice(0, 5);

  return (
    <section
      id="snap-food-stores"
      className="relative scroll-mt-28 overflow-hidden bg-[#0d1117] py-20 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(89,225,194,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(247,201,72,0.16),transparent_24%)]" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-[#59e1c2]" />
              <p className="text-sm font-black tracking-[0.24em] text-[#59e1c2]">
                SNAP FOOD API
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              فروشگاه‌ها و رستوران‌های زنده
            </h2>
            <p className="mt-5 text-lg leading-9 text-white/70">
              این بخش از endpoint فروشگاه خوانده می‌شود و هر کارت را با عکس،
              امتیاز، زمان ارسال و هزینه delivery نمایش می‌دهد.
            </p>
          </div>

          <motion.div
            className="relative h-[360px]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
          >
            {featuredStores.map((store, index) => (
              <motion.article
                key={store.id}
                className="absolute left-1/2 top-1/2 h-[250px] w-[min(78vw,420px)] overflow-hidden rounded-lg border border-white/10 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur"
                initial={{
                  opacity: 0,
                  x: "-50%",
                  y: "-45%",
                  rotate: 0,
                  scale: 0.84
                }}
                whileInView={{
                  opacity: 1 - index * 0.12,
                  x: `calc(-50% + ${index * 34}px)`,
                  y: `calc(-50% + ${index * 18}px)`,
                  rotate: index * -4,
                  scale: 1 - index * 0.055
                }}
                transition={{
                  delay: index * 0.09,
                  type: "spring",
                  stiffness: 180,
                  damping: 22
                }}
                style={{ zIndex: featuredStores.length - index }}
              >
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 768px) 78vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-black">{store.name}</h3>
                    <span className="rounded-full bg-[#59e1c2] px-3 py-1 text-xs font-black text-[#071013]">
                      {getStatusLabel(store.timingStatus)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm text-white/72">
                    {store.category}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stores.slice(0, 8).map((store, index) => (
            <motion.article
              key={store.id}
              className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.045, duration: 0.4 }}
              whileHover={{ y: -8 }}
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/78 to-transparent" />
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur">
                  {store.category}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h3 className="line-clamp-1 text-xl font-black">
                    {store.name}
                  </h3>
                  <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-white/62">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#f7c948]" />
                    <span className="line-clamp-2">{store.address}</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-white/8 p-2">
                    <Star className="mx-auto mb-1 h-4 w-4 text-[#f7c948]" />
                    <span className="font-black">{store.score || "-"}</span>
                  </div>
                  <div className="rounded-md bg-white/8 p-2">
                    <Clock3 className="mx-auto mb-1 h-4 w-4 text-[#59e1c2]" />
                    <span className="font-black">{store.timeToDeliver}m</span>
                  </div>
                  <div className="rounded-md bg-white/8 p-2">
                    <Bike className="mx-auto mb-1 h-4 w-4 text-[#ff8f5a]" />
                    <span className="font-black">
                      {formatMoney(store.deliveryCost)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
