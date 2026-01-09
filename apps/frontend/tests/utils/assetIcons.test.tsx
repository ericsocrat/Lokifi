import { AssetIcon, getAssetIcon, getCryptoIcon, getStockIcon } from '@/utils/assetIcons';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('assetIcons', () => {
  describe('getCryptoIcon', () => {
    describe('known cryptocurrencies', () => {
      it.each([
        ['BTC', 'bitcoin'],
        ['ETH', 'ethereum'],
        ['BNB', 'binancecoin'],
        ['SOL', 'solana'],
        ['XRP', 'ripple'],
        ['ADA', 'cardano'],
        ['DOGE', 'dogecoin'],
        ['DOT', 'polkadot'],
        ['LINK', 'chainlink'],
        ['UNI', 'uniswap'],
      ])('returns CoinGecko URL for %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
        expect(result).toContain('.png');
      });
    });

    describe('DeFi tokens', () => {
      it.each([
        ['AAVE', 'aave'],
        ['MKR', 'maker'],
        ['COMP', 'compound-governance-token'],
        ['SNX', 'havven'],
        ['CRV', 'curve-dao-token'],
        ['SUSHI', 'sushi'],
        ['YFI', 'yearn-finance'],
        ['BAL', 'balancer'],
        ['1INCH', '1inch'],
      ])('returns CoinGecko URL for DeFi token %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
      });
    });

    describe('Layer 2 and newer tokens', () => {
      it.each([
        ['ARB', 'arbitrum'],
        ['OP', 'optimism'],
        ['IMX', 'immutable-x'],
        ['LRC', 'loopring'],
        ['NEAR', 'near'],
        ['FTM', 'fantom'],
      ])('returns CoinGecko URL for L2/newer token %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
      });
    });

    describe('meme coins', () => {
      it.each([
        ['SHIB', 'shiba-inu'],
        ['PEPE', 'pepe'],
        ['BONK', 'bonk'],
        ['FLOKI', 'floki'],
      ])('returns CoinGecko URL for meme coin %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
      });
    });

    describe('gaming and metaverse tokens', () => {
      it.each([
        ['MANA', 'decentraland'],
        ['SAND', 'the-sandbox'],
        ['AXS', 'axie-infinity'],
        ['GALA', 'gala'],
        ['APE', 'apecoin'],
        ['ENJ', 'enjincoin'],
      ])('returns CoinGecko URL for gaming token %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
      });
    });

    describe('AI tokens', () => {
      it.each([
        ['FET', 'fetch-ai'],
        ['AGIX', 'singularitynet'],
        ['OCEAN', 'ocean-protocol'],
        ['RNDR', 'render-token'],
      ])('returns CoinGecko URL for AI token %s', (symbol, coinId) => {
        const result = getCryptoIcon(symbol);
        expect(result).toContain('coingecko.com');
        expect(result).toContain(coinId);
      });
    });

    describe('unknown cryptocurrencies', () => {
      it('returns UI Avatars fallback for unknown symbol', () => {
        const result = getCryptoIcon('UNKNOWN_COIN');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=UNKNOWN_COIN');
        expect(result).toContain('background=667eea');
        expect(result).toContain('color=fff');
        expect(result).toContain('bold=true');
        expect(result).toContain('size=128');
      });

      it('returns fallback for empty string', () => {
        const result = getCryptoIcon('');
        expect(result).toContain('ui-avatars.com');
      });

      it('returns fallback for lowercase symbol', () => {
        // Symbol lookup is case-sensitive, lowercase won't match
        const result = getCryptoIcon('btc');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=btc');
      });

      it('handles special characters in symbol', () => {
        const result = getCryptoIcon('TEST$COIN');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=TEST$COIN');
      });
    });
  });

  describe('getStockIcon', () => {
    describe('tech stocks', () => {
      it.each([
        ['AAPL', 'apple.com'],
        ['MSFT', 'microsoft.com'],
        ['GOOGL', 'google.com'],
        ['AMZN', 'amazon.com'],
        ['META', 'meta.com'],
        ['TSLA', 'tesla.com'],
        ['NVDA', 'nvidia.com'],
        ['NFLX', 'netflix.com'],
        ['AMD', 'amd.com'],
        ['INTC', 'intel.com'],
      ])('returns Clearbit URL for tech stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('enterprise software stocks', () => {
      it.each([
        ['ORCL', 'oracle.com'],
        ['CSCO', 'cisco.com'],
        ['ADBE', 'adobe.com'],
        ['CRM', 'salesforce.com'],
        ['IBM', 'ibm.com'],
      ])('returns Clearbit URL for enterprise stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('fintech stocks', () => {
      it.each([
        ['PYPL', 'paypal.com'],
        ['SQ', 'block.xyz'],
        ['COIN', 'coinbase.com'],
        ['HOOD', 'robinhood.com'],
      ])('returns Clearbit URL for fintech stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('banking stocks', () => {
      it.each([
        ['JPM', 'jpmorganchase.com'],
        ['BAC', 'bankofamerica.com'],
        ['WFC', 'wellsfargo.com'],
        ['GS', 'goldmansachs.com'],
        ['MS', 'morganstanley.com'],
      ])('returns Clearbit URL for bank stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('payment stocks', () => {
      it.each([
        ['V', 'visa.com'],
        ['MA', 'mastercard.com'],
        ['AXP', 'americanexpress.com'],
      ])('returns Clearbit URL for payment stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('retail stocks', () => {
      it.each([
        ['WMT', 'walmart.com'],
        ['TGT', 'target.com'],
        ['COST', 'costco.com'],
        ['HD', 'homedepot.com'],
        ['LOW', 'lowes.com'],
      ])('returns Clearbit URL for retail stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('consumer brands', () => {
      it.each([
        ['NKE', 'nike.com'],
        ['SBUX', 'starbucks.com'],
        ['MCD', 'mcdonalds.com'],
        ['KO', 'coca-cola.com'],
        ['PEP', 'pepsico.com'],
      ])('returns Clearbit URL for consumer stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('healthcare stocks', () => {
      it.each([
        ['JNJ', 'jnj.com'],
        ['UNH', 'unitedhealthgroup.com'],
        ['PFE', 'pfizer.com'],
        ['ABBV', 'abbvie.com'],
        ['LLY', 'lilly.com'],
        ['MRNA', 'modernatx.com'],
      ])('returns Clearbit URL for healthcare stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('cloud/SaaS stocks', () => {
      it.each([
        ['SHOP', 'shopify.com'],
        ['SNOW', 'snowflake.com'],
        ['PLTR', 'palantir.com'],
        ['ZM', 'zoom.us'],
      ])('returns Clearbit URL for cloud stock %s', (symbol, domain) => {
        const result = getStockIcon(symbol);
        expect(result).toContain('clearbit.com');
        expect(result).toContain(domain);
      });
    });

    describe('unknown stocks', () => {
      it('returns UI Avatars fallback for unknown symbol', () => {
        const result = getStockIcon('UNKNOWN_STOCK');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=UNKNOWN_STOCK');
        expect(result).toContain('background=10b981');
        expect(result).toContain('color=fff');
        expect(result).toContain('bold=true');
        expect(result).toContain('size=128');
      });

      it('returns fallback for empty string', () => {
        const result = getStockIcon('');
        expect(result).toContain('ui-avatars.com');
      });

      it('returns fallback for lowercase known symbol', () => {
        // Symbol lookup is case-sensitive
        const result = getStockIcon('aapl');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=aapl');
      });

      it('handles special characters in symbol', () => {
        const result = getStockIcon('BRK.B');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('name=BRK.B');
      });
    });
  });

  describe('getAssetIcon', () => {
    describe('crypto type', () => {
      it('delegates to getCryptoIcon for crypto type', () => {
        const result = getAssetIcon('BTC', 'crypto');
        expect(result).toContain('coingecko.com');
        expect(result).toContain('bitcoin');
      });

      it('returns crypto fallback for unknown crypto', () => {
        const result = getAssetIcon('UNKNOWN', 'crypto');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('background=667eea');
      });
    });

    describe('stock type', () => {
      it('delegates to getStockIcon for stock type', () => {
        const result = getAssetIcon('AAPL', 'stock');
        expect(result).toContain('clearbit.com');
        expect(result).toContain('apple.com');
      });

      it('returns stock fallback for unknown stock', () => {
        const result = getAssetIcon('UNKNOWN', 'stock');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('background=10b981');
      });
    });

    describe('etf type', () => {
      it('delegates to getStockIcon for ETF type', () => {
        const result = getAssetIcon('SPY', 'etf');
        expect(result).toContain('ui-avatars.com');
        expect(result).toContain('background=10b981');
      });

      it('uses stock fallback styling for ETF', () => {
        const result = getAssetIcon('QQQ', 'etf');
        expect(result).toContain('background=10b981');
      });
    });
  });

  describe('AssetIcon component', () => {
    // Mock Next.js Image component
    vi.mock('next/image', () => ({
      default: ({
        src,
        alt,
        width,
        height,
        className,
        onError,
      }: {
        src: string;
        alt: string;
        width: number;
        height: number;
        className?: string;
        onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
      }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          onError={onError}
          data-testid="asset-icon"
        />
      ),
    }));

    describe('rendering', () => {
      it('renders with crypto type', () => {
        render(<AssetIcon symbol="BTC" type="crypto" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', 'BTC logo');
        expect(img).toHaveAttribute('src');
        expect(img.getAttribute('src')).toContain('coingecko.com');
      });

      it('renders with stock type', () => {
        render(<AssetIcon symbol="AAPL" type="stock" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', 'AAPL logo');
        expect(img.getAttribute('src')).toContain('clearbit.com');
      });

      it('renders with etf type (uses stock handler)', () => {
        render(<AssetIcon symbol="SPY" type="etf" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', 'SPY logo');
      });

      it('renders with index type (converts to stock)', () => {
        render(<AssetIcon symbol="SPX" type="index" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', 'SPX logo');
      });
    });

    describe('size prop', () => {
      it('uses default size of 32', () => {
        render(<AssetIcon symbol="BTC" type="crypto" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveAttribute('width', '32');
        expect(img).toHaveAttribute('height', '32');
      });

      it('uses custom size when provided', () => {
        render(<AssetIcon symbol="BTC" type="crypto" size={64} />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveAttribute('width', '64');
        expect(img).toHaveAttribute('height', '64');
      });

      it('handles small sizes', () => {
        render(<AssetIcon symbol="BTC" type="crypto" size={16} />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveAttribute('width', '16');
        expect(img).toHaveAttribute('height', '16');
      });

      it('handles large sizes', () => {
        render(<AssetIcon symbol="BTC" type="crypto" size={256} />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveAttribute('width', '256');
        expect(img).toHaveAttribute('height', '256');
      });
    });

    describe('className prop', () => {
      it('includes default classes', () => {
        render(<AssetIcon symbol="BTC" type="crypto" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveClass('rounded-full');
        expect(img).toHaveClass('object-cover');
      });

      it('appends custom className', () => {
        render(<AssetIcon symbol="BTC" type="crypto" className="custom-class" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveClass('rounded-full');
        expect(img).toHaveClass('object-cover');
        expect(img).toHaveClass('custom-class');
      });

      it('handles empty className', () => {
        render(<AssetIcon symbol="BTC" type="crypto" className="" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveClass('rounded-full');
      });

      it('handles multiple custom classes', () => {
        render(
          <AssetIcon symbol="BTC" type="crypto" className="border border-surface-200 shadow-md" />
        );
        const img = screen.getByTestId('asset-icon');
        expect(img).toHaveClass('rounded-full');
        expect(img).toHaveClass('border');
        expect(img).toHaveClass('border-surface-200');
        expect(img).toHaveClass('shadow-md');
      });
    });

    describe('error handling', () => {
      it('updates src to fallback on error', () => {
        render(<AssetIcon symbol="BTC" type="crypto" size={32} />);
        const img = screen.getByTestId('asset-icon');

        // Simulate image load error
        fireEvent.error(img);

        // Check that src was updated to fallback
        expect(img.getAttribute('src')).toContain('ui-avatars.com');
        expect(img.getAttribute('src')).toContain('name=BTC');
        expect(img.getAttribute('src')).toContain('size=64'); // size * 2
      });

      it('uses correct fallback size (2x requested size)', () => {
        render(<AssetIcon symbol="ETH" type="crypto" size={48} />);
        const img = screen.getByTestId('asset-icon');

        fireEvent.error(img);

        expect(img.getAttribute('src')).toContain('size=96'); // 48 * 2
      });

      it('preserves symbol in fallback URL', () => {
        render(<AssetIcon symbol="SPECIAL_SYMBOL" type="stock" />);
        const img = screen.getByTestId('asset-icon');

        fireEvent.error(img);

        expect(img.getAttribute('src')).toContain('name=SPECIAL_SYMBOL');
      });
    });

    describe('edge cases', () => {
      it('handles symbol with special characters', () => {
        render(<AssetIcon symbol="BRK.B" type="stock" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', 'BRK.B logo');
      });

      it('handles empty symbol', () => {
        render(<AssetIcon symbol="" type="stock" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('alt', ' logo');
      });

      it('handles numeric symbol', () => {
        render(<AssetIcon symbol="1INCH" type="crypto" />);
        const img = screen.getByTestId('asset-icon');
        expect(img).toBeInTheDocument();
        expect(img.getAttribute('src')).toContain('coingecko.com');
      });
    });
  });
});
