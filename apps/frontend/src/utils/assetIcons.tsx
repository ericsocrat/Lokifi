/**
 * Asset Icon/Logo Utility
 * 
 * Provides icon URLs and components for stocks and cryptocurrencies
 */

/**
 * Get cryptocurrency icon from CoinGecko
 */
export function getCryptoIcon(symbol: string): string {
  const coinIds: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'TRX': 'tron',
    'LINK': 'chainlink',
    'ATOM': 'cosmos',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'FIL': 'filecoin',
    'AAVE': 'aave',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'SNX': 'havven',
    'CRV': 'curve-dao-token',
    'SUSHI': 'sushi',
    'YFI': 'yearn-finance',
    'BAL': 'balancer',
    '1INCH': '1inch',
    'ENJ': 'enjincoin',
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'IMX': 'immutable-x',
    'LRC': 'loopring',
    'NEAR': 'near',
    'FTM': 'fantom',
    'EGLD': 'elrond-erd-2',
    'HBAR': 'hedera-hashgraph',
    'FLOW': 'flow',
    'MANA': 'decentraland',
    'SHIB': 'shiba-inu',
    'PEPE': 'pepe',
    'BONK': 'bonk',
    'FLOKI': 'floki',
    'SAND': 'the-sandbox',
    'AXS': 'axie-infinity',
    'GALA': 'gala',
    'APE': 'apecoin',
    'CHZ': 'chiliz',
    'XTZ': 'tezos',
    'RUNE': 'thorchain',
    'CAKE': 'pancakeswap-token',
    'QNT': 'quant-network',
    'XMR': 'monero',
    'ZEC': 'zcash',
    'DASH': 'dash',
    'GRT': 'the-graph',
    'FET': 'fetch-ai',
    'AGIX': 'singularitynet',
    'OCEAN': 'ocean-protocol',
    'RNDR': 'render-token',
    'AR': 'arweave',
    'STX': 'blockstack',
    'INJ': 'injective-protocol',
    'THETA': 'theta-token',
    'TFUEL': 'theta-fuel',
    'ICP': 'internet-computer',
    'EOS': 'eos',
    'NEO': 'neo',
    'KAVA': 'kava',
    'ROSE': 'oasis-network',
    'ONE': 'harmony',
    'CELO': 'celo',
    'ZIL': 'zilliqa',
    'WAVES': 'waves',
    'QTUM': 'qtum',
    'ICX': 'icon',
    'ONT': 'ontology',
    'ZRX': '0x',
    'BAT': 'basic-attention-token',
    'OMG': 'omisego',
    'SC': 'siacoin',
    'ANKR': 'ankr',
    'SKL': 'skale',
    'CKB': 'nervos-network',
    'CELR': 'celer-network',
    'RSR': 'reserve-rights-token',
    'RVN': 'ravencoin',
    'DGB': 'digibyte',
    'HOT': 'holotoken',
    'BTT': 'bittorrent',
    'WOO': 'woo-network',
    'BLUR': 'blur',
    'MAGIC': 'magic',
    'GMT': 'stepn',
    'GST': 'green-satoshi-token',
    'LOOKS': 'looksrare',
    'DYDX': 'dydx',
    'GMX': 'gmx',
    'PERP': 'perpetual-protocol',
  };

  const coinId = coinIds[symbol];
  if (!coinId) {
    return `https://ui-avatars.com/api/?name=${symbol}&background=667eea&color=fff&bold=true&size=128`;
  }

  return `https://assets.coingecko.com/coins/images/${getCoinGeckoImageId(coinId)}/large/${coinId}.png`;
}

/**
 * Get CoinGecko image IDs (approximate mapping)
 */
function getCoinGeckoImageId(coinId: string): number {
  const mapping: Record<string, number> = {
    'bitcoin': 1,
    'ethereum': 279,
    'binancecoin': 825,
    'solana': 4128,
    'ripple': 44,
    'cardano': 975,
    'avalanche-2': 12559,
    'dogecoin': 5,
    'polkadot': 12171,
    'matic-network': 4713,
    'tron': 1094,
    'chainlink': 877,
    'cosmos': 1481,
    'uniswap': 12504,
    'litecoin': 2,
    'bitcoin-cash': 780,
    'stellar': 100,
    'algorand': 4380,
    'vechain': 1167,
    'filecoin': 12817,
  };

  return mapping[coinId] || 1;
}

/**
 * Get stock logo from Logo.dev or other sources
 */
export function getStockIcon(symbol: string): string {
  // Use Logo.dev for company logos
  const cleanSymbol = symbol.replace('.', '-').toLowerCase();
  
  // Special cases for better logos
  const specialLogos: Record<string, string> = {
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'GOOGL': 'https://logo.clearbit.com/google.com',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'NFLX': 'https://logo.clearbit.com/netflix.com',
    'AMD': 'https://logo.clearbit.com/amd.com',
    'INTC': 'https://logo.clearbit.com/intel.com',
    'ORCL': 'https://logo.clearbit.com/oracle.com',
    'CSCO': 'https://logo.clearbit.com/cisco.com',
    'ADBE': 'https://logo.clearbit.com/adobe.com',
    'CRM': 'https://logo.clearbit.com/salesforce.com',
    'PYPL': 'https://logo.clearbit.com/paypal.com',
    'SQ': 'https://logo.clearbit.com/block.xyz',
    'UBER': 'https://logo.clearbit.com/uber.com',
    'ABNB': 'https://logo.clearbit.com/airbnb.com',
    'SNAP': 'https://logo.clearbit.com/snap.com',
    'SPOT': 'https://logo.clearbit.com/spotify.com',
    'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
    'BAC': 'https://logo.clearbit.com/bankofamerica.com',
    'WFC': 'https://logo.clearbit.com/wellsfargo.com',
    'GS': 'https://logo.clearbit.com/goldmansachs.com',
    'MS': 'https://logo.clearbit.com/morganstanley.com',
    'BLK': 'https://logo.clearbit.com/blackrock.com',
    'V': 'https://logo.clearbit.com/visa.com',
    'MA': 'https://logo.clearbit.com/mastercard.com',
    'AXP': 'https://logo.clearbit.com/americanexpress.com',
    'WMT': 'https://logo.clearbit.com/walmart.com',
    'TGT': 'https://logo.clearbit.com/target.com',
    'COST': 'https://logo.clearbit.com/costco.com',
    'HD': 'https://logo.clearbit.com/homedepot.com',
    'LOW': 'https://logo.clearbit.com/lowes.com',
    'NKE': 'https://logo.clearbit.com/nike.com',
    'SBUX': 'https://logo.clearbit.com/starbucks.com',
    'MCD': 'https://logo.clearbit.com/mcdonalds.com',
    'KO': 'https://logo.clearbit.com/coca-cola.com',
    'PEP': 'https://logo.clearbit.com/pepsico.com',
    'JNJ': 'https://logo.clearbit.com/jnj.com',
    'UNH': 'https://logo.clearbit.com/unitedhealthgroup.com',
    'PFE': 'https://logo.clearbit.com/pfizer.com',
    'ABBV': 'https://logo.clearbit.com/abbvie.com',
    'TMO': 'https://logo.clearbit.com/thermofisher.com',
    'ABT': 'https://logo.clearbit.com/abbott.com',
    'LLY': 'https://logo.clearbit.com/lilly.com',
    'MRNA': 'https://logo.clearbit.com/modernatx.com',
    'XOM': 'https://logo.clearbit.com/exxonmobil.com',
    'CVX': 'https://logo.clearbit.com/chevron.com',
    'BA': 'https://logo.clearbit.com/boeing.com',
    'CAT': 'https://logo.clearbit.com/cat.com',
    'GE': 'https://logo.clearbit.com/ge.com',
    'UPS': 'https://logo.clearbit.com/ups.com',
    'DIS': 'https://logo.clearbit.com/disney.com',
    'CMCSA': 'https://logo.clearbit.com/comcast.com',
    'VZ': 'https://logo.clearbit.com/verizon.com',
    'T': 'https://logo.clearbit.com/att.com',
    'IBM': 'https://logo.clearbit.com/ibm.com',
    'SHOP': 'https://logo.clearbit.com/shopify.com',
    'SNOW': 'https://logo.clearbit.com/snowflake.com',
    'PLTR': 'https://logo.clearbit.com/palantir.com',
    'ZM': 'https://logo.clearbit.com/zoom.us',
    'COIN': 'https://logo.clearbit.com/coinbase.com',
    'HOOD': 'https://logo.clearbit.com/robinhood.com',
  };

  if (specialLogos[symbol]) {
    return specialLogos[symbol];
  }

  // Fallback to avatar
  return `https://ui-avatars.com/api/?name=${symbol}&background=10b981&color=fff&bold=true&size=128`;
}

/**
 * Get asset icon based on type
 */
export function getAssetIcon(symbol: string, type: 'stock' | 'crypto' | 'etf'): string {
  if (type === 'crypto') {
    return getCryptoIcon(symbol);
  }
  return getStockIcon(symbol);
}

/**
 * Component: Asset Icon/Logo
 */
interface AssetIconProps {
  symbol: string;
  type: 'stock' | 'crypto' | 'etf' | 'index';
  size?: number;
  className?: string;
}

export function AssetIcon({ symbol, type, size = 32, className = '' }: AssetIconProps) {
  const assetType = type === 'index' ? 'stock' : type;
  const iconUrl = getAssetIcon(symbol, assetType);
  
  return (
    <img
      src={iconUrl}
      alt={`${symbol} logo`}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={(e: any) => {
        // Fallback to initials avatar on error
        const target = e.target as HTMLImageElement;
        target.src = `https://ui-avatars.com/api/?name=${symbol}&background=667eea&color=fff&bold=true&size=${size * 2}`;
      }}
    />
  );
}
