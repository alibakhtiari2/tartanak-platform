import { NextRequest } from "next/server";

const WEBUI_BASE_URL = "http://127.0.0.1:18789";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string; action: string } }
) {
  const response = await fetch(
    `${WEBUI_BASE_URL}/api/webui/${encodeURIComponent(
      params.slug
    )}/${encodeURIComponent(params.action)}`,
    { cache: "no-store" }
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; action: string } }
) {
  const response = await fetch(
    `${WEBUI_BASE_URL}/api/webui/${encodeURIComponent(
      params.slug
    )}/${encodeURIComponent(params.action)}`,
    {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json"
      },
      body: await request.text(),
      cache: "no-store"
    }
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
