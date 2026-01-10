'use client';
import { FLAGS, getAllFlags, setDevFlag, type FeatureFlags } from '@/src/lib/utils/featureFlags';
import { useState } from 'react';

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
    <main
      className="p-6 bg-surface-0 min-h-screen text-white"
      role="main"
      aria-label="Feature flags debug interface"
    >
      <h1 className="text-2xl font-bold mb-6">Feature Flags Debug</h1>
      <section
        role="region"
        aria-label="Feature flags controls"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {Object.entries(flags).map(([flag, enabled]) => (
          <div
            key={flag}
            className="p-4 bg-surface-100 rounded-lg border border-surface-300"
            role="listitem"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{flag}</span>
              <button
                onClick={() => toggleFlag(flag as keyof FeatureFlags)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  enabled ? 'bg-green-600 text-white' : 'bg-surface-300 text-surface-200'
                }`}
                aria-label={`Toggle ${flag}: currently ${enabled ? 'enabled' : 'disabled'}`}
                aria-pressed={enabled}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-sm text-surface-300" aria-live="polite" aria-atomic="true">
              Current: {FLAGS[flag as keyof FeatureFlags] ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        ))}
      </section>
      <section
        role="region"
        aria-label="Instructions"
        className="mt-8 p-4 bg-surface-100 rounded-lg border border-surface-300"
      >
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="text-surface-200 text-sm">
          Toggle flags here to test features in development. Changes apply immediately to the
          current session. These overrides do not persist across page reloads.
        </p>
      </section>
    </main>
  );
}
