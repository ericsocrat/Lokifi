import { render, screen, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRProvider } from '../../components/SWRProvider';

// Test component that uses SWR to verify the provider works
function TestConsumer({ url }: { url: string }) {
  const { data, error, isLoading } = useSWR(url);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (data) return <div>Data: {JSON.stringify(data)}</div>;
  return null;
}

describe('SWRProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <SWRProvider>
          <div data-testid="child">Child content</div>
        </SWRProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <SWRProvider>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
          <div data-testid="child3">Third</div>
        </SWRProvider>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
      expect(screen.getByTestId('child3')).toBeInTheDocument();
    });

    it('renders nested components', () => {
      render(
        <SWRProvider>
          <div data-testid="parent">
            <div data-testid="nested">Nested content</div>
          </div>
        </SWRProvider>
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('nested')).toBeInTheDocument();
    });

    it('renders nothing when no children', () => {
      const { container } = render(<SWRProvider>{null}</SWRProvider>);

      // SWRConfig renders a fragment, so container should be empty
      expect(container.firstChild).toBe(null);
    });
  });

  describe('SWR context provision', () => {
    it('provides SWR context to children', async () => {
      const mockData = { message: 'Hello World' };
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve(mockData),
      });

      render(
        <SWRProvider>
          <TestConsumer url="/api/test" />
        </SWRProvider>
      );

      // Should start with loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should eventually show data
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test');
    });

    it('handles fetch errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(
        <SWRProvider>
          <TestConsumer url="/api/error" />
        </SWRProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('provides fetcher that parses JSON responses', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      render(
        <SWRProvider>
          <TestConsumer url="/api/data" />
        </SWRProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockResponse)}`)).toBeInTheDocument();
      });
    });
  });

  describe('cache provider', () => {
    it('provides fresh cache for each SWRProvider', async () => {
      const mockData1 = { value: 'first' };
      const mockData2 = { value: 'second' };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockData1),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockData2),
        });

      // First provider
      const { unmount } = render(
        <SWRProvider>
          <TestConsumer url="/api/cache-test" />
        </SWRProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData1)}`)).toBeInTheDocument();
      });

      unmount();

      // Second provider - should get fresh data
      render(
        <SWRProvider>
          <TestConsumer url="/api/cache-test" />
        </SWRProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData2)}`)).toBeInTheDocument();
      });
    });
  });

  describe('nested providers', () => {
    it('handles nested SWRProviders', () => {
      render(
        <SWRProvider>
          <div data-testid="outer">
            <SWRProvider>
              <div data-testid="inner">Inner content</div>
            </SWRProvider>
          </div>
        </SWRProvider>
      );

      expect(screen.getByTestId('outer')).toBeInTheDocument();
      expect(screen.getByTestId('inner')).toBeInTheDocument();
    });
  });
});
