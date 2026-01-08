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
  delete (window as { location?: Location }).location;
  (window as { location: URL }).location = new URL(url);

  return {
    restore: () => {
      (window as { location: Location }).location = originalLocation;
    },
    setHash: (hash: string) => {
      (window as { location: { hash: string } }).location.hash = hash;
    },
    setHref: (href: string) => {
      (window as { location: URL }).location = new URL(href);
    },
  };
}

