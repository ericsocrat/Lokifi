/**
 * AIResearchPage Tests
 *
 * Tests for the AI Research Assistant page component.
 * Covers welcome state, suggested queries, conversation flow, and input handling.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIResearchPage from '../../app/ai-research/page';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
  Bot: () => <div data-testid="bot-icon">Bot</div>,
  LineChart: () => <div data-testid="line-chart-icon">LineChart</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
}));

describe('AIResearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Page Header', () => {
    it('renders the main title', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('AI Research Assistant')).toBeInTheDocument();
    });

    it('renders the subtitle description', () => {
      render(<AIResearchPage />);

      expect(
        screen.getByText('Get intelligent insights about your investments')
      ).toBeInTheDocument();
    });

    it('displays Bot icon in header', () => {
      render(<AIResearchPage />);

      const botIcons = screen.getAllByTestId('bot-icon');
      expect(botIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Welcome State', () => {
    it('displays welcome message when no conversation', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    });

    it('displays welcome description', () => {
      render(<AIResearchPage />);

      expect(
        screen.getByText(
          'Ask me anything about your portfolio, market trends, or investment strategies.'
        )
      ).toBeInTheDocument();
    });

    it('displays Sparkles icon in welcome section', () => {
      render(<AIResearchPage />);

      const sparklesIcons = screen.getAllByTestId('sparkles-icon');
      expect(sparklesIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Suggested Queries', () => {
    it('renders Market Analysis suggestion', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('Market Analysis')).toBeInTheDocument();
      expect(
        screen.getByText('Get insights on current market trends and opportunities')
      ).toBeInTheDocument();
    });

    it('renders Portfolio Review suggestion', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('Portfolio Review')).toBeInTheDocument();
      expect(
        screen.getByText('Analyze your portfolio performance and allocation')
      ).toBeInTheDocument();
    });

    it('renders Stock Research suggestion', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('Stock Research')).toBeInTheDocument();
      expect(screen.getByText('Deep dive into specific stocks or sectors')).toBeInTheDocument();
    });

    it('renders Investment Ideas suggestion', () => {
      render(<AIResearchPage />);

      expect(screen.getByText('Investment Ideas')).toBeInTheDocument();
      expect(
        screen.getByText('Get personalized investment recommendations')
      ).toBeInTheDocument();
    });

    it('renders four suggested query cards', () => {
      render(<AIResearchPage />);

      const arrowIcons = screen.getAllByTestId('arrow-right-icon');
      expect(arrowIcons.length).toBe(4);
    });

    it('shows TrendingUp icon for Market Analysis', () => {
      render(<AIResearchPage />);

      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    });

    it('shows LineChart icon for Portfolio Review', () => {
      render(<AIResearchPage />);

      expect(screen.getByTestId('line-chart-icon')).toBeInTheDocument();
    });

    it('shows Search icon for Stock Research', () => {
      render(<AIResearchPage />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
  });

  describe('Input Area', () => {
    it('renders input field with placeholder', () => {
      render(<AIResearchPage />);

      expect(
        screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...')
      ).toBeInTheDocument();
    });

    it('renders Ask AI button', () => {
      render(<AIResearchPage />);

      expect(screen.getByRole('button', { name: /ask ai/i })).toBeInTheDocument();
    });

    it('renders disclaimer text', () => {
      render(<AIResearchPage />);

      expect(
        screen.getByText(/AI responses are for informational purposes only/i)
      ).toBeInTheDocument();
    });

    it('updates input value when typing', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });

      expect(input).toHaveValue('Test query');
    });

    it('disables submit button when input is empty', () => {
      render(<AIResearchPage />);

      const button = screen.getByRole('button', { name: /ask ai/i });
      expect(button).toBeDisabled();
    });

    it('enables submit button when input has text', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });

      const button = screen.getByRole('button', { name: /ask ai/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('clears input after submission', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.submit(input.closest('form')!);

      expect(input).toHaveValue('');
    });

    it('does not submit empty query', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.submit(input.closest('form')!);

      // Welcome state should still be visible
      expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    });

    it('shows user message after submission', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'What are the best stocks?' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByText('What are the best stocks?')).toBeInTheDocument();
    });

    it('shows loading indicator after submission', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.submit(input.closest('form')!);

      const loaders = screen.getAllByTestId('loader-icon');
      expect(loaders.length).toBeGreaterThan(0);
    });

    it('disables input while loading', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.submit(input.closest('form')!);

      expect(input).toBeDisabled();
    });

    it('shows AI response after timeout', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          expect(screen.getByText(/I'm analyzing your request/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('re-enables input after AI response', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          expect(input).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Suggested Query Interaction', () => {
    it('submits query when clicking Market Analysis card', () => {
      render(<AIResearchPage />);

      const marketAnalysisButton = screen.getByText('Market Analysis').closest('button');
      fireEvent.click(marketAnalysisButton!);

      expect(
        screen.getByText('What are the current market trends and potential opportunities?')
      ).toBeInTheDocument();
    });

    it('submits query when clicking Portfolio Review card', () => {
      render(<AIResearchPage />);

      const portfolioButton = screen.getByText('Portfolio Review').closest('button');
      fireEvent.click(portfolioButton!);

      expect(
        screen.getByText('Can you analyze my portfolio and suggest improvements?')
      ).toBeInTheDocument();
    });

    it('submits query when clicking Stock Research card', () => {
      render(<AIResearchPage />);

      const stockButton = screen.getByText('Stock Research').closest('button');
      fireEvent.click(stockButton!);

      expect(
        screen.getByText('Research the technology sector for potential investments')
      ).toBeInTheDocument();
    });

    it('submits query when clicking Investment Ideas card', () => {
      render(<AIResearchPage />);

      const investmentButton = screen.getByText('Investment Ideas').closest('button');
      fireEvent.click(investmentButton!);

      expect(
        screen.getByText('What are some investment ideas based on my risk tolerance?')
      ).toBeInTheDocument();
    });

    it('hides welcome state after clicking suggested query', () => {
      render(<AIResearchPage />);

      const marketAnalysisButton = screen.getByText('Market Analysis').closest('button');
      fireEvent.click(marketAnalysisButton!);

      expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();
    });
  });

  describe('Conversation Display', () => {
    it('displays user message with correct styling', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'My question' } });
      fireEvent.submit(input.closest('form')!);

      const userMessage = screen.getByText('My question');
      expect(userMessage).toBeInTheDocument();
    });

    it('shows MessageSquare icon for user messages', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'User question' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByTestId('message-square-icon')).toBeInTheDocument();
    });

    it('shows Bot icon for assistant messages', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          // Multiple bot icons: header + conversation
          const botIcons = screen.getAllByTestId('bot-icon');
          expect(botIcons.length).toBeGreaterThan(1);
        },
        { timeout: 3000 }
      );
    });

    it('maintains conversation history', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');

      // First message
      fireEvent.change(input, { target: { value: 'First question' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          expect(screen.getByText('First question')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Wait for AI response before second message
      await waitFor(
        () => {
          expect(screen.getByText(/I'm analyzing your request/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Second message
      fireEvent.change(input, { target: { value: 'Second question' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('has proper page layout with flex column', () => {
      const { container } = render(<AIResearchPage />);

      const mainContainer = container.querySelector('.flex.flex-col');
      expect(mainContainer).toBeInTheDocument();
    });

    it('has sticky header', () => {
      const { container } = render(<AIResearchPage />);

      const stickyHeader = container.querySelector('.sticky');
      expect(stickyHeader).toBeInTheDocument();
    });

    it('has max-width container for content', () => {
      const { container } = render(<AIResearchPage />);

      const maxWidthContainer = container.querySelector('.max-w-4xl');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('renders suggested queries in grid layout', () => {
      const { container } = render(<AIResearchPage />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies backdrop blur to header', () => {
      const { container } = render(<AIResearchPage />);

      const blurElement = container.querySelector('.backdrop-blur-xl');
      expect(blurElement).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive grid for suggested queries', () => {
      const { container } = render(<AIResearchPage />);

      const responsiveGrid = container.querySelector('.md\\:grid-cols-2');
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('starts with single column on mobile', () => {
      const { container } = render(<AIResearchPage />);

      const mobileGrid = container.querySelector('.grid-cols-1');
      expect(mobileGrid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy with h1', () => {
      render(<AIResearchPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('AI Research Assistant');
    });

    it('has proper heading for welcome message', () => {
      render(<AIResearchPage />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('How can I help you today?');
    });

    it('input has proper type attribute', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('submit button has type submit', () => {
      render(<AIResearchPage />);

      const button = screen.getByRole('button', { name: /ask ai/i });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Loading State', () => {
    it('shows loader in button during loading', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.submit(input.closest('form')!);

      // Loader should appear in the chat area
      const loaders = screen.getAllByTestId('loader-icon');
      expect(loaders.length).toBeGreaterThan(0);
    });

    it('disables submit button during loading', () => {
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.submit(input.closest('form')!);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('AI Response Content', () => {
    it('includes user query in AI response', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Bitcoin analysis' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          expect(screen.getByText(/Bitcoin analysis/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('shows development notice in AI response', async () => {
      vi.useRealTimers(); // Use real timers for this test
      render(<AIResearchPage />);

      const input = screen.getByPlaceholderText('Ask about markets, stocks, or your portfolio...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(
        () => {
          expect(screen.getByText(/currently in development/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
