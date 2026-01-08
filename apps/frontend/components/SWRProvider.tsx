'use client';

import React from 'react';
import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then((r) => r.json()),
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  );
}

