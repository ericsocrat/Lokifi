const axios = require("axios");
const fs = require("fs");
const FINNHUB_API_KEY = "d38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0";

const SYMBOLS = [
  // Popular ETFs - More Sectors & Themes (40)
  "XLK","XLV","XLY","XLP","XLU","XLI","XLRE","XLE","XLF","XLC",
  "VGT","VHT","VCR","VDC","VPU","VIS","VNQ","VDE","VFH","VOX",
  "QQQ","DIA","SPY","VTI","VOO","SCHD","SPHD","SPYD","DVY","HDV",
  "ARKK","ARKG","ARKW","ARKF","ARKQ","QQQJ","QQQM","SOXX","XSD","SMH",
  
  // Commodity & Materials ETFs (15)
  "GLD","SLV","GDX","GDXJ","USO","UNG","DBA","DBC","CORN","WEAT",
  "SOYB","CPER","URA","REMX","PALL",
  
  // Bond & Fixed Income ETFs (15)
  "AGG","BND","BNDX","VCIT","VCSH","SHY","IEI","IEF","MBB","VMBS",
  "HYG","JNK","EMB","PCY","BNDW",
  
  // International & Emerging Markets (20)
  "INDA","FXI","KWEB","MCHI","ASHR","EWJ","EWY","EWZ","EWW","EWC",
  "EWG","EWU","EWT","EWH","THD","RSX","ERUS","TUR","EZA","EPOL",
  
  // Commodities - Mining & Energy Companies (25)
  "FCX","NEM","GOLD","AEM","WPM","FNV","SCCO","TECK","HBM","CDE",
  "AG","PAAS","HL","EGO","KGC","SLW","OR","BTG","IAG","NGD",
  "CLF","STLD","NUE","RS","X",
  
  // REITs - Specialized (20)
  "PLD","AMT","CCI","EQIX","DLR","SBAC","PSA","WELL","O","VTR",
  "INVH","EXR","CUBE","LSI","KIM","REG","FRT","BXP","VNO","SLG",
  
  // Consumer Defensive - Essentials (15)
  "PG","KO","PEP","WMT","COST","TGT","KR","SYY","MDLZ","GIS",
  "K","CPB","CAG","HSY","MKC",
  
  // Healthcare - Pharma & Equipment (15)
  "JNJ","PFE","MRK","ABBV","LLY","GILD","REGN","VRTX","BIIB","AMGN",
  "CVS","CI","UNH","HUM","ANTM",
  
  // Financial Services - Diversified (15)
  "V","MA","AXP","PYPL","SQ","BLK","SCHW","MS","GS","SPGI",
  "MCO","CME","ICE","NDAQ","CBOE"
];

console.log(`🚀 Fetching ${SYMBOLS.length} Phase 2B stocks...`);

async function fetchPhase2B() {
  const results = [];
  let i = 0;
  
  for (const sym of SYMBOLS) {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_API_KEY}`
      );
      
      if (response.data.c && response.data.c > 0) {
        results.push({
          symbol: sym,
          name: sym,
          type: "stock",
          price: response.data.c,
          change: response.data.d || 0,
          changePercent: response.data.dp || 0,
          volume: 0,
          marketCap: 0,
          high24h: response.data.h || response.data.c,
          low24h: response.data.l || response.data.c,
          previousClose: response.data.pc || response.data.c
        });
      }
      
      i++;
      if (i % 25 === 0) {
        console.log(`Progress: ${i}/${SYMBOLS.length} (${results.length} successful)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1050));
      
    } catch (error) {
      console.log(`Error ${sym}: ${error.message}`);
      i++;
    }
  }
  
  fs.writeFileSync("phase2b-stocks.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} stocks saved to phase2b-stocks.json`);
}

fetchPhase2B();
