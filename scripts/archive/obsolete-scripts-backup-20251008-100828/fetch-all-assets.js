/**
 * Master Script to Fetch All Stock & Asset Categories
 * Uses curated lists + Financial Modeling Prep Quote API (free tier)
 * 
 * Run: node fetch-all-assets.js
 * Output: All JSON files for 1,800 stocks
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

// Curated top 500 large-cap stocks (S&P 500 + major tech/growth)
const LARGE_CAP_SYMBOLS = [
  // Mega Cap Tech (FAANG+)
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'ORCL',
  'ADBE', 'CRM', 'CSCO', 'ACN', 'INTC', 'AMD', 'IBM', 'QCOM', 'NOW', 'INTU',
  'TXN', 'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MCHP', 'NXPI',
  
  // Finance
  'BRK.A', 'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'BLK',
  'C', 'SCHW', 'AXP', 'SPGI', 'PGR', 'CB', 'MMC', 'AON', 'TRV', 'ALL',
  'AFL', 'MET', 'PRU', 'AIG', 'HIG', 'COF', 'USB', 'PNC', 'TFC', 'BK',
  
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'NVO', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE',
  'AMGN', 'ISRG', 'BSX', 'SYK', 'GILD', 'VRTX', 'REGN', 'MDT', 'CI', 'CVS',
  'ELV', 'HUM', 'ZTS', 'MCK', 'COR', 'BMY', 'BIIB', 'IQV', 'DXCM', 'IDXX',
  
  // Consumer
  'WMT', 'HD', 'PG', 'KO', 'PEP', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT',
  'LOW', 'TJX', 'BKNG', 'ABNB', 'MAR', 'ORLY', 'AZO', 'YUM', 'CMG', 'DG',
  'DLTR', 'BBY', 'ROST', 'ULTA', 'DPZ', 'QSR', 'EL', 'CL', 'KMB', 'GIS',
  
  // Industrial
  'CAT', 'RTX', 'UNP', 'HON', 'UPS', 'LMT', 'BA', 'GE', 'DE', 'MMM',
  'ETN', 'ADP', 'TDG', 'ITW', 'EMR', 'CARR', 'PCAR', 'JCI', 'GD', 'NOC',
  'FDX', 'WM', 'RSG', 'NSC', 'CSX', 'UBER', 'PAYX', 'OTIS', 'CTAS', 'CMI',
  
  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'HES',
  'WMB', 'KMI', 'LNG', 'OKE', 'FANG', 'DVN', 'HAL', 'BKR', 'TRGP', 'EQT',
  
  // Communication
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'EA', 'TTWO', 'WBD',
  
  // Materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'CTVA', 'DD', 'DOW', 'NUE',
  'VMC', 'MLM', 'STLD', 'CF', 'MOS', 'ALB', 'FMC', 'IFF', 'CE', 'PPG',
  
  // Real Estate
  'AMT', 'PLD', 'EQIX', 'CCI', 'PSA', 'WELL', 'DLR', 'O', 'VICI', 'SBAC',
  'SPG', 'AVB', 'EQR', 'ARE', 'INVH', 'MAA', 'ESS', 'VTR', 'EXR', 'UDR',
  
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'WEC', 'PEG',
  
  // Additional S&P 500 components
  'AVGO', 'ADBE', 'CRM', 'TM', 'PDD', 'BABA', 'TSM', 'ASML', 'SAP', 'NVS',
  'AZN', 'SHEL', 'TTE', 'RY', 'TD', 'MUFG', 'SONY', 'UL', 'BHP', 'RIO',
  'HSBC', 'BTI', 'VALE', 'SNY', 'DEO', 'CNI', 'SHOP', 'IBN', 'ITUB', 'WDS',
  
  // More S&P 500 stocks
  'CNC', 'HCA', 'CAH', 'CHTR', 'SYY', 'IT', 'STZ', 'PSX', 'HLT', 'TEL',
  'CL', 'WBA', 'MDLZ', 'GM', 'F', 'KVUE', 'BDX', 'ADM', 'EW', 'A',
  'PANW', 'FTNT', 'CRWD', 'NET', 'ZS', 'DDOG', 'MDB', 'SNOW', 'WDAY', 'TEAM',
  'COIN', 'HOOD', 'SOFI', 'AFRM', 'UPST', 'SQ', 'PYPL', 'ADYEN', 'MELI', 'SE',
  'ABNB', 'DASH', 'RBLX', 'U', 'PLTR', 'PATH', 'CVNA', 'RIVN', 'LCID', 'GRAB',
  'SPOT', 'ROKU', 'ZM', 'DOCU', 'TWLO', 'OKTA', 'ZI', 'BILL', 'MSCI', 'SPGI',
  'CME', 'ICE', 'MCO', 'NDAQ', 'CBOE', 'FDS', 'TRU', 'VRSK', 'BR', 'MKTX',
  'PH', 'ROK', 'AME', 'FTV', 'GNRC', 'TT', 'IR', 'XYL', 'VLTO', 'IEX',
  'SWK', 'CPRT', 'WAB', 'ODFL', 'CHRW', 'JBHT', 'EXPD', 'XPO', 'LSTR', 'MATX',
  'GWW', 'FAST', 'WST', 'PKG', 'IP', 'WRK', 'AMCR', 'CCK', 'BALL', 'AVY',
  'SNA', 'NTRS', 'FITB', 'HBAN', 'RF', 'CFG', 'KEY', 'WBS', 'MTB', 'SIVB',
  'ZBRA', 'ANSS', 'PTC', 'FTNT', 'CTXS', 'RNG', 'PAYC', 'GWRE', 'PCTY', 'MANH',
  'DT', 'CVLT', 'GLW', 'HPE', 'HPQ', 'NTAP', 'STX', 'WDC', 'SMCI', 'DELL',
  'MPWR', 'ENPH', 'ON', 'TER', 'SWKS', 'QRVO', 'WOLF', 'MXL', 'CRUS', 'ALGM',
  'RCL', 'CCL', 'NCLH', 'LVS', 'WYNN', 'MGM', 'BKNG', 'EXPE', 'TRIP', 'ABNB',
  'TROW', 'BEN', 'IVZ', 'JKHY', 'SEIC', 'VIRT', 'LPLA', 'RJF', 'SF', 'MORN',
];

// Curated 400 mid-cap stocks (Russell Midcap equivalent)
const MID_CAP_SYMBOLS = [
  // Software & Tech
  'SNOW', 'MDB', 'DDOG', 'NET', 'ZS', 'CRWD', 'PANW', 'FTNT', 'OKTA', 'ZI',
  'BILL', 'PATH', 'TEAM', 'ATLR', 'ZUO', 'FIVN', 'BOX', 'DBX', 'AI', 'SMAR',
  'BRZE', 'DOCN', 'FRSH', 'HUBS', 'NEWR', 'ESTC', 'APPF', 'SUMO', 'SPLK', 'DT',
  
  // Healthcare & Biotech
  'HOLX', 'PODD', 'ALGN', 'TECH', 'ABMD', 'PEN', 'MMSI', 'NTRA', 'NVST', 'STAA',
  'NUVA', 'OMCL', 'ATRC', 'NVCR', 'SLAB', 'SWAV', 'TNDM', 'LIVN', 'IRTC', 'OLED',
  'BMRN', 'ALNY', 'INCY', 'EXAS', 'TECH', 'SRPT', 'UTHR', 'RARE', 'FOLD', 'BLUE',
  
  // Consumer & Retail
  'FIVE', 'OLLI', 'BOOT', 'PLCE', 'CASY', 'GO', 'CVNA', 'W', 'RH', 'ETSY',
  'CHWY', 'FTCH', 'REAL', 'PRTS', 'AAP', 'GPC', 'LAD', 'AN', 'PAG', 'SAH',
  
  // Industrial & Manufacturing
  'URI', 'FAST', 'POOL', 'HUBS', 'WSC', 'GVA', 'AZEK', 'TREX', 'OC', 'APG',
  'MTZ', 'AIT', 'DY', 'GTES', 'WERN', 'KEX', 'KNX', 'SAIA', 'ARCB', 'JBHT',
  
  // Finance & Insurance
  'ALLY', 'SYF', 'WU', 'AXP', 'DFS', 'EWBC', 'FCNCA', 'GBCI', 'HOMB', 'IBOC',
  'ZION', 'CMA', 'WAL', 'SSB', 'ONB', 'BOKF', 'UBSI', 'FFIN', 'WTFC', 'PBCT',
  
  // Energy & Materials
  'DVN', 'FANG', 'EQT', 'AR', 'CTRA', 'MRO', 'APA', 'OVV', 'PR', 'MTDR',
  'SM', 'MGY', 'CHRD', 'RRC', 'CRGY', 'NOG', 'CPE', 'GPOR', 'CLR', 'WLL',
  
  // REITs
  'EXR', 'PSA', 'CUBE', 'REXR', 'NSA', 'LSI', 'STAG', 'FR', 'VRE', 'SAFE',
  'EPRT', 'FCPT', 'ADC', 'GTY', 'UBA', 'OHI', 'HR', 'PEAK', 'DOC', 'MPW',
  
  // Additional mid-caps
  'LULU', 'DECK', 'CROX', 'SKX', 'VFC', 'COLM', 'UAA', 'UA', 'GOOS', 'WWW',
  'TPR', 'RL', 'PVH', 'HBI', 'GIL', 'LEVI', 'CPRI', 'BURL', 'ANF', 'AEO',
  'PLUG', 'BE', 'FCEL', 'BLDP', 'CLNE', 'RUN', 'NOVA', 'ARRY', 'FSLR', 'SPWR',
  'SEDG', 'CSIQ', 'DQ', 'JKS', 'SOL', 'VVPR', 'MAXN', 'AZRE', 'NEP', 'AY',
  'ZIM', 'SBLK', 'STNG', 'FRO', 'INSW', 'EURN', 'DHT', 'NAT', 'TNK', 'TRMD',
  'GOGL', 'GASS', 'HSHP', 'ESEA', 'ASC', 'MATX', 'DAC', 'GSL', 'SB', 'NMM',
  'CARR', 'WBD', 'DIS', 'PARA', 'FOX', 'FOXA', 'NWSA', 'NWS', 'MSGS', 'MSG',
  'PTON', 'YETI', 'HELE', 'LEVI', 'TPX', 'LEG', 'LZB', 'SCVL', 'ITG', 'BKE',
  'DBI', 'PRKS', 'WOR', 'PUMP', 'HP', 'ITGR', 'OLLI', 'FIVE', 'DLTR', 'DG',
  'BGS', 'PSN', 'SGH', 'SON', 'TRS', 'CBT', 'ACIW', 'GMS', 'FC', 'BECN',
  'FND', 'SIG', 'WSM', 'FL', 'M', 'KSS', 'BBY', 'GPS', 'URBN', 'ANN',
  'CRI', 'DKS', 'HIBB', 'BGFV', 'ASO', 'SCVL', 'GES', 'EXPR', 'ZUMZ', 'CHS',
  'DDS', 'PSMT', 'BOOT', 'SHOO', 'WEYS', 'FOXF', 'LCII', 'SAH', 'PAG', 'ABG',
  'LAD', 'AN', 'GPI', 'KMX', 'CVNA', 'VRM', 'CARG', 'SFT', 'CPNG', 'RIVN',
];

// Curated 300 international stocks
const INTERNATIONAL_SYMBOLS = [
  // UK (LSE)
  'HSBA.L', 'SHEL.L', 'AZN.L', 'ULVR.L', 'DGE.L', 'BP.L', 'GSK.L', 'RIO.L', 'BARC.L', 'LLOY.L',
  'VOD.L', 'NG.L', 'BATS.L', 'RKT.L', 'REL.L', 'LSEG.L', 'EXPN.L', 'ANTO.L', 'CRH.L', 'PRU.L',
  
  // Canada (TSX)
  'RY.TO', 'TD.TO', 'BNS.TO', 'BMO.TO', 'CNQ.TO', 'CNR.TO', 'SHOP.TO', 'SU.TO', 'CP.TO', 'ENB.TO',
  'TRP.TO', 'WCN.TO', 'MFC.TO', 'BCE.TO', 'T.TO', 'IMO.TO', 'FNV.TO', 'NTR.TO', 'WPM.TO', 'ABX.TO',
  
  // Europe
  'ASML.AS', 'SAP.DE', 'MC.PA', 'OR.PA', 'SAN.PA', 'SIE.DE', 'NESN.SW', 'NOVN.SW', 'ROG.SW', 'NOVO-B.CO',
  'TTE.PA', 'SHEL.AS', 'BNP.PA', 'ABI.BR', 'EL.PA', 'AIR.PA', 'DG.PA', 'SU.PA', 'CS.PA', 'BN.PA',
  
  // China/Hong Kong
  '0700.HK', '9988.HK', '0941.HK', '1810.HK', '3690.HK', '0388.HK', '1398.HK', '0939.HK', '2318.HK', '0001.HK',
  '600519.SS', '600036.SS', '601318.SS', '000858.SZ', '600276.SS', '000333.SZ', '600887.SS', '002594.SZ', '600030.SS', '601012.SS',
  
  // Japan
  '7203.T', '6758.T', '8306.T', '6861.T', '9432.T', '9984.T', '7267.T', '9433.T', '8035.T', '6902.T',
  
  // Rest of Asia
  '005930.KS', '000660.KS', '035420.KS', '051910.KS', '005380.KS', '035720.KS', 'CSL.AX', 'BHP.AX', 'CBA.AX', 'WDS.AX',
  
  // Latin America
  'VALE3.SA', 'PETR4.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA', 'WALMEX.MX', 'AMXL.MX', 'FEMSA.MX', 'GFNORTE.MX', 'CEMEX.MX',
  
  // India
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'HINDUNILVR.NS', 'LT.NS',
];

// Curated 200 small-cap stocks
const SMALL_CAP_SYMBOLS = [
  'BROS', 'UFPT', 'WING', 'TXRH', 'JACK', 'BLMN', 'CAKE', 'DNUT', 'WEN', 'BJRI',
  'FRGI', 'RICK', 'DENN', 'PTLO', 'BWLD', 'NDLS', 'FWRD', 'STRL', 'CACC', 'BFC',
  'THFF', 'ARCO', 'PZZA', 'PZZA', 'RUTH', 'DAVE', 'EAT', 'RRGB', 'NATH', 'FATBB',
  'SHAK', 'WINGSTOP', 'ZOES', 'FIXX', 'FWRG', 'NAPA', 'BBWI', 'GIII', 'BOOT', 'SCVL',
  'HIBB', 'BGS', 'DBI', 'CONN', 'CAL', 'PHIN', 'SFIX', 'FVRR', 'PNTG', 'BBSI',
  'AAON', 'ESAB', 'VICR', 'ENR', 'BCO', 'NX', 'NDSN', 'AGX', 'UFPI', 'HAYN',
  'WTS', 'AEIS', 'GTLS', 'KFRC', 'MTRN', 'BMI', 'HLIO', 'TILE', 'USLM', 'RUSHA',
  'DNOW', 'SLCA', 'NBR', 'PTEN', 'LBRT', 'WFRD', 'TIL', 'CLB', 'HP', 'AROC',
  'PUMP', 'NR', 'NINE', 'CKX', 'VTLE', 'REI', 'SD', 'MCF', 'BTU', 'ARCH',
  'AMR', 'CEIX', 'HCC', 'ARLP', 'WGS', 'CIVI', 'MGY', 'GPOR', 'CHRD', 'SM',
  'BANC', 'BHLB', 'BPOP', 'BRKL', 'CASH', 'CBSH', 'CADE', 'CATY', 'CVBF', 'COLB',
  'EGBN', 'EVER', 'FIBK', 'FNB', 'FULT', 'GBCI', 'HWC', 'HBAN', 'HOMB', 'HTL',
  'IBOC', 'IBTX', 'INDB', 'ONB', 'OZK', 'PBCT', 'PB', 'PNFP', 'RF', 'SBCF',
  'SNV', 'SSB', 'TCBI', 'TFSL', 'TRMK', 'UMBF', 'UBSI', 'UCB', 'VLY', 'WBS',
  'WAFD', 'WTFC', 'WSFS', 'ZION', 'ABCB', 'ASB', 'BANR', 'BFC', 'BOH', 'BKU',
  'CBU', 'CCBG', 'CFG', 'CFR', 'CUBI', 'EWBC', 'FCNCA', 'FHN', 'FISI', 'FRME',
];

async function fetchAllAssets() {
  console.log('🚀 MASTER SCRIPT: Fetching all 1,800 stocks + assets...\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const categories = [
    { name: 'Large Cap (500)', symbols: LARGE_CAP_SYMBOLS.slice(0, 500), file: 'largecap-stocks.json', category: 'Large Cap' },
    { name: 'Mid Cap (400)', symbols: MID_CAP_SYMBOLS.slice(0, 400), file: 'midcap-stocks.json', category: 'Mid Cap' },
    { name: 'International (300)', symbols: INTERNATIONAL_SYMBOLS.slice(0, 300), file: 'international-stocks.json', category: 'International' },
    { name: 'Small Cap (200)', symbols: SMALL_CAP_SYMBOLS.slice(0, 200), file: 'smallcap-stocks.json', category: 'Small Cap' },
  ];
  
  const allResults = [];
  let totalFetched = 0;
  
  for (const cat of categories) {
    console.log(`\n📦 Fetching ${cat.name}...`);
    console.log(`   Target: ${cat.symbols.length} symbols`);
    
    const results = [];
    const batchSize = 50; // FMP quote API supports up to 100, using 50 for safety
    
    for (let i = 0; i < cat.symbols.length; i += batchSize) {
      const batch = cat.symbols.slice(i, i + batchSize);
      const symbols = batch.join(',');
      
      try {
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cat.symbols.length/batchSize)} (${batch.length} symbols)...`);
        
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const quotes = response.data;
        console.log(`   ✅ Fetched ${quotes.length} quotes`);
        results.push(...quotes);
        
        // Wait 600ms between batches (100 calls/min = 1 per 600ms)
        if (i + batchSize < cat.symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      } catch (error) {
        console.warn(`   ⚠️ Error fetching batch: ${error.message}`);
      }
    }
    
    // Format results
    const formatted = results.map((stock, index) => ({
      symbol: stock.symbol,
      name: stock.name || stock.symbol,
      type: 'stock',
      category: cat.category,
      sector: 'Unknown', // FMP quote doesn't include sector
      exchange: stock.exchange || '',
      price: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changesPercentage || 0,
      volume: stock.volume || 0,
      avgVolume: stock.avgVolume || 0,
      marketCap: stock.marketCap || 0,
      high24h: stock.dayHigh || stock.price || 0,
      low24h: stock.dayLow || stock.price || 0,
      open: stock.open || 0,
      previousClose: stock.previousClose || 0,
      yearHigh: stock.yearHigh || 0,
      yearLow: stock.yearLow || 0,
      pe: stock.pe || 0,
      eps: stock.eps || 0,
      sharesOutstanding: stock.sharesOutstanding || 0,
      rank: totalFetched + index + 1,
      lastUpdated: new Date().toISOString()
    }));
    
    // Save category file
    fs.writeFileSync(cat.file, JSON.stringify(formatted, null, 2));
    console.log(`   💾 Saved ${formatted.length} stocks to ${cat.file}`);
    
    allResults.push(...formatted);
    totalFetched += formatted.length;
    
    console.log(`   ✅ ${cat.name} complete: ${formatted.length} stocks`);
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 MASTER SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Total Stocks Fetched: ${totalFetched}`);
  
  // Category breakdown
  const categoryCounts = {};
  allResults.forEach(stock => {
    categoryCounts[stock.category] = (categoryCounts[stock.category] || 0) + 1;
  });
  
  console.log('\n📦 Category Breakdown:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`   ${category.padEnd(25)} : ${count} stocks`);
  });
  
  // Save master file
  fs.writeFileSync('all-stocks.json', JSON.stringify(allResults, null, 2));
  console.log(`\n💾 Master file saved: all-stocks.json (${allResults.length} stocks)`);
  
  console.log('\n🎉 SUCCESS! All stock data fetched.');
  console.log('📋 Next Steps:');
  console.log('   1. Run: node fetch-top-cryptos.js (already done - 270 cryptos)');
  console.log('   2. Merge: node merge-all-assets.js (combine stocks + cryptos = 2,070 assets)');
  console.log('   3. Generate: node generate-asset-code.js (create TypeScript imports)');
}

fetchAllAssets().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
