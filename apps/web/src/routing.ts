"use client";
import { useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";
export function publicPath(path: string): string {
  const match = path.match(/^\/(portfolios|holdings)\/([a-zA-Z0-9-]+)$/);
  return match ? `/${match[1] === "portfolios" ? "portfolio" : "holding"}?id=${encodeURIComponent(match[2])}` : path;
}
export function useRouter() {
  const r = useNextRouter();
  return useMemo(
    () => ({ push: (p: string) => r.push(publicPath(p)), replace: (p: string) => r.replace(publicPath(p)) }),
    [r],
  );
}
