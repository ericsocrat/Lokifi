"use client";

import { SWRConfig } from "swr";
import React from "react";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        fetcher: (url: string) => fetch(url).then((r: any) => r.json()),
        provider: () => new Map()
      }}
    >
      {children}
    </SWRConfig>
  );
}