import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CopilotChat from '../../components/CopilotChat';

// Hoisted mocks
const { mockSymbolStore, mockTimeframeStore, mockAPI, _MockEventSource } = vi.hoisted(() => {
  const mockEventSource = vi.fn();
  return {
    mockSymbolStore: {
      currentSymbol: 'BTCUSD',
      get: vi.fn(() => 'BTCUSD'),
    },
    mockTimeframeStore: {
      currentTimeframe: '1h',
      get: vi.fn(() => '1h'),
    },
    mockAPI: 'http://localhost:8000',
    _MockEventSource: mockEventSource,
  };
});

vi.mock('@/lib/api', () => ({
  API: mockAPI,
}));

vi.mock('@/stores/symbolStore', () => ({
  symbolStore: mockSymbolStore,
}));

vi.mock('@/stores/timeframeStore', () => ({
  timeframeStore: mockTimeframeStore,
}));

describe('CopilotChat', () => {
  let eventSourceInstance: {
    onmessage: ((event: { data: string }) => void) | null;
    onerror: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock EventSource instance
    eventSourceInstance = {
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    };

    // Mock global EventSource
    global.EventSource = vi.fn(() => eventSourceInstance) as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the AI Copilot heading', () => {
      render(<CopilotChat />);
      expect(screen.getByText('AI Copilot')).toBeInTheDocument();
    });

    it('should render model preset dropdown', () => {
      render(<CopilotChat />);
      expect(screen.getByRole('combobox', { name: /model preset/i })).toBeInTheDocument();
    });

    it('should render all preset options', () => {
      render(<CopilotChat />);
      const select = screen.getByRole('combobox', { name: /model preset/i });

      expect(select.querySelectorAll('option')).toHaveLength(3);
      expect(screen.getByText('llama3.1 (Ollama)')).toBeInTheDocument();
      expect(screen.getByText('qwen2.5 (Ollama)')).toBeInTheDocument();
      expect(screen.getByText('Custom…')).toBeInTheDocument();
    });

    it('should render chat input', () => {
      render(<CopilotChat />);
      expect(screen.getByPlaceholderText(/ask about btc, aapl, rsi, news/i)).toBeInTheDocument();
    });

    it('should render Ask button', () => {
      render(<CopilotChat />);
      expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
    });

    it('should render use chart context checkbox', () => {
      render(<CopilotChat />);
      expect(screen.getByText(/use chart as context/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should have chart context checkbox checked by default', () => {
      render(<CopilotChat />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Model Selection', () => {
    it('should not show custom input by default', () => {
      render(<CopilotChat />);
      expect(screen.queryByPlaceholderText(/ollama model id/i)).not.toBeInTheDocument();
    });

    it('should show custom input when Custom is selected', () => {
      render(<CopilotChat />);
      const select = screen.getByRole('combobox', { name: /model preset/i });

      fireEvent.change(select, { target: { value: '__custom__' } });

      expect(screen.getByPlaceholderText(/ollama model id/i)).toBeInTheDocument();
    });

    it('should hide custom input when switching back to preset', () => {
      render(<CopilotChat />);
      const select = screen.getByRole('combobox', { name: /model preset/i });

      // Switch to custom
      fireEvent.change(select, { target: { value: '__custom__' } });
      expect(screen.getByPlaceholderText(/ollama model id/i)).toBeInTheDocument();

      // Switch back to preset
      fireEvent.change(select, { target: { value: 'qwen2.5' } });
      expect(screen.queryByPlaceholderText(/ollama model id/i)).not.toBeInTheDocument();
    });

    it('should allow entering custom model id', () => {
      render(<CopilotChat />);
      const select = screen.getByRole('combobox', { name: /model preset/i });

      fireEvent.change(select, { target: { value: '__custom__' } });
      const customInput = screen.getByPlaceholderText(/ollama model id/i);

      fireEvent.change(customInput, { target: { value: 'mistral:7b' } });
      expect(customInput).toHaveValue('mistral:7b');
    });
  });

  describe('Chat Input', () => {
    it('should update question input on change', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);

      fireEvent.change(input, { target: { value: 'What is the BTC price trend?' } });
      expect(input).toHaveValue('What is the BTC price trend?');
    });
  });

  describe('Context Toggle', () => {
    it('should toggle chart context checkbox', () => {
      render(<CopilotChat />);
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Ask Functionality', () => {
    it('should create EventSource when Ask is clicked', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.change(input, { target: { value: 'Test question' } });
      fireEvent.click(askButton);

      expect(global.EventSource).toHaveBeenCalled();
    });

    it('should include question in URL', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.change(input, { target: { value: 'What is BTC?' } });
      fireEvent.click(askButton);

      const calledUrl = (global.EventSource as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(calledUrl).toContain('q=What%20is%20BTC%3F');
    });

    it('should include context when checkbox is checked', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(askButton);

      expect(mockSymbolStore.get).toHaveBeenCalled();
      expect(mockTimeframeStore.get).toHaveBeenCalled();
    });

    it('should not include context when checkbox is unchecked', () => {
      render(<CopilotChat />);
      const checkbox = screen.getByRole('checkbox');
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.click(checkbox); // Uncheck
      vi.clearAllMocks(); // Clear previous calls

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(askButton);

      // Symbol and timeframe store should still be imported but returned value should not be used in URL
      const calledUrl = (global.EventSource as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(calledUrl).not.toContain('ctx_symbols=BTCUSD');
    });

    it('should close previous EventSource on new ask', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      // First ask
      fireEvent.change(input, { target: { value: 'First question' } });
      fireEvent.click(askButton);

      // Second ask should close the first EventSource
      fireEvent.change(input, { target: { value: 'Second question' } });
      fireEvent.click(askButton);

      expect(eventSourceInstance.close).toHaveBeenCalled();
    });
  });

  describe('Streaming Response', () => {
    it('should display streamed messages', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(askButton);

      // Simulate streaming response - wrap in act for React state updates
      act(() => {
        eventSourceInstance.onmessage?.({ data: 'Hello ' });
      });
      act(() => {
        eventSourceInstance.onmessage?.({ data: 'World!' });
      });

      expect(screen.getByText('Hello World!')).toBeInTheDocument();
    });

    it('should close EventSource on error', () => {
      render(<CopilotChat />);
      const input = screen.getByPlaceholderText(/ask about btc/i);
      const askButton = screen.getByRole('button', { name: /ask/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(askButton);

      // Simulate error
      eventSourceInstance.onerror?.();

      expect(eventSourceInstance.close).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(<CopilotChat />);
      const panel = container.querySelector('.rounded-2xl');
      expect(panel).toBeInTheDocument();
    });
  });
});
