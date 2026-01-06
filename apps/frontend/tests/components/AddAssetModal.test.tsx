import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock both possible import paths for useMarketData - inline factories to avoid hoisting issues
vi.mock('@/hooks/useMarketData', () => ({
  useAllAssets: (type: string) => {
    const mockAllStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 150.50, changePercent: 1.25, type: 'stock' as const },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.00, changePercent: -0.75, type: 'stock' as const },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.00, changePercent: 0.50, type: 'stock' as const },
    ];
    const mockAllCrypto = [
      { symbol: 'BTC', name: 'Bitcoin', price: 45000, changePercent: 2.50, type: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', price: 2500, changePercent: -1.20, type: 'crypto' as const },
    ];
    if (type === 'stock') return mockAllStocks;
    if (type === 'crypto') return mockAllCrypto;
    return [];
  },
  useAssetSearch: () => [],
}));

vi.mock('@/src/hooks/useMarketData', () => ({
  useAllAssets: (type: string) => {
    const mockAllStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 150.50, changePercent: 1.25, type: 'stock' as const },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.00, changePercent: -0.75, type: 'stock' as const },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.00, changePercent: 0.50, type: 'stock' as const },
    ];
    const mockAllCrypto = [
      { symbol: 'BTC', name: 'Bitcoin', price: 45000, changePercent: 2.50, type: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', price: 2500, changePercent: -1.20, type: 'crypto' as const },
    ];
    if (type === 'stock') return mockAllStocks;
    if (type === 'crypto') return mockAllCrypto;
    return [];
  },
  useAssetSearch: () => [],
}));

// Mock AssetIcon component (both paths) - uses JSX with default React import from vi.mock scope
vi.mock('@/utils/assetIcons', async () => {
  const React = await import('react');
  return {
    AssetIcon: ({ symbol }: { symbol: string }) =>
      React.createElement('div', { 'data-testid': `asset-icon-${symbol}` }, symbol),
  };
});

vi.mock('@/src/utils/assetIcons', async () => {
  const React = await import('react');
  return {
    AssetIcon: ({ symbol }: { symbol: string }) =>
      React.createElement('div', { 'data-testid': `asset-icon-${symbol}` }, symbol),
  };
});

import AddAssetModal, { ASSET_CATEGORIES } from '@/components/portfolio/AddAssetModal';

describe('AddAssetModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddAssets = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAddAssets: mockOnAddAssets,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AddAssetModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Select Asset Category')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AddAssetModal {...defaultProps} />);
      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
    });

    it('should render all asset categories', () => {
      render(<AddAssetModal {...defaultProps} />);
      
      ASSET_CATEGORIES.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
        expect(screen.getByText(category.description)).toBeInTheDocument();
      });
    });

    it('should render close button', () => {
      render(<AddAssetModal {...defaultProps} />);
      // X button for close
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should render cancel button', () => {
      render(<AddAssetModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Category Selection (Step 1)', () => {
    it('should show category selection as first step', () => {
      render(<AddAssetModal {...defaultProps} />);
      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
    });

    it('should transition to selection step when clicking stocks category', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();
    });

    it('should transition to selection step when clicking crypto category', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Cryptocurrency'));
      
      expect(screen.getByText('Select Cryptocurrency')).toBeInTheDocument();
    });

    it('should display back button after selecting category', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      // Back button (ArrowLeft icon)
      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find(btn => btn.querySelector('[class*="ArrowLeft"]') !== null || btn.querySelector('svg') !== null);
      expect(backButton).toBeDefined();
    });
  });

  describe('Asset Selection (Step 2)', () => {
    it('should display stock assets when stocks category selected', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      // Check by name (unique) - symbols appear multiple times (icon + label)
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    });

    it('should display crypto assets when crypto category selected', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Cryptocurrency'));
      
      // Check by name (unique) - symbols appear multiple times (icon + label)
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
    });

    it('should display search input', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
    });

    it('should display asset prices', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByText('$150.50')).toBeInTheDocument();
    });

    it('should display asset change percentages', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByText('+1.25%')).toBeInTheDocument();
      expect(screen.getByText('-0.75%')).toBeInTheDocument();
    });

    it('should display live market data status', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByText(/Live Market Data/)).toBeInTheDocument();
    });

    it('should select asset when clicked', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      
      expect(screen.getByText('✓ Selected')).toBeInTheDocument();
      expect(screen.getByText('1 asset selected')).toBeInTheDocument();
    });

    it('should deselect asset when clicked again', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      expect(screen.getByText('✓ Selected')).toBeInTheDocument();
      
      await user.click(screen.getByText('Apple Inc.'));
      expect(screen.queryByText('✓ Selected')).not.toBeInTheDocument();
    });

    it('should allow selecting multiple assets', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByText('Alphabet Inc.'));
      
      expect(screen.getByText('2 assets selected')).toBeInTheDocument();
    });

    it('should show Continue button with count when assets selected', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      
      expect(screen.getByRole('button', { name: /continue \(1\)/i })).toBeInTheDocument();
    });

    it('should disable Continue button when no assets selected', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByRole('button', { name: /continue \(0\)/i })).toBeDisabled();
    });
  });

  describe('Search Functionality', () => {
    it('should show search input for filtering assets', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      const searchInput = screen.getByPlaceholderText('Search assets...');
      expect(searchInput).toBeInTheDocument();
      
      // User can type in search box
      await user.type(searchInput, 'AAPL');
      expect(searchInput).toHaveValue('AAPL');
    });
  });

  describe('Quantity Input (Step 3)', () => {
    it('should transition to quantity step after Continue', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByText('Enter Details')).toBeInTheDocument();
    });

    it('should display selected assets in quantity step', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      // Check by name (unique) - symbol appears multiple times (icon + label)
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should display quantity and value inputs', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Value ($)')).toBeInTheDocument();
    });

    it('should allow entering quantity', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      const quantityInput = screen.getByPlaceholderText('0.00');
      await user.type(quantityInput, '10');
      
      expect(quantityInput).toHaveValue(10);
    });

    it('should show Add Assets button in quantity step', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      expect(screen.getByRole('button', { name: /add assets/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should go back to category from selection', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();
      
      // Click back button
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0]; // First button is back
      await user.click(backButton);
      
      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
    });

    it('should go back to selection from quantity', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      expect(screen.getByText('Enter Details')).toBeInTheDocument();
      
      // Click back button
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      
      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();
    });

    it('should clear selection when going back to category', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      expect(screen.getByText('1 asset selected')).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      
      // Go back to stocks
      await user.click(screen.getByText('Stocks & ETFs'));
      expect(screen.queryByText(/asset selected/i)).not.toBeInTheDocument();
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when clicking Cancel', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset state when closing modal', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Reopen modal
      rerender(<AddAssetModal {...defaultProps} />);
      
      // Should be back at category step
      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
    });
  });

  describe('Adding Assets', () => {
    it('should call onAddAssets with selected assets', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /add assets/i }));
      
      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
            name: 'Apple Inc.',
          }),
        ]),
        'stocks'
      );
    });

    it('should include quantity in added assets', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      const quantityInput = screen.getByPlaceholderText('0.00');
      await user.type(quantityInput, '10');
      
      await user.click(screen.getByRole('button', { name: /add assets/i }));
      
      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            quantity: 10,
          }),
        ]),
        'stocks'
      );
    });

    it('should use default quantity of 1 if not specified', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /add assets/i }));
      
      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            quantity: 1,
          }),
        ]),
        'stocks'
      );
    });

    it('should close modal after adding assets', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      await user.click(screen.getByText('Apple Inc.'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /add assets/i }));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should add multiple assets with correct category', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Cryptocurrency'));
      await user.click(screen.getByText('Bitcoin'));
      await user.click(screen.getByText('Ethereum'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /add assets/i }));
      
      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ symbol: 'BTC' }),
          expect.objectContaining({ symbol: 'ETH' }),
        ]),
        'crypto'
      );
    });
  });

  describe('ASSET_CATEGORIES', () => {
    it('should export ASSET_CATEGORIES with correct structure', () => {
      expect(ASSET_CATEGORIES).toHaveLength(8);
      
      const expectedCategories = [
        'stocks',
        'crypto',
        'real-estate',
        'business',
        'cash',
        'debt',
        'vehicle',
        'other',
      ];
      
      ASSET_CATEGORIES.forEach((category, index) => {
        expect(category.id).toBe(expectedCategories[index]);
        expect(category.name).toBeTruthy();
        expect(category.icon).toBeTruthy();
        expect(category.description).toBeTruthy();
      });
    });
  });

  describe('Styling', () => {
    it('should have modal overlay', () => {
      const { container } = render(<AddAssetModal {...defaultProps} />);
      expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
    });

    it('should have rounded modal container', () => {
      const { container } = render(<AddAssetModal {...defaultProps} />);
      expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    });
  });

  describe('Asset Display', () => {
    it('should render AssetIcon for each asset', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      expect(screen.getByTestId('asset-icon-AAPL')).toBeInTheDocument();
      expect(screen.getByTestId('asset-icon-GOOGL')).toBeInTheDocument();
    });

    it('should format prices with correct decimal places', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Stocks & ETFs'));
      
      // Stock prices should have 2 decimal places
      expect(screen.getByText('$150.50')).toBeInTheDocument();
      expect(screen.getByText('$140.00')).toBeInTheDocument();
    });

    it('should format crypto prices correctly', async () => {
      const user = userEvent.setup();
      render(<AddAssetModal {...defaultProps} />);
      
      await user.click(screen.getByText('Cryptocurrency'));
      
      expect(screen.getByText('$45,000.00')).toBeInTheDocument();
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });
  });
});
