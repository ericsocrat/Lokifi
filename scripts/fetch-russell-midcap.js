/**
 * Fetch Russell Midcap 400 Stocks
 * Uses Financial Modeling Prep API Stock Screener
 * 
 * Run: node fetch-russell-midcap.js
 * Output: russell-midcap-stocks.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

async function fetchRussellMidcap() {
  console.log('🚀 Fetching Russell Midcap 400 stocks (mid-cap range)...\n');
  
  try {
    // Midcap definition: $2B - $10B market cap
    // We'll fetch stocks in this range
    console.log('📡 Fetching mid-cap stocks ($2B - $10B market cap)...');
    
    const response = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock-screener`, {
        params: {
          marketCapMoreThan: 2000000000,      // $2 billion
          marketCapLowerThan: 10000000000,    // $10 billion
          volumeMoreThan: 100000,              // Active stocks
          limit: 400,
          apikey: API_KEY
        }
      }
    );
    
    let stocks = response.data;
    console.log(`✅ Fetched ${stocks.length} mid-cap stocks`);
    
    if (stocks.length === 0) {
      throw new Error('No mid-cap stocks returned from API');
    }
    
    // Sort by market cap descending and take top 400
    stocks = stocks
      .filter(s => s.marketCap >= 2e9 && s.marketCap <= 10e9)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 400);
    
    console.log(`✅ Filtered to top ${stocks.length} mid-cap stocks by market cap`);
    
    // Wait 1 second to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch detailed quotes for top 100 at a time (to avoid URL length limits)
    console.log('\n📡 Fetching detailed quotes...');
    const detailedStocks = [];
    
    for (let i = 0; i < stocks.length; i += 100) {
      const batch = stocks.slice(i, i + 100);
      const symbols = batch.map(s => s.symbol).join(',');
      
      console.log(`   Fetching batch ${Math.floor(i/100) + 1}/${Math.ceil(stocks.length/100)} (${batch.length} stocks)...`);
      
      try {
        const quoteResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const quotes = quoteResponse.data;
        
        // Merge screener data with quote data
        batch.forEach(stock => {
          const quote = quotes.find(q => q.symbol === stock.symbol);
          if (quote) {
            detailedStocks.push({
              ...stock,
              ...quote
            });
          } else {
            detailedStocks.push(stock);
          }
        });
        
        // Wait 1 second between batches
        if (i + 100 < stocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`   ⚠️ Warning: Could not fetch quotes for batch ${Math.floor(i/100) + 1}, using screener data`);
        detailedStocks.push(...batch);
      }
    }
    
    console.log(`✅ Fetched detailed data for ${detailedStocks.length} stocks`);
    
    // Format for our application
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
      marketCap: stock.marketCap || 0,
      high24h: stock.dayHigh || stock.price || 0,
      low24h: stock.dayLow || stock.price || 0,
      avgVolume: stock.avgVolume || 0,
      open: stock.open || 0,
      previousClose: stock.previousClose || 0,
      eps: stock.eps || 0,
      pe: stock.pe || 0,
      yearHigh: stock.yearHigh || 0,
      yearLow: stock.yearLow || 0,
      sharesOutstanding: stock.sharesOutstanding || 0,
      rank: index + 1,
      category: 'Russell Midcap',
      lastUpdated: new Date().toISOString()
    }));
    
    // Save to JSON file
    const outputFile = 'russell-midcap-stocks.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedStocks, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = formattedStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
    const totalVolume = formattedStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgPrice = formattedStocks.reduce((sum, s) => sum + s.price, 0) / formattedStocks.length;
    const avgMarketCap = totalMarketCap / formattedStocks.length;
    const gainers = formattedStocks.filter(s => s.changePercent > 0).length;
    const losers = formattedStocks.filter(s => s.changePercent < 0).length;
    
    console.log(`Total Stocks: ${formattedStocks.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Average Market Cap: $${(avgMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Total Volume: $${(totalVolume / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    console.log(`Gainers: ${gainers} | Losers: ${losers} | Unchanged: ${formattedStocks.length - gainers - losers}`);
    
    // Sector breakdown
    console.log('\n📈 Sector Breakdown:');
    console.log('═══════════════════════════════════════');
    const sectorCounts = {};
    formattedStocks.forEach(stock => {
      const sector = stock.sector || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
    
    Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([sector, count]) => {
        const percentage = ((count / formattedStocks.length) * 100).toFixed(1);
        console.log(`${sector.padEnd(30)} | ${count} stocks (${percentage}%)`);
      });
    
    // Top 20 by market cap
    console.log('\n🏆 Top 20 by Market Cap:');
    console.log('═══════════════════════════════════════');
    const sortedByMcap = [...formattedStocks]
      .filter(s => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 20);
    
    sortedByMcap.forEach((stock, i) => {
      const mcap = (stock.marketCap / 1e9).toFixed(2);
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} | ${stock.name.substring(0, 30).padEnd(30)} | $${mcap}B | ${changeSign}${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Exchange breakdown
    console.log('\n🏢 Exchange Breakdown:');
    console.log('═══════════════════════════════════════');
    const exchangeCounts = {};
    formattedStocks.forEach(stock => {
      const exchange = stock.exchange || 'Unknown';
      exchangeCounts[exchange] = (exchangeCounts[exchange] || 0) + 1;
    });
    
    Object.entries(exchangeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([exchange, count]) => {
        console.log(`${exchange.padEnd(20)} | ${count} stocks`);
      });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Russell Midcap 400 Stocks\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n`;
    tsCode += `// Market Cap Range: $2B - $10B\n\n`;
    tsCode += `const russellMidcapStocks = [\n`;
    
    formattedStocks.forEach(stock => {
      tsCode += `  { symbol: '${stock.symbol}', name: '${stock.name.replace(/'/g, "\\'")}', sector: '${stock.sector}', type: 'stock', marketCap: ${stock.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default russellMidcapStocks;\n`;
    
    fs.writeFileSync('russell-midcap-stocks.ts', tsCode);
    console.log('✅ Generated russell-midcap-stocks.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - russell-midcap-stocks.json (Full data)');
    console.log('   - russell-midcap-stocks.ts (TypeScript import)');
    console.log(`\n💡 Next step: Run fetch-international.js for international stocks`);
    
  } catch (error) {
    console.error('❌ Error fetching Russell Midcap data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
fetchRussellMidcap();
