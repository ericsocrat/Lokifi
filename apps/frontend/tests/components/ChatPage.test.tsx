import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/src/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock chat API
const mockChat = vi.fn();
vi.mock('@/src/lib/api/chat', () => ({
  chat: (messages: unknown[]) => mockChat(messages),
}));

// Import after mocks
import ChatPage from '../../app/chat/page';

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    mockChat.mockResolvedValue({ answer: 'Test response' });
    // Mock scrollTo
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Page Header', () => {
    it('should render page title', () => {
      render(<ChatPage />);

      expect(screen.getByRole('heading', { name: 'AI Chat' })).toBeInTheDocument();
    });
  });

  describe('Chat Input', () => {
    it('should render input field with placeholder', () => {
      render(<ChatPage />);

      const input = screen.getByPlaceholderText(
        /Ask:.*\/price.*\/alert.*\/portfolio/i
      );
      expect(input).toBeInTheDocument();
    });

    it('should have default input value', () => {
      render(<ChatPage />);

      const input = screen.getByDisplayValue('/price BTCUSD 1h');
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<ChatPage />);

      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should allow typing in input', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByDisplayValue('/price BTCUSD 1h');
      await user.clear(input);
      await user.type(input, '/alert ETHUSD above 3000');

      expect(input).toHaveValue('/alert ETHUSD above 3000');
    });
  });

  describe('Message Sending', () => {
    it('should send message when clicking send button', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(mockChat).toHaveBeenCalled();
      });
    });

    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByDisplayValue('/price BTCUSD 1h');
      await user.type(input, '{enter}');

      await waitFor(() => {
        expect(mockChat).toHaveBeenCalled();
      });
    });

    it('should display user message after sending', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('/price BTCUSD 1h')).toBeInTheDocument();
      });
    });

    it('should display assistant response', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValue({ answer: 'Bitcoin price is $45,000' });

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Bitcoin price is $45,000')).toBeInTheDocument();
      });
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByDisplayValue('/price BTCUSD 1h');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should show loading state while sending', async () => {
      const user = userEvent.setup();
      // Never resolve to keep in loading state
      mockChat.mockImplementation(() => new Promise(() => {}));

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\.\.\./i })).toBeInTheDocument();
      });
    });

    it('should disable send button while busy', async () => {
      const user = userEvent.setup();
      mockChat.mockImplementation(() => new Promise(() => {}));

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\.\.\./i })).toBeDisabled();
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByDisplayValue('/price BTCUSD 1h');
      await user.clear(input);
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(mockChat).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when chat fails', async () => {
      const user = userEvent.setup();
      mockChat.mockRejectedValue(new Error('API Error'));

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should display generic error for non-Error exceptions', async () => {
      const user = userEvent.setup();
      mockChat.mockRejectedValue('Unknown error');

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should display (no answer) when response has no answer', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValue({});

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('(no answer)')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Status', () => {
    it('should show login prompt when not logged in', () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<ChatPage />);

      expect(screen.getByText(/not logged in/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    });

    it('should show login link pointing to /login', () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<ChatPage />);

      const loginLink = screen.getByRole('link', { name: /login/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should show username when logged in', () => {
      mockUseAuth.mockReturnValue({
        user: { username: 'testuser', email: 'test@example.com' },
      });

      render(<ChatPage />);

      expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    });

    it('should show email when username not available', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
      });

      render(<ChatPage />);

      expect(screen.getByText(/@test@example.com/)).toBeInTheDocument();
    });

    it('should mention portfolio tools when logged in', () => {
      mockUseAuth.mockReturnValue({
        user: { username: 'testuser' },
      });

      render(<ChatPage />);

      expect(screen.getByText(/\/portfolio/)).toBeInTheDocument();
      expect(screen.getByText(/create alerts/)).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should not display system messages', () => {
      render(<ChatPage />);

      expect(screen.queryByText(/You are Lokifi/)).not.toBeInTheDocument();
    });

    it('should style user messages differently from assistant', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValue({ answer: 'Response' });

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        // User message should be right-aligned
        const userMessage = screen.getByText('/price BTCUSD 1h');
        expect(userMessage.closest('.text-right')).toBeInTheDocument();

        // Assistant message should not be right-aligned
        const assistantMessage = screen.getByText('Response');
        expect(assistantMessage.closest('.text-right')).not.toBeInTheDocument();
      });
    });
  });

  describe('Chat Container', () => {
    it('should have scrollable message container', () => {
      render(<ChatPage />);

      const container = document.querySelector('.overflow-auto');
      expect(container).toBeInTheDocument();
    });

    it('should have max height constraint', () => {
      render(<ChatPage />);

      const container = document.querySelector('.max-h-\\[60vh\\]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Multiple Messages', () => {
    it('should accumulate messages in conversation', async () => {
      const user = userEvent.setup();
      mockChat
        .mockResolvedValueOnce({ answer: 'First response' })
        .mockResolvedValueOnce({ answer: 'Second response' });

      render(<ChatPage />);

      // Send first message
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Type and send second message
      const input = screen.getByPlaceholderText(/Ask:/);
      await user.type(input, '/portfolio summary');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
        // First messages should still be visible
        expect(screen.getByText('First response')).toBeInTheDocument();
        expect(screen.getByText('/price BTCUSD 1h')).toBeInTheDocument();
      });
    });

    it('should pass conversation history to chat API', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValueOnce({ answer: 'First response' });

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(mockChat).toHaveBeenCalledWith([
          { role: 'system', content: 'You are Lokifi, a helpful market assistant.' },
          { role: 'user', content: '/price BTCUSD 1h' },
        ]);
      });
    });
  });

  describe('UI Styling', () => {
    it('should have rounded container', () => {
      render(<ChatPage />);

      const container = document.querySelector('.rounded-2xl.border');
      expect(container).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      render(<ChatPage />);

      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toHaveClass('bg-emerald-600');
    });

    it('should have user message with sky blue background', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValue({ answer: 'Response' });

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const userMessage = screen.getByText('/price BTCUSD 1h');
        expect(userMessage.closest('.bg-sky-600')).toBeInTheDocument();
      });
    });

    it('should have assistant message with neutral background', async () => {
      const user = userEvent.setup();
      mockChat.mockResolvedValue({ answer: 'Response' });

      render(<ChatPage />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const assistantMessage = screen.getByText('Response');
        expect(assistantMessage.closest('.bg-neutral-800')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ChatPage />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should have accessible input field', () => {
      render(<ChatPage />);

      const input = screen.getByPlaceholderText(/Ask:/);
      expect(input).toHaveAttribute('placeholder');
    });

    it('should have accessible button', () => {
      render(<ChatPage />);

      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toBeEnabled();
    });

    it('should have accessible login link', () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<ChatPage />);

      const link = screen.getByRole('link', { name: /login/i });
      expect(link).toHaveAttribute('href');
    });
  });

  describe('Code Display', () => {
    it('should render code element in help text when logged in', () => {
      mockUseAuth.mockReturnValue({
        user: { username: 'testuser' },
      });

      render(<ChatPage />);

      const codeElement = screen.getByText('/portfolio');
      expect(codeElement.tagName).toBe('CODE');
    });
  });
});
