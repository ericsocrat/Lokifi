interface Env {
  LOKIFI_API_ORIGIN: string;
  LOKIFI_PROXY_SECRET: string;
  LOKIFI_WEB_ORIGIN: string;
}
interface Context {
  request: Request;
  env: Env;
  params: { path: string[] };
}
export async function onRequest({ request, env, params }: Context) {
  const url = new URL(request.url);
  if (!env.LOKIFI_API_ORIGIN || !env.LOKIFI_PROXY_SECRET)
    return Response.json({ detail: "Lokifi is not configured yet" }, { status: 503 });
  if (!params.path.every((p) => /^[a-zA-Z0-9_-]+$/.test(p)))
    return Response.json({ detail: "Invalid API path" }, { status: 400 });
  if (!["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"].includes(request.method))
    return new Response(null, { status: 405 });
  const headers = new Headers({ "x-lokifi-proxy": env.LOKIFI_PROXY_SECRET });
  for (const key of ["cookie", "content-type", "origin", "sec-fetch-site"]) {
    const v = request.headers.get(key);
    if (v) headers.set(key, v);
  }
  headers.set("x-lokifi-client-ip", request.headers.get("cf-connecting-ip") || "unknown");
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${env.LOKIFI_API_ORIGIN}/api/v1/${params.path.join("/")}${url.search}`, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
      signal: controller.signal,
    });
    const out = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const key of ["content-type", "content-disposition", "retry-after", "set-cookie"]) {
      const v = response.headers.get(key);
      if (v) out.set(key, v);
    }
    return new Response(response.body, { status: response.status, headers: out });
  } catch {
    return Response.json(
      { detail: "Lokifi is starting or temporarily unavailable. Please retry shortly." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
