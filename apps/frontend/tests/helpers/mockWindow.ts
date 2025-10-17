/**
 * Test helper for mocking window.location
 * Usage:
 *   const mockLocation = mockWindowLocation('https://app.lokifi.ai/chart');
 *   // ... run tests ...
 *   mockLocation.restore();
 */
export function mockWindowLocation(url: string) {
  const originalLocation = window.location;

  // Delete and recreate location with a URL object
  delete (window as any).location;
  (window as any).location = new URL(url);

  return {
    restore: () => {
      (window as any).location = originalLocation;
    },
    setHash: (hash: string) => {
      (window as any).location.hash = hash;
    },
    setHref: (href: string) => {
      (window as any).location = new URL(href);
    },
  };
}
