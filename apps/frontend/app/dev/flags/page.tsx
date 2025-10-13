"use client";
import React, { useState } from 'react';
import { FLAGS, setDevFlag, getAllFlags, type FeatureFlags } from '@/lib/utils/featureFlags';

// Dev-only debug page for feature flags
export default function FeatureFlagsDebug() {
  const [flags, setFlags] = useState<FeatureFlags>(getAllFlags);

  const toggleFlag = (flag: keyof FeatureFlags) => {
    const newValue = !flags[flag];
    setDevFlag(flag, newValue);
    setFlags({ ...flags, [flag]: newValue });
  };

  if (process.env.NODE_ENV !== 'development') {
    return <div>Feature flags debug page is only available in development.</div>;
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Feature Flags Debug</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(flags).map(([flag, enabled]) => (
          <div key={flag} className="p-4 bg-gray-800 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{flag}</span>
              <button
                onClick={() => toggleFlag(flag as keyof FeatureFlags)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  enabled
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-200'
                }`}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Current: {FLAGS[flag as keyof FeatureFlags] ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="text-gray-300 text-sm">
          Toggle flags here to test features in development. Changes apply immediately to the current session.
          These overrides do not persist across page reloads.
        </p>
      </div>
    </div>
  );
}
