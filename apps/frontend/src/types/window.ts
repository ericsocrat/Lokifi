/**
 * Window global augmentations for chart functionality
 */

export {}; // Make this a module

declare global {
  interface Window {
    __lokifi_toast?: (message: string) => void;
    __lokifi_lastSnapshotPng?: string;
    _bbSeries?: unknown[];
    _vwap?: unknown;
    _vwma?: unknown;
    _stdch?: unknown[];
  }

  interface WindowEventMap {
    'lokifi:open-alert': CustomEvent;
    'lokifi:open-report': CustomEvent;
    'lokifi.toast': CustomEvent<{
      type: string;
      title: string;
      message: string;
    }>;
  }
}
