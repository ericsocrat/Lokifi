'use client';
import DrawingLayer from '@/components/DrawingLayer';
import { useChartStore } from '@/state/store';
import React from 'react';

export default function DevDrawingPage() {
  React.useEffect(() => {
    // Default to trendline tool for test convenience
    try {
      useChartStore.getState().setTool('trendline');
    } catch {
      // ignore if store not ready in SSR
    }
  }, []);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-semibold mb-4">DrawingLayer Dev Test</h1>
      <p className="text-sm text-gray-500 mb-2">
        Use this page to validate canvas drawing behavior in a real browser.
      </p>
      <div
        id="drawing-container"
        className="relative border rounded-md bg-white"
        style={{ width: 800, height: 600 }}
      >
        {/* DrawingLayer uses absolute inset-0 inside a sized relative container */}
        <DrawingLayer useOffscreen={false} />
      </div>
    </div>
  );
}
