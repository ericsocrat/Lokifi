// Local parity server for the static Pages build and streaming API proxy.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web/out");
const port = Number(process.env.PORT || 13100);
const api = process.env.LOKIFI_API_ORIGIN || "http://127.0.0.1:18100";
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1:" + port);
      if (url.pathname.startsWith("/api/v1/")) {
        const headers = new Headers();
        for (const key of ["cookie", "content-type", "origin", "sec-fetch-site"])
          if (req.headers[key]) headers.set(key, String(req.headers[key]));
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 600000) {
            res.writeHead(413);
            res.end();
            return;
          }
          chunks.push(chunk);
        }
        const controller = new AbortController();
        res.on("close", () => controller.abort());
        const upstream = await fetch(api + url.pathname + url.search, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
          signal: controller.signal,
          redirect: "manual",
        });
        res.statusCode = upstream.status;
        res.setHeader("cache-control", "no-store");
        for (const key of ["content-type", "content-disposition", "retry-after"])
          if (upstream.headers.get(key)) res.setHeader(key, upstream.headers.get(key));
        const cookies = upstream.headers.getSetCookie();
        if (cookies.length) res.setHeader("set-cookie", cookies);
        if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
        else res.end();
        return;
      }
      const old = url.pathname.match(/^\/(portfolios|holdings)\/([a-f0-9-]+)$/i);
      if (old) {
        res.writeHead(302, { location: `/${old[1] === "portfolios" ? "portfolio" : "holding"}?id=${old[2]}` });
        res.end();
        return;
      }
      let path = resolve(root, "." + decodeURIComponent(url.pathname));
      if (!path.startsWith(root + "/") && !path.startsWith(root + "\\") && path !== root) {
        res.writeHead(400);
        res.end();
        return;
      }
      if (url.pathname === "/") path = resolve(root, "index.html");
      else if (!extname(path)) path += ".html";
      try {
        await stat(path);
      } catch {
        path = resolve(root, "404.html");
        res.statusCode = 404;
      }
      const types = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".txt": "text/plain",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".png": "image/png",
      };
      res.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(await readFile(path));
    } catch {
      if (!res.headersSent) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: "Lokifi is starting or temporarily unavailable." }));
      } else res.end();
    }
  })
  .listen(port, "127.0.0.1", () => console.log("Static Lokifi preview: http://127.0.0.1:" + port));
