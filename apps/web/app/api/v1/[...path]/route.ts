import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p)))
    return Response.json({ detail: "Invalid API path" }, { status: 400 });
  const base = process.env.LOKIFI_API_ORIGIN || "http://127.0.0.1:18100";
  const headers = new Headers();
  for (const key of ["content-type", "cookie", "origin", "sec-fetch-site"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  // No redirects, arbitrary hosts, client authorization headers or public secrets.
  let body: Uint8Array | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 600000) {
          await reader.cancel();
          return Response.json({ detail: "Request too large" }, { status: 413 });
        }
        chunks.push(chunk.value);
      }
    body = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.length;
    }
  }
  try {
    const upstream = await fetch(`${base}/api/v1/${path.join("/")}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const outgoing = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "content-disposition"]) {
      const value = upstream.headers.get(key);
      if (value) outgoing.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append("set-cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json(
      { detail: "Lokifi cannot reach its storage service. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
