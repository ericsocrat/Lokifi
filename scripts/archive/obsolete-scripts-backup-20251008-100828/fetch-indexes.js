/**
 * Fetch Major Stock Market Indexes & Index ETFs
 * Uses Financial Modeling Prep API
 * 
 * Run: node fetch-indexes.js
 * Output: indexes-assets.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

// Curated list of major indexes and index tracking ETFs
const INDEX_SYMBOLS = [
  // US Major Indexes
  '^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX',  // SPX, Dow, Nasdaq, Russell 2000, VIX
  'SPY', 'VOO', 'IVV', 'QQQ', 'DIA', 'IWM',  // Major index ETFs
  
  // US Sector Indexes & ETFs
  'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLC', 'XLU', 'XLP', 'XLRE', 'XLB', 'XLY',  // SPDR sectors
  'VGT', 'VFH', 'VHT', 'VDE', 'VIS', 'VOX', 'VPU', 'VDC', 'VNQ', 'VAW', 'VCR',  // Vanguard sectors
  
  // Market Cap & Style Indexes
  'IVW', 'IVE', 'IWF', 'IWD', 'IJH', 'IJK', 'IJJ',  // Large/mid/small cap, growth/value
  'VUG', 'VTV', 'VBK', 'VBR', 'VO', 'VB',           // Vanguard growth/value
  'MDY', 'SLY', 'OEF',                               // Mid/small cap ETFs
  
  // International Indexes
  '^FTSE', '^GDAXI', '^FCHI', '^N225', '^HSI',      // FTSE 100, DAX, CAC 40, Nikkei, Hang Seng
  'EFA', 'VEA', 'IEFA', 'EEM', 'VWO', 'IEMG',       // International equity ETFs
  'FXI', 'EWJ', 'EWG', 'EWU', 'EWC', 'EWA',         // Country ETFs
  
  // Bond Indexes & ETFs
  'AGG', 'BND', 'TLT', 'IEF', 'SHY',                // US Treasury ETFs
  'LQD', 'HYG', 'JNK', 'EMB', 'BNDX',               // Corporate/high-yield/international bonds
  'TIP', 'VTIP', 'SCHP',                            // TIPS (inflation-protected)
  'MUB', 'SUB',                                      // Municipal bonds
  
  // Commodity Indexes
  'DBC', 'GSG', 'PDBC', 'DJP',                      // Broad commodity indexes
  
  // REIT & Real Estate Indexes
  'VNQ', 'XLRE', 'IYR', 'SCHH', 'RWR',              // REIT ETFs
  
  // Volatility & Alternative Indexes
  'VIXY', 'SVXY', 'UVXY',                           // Volatility ETFs
  
  // Emerging Markets
  'EEM', 'VWO', 'IEMG', 'SCHE', 'DEM',              // EM equity
  'EMB', 'PCY', 'EMLC',                             // EM bonds
  
  // Factor & Strategy Indexes
  'MTUM', 'QUAL', 'SIZE', 'VLUE', 'USMV',           // Factor ETFs
  'SCHD', 'VYM', 'HDV', 'SDY',                      // Dividend ETFs
  
  // Additional US indexes
  '^GSPTSE', '^MXX', '^BVSP',                       // Canada, Mexico, Brazil indexes
];

async function fetchIndexes() {
  console.log('🚀 Fetching major stock market indexes and index ETFs...\n');
  console.log(`📋 Targeting ${INDEX_SYMBOLS.length} index symbols\n`);
  
  try {
    const allAssets = [];
    
    // Fetch in batches of 50 symbols (smaller batches for indexes)
    for (let i = 0; i < INDEX_SYMBOLS.length; i += 50) {
      const batch = INDEX_SYMBOLS.slice(i, i + 50);
      const symbols = batch.join(',');
      
      console.log(`📡 Fetching batch ${Math.floor(i/50) + 1}/${Math.ceil(INDEX_SYMBOLS.length/50)} (${batch.length} symbols)...`);
      
      try {
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const assets = response.data;
        console.log(`   ✅ Fetched ${assets.length} assets`);
        allAssets.push(...assets);
        
        // Wait 1 second between batches
        if (i + 50 < INDEX_SYMBOLS.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`   ⚠️ Error fetching batch: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total assets fetched: ${allAssets.length}`);
    
    // Format assets
    const formattedAssets = allAssets.map((asset, index) => {
      const category = categorizeIndex(asset.symbol, asset.name || '');
      const region = getRegion(asset.symbol);
      
      return {
        symbol: asset.symbol,
        name: asset.name || asset.symbol,
        type: getIndexType(asset.symbol),
        category: category,
        region: region,
        price: asset.price || 0,
        change: asset.change || 0,
        changePercent: asset.changesPercentage || 0,
        volume: asset.volume || 0,
        avgVolume: asset.avgVolume || 0,
        marketCap: asset.marketCap || 0,
        high24h: asset.dayHigh || asset.price || 0,
        low24h: asset.dayLow || asset.price || 0,
        open: asset.open || 0,
        previousClose: asset.previousClose || 0,
        yearHigh: asset.yearHigh || 0,
        yearLow: asset.yearLow || 0,
        pe: asset.pe || 0,
        exchange: asset.exchange || '',
        rank: index + 1,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Sort by priority: indexes first, then ETFs by AUM (approximated by avg volume)
    formattedAssets.sort((a, b) => {
      // Pure indexes (^) first
      if (a.symbol.startsWith('^') && !b.symbol.startsWith('^')) return -1;
      if (!a.symbol.startsWith('^') && b.symbol.startsWith('^')) return 1;
      
      // Then by avg volume (proxy for ETF size)
      return (b.avgVolume || 0) - (a.avgVolume || 0);
    });
    
    // Update ranks
    formattedAssets.forEach((asset, index) => {
      asset.rank = index + 1;
    });
    
    // Take top 100
    const top100 = formattedAssets.slice(0, 100);
    
    // Save to JSON file
    const outputFile = 'indexes-assets.json';
    fs.writeFileSync(outputFile, JSON.stringify(top100, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalVolume = top100.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgPrice = top100.reduce((sum, s) => sum + s.price, 0) / top100.length;
    const avgChange = top100.reduce((sum, s) => sum + s.changePercent, 0) / top100.length;
    
    console.log(`Total Indexes: ${top100.length}`);
    console.log(`Total Daily Volume: $${(totalVolume / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    console.log(`Average Change: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`);
    
    // Category breakdown
    console.log('\n📦 Category Breakdown:');
    console.log('═══════════════════════════════════════');
    const categoryCounts = {};
    top100.forEach(asset => {
      const category = asset.category || 'Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const pct = ((count / top100.length) * 100).toFixed(1);
        console.log(`${category.padEnd(35)} | ${count.toString().padStart(3)} (${pct}%)`);
      });
    
    // Region breakdown
    console.log('\n🌍 Region Breakdown:');
    console.log('═══════════════════════════════════════');
    const regionCounts = {};
    top100.forEach(asset => {
      const region = asset.region || 'Other';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    
    Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        const pct = ((count / top100.length) * 100).toFixed(1);
        console.log(`${region.padEnd(25)} | ${count.toString().padStart(3)} (${pct}%)`);
      });
    
    // Type breakdown
    console.log('\n🏷️  Type Breakdown:');
    console.log('═══════════════════════════════════════');
    const typeCounts = {};
    top100.forEach(asset => {
      const type = asset.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const pct = ((count / top100.length) * 100).toFixed(1);
        console.log(`${type.toUpperCase().padEnd(20)} | ${count.toString().padStart(3)} (${pct}%)`);
      });
    
    // Top 20 indexes
    console.log('\n🏆 Top 20 Major Indexes:');
    console.log('═══════════════════════════════════════');
    top100.slice(0, 20).forEach((asset, i) => {
      const changeSign = asset.changePercent >= 0 ? '+' : '';
      const vol = asset.avgVolume > 0 ? `Vol: ${(asset.avgVolume / 1e6).toFixed(1)}M` : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${asset.symbol.padEnd(8)} | ${asset.name.substring(0, 35).padEnd(35)} | $${asset.price.toFixed(2).padStart(10)} | ${changeSign}${asset.changePercent.toFixed(2)}% | ${vol}`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 100 Stock Market Indexes & Index ETFs\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n\n`;
    tsCode += `const indexAssets = [\n`;
    
    top100.forEach(asset => {
      tsCode += `  { symbol: '${asset.symbol}', name: '${asset.name.replace(/'/g, "\\'")}', category: '${asset.category}', type: '${asset.type}', region: '${asset.region}' },\n`;
    });
    
    tsCode += `];\n\nexport default indexAssets;\n`;
    
    fs.writeFileSync('indexes-assets.ts', tsCode);
    console.log('✅ Generated indexes-assets.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - indexes-assets.json (Full data)');
    console.log('   - indexes-assets.ts (TypeScript import)');
    console.log(`\n💡 Indexes complete! Ready for next category.`);
    
  } catch (error) {
    console.error('❌ Error fetching index data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Helper functions
function categorizeIndex(symbol, name) {
  const s = symbol.toUpperCase();
  const n = name.toLowerCase();
  
  // Pure indexes (^)
  if (s.startsWith('^')) {
    if (s.includes('GSPC') || n.includes('s&p 500')) return 'US Market Index - Large Cap';
    if (s.includes('DJI') || n.includes('dow jones')) return 'US Market Index - Large Cap';
    if (s.includes('IXIC') || n.includes('nasdaq')) return 'US Market Index - Tech';
    if (s.includes('RUT') || n.includes('russell 2000')) return 'US Market Index - Small Cap';
    if (s.includes('VIX') || n.includes('volatility')) return 'US Market Index - Volatility';
    if (s.includes('FTSE')) return 'International Index - UK';
    if (s.includes('GDAXI') || s.includes('DAX')) return 'International Index - Germany';
    if (s.includes('FCHI') || s.includes('CAC')) return 'International Index - France';
    if (s.includes('N225') || s.includes('NIKKEI')) return 'International Index - Japan';
    if (s.includes('HSI') || n.includes('hang seng')) return 'International Index - Hong Kong';
    return 'International Index';
  }
  
  // ETFs
  if (['SPY', 'VOO', 'IVV'].includes(s)) return 'US Broad Market ETF - S&P 500';
  if (['QQQ', 'QQQM'].includes(s)) return 'US Broad Market ETF - Nasdaq';
  if (['DIA'].includes(s)) return 'US Broad Market ETF - Dow Jones';
  if (['IWM', 'VB', 'SLY'].includes(s)) return 'US Broad Market ETF - Small Cap';
  
  // Sector ETFs
  if (['XLK', 'VGT'].includes(s) || n.includes('technology')) return 'US Sector ETF - Technology';
  if (['XLF', 'VFH'].includes(s) || n.includes('financial')) return 'US Sector ETF - Financial';
  if (['XLV', 'VHT'].includes(s) || n.includes('health')) return 'US Sector ETF - Healthcare';
  if (['XLE', 'VDE'].includes(s) || n.includes('energy')) return 'US Sector ETF - Energy';
  if (['XLI', 'VIS'].includes(s) || n.includes('industrial')) return 'US Sector ETF - Industrial';
  if (['XLC', 'VOX'].includes(s) || n.includes('communication')) return 'US Sector ETF - Communication';
  if (['XLU', 'VPU'].includes(s) || n.includes('utilities')) return 'US Sector ETF - Utilities';
  if (['XLP', 'VDC'].includes(s) || n.includes('consumer staples')) return 'US Sector ETF - Consumer Staples';
  if (['XLRE', 'VNQ', 'IYR'].includes(s) || n.includes('real estate')) return 'US Sector ETF - Real Estate';
  if (['XLB', 'VAW'].includes(s) || n.includes('materials')) return 'US Sector ETF - Materials';
  if (['XLY', 'VCR'].includes(s) || n.includes('consumer discretionary')) return 'US Sector ETF - Consumer Discretionary';
  
  // Style/factor ETFs
  if (n.includes('growth')) return 'US Style ETF - Growth';
  if (n.includes('value')) return 'US Style ETF - Value';
  if (n.includes('dividend')) return 'US Factor ETF - Dividend';
  if (n.includes('momentum')) return 'US Factor ETF - Momentum';
  if (n.includes('quality')) return 'US Factor ETF - Quality';
  if (n.includes('volatility')) return 'US Factor ETF - Low Volatility';
  
  // International ETFs
  if (['EFA', 'VEA', 'IEFA'].includes(s)) return 'International ETF - Developed Markets';
  if (['EEM', 'VWO', 'IEMG'].includes(s)) return 'International ETF - Emerging Markets';
  if (['FXI', 'EWJ', 'EWG', 'EWU', 'EWC'].includes(s)) return 'International ETF - Country Specific';
  
  // Bond ETFs
  if (['AGG', 'BND'].includes(s) || n.includes('aggregate')) return 'Bond ETF - Aggregate';
  if (['TLT', 'IEF', 'SHY'].includes(s) || n.includes('treasury')) return 'Bond ETF - Treasury';
  if (['LQD', 'HYG', 'JNK'].includes(s)) return 'Bond ETF - Corporate';
  if (['EMB', 'PCY'].includes(s)) return 'Bond ETF - Emerging Markets';
  if (['TIP', 'VTIP'].includes(s) || n.includes('tips')) return 'Bond ETF - TIPS';
  if (['MUB', 'SUB'].includes(s) || n.includes('municipal')) return 'Bond ETF - Municipal';
  
  // Commodity ETFs
  if (['DBC', 'GSG', 'PDBC', 'DJP'].includes(s)) return 'Commodity Index ETF';
  
  // Volatility ETFs
  if (['VIXY', 'SVXY', 'UVXY'].includes(s) || n.includes('volatility')) return 'Volatility ETF';
  
  return 'Other Index';
}

function getIndexType(symbol) {
  if (symbol.startsWith('^')) return 'index';
  return 'etf';
}

function getRegion(symbol) {
  const s = symbol.toUpperCase();
  
  if (s.startsWith('^GSPC') || s.startsWith('^DJI') || s.startsWith('^IXIC') || s.startsWith('^RUT') || s.startsWith('^VIX')) {
    return 'United States';
  }
  if (s.startsWith('^FTSE')) return 'United Kingdom';
  if (s.startsWith('^GDAXI')) return 'Germany';
  if (s.startsWith('^FCHI')) return 'France';
  if (s.startsWith('^N225')) return 'Japan';
  if (s.startsWith('^HSI')) return 'Hong Kong';
  if (s.startsWith('^GSPTSE')) return 'Canada';
  if (s.startsWith('^MXX')) return 'Mexico';
  if (s.startsWith('^BVSP')) return 'Brazil';
  
  // ETFs
  if (['SPY', 'VOO', 'IVV', 'QQQ', 'DIA', 'IWM', 'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLC', 'XLU', 'XLP', 'XLRE', 'XLB', 'XLY'].includes(s)) {
    return 'United States';
  }
  if (['EFA', 'VEA', 'IEFA'].includes(s)) return 'International - Developed';
  if (['EEM', 'VWO', 'IEMG'].includes(s)) return 'International - Emerging';
  if (['FXI'].includes(s)) return 'China';
  if (['EWJ'].includes(s)) return 'Japan';
  if (['EWG'].includes(s)) return 'Germany';
  if (['EWU'].includes(s)) return 'United Kingdom';
  if (['EWC'].includes(s)) return 'Canada';
  
  return 'Global';
}

// Run the script
fetchIndexes();
