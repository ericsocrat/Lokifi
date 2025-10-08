/**
 * Window global augmentations for chart functionality
 */

export {}; // Make this a module

declare global {
  interface Window {
    __fynix_toast?: (message: string) => void;
    __fynix_lastSnapshotPng?: string;
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
