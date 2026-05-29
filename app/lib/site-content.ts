import {
  Bot,
  Car,
  CloudSun,
  DatabaseBackup,
  Gauge,
  MessageSquareText,
  PackageCheck,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Wrench
} from "lucide-react";

export const servicePillars = [
  {
    icon: ShoppingBag,
    title: "سفارش و فروشگاه",
    text: "نمایش فروشگاه‌های زنده، شروع سفارش در چت، جمع‌آوری اطلاعات و تایید نهایی در یک مسیر ساده.",
    href: "/orders",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85"
  },
  {
    icon: ServerCog,
    title: "زیرساخت و سرور",
    text: "مانیتورینگ، بکاپ، شبکه، امنیت و تصمیم‌های عملی برای سرویس‌هایی که باید آرام و پایدار کار کنند.",
    href: "/services",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85"
  },
  {
    icon: Car,
    title: "گاراژ فنی خودرو",
    text: "راهنمای نگهداری، تشخیص اولیه علائم، برنامه سرویس و نگاه مهندسی به حرکت مطمئن.",
    href: "/garage",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85"
  },
  {
    icon: CloudSun,
    title: "آب‌وهوا و تصمیم روز",
    text: "سوال‌های ساده درباره دما، بارش، باد و اینکه امروز برای بیرون رفتن یا ارسال سفارش چه وضعی دارد.",
    href: "/services",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85"
  }
];

export const operationSteps = [
  {
    icon: MessageSquareText,
    title: "گفتگو شروع می‌شود",
    text: "کاربر طبیعی می‌نویسد؛ لازم نیست فرم خشک پر کند. چت intent را تشخیص می‌دهد."
  },
  {
    icon: Bot,
    title: "مسیر مناسب انتخاب می‌شود",
    text: "سفارش، آب‌وهوا، سرور یا خودرو هرکدام پاسخ و مرحله‌بندی خودشان را دارند."
  },
  {
    icon: PackageCheck,
    title: "اطلاعات کامل می‌شود",
    text: "برای سفارش، آیتم‌ها، نام، تلفن و آدرس مرحله‌به‌مرحله جمع می‌شود."
  },
  {
    icon: ShieldCheck,
    title: "تایید و اقدام",
    text: "خروجی نهایی آماده اتصال به پنل مدیریت، پیام‌رسان یا سیستم سفارش واقعی است."
  }
];

export const infraCards = [
  {
    icon: DatabaseBackup,
    title: "Backup Discipline",
    text: "بکاپ فقط داشتن فایل نیست؛ یعنی زمان‌بندی، تست restore، نگهداری نسخه‌ها و مستندسازی مسیر برگشت."
  },
  {
    icon: Gauge,
    title: "Observability",
    text: "داشبورد، alert و لاگ باید قبل از بحران حرف بزنند. تارتنک وضعیت را خوانا می‌کند."
  },
  {
    icon: Wrench,
    title: "Operational Fixes",
    text: "مشکل‌ها به action کوچک تبدیل می‌شوند: دسترسی، شبکه، deploy، storage یا performance."
  }
];

export const garageChecks = [
  "چک ترمز، لرزش و صدای غیرعادی",
  "بررسی مصرف سوخت و سرویس دوره‌ای",
  "نگاه به برق، باتری، سنسورها و دیاگ",
  "برنامه نگهداری برای مسیر شهری و بین‌شهری"
];
