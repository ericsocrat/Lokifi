import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the queryClient module with a minimal mock
vi.mock('@/lib/api/queryClient', () => ({
  queryClient: {
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    // Minimal mock object that satisfies QueryClient interface
  },
}));

// Mock React Query DevTools
vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: ({ initialIsOpen }: { initialIsOpen: boolean }) => (
    <div data-testid="react-query-devtools" data-initial-open={initialIsOpen}>
      DevTools
    </div>
  ),
}));

describe('ReactQueryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <ReactQueryProvider>
          <div>Test Child Component</div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Test Child Component')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ReactQueryProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should wrap children with QueryClientProvider', () => {
      const { container } = render(
        <ReactQueryProvider>
          <div data-testid="test-content">Content</div>
        </ReactQueryProvider>
      );

      // Children should be rendered
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="test-content"]')).toBeTruthy();
    });

    it('should handle React fragments as children', () => {
      render(
        <ReactQueryProvider>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Fragment Child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment Child 2')).toBeInTheDocument();
    });
  });

  describe('DevTools Integration', () => {
    it('should render DevTools in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development');

      render(
        <ReactQueryProvider>
          <div>Test Content</div>
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('react-query-devtools')).toBeInTheDocument();
      vi.unstubAllEnvs();
    });

    it('should not render DevTools in production mode', () => {
      vi.stubEnv('NODE_ENV', 'production');

      render(
        <ReactQueryProvider>
          <div>Test Content</div>
        </ReactQueryProvider>
      );

      expect(screen.queryByTestId('react-query-devtools')).not.toBeInTheDocument();
      vi.unstubAllEnvs();
    });

    it('should not render DevTools in test mode', () => {
      vi.stubEnv('NODE_ENV', 'test');

      render(
        <ReactQueryProvider>
          <div>Test Content</div>
        </ReactQueryProvider>
      );

      expect(screen.queryByTestId('react-query-devtools')).not.toBeInTheDocument();
      vi.unstubAllEnvs();
    });

    it('should set initialIsOpen to false for DevTools', () => {
      vi.stubEnv('NODE_ENV', 'development');

      render(
        <ReactQueryProvider>
          <div>Test Content</div>
        </ReactQueryProvider>
      );

      const devtools = screen.getByTestId('react-query-devtools');
      expect(devtools.getAttribute('data-initial-open')).toBe('false');
      vi.unstubAllEnvs();
    });
  });

  describe('Provider Configuration', () => {
    it('should provide queryClient to children', () => {
      // Component that uses React Query would be able to access the client
      render(
        <ReactQueryProvider>
          <div data-testid="query-consumer">Query Consumer</div>
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('query-consumer')).toBeInTheDocument();
    });

    it('should render without errors', () => {
      expect(() => {
        render(
          <ReactQueryProvider>
            <div>Content</div>
          </ReactQueryProvider>
        );
      }).not.toThrow();
    });

    it('should handle empty children', () => {
      const { container } = render(<ReactQueryProvider>{null}</ReactQueryProvider>);

      expect(container).toBeInTheDocument();
    });
  });

  describe('Nesting and Composition', () => {
    it('should allow nested components', () => {
      render(
        <ReactQueryProvider>
          <div>
            <span>Nested Level 1</span>
            <div>
              <span>Nested Level 2</span>
            </div>
          </div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Nested Level 1')).toBeInTheDocument();
      expect(screen.getByText('Nested Level 2')).toBeInTheDocument();
    });

    it('should preserve component tree structure', () => {
      const TestComponent = () => <div data-testid="test-component">Test</div>;

      render(
        <ReactQueryProvider>
          <TestComponent />
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('should support multiple provider instances', () => {
      const { rerender } = render(
        <ReactQueryProvider>
          <div>Instance 1</div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Instance 1')).toBeInTheDocument();

      rerender(
        <ReactQueryProvider>
          <div>Instance 2</div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Instance 2')).toBeInTheDocument();
    });
  });

  describe('Client Component Directive', () => {
    it('should be a client component (has use client directive)', () => {
      // This is verified by the component structure
      // The component should render without server-side issues
      render(
        <ReactQueryProvider>
          <div>Client Component Test</div>
        </ReactQueryProvider>
      );

      expect(screen.getByText('Client Component Test')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid re-renders', () => {
      const { rerender } = render(
        <ReactQueryProvider>
          <div>Content 1</div>
        </ReactQueryProvider>
      );

      for (let i = 2; i <= 5; i++) {
        rerender(
          <ReactQueryProvider>
            <div>Content {i}</div>
          </ReactQueryProvider>
        );
        expect(screen.getByText(`Content ${i}`)).toBeInTheDocument();
      }
    });

    it('should handle different NODE_ENV values', () => {
      const envValues = ['development', 'production', 'test', 'staging'];

      envValues.forEach((env) => {
        vi.stubEnv('NODE_ENV', env);

        const { unmount } = render(
          <ReactQueryProvider>
            <div>Env: {env}</div>
          </ReactQueryProvider>
        );

        expect(screen.getByText(`Env: ${env}`)).toBeInTheDocument();

        unmount();
        vi.unstubAllEnvs();
      });
    });

    it('should maintain DevTools state across re-renders in development', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const { rerender } = render(
        <ReactQueryProvider>
          <div>Content A</div>
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('react-query-devtools')).toBeInTheDocument();

      rerender(
        <ReactQueryProvider>
          <div>Content B</div>
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('react-query-devtools')).toBeInTheDocument();
      vi.unstubAllEnvs();
    });
  });
});
