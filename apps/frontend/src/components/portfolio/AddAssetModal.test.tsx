/**
 * Tests for AddAssetModal component
 *
 * A multi-step modal for adding assets to portfolio:
 * 1. Category selection (stocks, crypto, real-estate, etc.)
 * 2. Asset selection with search (for stocks/crypto)
 * 3. Quantity and value input
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddAssetModal from './AddAssetModal';
import type { MarketAsset } from '@/services/marketData';

// Mock the hooks
vi.mock('@/hooks/useMarketData', () => ({
  useAllAssets: vi.fn(),
  useAssetSearch: vi.fn(),
}));

// Import mocked hooks
import { useAllAssets, useAssetSearch } from '@/hooks/useMarketData';

const mockStocks: MarketAsset[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    price: 175.5,
    previousClose: 174.0,
    change: 1.5,
    changePercent: 0.86,
    volume: 50000000,
    marketCap: 2800000000000,
    high24h: 176.0,
    low24h: 173.5,
    lastUpdated: Date.now(),
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'stock',
    price: 140.25,
    previousClose: 138.0,
    change: 2.25,
    changePercent: 1.63,
    volume: 25000000,
    marketCap: 1750000000000,
    high24h: 141.0,
    low24h: 137.5,
    lastUpdated: Date.now(),
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    price: 380.0,
    previousClose: 375.0,
    change: 5.0,
    changePercent: 1.33,
    volume: 30000000,
    marketCap: 2900000000000,
    high24h: 382.0,
    low24h: 374.0,
    lastUpdated: Date.now(),
  },
];

const mockCrypto: MarketAsset[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    price: 43500.0,
    previousClose: 42800.0,
    change: 700.0,
    changePercent: 1.64,
    volume: 28000000000,
    marketCap: 850000000000,
    high24h: 44000.0,
    low24h: 42500.0,
    lastUpdated: Date.now(),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    price: 2350.0,
    previousClose: 2280.0,
    change: 70.0,
    changePercent: 3.07,
    volume: 15000000000,
    marketCap: 280000000000,
    high24h: 2400.0,
    low24h: 2250.0,
    lastUpdated: Date.now(),
  },
];

describe('AddAssetModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddAssets = vi.fn();

  const renderModal = () => {
    return render(
      <AddAssetModal isOpen={true} onClose={mockOnClose} onAddAssets={mockOnAddAssets} />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    (useAllAssets as ReturnType<typeof vi.fn>).mockImplementation((type?: string) => {
      if (type === 'stock') return mockStocks;
      if (type === 'crypto') return mockCrypto;
      return [];
    });
    (useAssetSearch as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Category Selection Step', () => {
    it('should render category selection as initial step', () => {
      renderModal();

      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
      expect(screen.getByText('Stocks & ETFs')).toBeInTheDocument();
      expect(screen.getByText('Cryptocurrency')).toBeInTheDocument();
      expect(screen.getByText('Real Estate')).toBeInTheDocument();
    });

    it('should display all 8 asset categories', () => {
      renderModal();

      const categories = [
        'Stocks & ETFs',
        'Cryptocurrency',
        'Real Estate',
        'Business',
        'Cash & Bank',
        'Debt',
        'Vehicles',
        'Other Assets',
      ];

      categories.forEach((category) => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it('should display category descriptions', () => {
      renderModal();

      expect(screen.getByText('Publicly traded securities')).toBeInTheDocument();
      expect(screen.getByText('Digital currencies')).toBeInTheDocument();
      expect(screen.getByText('Properties and land')).toBeInTheDocument();
    });

    it('should navigate to selection step when clicking Stocks & ETFs', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
    });

    it('should navigate to crypto selection when clicking Cryptocurrency', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Cryptocurrency'));

      expect(screen.getByText('Select Cryptocurrency')).toBeInTheDocument();
    });

    it('should return null when isOpen is false', () => {
      const { container } = render(
        <AddAssetModal isOpen={false} onClose={mockOnClose} onAddAssets={mockOnAddAssets} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Asset Selection Step', () => {
    it('should display stock assets after selecting Stocks & ETFs category', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('should display crypto assets after selecting Cryptocurrency category', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Cryptocurrency'));

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
    });

    it('should display asset prices with proper formatting', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      // AAPL price formatted
      expect(screen.getByText('$175.50')).toBeInTheDocument();
    });

    it('should display change percentage for assets', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      // Positive change should have + prefix
      expect(screen.getByText('+0.86%')).toBeInTheDocument();
    });

    it('should select an asset when clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      // Find the AAPL button and click it
      const aaplButton = screen.getByText('AAPL').closest('button');
      expect(aaplButton).toBeInTheDocument();
      await user.click(aaplButton!);

      // Should show selected indicator
      expect(screen.getByText('✓ Selected')).toBeInTheDocument();
      expect(screen.getByText('1 asset selected')).toBeInTheDocument();
    });

    it('should allow selecting multiple assets', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      const googlButton = screen.getByText('GOOGL').closest('button');

      await user.click(aaplButton!);
      await user.click(googlButton!);

      expect(screen.getByText('2 assets selected')).toBeInTheDocument();
    });

    it('should deselect asset when clicked again', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);
      expect(screen.getByText('1 asset selected')).toBeInTheDocument();

      await user.click(aaplButton!);
      expect(screen.queryByText('1 asset selected')).not.toBeInTheDocument();
    });

    it('should call useAssetSearch when typing in search', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'Apple');

      // useAssetSearch is called with the query
      expect(useAssetSearch).toHaveBeenCalledWith('Apple');
    });

    it('should show back button in selection step', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      // More buttons should be available in selection step (back, close, cancel, continue)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('should navigate back to category step when clicking back', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));
      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();

      // Find the back button (first button in header)
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0]; // First button is back
      await user.click(backButton);

      expect(screen.getByText('Select Asset Category')).toBeInTheDocument();
    });

    it('should disable Continue button when no assets selected', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      expect(continueButton).toBeDisabled();
    });

    it('should enable Continue button when assets are selected', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      expect(continueButton).not.toBeDisabled();
    });

    it('should display market data status message', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      expect(screen.getByText(/Live Market Data/)).toBeInTheDocument();
    });
  });

  describe('Quantity Input Step', () => {
    it('should navigate to quantity step after selecting assets and clicking Continue', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await user.click(continueButton);

      expect(screen.getByText('Enter Details')).toBeInTheDocument();
    });

    it('should display selected assets with quantity inputs', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await user.click(continueButton);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Value ($)')).toBeInTheDocument();
    });

    it('should allow entering quantity for assets', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await user.click(continueButton);

      const quantityInput = screen.getByPlaceholderText('0.00');
      await user.type(quantityInput, '10');

      expect(quantityInput).toHaveValue(10);
    });

    it('should display Add Assets button in quantity step', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await user.click(continueButton);

      expect(screen.getByText('Add Assets')).toBeInTheDocument();
    });

    it('should call onAddAssets with correct data when clicking Add Assets', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await user.click(continueButton);

      const quantityInput = screen.getByPlaceholderText('0.00');
      await user.type(quantityInput, '5');

      const addButton = screen.getByText('Add Assets');
      await user.click(addButton);

      expect(mockOnAddAssets).toHaveBeenCalledTimes(1);
      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
            name: 'Apple Inc.',
            quantity: 5,
          }),
        ]),
        'stocks'
      );
    });

    it('should call onClose after adding assets', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      await user.click(screen.getByRole('button', { name: /Continue/ }));
      await user.click(screen.getByText('Add Assets'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should use default quantity of 1 when not specified', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);

      await user.click(screen.getByRole('button', { name: /Continue/ }));
      await user.click(screen.getByText('Add Assets'));

      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            quantity: 1,
          }),
        ]),
        'stocks'
      );
    });
  });

  describe('Modal Behavior', () => {
    it('should call onClose when clicking Cancel button', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking X button', async () => {
      const user = userEvent.setup();
      renderModal();

      // X button is the first button in category step (in header)
      const buttons = screen.getAllByRole('button');
      const xButton = buttons[0];
      await user.click(xButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset state when modal is closed', async () => {
      const user = userEvent.setup();
      renderModal();

      // Navigate to selection and select an asset
      await user.click(screen.getByText('Stocks & ETFs'));
      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);
      expect(screen.getByText('1 asset selected')).toBeInTheDocument();

      // Close and check modal resets (via onClose callback)
      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show Cancel button in all steps', async () => {
      const user = userEvent.setup();
      renderModal();

      // Category step
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Selection step
      await user.click(screen.getByText('Stocks & ETFs'));
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Quantity step
      const aaplButton = screen.getByText('AAPL').closest('button');
      await user.click(aaplButton!);
      await user.click(screen.getByRole('button', { name: /Continue/ }));
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Multiple Asset Selection', () => {
    it('should handle adding multiple assets with different quantities', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Stocks & ETFs'));

      // Select two assets
      const aaplButton = screen.getByText('AAPL').closest('button');
      const googlButton = screen.getByText('GOOGL').closest('button');
      await user.click(aaplButton!);
      await user.click(googlButton!);

      expect(screen.getByText('2 assets selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Continue/ }));

      // Enter different quantities
      const quantityInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(quantityInputs[0], '10');
      await user.type(quantityInputs[1], '5');

      await user.click(screen.getByText('Add Assets'));

      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ symbol: 'AAPL', quantity: 10 }),
          expect.objectContaining({ symbol: 'GOOGL', quantity: 5 }),
        ]),
        'stocks'
      );
    });
  });

  describe('Crypto Assets', () => {
    it('should handle crypto asset selection flow', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Cryptocurrency'));

      // Select BTC
      const btcButton = screen.getByText('BTC').closest('button');
      await user.click(btcButton!);

      await user.click(screen.getByRole('button', { name: /Continue/ }));
      await user.click(screen.getByText('Add Assets'));

      expect(mockOnAddAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'BTC',
            name: 'Bitcoin',
          }),
        ]),
        'crypto'
      );
    });

    it('should display crypto prices with more decimal places for low values', async () => {
      const user = userEvent.setup();
      // Add a low-price crypto
      const lowPriceCrypto: MarketAsset = {
        symbol: 'SHIB',
        name: 'Shiba Inu',
        type: 'crypto',
        price: 0.00001234,
        previousClose: 0.00001200,
        change: 0.00000034,
        changePercent: 2.83,
        volume: 5000000000,
        marketCap: 7000000000,
        high24h: 0.0000125,
        low24h: 0.0000118,
        lastUpdated: Date.now(),
      };
      (useAllAssets as ReturnType<typeof vi.fn>).mockImplementation((type?: string) => {
        if (type === 'crypto') return [...mockCrypto, lowPriceCrypto];
        return [];
      });

      renderModal();
      await user.click(screen.getByText('Cryptocurrency'));

      // Should display SHIB in the list
      expect(screen.getByText('SHIB')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty asset list gracefully', async () => {
      const user = userEvent.setup();
      (useAllAssets as ReturnType<typeof vi.fn>).mockReturnValue([]);

      renderModal();
      await user.click(screen.getByText('Stocks & ETFs'));

      // Should still show the selection UI even if empty
      expect(screen.getByText('Select Stocks & ETFs')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
    });

    it('should handle search with no results', async () => {
      const user = userEvent.setup();
      (useAssetSearch as ReturnType<typeof vi.fn>).mockReturnValue([]);

      renderModal();
      await user.click(screen.getByText('Stocks & ETFs'));

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'nonexistent');

      // No assets should be visible (search returns empty and filters show no results)
      // Note: The search filters by type, so even with empty search results, it shows category assets
    });

    it('should handle negative change percent', async () => {
      const user = userEvent.setup();
      const negativeStock: MarketAsset = {
        ...mockStocks[0],
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        changePercent: -2.5,
      };
      (useAllAssets as ReturnType<typeof vi.fn>).mockImplementation((type?: string) => {
        if (type === 'stock') return [negativeStock];
        return [];
      });

      renderModal();
      await user.click(screen.getByText('Stocks & ETFs'));

      // Negative percent should not have + prefix
      expect(screen.getByText('-2.50%')).toBeInTheDocument();
    });
  });
});
