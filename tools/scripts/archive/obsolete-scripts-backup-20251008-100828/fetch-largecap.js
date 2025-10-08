/**
 * Fetch Top 500 Large-Cap Stocks (S&P 500 equivalent - Market Cap > $10B)
 * Uses Financial Modeling Prep API - Stock Screener
 * 
 * Run: node fetch-largecap.js
 * Output: largecap-stocks.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

async function fetchLargeCapStocks() {
  console.log('🚀 Fetching top 500 large-cap stocks (Market Cap > $10B)...\n');
  
  try {
    // Fetch large-cap stocks using stock screener
    console.log('📡 Fetching large-cap stocks from stock screener...');
    const response = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock-screener`,
      {
        params: {
          marketCapMoreThan: 10000000000,  // $10 billion
          volumeMoreThan: 500000,           // Min 500k daily volume
          limit: 600,                       // Get 600 to filter to best 500
          apikey: API_KEY
        }
      }
    );
    
    let stocks = response.data;
    console.log(`✅ Fetched ${stocks.length} large-cap stocks`);
    
    if (stocks.length === 0) {
      console.error('❌ No stocks returned from screener');
      process.exit(1);
    }
    
    // Sort by market cap descending and take top 500
    stocks = stocks
      .filter(s => s.marketCap >= 10000000000)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 500);
    
    console.log(`\n✅ Filtered to top ${stocks.length} large-cap stocks by market cap`);
    
    // Fetch detailed quotes in batches
    console.log('\n📡 Fetching detailed quotes in batches...');
    const detailedStocks = [];
    const batchSize = 100;
    
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const symbols = batch.map(s => s.symbol).join(',');
      
      console.log(`   Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(stocks.length/batchSize)} (${batch.length} stocks)...`);
      
      try {
        const quoteResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const quotes = quoteResponse.data;
        console.log(`   ✅ Fetched ${quotes.length} detailed quotes`);
        
        // Merge screener data with quotes
        quotes.forEach(quote => {
          const screenerData = batch.find(s => s.symbol === quote.symbol);
          if (screenerData) {
            detailedStocks.push({
              ...screenerData,
              ...quote
            });
          }
        });
        
        // Wait 1 second between batches to respect rate limits
        if (i + batchSize < stocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`   ⚠️ Error fetching quotes for batch: ${error.message}`);
        // Use screener data as fallback
        batch.forEach(stock => detailedStocks.push(stock));
      }
    }
    
    console.log(`\n✅ Total stocks with detailed data: ${detailedStocks.length}`);
    
    // Format stocks
    const formattedStocks = detailedStocks.map((stock, index) => ({
      symbol: stock.symbol,
      name: stock.companyName || stock.name || stock.symbol,
      type: 'stock',
      sector: stock.sector || 'Unknown',
      industry: stock.industry || '',
      exchange: stock.exchangeShortName || stock.exchange || '',
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
      rank: index + 1,
      category: 'Large Cap',
      lastUpdated: new Date().toISOString()
    }));
    
    // Sort by market cap
    formattedStocks.sort((a, b) => b.marketCap - a.marketCap);
    
    // Update ranks
    formattedStocks.forEach((stock, index) => {
      stock.rank = index + 1;
    });
    
    // Save to JSON file
    const outputFile = 'largecap-stocks.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedStocks, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = formattedStocks.reduce((sum, s) => sum + s.marketCap, 0);
    const avgMarketCap = totalMarketCap / formattedStocks.length;
    const totalVolume = formattedStocks.reduce((sum, s) => sum + s.volume, 0);
    const avgPrice = formattedStocks.reduce((sum, s) => sum + s.price, 0) / formattedStocks.length;
    
    console.log(`Total Stocks: ${formattedStocks.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e12).toFixed(2)} Trillion`);
    console.log(`Average Market Cap: $${(avgMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Total Volume: $${(totalVolume / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    
    // Market cap range
    const minMarketCap = Math.min(...formattedStocks.map(s => s.marketCap));
    const maxMarketCap = Math.max(...formattedStocks.map(s => s.marketCap));
    console.log(`Market Cap Range: $${(minMarketCap / 1e9).toFixed(2)}B - $${(maxMarketCap / 1e12).toFixed(2)}T`);
    
    // Sector breakdown
    console.log('\n📦 Sector Breakdown:');
    console.log('═══════════════════════════════════════');
    const sectorCounts = {};
    formattedStocks.forEach(stock => {
      const sector = stock.sector || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
    
    Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([sector, count]) => {
        const pct = ((count / formattedStocks.length) * 100).toFixed(1);
        console.log(`${sector.padEnd(30)} | ${count.toString().padStart(3)} (${pct}%)`);
      });
    
    // Exchange breakdown
    console.log('\n🏦 Exchange Breakdown:');
    console.log('═══════════════════════════════════════');
    const exchangeCounts = {};
    formattedStocks.forEach(stock => {
      const exchange = stock.exchange || 'Unknown';
      exchangeCounts[exchange] = (exchangeCounts[exchange] || 0) + 1;
    });
    
    Object.entries(exchangeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([exchange, count]) => {
        const pct = ((count / formattedStocks.length) * 100).toFixed(1);
        console.log(`${exchange.padEnd(20)} | ${count.toString().padStart(3)} (${pct}%)`);
      });
    
    // Top 20 by market cap
    console.log('\n🏆 Top 20 Large-Cap Stocks by Market Cap:');
    console.log('═══════════════════════════════════════');
    formattedStocks.slice(0, 20).forEach((stock, i) => {
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(8)} | ${stock.name.substring(0, 30).padEnd(30)} | $${(stock.marketCap / 1e12).toFixed(2)}T | ${changeSign}${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 500 Large-Cap Stocks (Market Cap > $10B)\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n\n`;
    tsCode += `const largeCapStocks = [\n`;
    
    formattedStocks.forEach(stock => {
      tsCode += `  { symbol: '${stock.symbol}', name: '${stock.name.replace(/'/g, "\\'")}', sector: '${stock.sector}', marketCap: ${stock.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default largeCapStocks;\n`;
    
    fs.writeFileSync('largecap-stocks.ts', tsCode);
    console.log('✅ Generated largecap-stocks.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - largecap-stocks.json (Full data)');
    console.log('   - largecap-stocks.ts (TypeScript import)');
    
  } catch (error) {
    console.error('❌ Error fetching large-cap stock data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
fetchLargeCapStocks();
