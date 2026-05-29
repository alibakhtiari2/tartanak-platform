const WEBUI_WIDGET_URL = "http://127.0.0.1:18789/webui/qa/widget";

export async function GET() {
  const response = await fetch(WEBUI_WIDGET_URL, {
    cache: "no-store"
  });

  let body = await response.text();

  body = body
    .replace('setTimeout(refresh, 900);', 'setTimeout(refresh, 1200);')
    .replace('setTimeout(refresh, 2400);', 'setTimeout(refresh, 3200);')
    .replace(
      'setTimeout(refresh, 5000);',
      [
        'setTimeout(refresh, 6500);',
        'setTimeout(refresh, 10000);',
        'setTimeout(refresh, 15000);',
        'setTimeout(refresh, 22000);'
      ].join("\n    ")
    );

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/html"
    }
  });
}
