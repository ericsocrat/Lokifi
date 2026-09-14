"use client";
import { useEffect, useRef } from "react";
interface WidgetAPI {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: WidgetAPI;
  }
}
export function Turnstile({
  siteKey,
  action,
  onToken,
  attempt = 0,
}: {
  siteKey: string | null;
  action: string;
  onToken: (token: string) => void;
  attempt?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!siteKey) return;
    let id: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (!cancelled && container.current && window.turnstile && !id)
        id = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "true";
      document.head.append(script);
    }
    script.addEventListener("load", mount);
    mount();
    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, action, attempt]);
  return <div ref={container} className="bot-verification" />;
}
