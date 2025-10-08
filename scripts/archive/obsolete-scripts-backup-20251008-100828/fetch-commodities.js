/**
 * Fetch Top Commodity ETFs, Futures, and Related Assets
 * Uses Financial Modeling Prep API
 * 
 * Run: node fetch-commodities.js
 * Output: commodities-assets.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

// Curated list of major commodity ETFs, mining stocks, and commodity-related assets
const COMMODITY_SYMBOLS = [
  // Gold & Precious Metals
  'GLD', 'IAU', 'SGOL', 'GLDM', 'PHYS',  // Gold ETFs
  'SLV', 'SIVR', 'PSLV',                   // Silver ETFs
  'PPLT', 'PALL',                          // Platinum, Palladium ETFs
  'GDX', 'GDXJ', 'RING',                   // Gold miners ETFs
  'NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM', 'RGLD', 'OR', 'AUY', 'BTG', // Gold mining stocks
  'AG', 'HL', 'PAAS', 'MAG', 'CDE',       // Silver mining stocks
  
  // Energy
  'USO', 'BNO', 'DBO', 'USL',             // Oil ETFs
  'UNG', 'BOIL', 'KOLD',                  // Natural Gas ETFs
  'XLE', 'VDE', 'IYE', 'FENY', 'XOP',     // Energy sector ETFs
  'OIH', 'IEO', 'IEZ', 'PXE',             // Oil & Gas ETFs
  'URA', 'URNM', 'NLR',                   // Uranium ETFs
  'TAN', 'ICLN', 'QCLN', 'PBW',           // Clean energy ETFs
  'CCJ', 'UEC', 'DNN', 'UUUU',            // Uranium mining stocks
  
  // Industrial Metals
  'CPER', 'JJC',                          // Copper ETFs
  'NIB',                                   // Nickel ETF
  'REMX', 'LIT',                          // Rare earth, Lithium ETFs
  'FCX', 'SCCO', 'TECK', 'VALE', 'RIO', 'BHP', 'AA', 'CENX', // Mining stocks
  'ALB', 'SQM', 'LAC', 'LTHM',            // Lithium stocks
  'MP', 'LYNAS',                          // Rare earth stocks
  
  // Agriculture
  'CORN', 'WEAT', 'SOYB', 'JO',           // Grain ETFs
  'DBA', 'MOO', 'VEGI',                   // Agriculture ETFs
  'COW', 'LAND', 'FPI',                   // Livestock/Farm ETFs
  'ADM', 'BG', 'DE', 'AGCO', 'CF', 'NTR', 'MOS', 'FMC', // Ag stocks
  
  // Broad Commodities
  'DBC', 'GSG', 'PDBC', 'USCI', 'DJP',    // Broad commodity ETFs
  'GCC', 'RJI', 'RJA', 'RJN', 'RJZ',      // Rogers commodity ETFs
  
  // Soft Commodities
  'WOOD', 'CUT',                          // Lumber ETFs
  'NIB', 'JJN',                           // Soft commodity ETFs
  'CHOC', 'JAVA', 'SGAR',                 // Coffee, Cocoa, Sugar (if available)
  
  // Commodity Producers
  'RIO', 'BHP', 'VALE', 'GLEN',           // Diversified miners
  'AA', 'CENX', 'ACH',                    // Aluminum
  'STLD', 'NUE', 'CLF', 'MT', 'X',        // Steel
  'VMC', 'MLM', 'SUM',                    // Aggregates/Construction
  
  // Alternative Resources
  'ICLN', 'QCLN', 'TAN', 'FAN',           // Renewables
  'WOOD', 'LPX', 'WY', 'PCH',             // Timber
  'MOS', 'NTR', 'CF', 'ICL',              // Fertilizers
];

async function fetchCommodities() {
  console.log('🚀 Fetching commodity assets (ETFs, futures, mining stocks)...\n');
  console.log(`📋 Targeting ${COMMODITY_SYMBOLS.length} commodity-related symbols\n`);
  
  try {
    const allAssets = [];
    
    // Fetch in batches of 100 symbols
    for (let i = 0; i < COMMODITY_SYMBOLS.length; i += 100) {
      const batch = COMMODITY_SYMBOLS.slice(i, i + 100);
      const symbols = batch.join(',');
      
      console.log(`📡 Fetching batch ${Math.floor(i/100) + 1}/${Math.ceil(COMMODITY_SYMBOLS.length/100)} (${batch.length} symbols)...`);
      
      try {
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const assets = response.data;
        console.log(`   ✅ Fetched ${assets.length} assets`);
        allAssets.push(...assets);
        
        // Wait 1 second between batches
        if (i + 100 < COMMODITY_SYMBOLS.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`   ⚠️ Error fetching batch: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total assets fetched: ${allAssets.length}`);
    
    // Filter and categorize
    const formattedAssets = allAssets.map((asset, index) => {
      const category = categorizeAsset(asset.symbol, asset.name || '');
      
      return {
        symbol: asset.symbol,
        name: asset.name || asset.symbol,
        type: getAssetType(asset.symbol),
        category: category,
        subCategory: getSubCategory(asset.symbol),
        price: asset.price || 0,
        change: asset.change || 0,
        changePercent: asset.changesPercentage || 0,
        volume: asset.volume || 0,
        marketCap: asset.marketCap || 0,
        high24h: asset.dayHigh || asset.price || 0,
        low24h: asset.dayLow || asset.price || 0,
        avgVolume: asset.avgVolume || 0,
        open: asset.open || 0,
        previousClose: asset.previousClose || 0,
        yearHigh: asset.yearHigh || 0,
        yearLow: asset.yearLow || 0,
        pe: asset.pe || 0,
        eps: asset.eps || 0,
        exchange: asset.exchange || '',
        rank: index + 1,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Sort by market cap/volume (ETFs first, then stocks)
    formattedAssets.sort((a, b) => {
      if (a.type === 'etf' && b.type !== 'etf') return -1;
      if (a.type !== 'etf' && b.type === 'etf') return 1;
      return (b.marketCap || b.avgVolume || 0) - (a.marketCap || a.avgVolume || 0);
    });
    
    // Update ranks
    formattedAssets.forEach((asset, index) => {
      asset.rank = index + 1;
    });
    
    // Take top 150
    const top150 = formattedAssets.slice(0, 150);
    
    // Save to JSON file
    const outputFile = 'commodities-assets.json';
    fs.writeFileSync(outputFile, JSON.stringify(top150, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = top150.reduce((sum, s) => sum + (s.marketCap || 0), 0);
    const totalVolume = top150.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgPrice = top150.reduce((sum, s) => sum + s.price, 0) / top150.length;
    
    console.log(`Total Assets: ${top150.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Total Volume: $${(totalVolume / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    
    // Category breakdown
    console.log('\n📦 Category Breakdown:');
    console.log('═══════════════════════════════════════');
    const categoryCounts = {};
    top150.forEach(asset => {
      const category = asset.category || 'Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`${category.padEnd(30)} | ${count} assets`);
      });
    
    // Type breakdown
    console.log('\n🏷️  Type Breakdown:');
    console.log('═══════════════════════════════════════');
    const typeCounts = {};
    top150.forEach(asset => {
      const type = asset.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`${type.toUpperCase().padEnd(20)} | ${count} assets`);
      });
    
    // Top 20 by market cap/volume
    console.log('\n🏆 Top 20 Commodity Assets:');
    console.log('═══════════════════════════════════════');
    top150.slice(0, 20).forEach((asset, i) => {
      const value = asset.marketCap > 0 
        ? `$${(asset.marketCap / 1e9).toFixed(2)}B` 
        : `Vol: ${(asset.avgVolume / 1e6).toFixed(1)}M`;
      const changeSign = asset.changePercent >= 0 ? '+' : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${asset.symbol.padEnd(6)} | ${asset.name.substring(0, 30).padEnd(30)} | ${value.padEnd(12)} | ${changeSign}${asset.changePercent.toFixed(2)}%`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 150 Commodity Assets (ETFs, Futures, Mining Stocks)\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n\n`;
    tsCode += `const commodityAssets = [\n`;
    
    top150.forEach(asset => {
      tsCode += `  { symbol: '${asset.symbol}', name: '${asset.name.replace(/'/g, "\\'")}', category: '${asset.category}', type: '${asset.type}', marketCap: ${asset.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default commodityAssets;\n`;
    
    fs.writeFileSync('commodities-assets.ts', tsCode);
    console.log('✅ Generated commodities-assets.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - commodities-assets.json (Full data)');
    console.log('   - commodities-assets.ts (TypeScript import)');
    console.log(`\n💡 All fetching scripts complete! Ready for merge step.`);
    
  } catch (error) {
    console.error('❌ Error fetching commodity data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Helper functions
function categorizeAsset(symbol, name) {
  const s = symbol.toUpperCase();
  const n = name.toLowerCase();
  
  if (s.includes('GLD') || s.includes('GOLD') || s.includes('NEM') || s.includes('GDX') || n.includes('gold')) return 'Precious Metals - Gold';
  if (s.includes('SLV') || s.includes('SILV') || s.includes('AG') || n.includes('silver')) return 'Precious Metals - Silver';
  if (s.includes('PPLT') || s.includes('PALL') || n.includes('platinum') || n.includes('palladium')) return 'Precious Metals - Other';
  if (s.includes('USO') || s.includes('OIL') || s.includes('BNO') || n.includes('oil') || n.includes('crude')) return 'Energy - Oil';
  if (s.includes('UNG') || s.includes('GAS') || n.includes('natural gas')) return 'Energy - Natural Gas';
  if (s.includes('URA') || s.includes('URN') || s.includes('CCJ') || n.includes('uranium')) return 'Energy - Uranium';
  if (s.includes('TAN') || s.includes('ICLN') || n.includes('clean') || n.includes('solar')) return 'Energy - Renewable';
  if (s.includes('XLE') || s.includes('VDE') || n.includes('energy')) return 'Energy - Sector';
  if (s.includes('CPER') || s.includes('FCX') || n.includes('copper')) return 'Industrial Metals - Copper';
  if (s.includes('VALE') || s.includes('RIO') || s.includes('BHP')) return 'Industrial Metals - Diversified';
  if (s.includes('AA') || s.includes('CENX') || n.includes('aluminum')) return 'Industrial Metals - Aluminum';
  if (s.includes('STLD') || s.includes('NUE') || n.includes('steel')) return 'Industrial Metals - Steel';
  if (s.includes('LIT') || s.includes('ALB') || n.includes('lithium')) return 'Industrial Metals - Lithium';
  if (s.includes('CORN') || s.includes('WEAT') || s.includes('SOYB') || s.includes('JO')) return 'Agriculture - Grains';
  if (s.includes('DBA') || s.includes('MOO') || s.includes('ADM') || s.includes('BG')) return 'Agriculture - General';
  if (s.includes('MOS') || s.includes('NTR') || s.includes('CF') || n.includes('fertilizer')) return 'Agriculture - Fertilizers';
  if (s.includes('DBC') || s.includes('GSG') || s.includes('PDBC') || s.includes('USCI')) return 'Commodities - Broad';
  if (s.includes('WOOD') || s.includes('CUT') || n.includes('timber') || n.includes('lumber')) return 'Soft Commodities - Timber';
  
  return 'Commodities - Other';
}

function getAssetType(symbol) {
  // ETFs typically have 3-4 letters and are all caps
  // Stocks typically have more varied naming
  const etfKeywords = ['ETF', 'FUND', 'TRUST', 'INDEX'];
  const s = symbol.toUpperCase();
  
  if (etfKeywords.some(kw => s.includes(kw)) || 
      ['GLD', 'SLV', 'USO', 'UNG', 'DBC', 'GDX', 'XLE', 'ICLN', 'TAN', 'DBA', 'MOO', 'CPER'].includes(s)) {
    return 'etf';
  }
  return 'stock';
}

function getSubCategory(symbol) {
  const s = symbol.toUpperCase();
  
  if (['GLD', 'IAU', 'SGOL', 'GLDM', 'PHYS'].includes(s)) return 'Gold ETFs';
  if (['SLV', 'SIVR', 'PSLV'].includes(s)) return 'Silver ETFs';
  if (['GDX', 'GDXJ', 'RING'].includes(s)) return 'Mining ETFs';
  if (['NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM'].includes(s)) return 'Gold Miners';
  if (['USO', 'BNO', 'DBO', 'USL'].includes(s)) return 'Oil ETFs';
  if (['UNG', 'BOIL', 'KOLD'].includes(s)) return 'Natural Gas ETFs';
  if (['FCX', 'SCCO', 'TECK', 'VALE', 'RIO', 'BHP'].includes(s)) return 'Diversified Miners';
  if (['DBA', 'MOO', 'CORN', 'WEAT', 'SOYB'].includes(s)) return 'Agriculture ETFs';
  if (['DBC', 'GSG', 'PDBC', 'USCI', 'DJP'].includes(s)) return 'Broad Commodity ETFs';
  
  return '';
}

// Run the script
fetchCommodities();
