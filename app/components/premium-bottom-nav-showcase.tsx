"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Home, Search, Shield, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    key: "tartanak",
    label: "خانه",
    href: "/",
    target: "tartanak-home",
    icon: Home,
    gradient: "from-[#2a1248] to-[#34145f]",
    color: "text-[#c86bff]",
    glow: "shadow-[0_0_26px_rgba(200,107,255,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]"
  },
  {
    key: "explore",
    label: "فروشگاه",
    href: "/orders",
    target: "snap-food-stores",
    icon: ShoppingBag,
    gradient: "from-[#4a1231] to-[#5a163d]",
    color: "text-[#ff5fb2]",
    glow: "shadow-[0_0_26px_rgba(255,95,178,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
  },
  {
    key: "services",
    label: "خدمات",
    href: "/services",
    target: "tartanak-command-center",
    icon: Shield,
    gradient: "from-[#4a2a08] to-[#5c320a]",
    color: "text-[#ff9d3d]",
    glow: "shadow-[0_0_26px_rgba(255,157,61,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]"
  },
  {
    key: "garage",
    label: "گاراژ",
    href: "/garage",
    target: "about-tartanak",
    icon: Car,
    gradient: "from-[#3c1609] to-[#61220d]",
    color: "text-[#ff8f5a]",
    glow: "shadow-[0_0_26px_rgba(255,143,90,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]"
  },
  {
    key: "profile",
    label: "درباره",
    href: "/about",
    target: "about-tartanak",
    icon: UserRound,
    gradient: "from-[#053a40] to-[#06535c]",
    color: "text-[#43e7ff]",
    glow: "shadow-[0_0_26px_rgba(67,231,255,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
  }
];

export function PremiumBottomNavShowcase() {
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const pathname = usePathname();

  useEffect(() => {
    const routeTab = tabs.find((tab) => tab.href === pathname);

    if (routeTab && pathname !== "/") {
      setActiveKey(routeTab.key);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const matchingTab = tabs.find(
          (tab) => tab.target === visibleEntry.target.id
        );

        if (matchingTab) {
          setActiveKey(matchingTab.key);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    tabs.forEach((tab) => {
      const target = document.getElementById(tab.target);

      if (target) {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, [pathname]);

  const handleNavigate = (targetId: string, key: string, href: string) => {
    setActiveKey(key);

    if (pathname !== "/") {
      return;
    }

    if (href !== "/" && !document.getElementById(targetId)) {
      return;
    }

    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  return (
    <nav
      className="fixed inset-x-0 top-3 z-50 px-3"
      aria-label="ناوبری اصلی تارتنک"
    >
      <div className="mx-auto flex w-full max-w-[430px] flex-col items-center">
        <div className="absolute top-6 h-16 w-[82%] rounded-full bg-black/20 blur-2xl" />
        <div className="relative w-full rounded-[34px] bg-[#0d0d0d] p-[10px] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
          <div className="flex h-[74px] items-center justify-between rounded-full border border-white/[0.06] bg-[#1a1a1a]/96 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_48px_rgba(0,0,0,0.35)] backdrop-blur sm:px-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isRouteActive = tab.href === pathname;
              const isActive = isRouteActive || tab.key === activeKey;

              return (
                <Link
                  key={tab.key}
                  href={pathname === "/" ? `#${tab.target}` : tab.href}
                  onClick={() => handleNavigate(tab.target, tab.key, tab.href)}
                  className={cn(
                    "flex h-[50px] items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                    isActive
                      ? cn(
                          "w-[106px] gap-2 bg-gradient-to-r px-3 sm:w-[132px]",
                          tab.gradient,
                          tab.color,
                          tab.glow
                        )
                      : "w-[44px] text-[#777777] hover:text-white sm:w-[50px]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={tab.label}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 shrink-0",
                      isActive && tab.key === "tartanak"
                        ? "drop-shadow-[0_0_9px_rgba(200,107,255,0.72)]"
                        : ""
                    )}
                    strokeWidth={isActive ? 2.35 : 1.85}
                  />
                  {isActive ? (
                    <span className="truncate text-[12px] font-black leading-none sm:text-[14px]">
                      {tab.label}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
