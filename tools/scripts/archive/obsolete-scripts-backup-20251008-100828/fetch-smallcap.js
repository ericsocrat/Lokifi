/**
 * Fetch Top 200 Small-Cap Stocks ($300M - $2B market cap)
 * Uses Financial Modeling Prep API
 * 
 * Run: node fetch-smallcap.js
 * Output: smallcap-stocks.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

async function fetchSmallCapStocks() {
  console.log('🚀 Fetching top 200 small-cap stocks ($300M - $2B market cap)...\n');
  
  try {
    // Fetch small-cap stocks using stock screener
    console.log('📡 Fetching small-cap stocks from stock screener...');
    const response = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock-screener`,
      {
        params: {
          marketCapMoreThan: 300000000,      // $300 million
          marketCapLowerThan: 2000000000,    // $2 billion
          volumeMoreThan: 100000,             // Min 100k daily volume
          limit: 250,                         // Get 250 to filter to best 200
          apikey: API_KEY
        }
      }
    );
    
    let stocks = response.data;
    console.log(`✅ Fetched ${stocks.length} small-cap stocks`);
    
    if (stocks.length === 0) {
      console.error('❌ No stocks returned from screener');
      process.exit(1);
    }
    
    // Sort by market cap descending and take top 200
    stocks = stocks
      .filter(s => s.marketCap >= 300000000 && s.marketCap <= 2000000000)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 200);
    
    console.log(`\n✅ Filtered to top ${stocks.length} small-cap stocks by market cap`);
    
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
      category: 'Small Cap',
      lastUpdated: new Date().toISOString()
    }));
    
    // Sort by market cap
    formattedStocks.sort((a, b) => b.marketCap - a.marketCap);
    
    // Update ranks
    formattedStocks.forEach((stock, index) => {
      stock.rank = index + 1;
    });
    
    // Save to JSON file
    const outputFile = 'smallcap-stocks.json';
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
    console.log(`Total Market Cap: $${(totalMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Average Market Cap: $${(avgMarketCap / 1e6).toFixed(2)} Million`);
    console.log(`Total Volume: $${(totalVolume / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    
    // Market cap range
    const minMarketCap = Math.min(...formattedStocks.map(s => s.marketCap));
    const maxMarketCap = Math.max(...formattedStocks.map(s => s.marketCap));
    console.log(`Market Cap Range: $${(minMarketCap / 1e6).toFixed(2)}M - $${(maxMarketCap / 1e9).toFixed(2)}B`);
    
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
    console.log('\n🏆 Top 20 Small-Cap Stocks by Market Cap:');
    console.log('═══════════════════════════════════════');
    formattedStocks.slice(0, 20).forEach((stock, i) => {
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(8)} | ${stock.name.substring(0, 30).padEnd(30)} | $${(stock.marketCap / 1e9).toFixed(2)}B | ${changeSign}${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Top 10 gainers
    const gainers = [...formattedStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    console.log('\n📈 Top 10 Gainers:');
    console.log('═══════════════════════════════════════');
    gainers.forEach((stock, i) => {
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(8)} | ${stock.name.substring(0, 30).padEnd(30)} | +${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Top 10 losers
    const losers = [...formattedStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    console.log('\n📉 Top 10 Losers:');
    console.log('═══════════════════════════════════════');
    losers.forEach((stock, i) => {
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(8)} | ${stock.name.substring(0, 30).padEnd(30)} | ${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 200 Small-Cap Stocks ($300M - $2B market cap)\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n\n`;
    tsCode += `const smallCapStocks = [\n`;
    
    formattedStocks.forEach(stock => {
      tsCode += `  { symbol: '${stock.symbol}', name: '${stock.name.replace(/'/g, "\\'")}', sector: '${stock.sector}', marketCap: ${stock.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default smallCapStocks;\n`;
    
    fs.writeFileSync('smallcap-stocks.ts', tsCode);
    console.log('✅ Generated smallcap-stocks.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - smallcap-stocks.json (Full data)');
    console.log('   - smallcap-stocks.ts (TypeScript import)');
    console.log(`\n💡 Small-cap stocks complete! All 6 fetching scripts now ready.`);
    
  } catch (error) {
    console.error('❌ Error fetching small-cap stock data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
fetchSmallCapStocks();
