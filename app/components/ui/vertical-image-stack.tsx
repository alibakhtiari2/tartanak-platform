"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";

type StackImage = {
  id: string;
  src: string;
  alt: string;
  title: string;
};

type CardStyle = {
  y: number;
  scale: number;
  opacity: number;
  zIndex: number;
  rotateX: number;
};

const defaultImages: StackImage[] = [
  {
    id: "servers",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85",
    alt: "اتاق سرور مدرن با رک‌های روشن",
    title: "زیرساخت آماده"
  },
  {
    id: "cars",
    src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85",
    alt: "خودروی کلاسیک تیره در نور شهری",
    title: "حرکت مطمئن"
  },
  {
    id: "purple-coke",
    src: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1600&q=85",
    alt: "بطری نوشابه خنک",
    title: "کوکاکولای بنفش"
  },
  {
    id: "monitoring",
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=85",
    alt: "تجهیزات شبکه و مانیتورینگ",
    title: "مانیتورینگ دقیق"
  },
  {
    id: "road",
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85",
    alt: "خودروی اسپرت در جاده",
    title: "مسیرهای آماده"
  }
];

type VerticalImageStackProps = {
  images?: StackImage[];
};

function getWrappedDiff(index: number, currentIndex: number, total: number) {
  let diff = index - currentIndex;

  if (diff > total / 2) {
    diff -= total;
  }

  if (diff < -total / 2) {
    diff += total;
  }

  return diff;
}

export function VerticalImageStack({
  images = defaultImages
}: VerticalImageStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastWheelAt = useRef(0);

  const move = useCallback(
    (direction: 1 | -1) => {
      setCurrentIndex((index) => {
        const nextIndex = index + direction;

        if (nextIndex < 0) {
          return images.length - 1;
        }

        if (nextIndex >= images.length) {
          return 0;
        }

        return nextIndex;
      });
    },
    [images.length]
  );

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -80) {
      move(1);
      return;
    }

    if (info.offset.y > 80) {
      move(-1);
    }
  };

  const getCardStyle = (index: number): CardStyle => {
    const diff = getWrappedDiff(index, currentIndex, images.length);

    if (diff === 0) {
      return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 };
    }

    if (diff === -1) {
      return { y: -140, scale: 0.86, opacity: 0.5, zIndex: 4, rotateX: 14 };
    }

    if (diff === 1) {
      return { y: 140, scale: 0.86, opacity: 0.5, zIndex: 4, rotateX: -14 };
    }

    if (diff === -2) {
      return { y: -280, scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: 15 };
    }

    if (diff === 2) {
      return { y: 280, scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: -15 };
    }

    return {
      y: diff > 0 ? 400 : -400,
      scale: 0.6,
      opacity: 0,
      zIndex: 0,
      rotateX: diff > 0 ? -20 : 20
    };
  };

  const isVisible = (index: number) =>
    Math.abs(getWrappedDiff(index, currentIndex, images.length)) <= 2;

  return (
    <section
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 18) {
          return;
        }

        const now = Date.now();

        if (now - lastWheelAt.current < 520) {
          return;
        }

        lastWheelAt.current = now;
        move(event.deltaY > 0 ? 1 : -1);
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.02] blur-3xl" />
      </div>

      <div
        className="relative flex h-[500px] w-[320px] items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        {images.map((image, index) => {
          if (!isVisible(index)) {
            return null;
          }

          const style = getCardStyle(index);
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={image.id}
              className="absolute cursor-grab active:cursor-grabbing"
              animate={{
                y: style.y,
                scale: style.scale,
                opacity: style.opacity,
                rotateX: style.rotateX,
                zIndex: style.zIndex
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 1
              }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{
                transformStyle: "preserve-3d",
                zIndex: style.zIndex
              }}
            >
              <div
                className="relative h-[420px] w-[280px] overflow-hidden rounded-3xl bg-card ring-1 ring-border/20"
                style={{
                  boxShadow: isCurrent
                    ? "0 25px 50px -12px hsl(var(--foreground) / 0.15), 0 0 0 1px hsl(var(--foreground) / 0.05)"
                    : "0 10px 30px -10px hsl(var(--foreground) / 0.1)"
                }}
              >
                <div className="absolute inset-0 z-10 rounded-3xl bg-gradient-to-b from-foreground/10 via-transparent to-transparent" />
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="h-full w-full object-cover"
                  draggable={false}
                  priority={isCurrent}
                  sizes="280px"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-background/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-30 p-5 text-foreground">
                  <h3 className="text-xl font-black">{image.title}</h3>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) {
                setCurrentIndex(index);
              }
            }}
            className={`w-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "h-6 bg-foreground"
                : "h-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.5,
              ease: "easeInOut"
            }}
          >
            <ArrowUp className="h-6 w-6" strokeWidth={1.5} />
          </motion.div>
          <span className="text-xs font-medium uppercase tracking-widest">
            Scroll or drag
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.5,
              ease: "easeInOut"
            }}
          >
            <ArrowDown className="h-6 w-6" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
