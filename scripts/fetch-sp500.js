/**
 * Fetch S&P 500 Stocks
 * Uses Financial Modeling Prep API
 * 
 * Run: node fetch-sp500.js
 * Output: sp500-stocks.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

async function fetchSP500Stocks() {
  console.log('🚀 Fetching top 500 large-cap stocks (S&P 500 equivalent)...\n');
  
  try {
    // Fetch large-cap stocks using stock screener (market cap > $10B)
    console.log('📡 Fetching large-cap stocks from stock screener...');
    const response = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock-screener`,
      {
        params: {
          marketCapMoreThan: 10000000000,  // $10 billion
          volumeMoreThan: 500000,          // Min 500k daily volume
          limit: 500,
          apikey: API_KEY
        }
      }
    );
    
    const constituents = response.data;
    console.log(`✅ Fetched ${constituents.length} S&P 500 constituents`);
    
    if (constituents.length === 0) {
      throw new Error('No S&P 500 data returned from API');
    }
    
    // Wait 1 second to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch current prices for all stocks (batch request)
    console.log('\n📡 Fetching current prices for all stocks...');
    const symbols = constituents.map(c => c.symbol).join(',');
    
    const priceResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
    );
    
    const priceData = priceResponse.data;
    console.log(`✅ Fetched prices for ${priceData.length} stocks`);
    
    // Create a price lookup map
    const priceMap = {};
    priceData.forEach(stock => {
      priceMap[stock.symbol] = stock;
    });
    
    // Format for our application
    const formattedStocks = constituents.map((constituent, index) => {
      const symbol = constituent.symbol;
      const priceInfo = priceMap[symbol] || {};
      
      return {
        symbol: symbol,
        name: constituent.name || priceInfo.name || symbol,
        type: 'stock',
        sector: constituent.sector || 'Unknown',
        subSector: constituent.subSector || '',
        headQuarter: constituent.headQuarter || '',
        founded: constituent.founded || '',
        price: priceInfo.price || 0,
        change: priceInfo.change || 0,
        changePercent: priceInfo.changesPercentage || 0,
        volume: priceInfo.volume || 0,
        marketCap: priceInfo.marketCap || 0,
        high24h: priceInfo.dayHigh || priceInfo.price || 0,
        low24h: priceInfo.dayLow || priceInfo.price || 0,
        avgVolume: priceInfo.avgVolume || 0,
        open: priceInfo.open || 0,
        previousClose: priceInfo.previousClose || 0,
        eps: priceInfo.eps || 0,
        pe: priceInfo.pe || 0,
        earningsAnnouncement: priceInfo.earningsAnnouncement || null,
        sharesOutstanding: priceInfo.sharesOutstanding || 0,
        rank: index + 1,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Save to JSON file
    const outputFile = 'sp500-stocks.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedStocks, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = formattedStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
    const totalVolume = formattedStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgPrice = formattedStocks.reduce((sum, s) => sum + s.price, 0) / formattedStocks.length;
    const gainers = formattedStocks.filter(s => s.changePercent > 0).length;
    const losers = formattedStocks.filter(s => s.changePercent < 0).length;
    
    console.log(`Total Stocks: ${formattedStocks.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e12).toFixed(2)} Trillion`);
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
      .forEach(([sector, count]) => {
        console.log(`${sector.padEnd(30)} | ${count} stocks`);
      });
    
    // Top 10 by market cap
    console.log('\n🏆 Top 10 by Market Cap:');
    console.log('═══════════════════════════════════════');
    const sortedByMcap = [...formattedStocks]
      .filter(s => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 10);
    
    sortedByMcap.forEach((stock, i) => {
      const mcap = (stock.marketCap / 1e9).toFixed(2);
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      console.log(
        `${i + 1}. ${stock.symbol.padEnd(6)} | ${stock.name.padEnd(35)} | $${mcap}B | ${changeSign}${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Top 10 gainers
    console.log('\n📈 Top 10 Gainers:');
    console.log('═══════════════════════════════════════');
    const topGainers = [...formattedStocks]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);
    
    topGainers.forEach((stock, i) => {
      console.log(
        `${i + 1}. ${stock.symbol.padEnd(6)} | ${stock.name.padEnd(35)} | +${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Top 10 losers
    console.log('\n📉 Top 10 Losers:');
    console.log('═══════════════════════════════════════');
    const topLosers = [...formattedStocks]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);
    
    topLosers.forEach((stock, i) => {
      console.log(
        `${i + 1}. ${stock.symbol.padEnd(6)} | ${stock.name.padEnd(35)} | ${stock.changePercent.toFixed(2)}%`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// S&P 500 Stocks\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n\n`;
    tsCode += `const sp500Stocks = [\n`;
    
    formattedStocks.forEach(stock => {
      tsCode += `  { symbol: '${stock.symbol}', name: '${stock.name.replace(/'/g, "\\'")}', sector: '${stock.sector}', type: 'stock', marketCap: ${stock.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default sp500Stocks;\n`;
    
    fs.writeFileSync('sp500-stocks.ts', tsCode);
    console.log('✅ Generated sp500-stocks.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - sp500-stocks.json (Full data)');
    console.log('   - sp500-stocks.ts (TypeScript import)');
    console.log(`\n💡 Next step: Run fetch-russell-midcap.js for 400 more stocks`);
    
  } catch (error) {
    console.error('❌ Error fetching S&P 500 data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
fetchSP500Stocks();
