"use client";
import { useEffect } from "react";

export function CanonicalBoundary() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const legacy = url.pathname.match(/^\/(portfolios|holdings)\/([a-f0-9-]{36})\/?$/i);
    const alias =
      url.hostname === "www.lokifi.com" ||
      url.hostname === "lokifi-beta.pages.dev" ||
      url.hostname.endsWith(".lokifi-beta.pages.dev");
    if (alias) {
      url.protocol = "https:";
      url.host = "lokifi.com";
    }
    if (legacy) {
      url.pathname = legacy[1] === "portfolios" ? "/portfolio" : "/holding";
      url.searchParams.set("id", legacy[2]);
    }
    if (legacy || alias) window.location.replace(url.href);
  }, []);
  return null;
}
