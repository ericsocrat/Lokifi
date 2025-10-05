/**
 * Fetch Top 300 International Stocks
 * Uses Financial Modeling Prep API
 * Focuses on major non-US exchanges
 * 
 * Run: node fetch-international.js
 * Output: international-stocks.json
 */

const axios = require('axios');
const fs = require('fs');

const API_KEY = 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL';

// Major international exchanges
const EXCHANGES = [
  'LSE',    // London Stock Exchange (UK)
  'TSX',    // Toronto Stock Exchange (Canada)
  'FRA',    // Frankfurt (Germany)
  'EPA',    // Euronext Paris (France)
  'SHH',    // Shanghai (China)
  'SHZ',    // Shenzhen (China)
  'HKG',    // Hong Kong
  'JPX',    // Tokyo (Japan)
  'KRX',    // Korea Exchange
  'ASX',    // Australian Securities Exchange
  'BMV',    // Mexican Stock Exchange
  'BSE',    // Bombay Stock Exchange (India)
  'NSE',    // National Stock Exchange (India)
  'SIX',    // Swiss Exchange
  'AMS',    // Euronext Amsterdam
];

async function fetchInternationalStocks() {
  console.log('🚀 Fetching top 300 international stocks...\n');
  console.log('🌍 Targeting exchanges:', EXCHANGES.join(', '));
  
  try {
    const allStocks = [];
    
    // Fetch stocks from each exchange
    for (const exchange of EXCHANGES) {
      console.log(`\n📡 Fetching from ${exchange}...`);
      
      try {
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/stock-screener`, {
            params: {
              exchange: exchange,
              marketCapMoreThan: 1000000000,  // $1 billion minimum
              volumeMoreThan: 50000,           // Active stocks
              limit: 50,                       // Top 50 from each
              apikey: API_KEY
            }
          }
        );
        
        const stocks = response.data;
        console.log(`   ✅ Found ${stocks.length} stocks from ${exchange}`);
        
        allStocks.push(...stocks.map(s => ({
          ...s,
          exchange: exchange
        })));
        
        // Wait 500ms between exchanges to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ⚠️ Could not fetch from ${exchange}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total stocks fetched: ${allStocks.length}`);
    
    // Sort by market cap and take top 300
    const topStocks = allStocks
      .filter(s => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 300);
    
    console.log(`✅ Selected top ${topStocks.length} by market cap`);
    
    // Fetch detailed quotes in batches
    console.log('\n📡 Fetching detailed quotes...');
    const detailedStocks = [];
    
    for (let i = 0; i < topStocks.length; i += 50) {
      const batch = topStocks.slice(i, i + 50);
      const symbols = batch.map(s => s.symbol).join(',');
      
      console.log(`   Batch ${Math.floor(i/50) + 1}/${Math.ceil(topStocks.length/50)} (${batch.length} stocks)...`);
      
      try {
        const quoteResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`
        );
        
        const quotes = quoteResponse.data;
        
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`   ⚠️ Could not fetch quotes for batch, using screener data`);
        detailedStocks.push(...batch);
      }
    }
    
    // Format for our application
    const formattedStocks = detailedStocks.map((stock, index) => ({
      symbol: stock.symbol,
      name: stock.companyName || stock.name || stock.symbol,
      type: 'stock',
      sector: stock.sector || 'Unknown',
      industry: stock.industry || '',
      exchange: stock.exchangeShortName || stock.exchange || '',
      country: getCountryFromExchange(stock.exchange),
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
      category: 'International',
      lastUpdated: new Date().toISOString()
    }));
    
    // Save to JSON file
    const outputFile = 'international-stocks.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedStocks, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = formattedStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
    const totalVolume = formattedStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgPrice = formattedStocks.reduce((sum, s) => sum + s.price, 0) / formattedStocks.length;
    const avgMarketCap = totalMarketCap / formattedStocks.length;
    
    console.log(`Total Stocks: ${formattedStocks.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e12).toFixed(2)} Trillion`);
    console.log(`Average Market Cap: $${(avgMarketCap / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    
    // Country breakdown
    console.log('\n🌍 Country Breakdown:');
    console.log('═══════════════════════════════════════');
    const countryCounts = {};
    formattedStocks.forEach(stock => {
      const country = stock.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([country, count]) => {
        const percentage = ((count / formattedStocks.length) * 100).toFixed(1);
        console.log(`${country.padEnd(25)} | ${count.toString().padStart(3)} stocks (${percentage}%)`);
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
        console.log(`${sector.padEnd(30)} | ${count} stocks`);
      });
    
    // Top 20 by market cap
    console.log('\n🏆 Top 20 International Stocks by Market Cap:');
    console.log('═══════════════════════════════════════');
    const sortedByMcap = [...formattedStocks]
      .filter(s => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 20);
    
    sortedByMcap.forEach((stock, i) => {
      const mcap = (stock.marketCap / 1e9).toFixed(2);
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      console.log(
        `${(i + 1).toString().padStart(2)}. ${stock.symbol.padEnd(10)} | ${stock.country.padEnd(12)} | ${stock.name.substring(0, 25).padEnd(25)} | $${mcap}B`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 300 International Stocks\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: Financial Modeling Prep API\n`;
    tsCode += `// Exchanges: ${EXCHANGES.join(', ')}\n\n`;
    tsCode += `const internationalStocks = [\n`;
    
    formattedStocks.forEach(stock => {
      tsCode += `  { symbol: '${stock.symbol}', name: '${stock.name.replace(/'/g, "\\'")}', country: '${stock.country}', exchange: '${stock.exchange}', type: 'stock', marketCap: ${stock.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default internationalStocks;\n`;
    
    fs.writeFileSync('international-stocks.ts', tsCode);
    console.log('✅ Generated international-stocks.ts');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - international-stocks.json (Full data)');
    console.log('   - international-stocks.ts (TypeScript import)');
    console.log(`\n💡 Next step: Run fetch-commodities.js for commodity assets`);
    
  } catch (error) {
    console.error('❌ Error fetching international stocks:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Helper function to map exchange to country
function getCountryFromExchange(exchange) {
  const mapping = {
    'LSE': 'United Kingdom',
    'TSX': 'Canada',
    'FRA': 'Germany',
    'EPA': 'France',
    'SHH': 'China',
    'SHZ': 'China',
    'HKG': 'Hong Kong',
    'JPX': 'Japan',
    'KRX': 'South Korea',
    'ASX': 'Australia',
    'BMV': 'Mexico',
    'BSE': 'India',
    'NSE': 'India',
    'SIX': 'Switzerland',
    'AMS': 'Netherlands',
  };
  return mapping[exchange] || 'International';
}

// Run the script
fetchInternationalStocks();
