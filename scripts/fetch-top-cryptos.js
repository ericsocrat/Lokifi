/**
 * Fetch Top 270 Cryptocurrencies by Market Cap
 * Uses CoinGecko API (no authentication required)
 * 
 * Run: node fetch-top-cryptos.js
 * Output: top-270-cryptos.json
 */

const axios = require('axios');
const fs = require('fs');

async function fetchTop270Cryptos() {
  console.log('🚀 Fetching top 270 cryptocurrencies by market cap from CoinGecko...\n');
  
  try {
    const allCryptos = [];
    
    // Fetch page 1 (250 cryptos - CoinGecko max per page)
    console.log('📡 Fetching page 1 (rank 1-250)...');
    const page1Response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        }
      }
    );
    allCryptos.push(...page1Response.data);
    console.log(`✅ Fetched ${page1Response.data.length} cryptos from page 1`);
    
    // Wait 1 second to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch page 2 (next 20 cryptos for total of 270)
    console.log('📡 Fetching page 2 (rank 251-270)...');
    const page2Response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 20,
          page: 2,
          sparkline: false,
          price_change_percentage: '24h'
        }
      }
    );
    allCryptos.push(...page2Response.data);
    console.log(`✅ Fetched ${page2Response.data.length} cryptos from page 2`);
    
    console.log(`\n✅ Total cryptos fetched: ${allCryptos.length}`);
    
    // Format for our application
    const formattedCryptos = allCryptos.map((crypto, index) => {
      // Handle symbols with special characters or very long names
      const symbol = crypto.symbol ? crypto.symbol.toUpperCase() : `CRYPTO${index + 1}`;
      const name = crypto.name || 'Unknown Crypto';
      
      return {
        symbol: symbol,
        name: name,
        id: crypto.id, // CoinGecko ID for API calls
        type: 'crypto',
        price: crypto.current_price || 0,
        change: crypto.price_change_24h || 0,
        changePercent: crypto.price_change_percentage_24h || 0,
        volume: crypto.total_volume || 0,
        marketCap: crypto.market_cap || 0,
        high24h: crypto.high_24h || crypto.current_price || 0,
        low24h: crypto.low_24h || crypto.current_price || 0,
        circulatingSupply: crypto.circulating_supply || 0,
        totalSupply: crypto.total_supply || 0,
        maxSupply: crypto.max_supply || 0,
        rank: index + 1,
        ath: crypto.ath || 0,
        athDate: crypto.ath_date || null,
        lastUpdated: crypto.last_updated || new Date().toISOString()
      };
    });
    
    // Save to JSON file
    const outputFile = 'top-270-cryptos.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedCryptos, null, 2));
    console.log(`\n💾 Saved to ${outputFile}`);
    
    // Generate summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log('═══════════════════════════════════════');
    
    const totalMarketCap = formattedCryptos.reduce((sum, c) => sum + c.marketCap, 0);
    const totalVolume24h = formattedCryptos.reduce((sum, c) => sum + c.volume, 0);
    const avgPrice = formattedCryptos.reduce((sum, c) => sum + c.price, 0) / formattedCryptos.length;
    
    console.log(`Total Cryptos: ${formattedCryptos.length}`);
    console.log(`Total Market Cap: $${(totalMarketCap / 1e12).toFixed(2)} Trillion`);
    console.log(`Total 24h Volume: $${(totalVolume24h / 1e9).toFixed(2)} Billion`);
    console.log(`Average Price: $${avgPrice.toFixed(2)}`);
    
    // Top 10 by market cap
    console.log('\n🏆 Top 10 Cryptocurrencies:');
    console.log('═══════════════════════════════════════');
    formattedCryptos.slice(0, 10).forEach((crypto, i) => {
      const mcap = (crypto.marketCap / 1e9).toFixed(2);
      const changeSign = crypto.changePercent >= 0 ? '+' : '';
      console.log(
        `${i + 1}. ${crypto.symbol.padEnd(6)} | ${crypto.name.padEnd(20)} | $${mcap}B | ${changeSign}${crypto.changePercent.toFixed(2)}%`
      );
    });
    
    // Bottom 10 (rank 261-270)
    console.log('\n📉 Bottom 10 (Rank 261-270):');
    console.log('═══════════════════════════════════════');
    formattedCryptos.slice(-10).forEach((crypto, i) => {
      const mcap = (crypto.marketCap / 1e6).toFixed(2);
      const changeSign = crypto.changePercent >= 0 ? '+' : '';
      console.log(
        `${261 + i}. ${crypto.symbol.padEnd(6)} | ${crypto.name.padEnd(20)} | $${mcap}M | ${changeSign}${crypto.changePercent.toFixed(2)}%`
      );
    });
    
    // Generate TypeScript code snippet
    console.log('\n📝 Generating TypeScript code snippet...');
    let tsCode = `// Top 270 Cryptocurrencies by Market Cap\n`;
    tsCode += `// Generated: ${new Date().toISOString()}\n`;
    tsCode += `// Source: CoinGecko API\n\n`;
    tsCode += `const top270Cryptos = [\n`;
    
    formattedCryptos.forEach(crypto => {
      tsCode += `  { symbol: '${crypto.symbol}', name: '${crypto.name}', id: '${crypto.id}', type: 'crypto', marketCap: ${crypto.marketCap} },\n`;
    });
    
    tsCode += `];\n\nexport default top270Cryptos;\n`;
    
    fs.writeFileSync('top-270-cryptos.ts', tsCode);
    console.log('✅ Generated top-270-cryptos.ts');
    
    // Create symbol mapping for CoinGecko API calls
    const symbolMapping = {};
    formattedCryptos.forEach(crypto => {
      symbolMapping[crypto.symbol] = crypto.id;
    });
    
    fs.writeFileSync('coingecko-symbol-mapping.json', JSON.stringify(symbolMapping, null, 2));
    console.log('✅ Generated coingecko-symbol-mapping.json');
    
    console.log('\n🎉 Success! Files created:');
    console.log('   - top-270-cryptos.json (Full data)');
    console.log('   - top-270-cryptos.ts (TypeScript import)');
    console.log('   - coingecko-symbol-mapping.json (For API calls)');
    console.log('\n💡 Next step: Import these files into your frontend/src/data/assets/ folder');
    
  } catch (error) {
    console.error('❌ Error fetching crypto data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
fetchTop270Cryptos();
