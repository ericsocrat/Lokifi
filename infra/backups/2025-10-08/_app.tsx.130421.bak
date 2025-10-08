/**
 * Custom App Component with Web Vitals Integration
 * This integrates Web Vitals monitoring into Next.js
 */

import { webVitalsMonitor } from '@/src/lib/webVitals';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

export function reportWebVitals(metric: any) {
  // This function is called by Next.js automatically
  // We use our custom monitor which already handles this
  if (process.env.NODE_ENV === 'development') {
    console.log('Next.js Web Vital:', metric);
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Ensure Web Vitals monitor is initialized
    webVitalsMonitor.init();

    // Subscribe to metrics for custom handling
    const unsubscribe = webVitalsMonitor.subscribe((report) => {
      // Custom analytics integration can go here
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', report.name, {
          event_category: 'Web Vitals',
          event_label: report.id,
          value: Math.round(report.value),
          non_interaction: true,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
