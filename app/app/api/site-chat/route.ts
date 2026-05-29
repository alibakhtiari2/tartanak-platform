import { NextRequest } from "next/server";

const WEBUI_CHAT_URL = "http://127.0.0.1:18789/api/webui/qa/chat";

type ChatRequest = {
  message?: string;
  visitorId?: string;
};

type AgentMessage = {
  role?: string;
  content?: string | Array<{ type?: string; text?: string }>;
};

type AgentHistory = {
  messages?: AgentMessage[];
};

type OrderDraft = {
  items?: string;
  name?: string;
  phone?: string;
  address?: string;
};

const orders = new Map<string, OrderDraft>();

function extractAgentText(content: AgentMessage["content"]) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text)
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

async function postAgent(body: object, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(WEBUI_CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getAssistantCount(visitorId: string) {
  const history = (await postAgent({
    action: "history",
    visitorId
  })) as AgentHistory | null;

  return (
    history?.messages?.filter((message) => message.role === "assistant").length ??
    0
  );
}

async function getAgentReply(visitorId: string, message: string) {
  const assistantCountBefore = await getAssistantCount(visitorId);
  const sendResult = await postAgent(
    {
      action: "send",
      visitorId,
      message
    },
    10000
  );

  if (!sendResult) {
    return null;
  }

  for (let attempt = 0; attempt < 18; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 4 ? 1100 : 1800));

    const history = (await postAgent({
      action: "history",
      visitorId
    })) as AgentHistory | null;
    const assistantMessages =
      history?.messages?.filter((item) => item.role === "assistant") ?? [];

    if (assistantMessages.length <= assistantCountBefore) {
      continue;
    }

    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    const text = extractAgentText(latestAssistant.content);

    if (text) {
      return text;
    }
  }

  return null;
}

function normalize(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک");
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function getMissingOrderFields(order: OrderDraft) {
  const missing: Array<keyof OrderDraft> = [];

  if (!order.items) {
    missing.push("items");
  }

  if (!order.name) {
    missing.push("name");
  }

  if (!order.phone) {
    missing.push("phone");
  }

  if (!order.address) {
    missing.push("address");
  }

  return missing;
}

function extractOrderInfo(message: string, previous: OrderDraft) {
  const next: OrderDraft = { ...previous };
  const lines = message
    .split(/\n|،|,/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = normalize(line);

    if (includesAny(normalized, ["نام:", "اسم:", "name:"])) {
      next.name = line.replace(/^(نام|اسم|name)\s*:\s*/i, "").trim();
      continue;
    }

    if (includesAny(normalized, ["تلفن:", "موبایل:", "phone:"])) {
      next.phone = line.replace(/^(تلفن|موبایل|phone)\s*:\s*/i, "").trim();
      continue;
    }

    if (includesAny(normalized, ["آدرس:", "ادرس:", "address:"])) {
      next.address = line.replace(/^(آدرس|ادرس|address)\s*:\s*/i, "").trim();
      continue;
    }

    if (includesAny(normalized, ["سفارش:", "غذا:", "آیتم:", "ایتم:", "order:"])) {
      next.items = line
        .replace(/^(سفارش|غذا|آیتم|ایتم|order)\s*:\s*/i, "")
        .trim();
    }
  }

  const phoneMatch = message.match(/(?:\+?\d[\d\s-]{7,}\d)/);

  if (phoneMatch && !next.phone) {
    next.phone = phoneMatch[0].trim();
  }

  if (!next.address && includesAny(normalize(message), ["خیابان", "کوچه", "پلاک", "واحد", "آدرس", "ادرس"])) {
    next.address = message.trim();
  }

  if (!next.items) {
    const normalized = normalize(message);
    const itemCue = includesAny(normalized, [
      "پیتزا",
      "برگر",
      "کباب",
      "قورمه",
      "ماچا",
      "نوشابه",
      "کوکا"
    ]);

    if (itemCue) {
      next.items = message.trim();
    }
  }

  return next;
}

function buildOrderReply(visitorId: string, message: string) {
  const currentOrder = orders.get(visitorId) ?? {};
  const order = extractOrderInfo(message, currentOrder);
  orders.set(visitorId, order);

  const missing = getMissingOrderFields(order);

  if (missing.length === 0) {
    const summary = [
      "سفارش ثبت اولیه شد و آماده تایید است:",
      `• آیتم‌ها: ${order.items}`,
      `• نام: ${order.name}`,
      `• تلفن: ${order.phone}`,
      `• آدرس: ${order.address}`,
      "",
      "اگر همه‌چیز درست است بنویسید «تایید سفارش». اگر چیزی اشتباه است همان مورد را با برچسب بفرستید؛ مثلا: «آدرس: ...»"
    ].join("\n");

    return { reply: summary, order };
  }

  const nextQuestionByField: Record<keyof OrderDraft, string> = {
    items: "چی میل دارید سفارش بدهید؟ مثلا: «۲ پیتزا، یک کوکاکولای بنفش و یک ماچا».",
    name: "نام گیرنده سفارش را بفرستید.",
    phone: "شماره تماس را بفرستید تا برای هماهنگی سفارش استفاده شود.",
    address: "آدرس تحویل را با پلاک و واحد بفرستید."
  };

  const knownParts = [
    order.items ? `آیتم‌ها: ${order.items}` : null,
    order.name ? `نام: ${order.name}` : null,
    order.phone ? `تلفن: ${order.phone}` : null,
    order.address ? `آدرس: ${order.address}` : null
  ].filter(Boolean);

  return {
    reply: [
      knownParts.length > 0
        ? `تا اینجا گرفتم: ${knownParts.join(" | ")}`
        : "حتماً، سفارش را مرحله‌به‌مرحله می‌گیرم.",
      nextQuestionByField[missing[0]]
    ].join("\n"),
    order
  };
}

function siteReply(message: string, visitorId: string) {
  const normalized = normalize(message);
  const hasOrder = orders.has(visitorId);

  if (
    includesAny(normalized, ["تایید سفارش", "تأیید سفارش", "confirm order"]) &&
    hasOrder
  ) {
    const order = orders.get(visitorId);
    const missing = getMissingOrderFields(order ?? {});

    if (order && missing.length === 0) {
      orders.delete(visitorId);

      return {
        reply:
          "سفارش تایید شد. در نسخه فعلی سایت این ثبت به‌صورت نمایشی داخل چت انجام می‌شود؛ مرحله بعدی می‌تواند اتصال به پنل سفارش یا پیام تلگرام/واتساپ باشد.",
        source: "local-order",
        order
      };
    }

    return {
      reply: "برای تایید هنوز چند مورد کم است. لطفاً اطلاعات سفارش، نام، تلفن و آدرس را کامل کنید.",
      source: "local-order",
      order
    };
  }

  if (
    hasOrder ||
    includesAny(normalized, [
      "سفارش",
      "order",
      "خرید",
      "بخرم",
      "میخوام",
      "می‌خوام",
      "می خوام",
      "پیتزا",
      "برگر",
      "غذا",
      "نوشابه",
      "کوکا",
      "ماچا"
    ])
  ) {
    return { ...buildOrderReply(visitorId, message), source: "local-order" };
  }

  if (includesAny(normalized, ["سلام", "درود", "hello", "hi"])) {
    return {
      reply:
        "سلام، خوش آمدید. می‌توانید سفارش غذا/نوشیدنی بدهید، درباره فروشگاه‌های زنده بپرسید، یا سرورها، خودروها، آب‌وهوا و ماچا را بررسی کنیم.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["فروشگاه", "رستوران", "اسنپ", "snap"])) {
    return {
      reply:
        "بخش فروشگاه‌ها از API زنده خوانده می‌شود و کارت‌ها عکس، امتیاز، زمان ارسال، هزینه delivery و وضعیت باز/بسته را نشان می‌دهند. اگر می‌خواهید سفارش بدهید، فقط بنویسید چه چیزی می‌خواهید.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["آب", "هوا", "weather", "بارون", "باران", "دما"])) {
    return {
      reply:
        "برای آب‌وهوا می‌توانید شهر و سوالتان را بگویید؛ مثلا «هوای وین امروز چطوره؟». بخش Weather Q&A هم برای دما، بارش، باد و شرایط بیرون رفتن طراحی شده است.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["سرور", "server", "زیرساخت", "بکاپ", "مانیتورینگ"])) {
    return {
      reply:
        "در بخش سرورها روی پایداری، بکاپ، مانیتورینگ و دسترسی امن تمرکز شده. اگر سناریوی خاص دارید، بگویید مشکل uptime، backup، network یا deployment است تا دقیق‌تر راهنمایی کنم.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["خودرو", "ماشین", "car", "موتور", "ترمز"])) {
    return {
      reply:
        "بخش خودروها نگاه فنی دارد: ایمنی، مصرف سوخت، ترمز، موتور، برق خودرو و نگهداری دوره‌ای. مدل یا مشکل را بگویید تا مشخص‌تر جواب بدهم.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["کوکا", "نوشابه", "بنفش", "purple coke"])) {
    return {
      reply:
        "کوکاکولای بنفش در سایت نقش یک ایده خاص و playful دارد: نوشیدنی آشنا با حال‌وهوای آینده‌نگر. می‌توانید حتی آن را در سفارش نمایشی هم اضافه کنید.",
      source: "local"
    };
  }

  if (includesAny(normalized, ["ماچا", "matcha", "چای سبز"])) {
    return {
      reply:
        "ماچا بخش جدید پایین صفحه است: یک مکث سبز بین سرورها، خودروها و سفارش‌ها. اگر می‌خواهید، می‌توانم سفارش ماچا هم برایتان مرحله‌ای ثبت کنم.",
      source: "local"
    };
  }

  return {
    reply:
      "من متوجه شدم، ولی برای اینکه دقیق جواب بدهم یکی از این‌ها را بگویید: «سفارش می‌خوام»، «فروشگاه‌ها»، «آب‌وهوا»، «سرورها»، «خودروها»، «ماچا» یا سوالتان را با جزئیات بیشتر بنویسید.",
    source: "local"
  };
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = payload.message?.trim();

  if (!message) {
    return Response.json({ reply: "لطفاً یک پیام بنویسید." }, { status: 400 });
  }

  const visitorId =
    payload.visitorId?.replace(/[^a-zA-Z0-9_-]/g, "") ||
    `site-${crypto.randomUUID()}`;

  const agentReply = await getAgentReply(visitorId, message);

  if (agentReply) {
    return Response.json({ reply: agentReply, source: "agent" });
  }

  return Response.json(siteReply(message, visitorId));
}
