import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import {
  WebDesignStudio,
  type RegistryComponent
} from "@/components/web-design-studio";

export const metadata: Metadata = {
  title: "Web Design Studio | Tartanak",
  description:
    "A guided studio for finding, planning, and installing web design components."
};

type DownloadList = {
  generated?: string;
  total?: number;
  components?: Array<{
    name?: string;
    author?: string;
    slug?: string;
    install?: string;
    url?: string;
  }>;
};

function componentKind(component: Pick<RegistryComponent, "slug" | "install">) {
  const installKind = component.install.match(/\/r\/[^/]+\/([^"\s]+)/)?.[1];

  return (
    installKind ??
    component.slug.replace(/-variant-\d+$/, "") ??
    "component"
  );
}

function componentCategory(kind: string) {
  if (
    [
      "hero",
      "animated-hero",
      "hero-section",
      "hero-section-dark",
      "hero-with-mockup",
      "hero-highlight",
      "hero-video-dialog",
      "hero-parallax",
      "shape-landing-hero",
      "call-to-action",
      "features",
      "feature-section",
      "clients",
      "testimonials",
      "pricing-section",
      "footer"
    ].includes(kind)
  ) {
    return "Sections";
  }

  if (
    [
      "button",
      "input",
      "select",
      "textarea",
      "checkbox",
      "radio-group",
      "slider",
      "toggle",
      "form",
      "date-picker",
      "upload-download"
    ].includes(kind)
  ) {
    return "Controls";
  }

  if (
    [
      "card",
      "accordion",
      "tabs",
      "modal-dialog",
      "dropdown",
      "popover",
      "tooltip",
      "table",
      "pagination",
      "scroll-area",
      "sidebar",
      "navbar-navigation",
      "menu"
    ].includes(kind)
  ) {
    return "Structure";
  }

  if (
    [
      "background",
      "border",
      "image",
      "video",
      "icons",
      "text",
      "badge",
      "avatar",
      "chip-tag",
      "spinner-loader"
    ].includes(kind)
  ) {
    return "Visuals";
  }

  if (
    [
      "ai-chat",
      "notification",
      "toast",
      "alert",
      "empty-state",
      "file-tree",
      "map",
      "dock",
      "hook"
    ].includes(kind)
  ) {
    return "Product";
  }

  return "Utilities";
}

async function getRegistry() {
  const filePath = path.join("/home/ali", "downloadlist.json");

  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw) as DownloadList;

    const components = (data.components ?? [])
      .filter(
        (component) =>
          component.name &&
          component.author &&
          component.slug &&
          component.install &&
          component.url
      )
      .map((component) => {
        const base = {
          name: component.name ?? "Untitled",
          author: component.author ?? "unknown",
          slug: component.slug ?? "",
          install: component.install ?? "",
          url: component.url ?? ""
        };
        const kind = componentKind(base);
        const style = base.name.split(" ")[0] ?? "Clean";

        return {
          ...base,
          kind,
          style,
          category: componentCategory(kind)
        };
      });

    return {
      generated: data.generated ?? null,
      total: data.total ?? components.length,
      components
    };
  } catch {
    return {
      generated: null,
      total: 0,
      components: [] as RegistryComponent[]
    };
  }
}

export default async function BackgroundsPage() {
  const registry = await getRegistry();

  return <WebDesignStudio registry={registry} />;
}
