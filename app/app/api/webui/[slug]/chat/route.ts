import { NextRequest } from "next/server";

const WEBUI_BASE_URL = "http://127.0.0.1:18789";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await request.text();
  const authorization = request.headers.get("authorization");

  const response = await fetch(
    `${WEBUI_BASE_URL}/api/webui/${encodeURIComponent(params.slug)}/chat`,
    {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        ...(authorization ? { authorization } : {})
      },
      body,
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
