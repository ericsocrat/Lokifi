const axios = require("axios");
const fs = require("fs");
const FINNHUB_API_KEY = "d38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0";

const SYMBOLS = [
  // European Leaders (20)
  "SAP","ASML","LVMH.PA","NVO","OR.PA","ROG.SW","SHEL","TTE","BP","ULVR.L",
  "HSBA.L","GSK.L","AZN.L","DGE.L","NESN.SW","SIE.DE","NOVN.SW","MC.PA",
  "AIR.PA","BN.PA",
  // Asian Tech (20)
  "TSM","BABA","9988.HK","700.HK","BIDU","JD","PDD","TME","BILI","IQ",
  "NTES","SE","GRAB","BEKE","LI","XPEV","NIO","BYD","YUMC","BEKE",
  // Japanese Companies (15)
  "SNE","TM","HMC","NSANY","NTDOY","FUJHY","MUFG","SMFG","MFG","HTHIY",
  "PCRFY","DSCSY","OTCMKTS:SNEJF","OTCMKTS:CANNY","OTCMKTS:SMFG",
  // Latin America (10)
  "VALE","PBR","ITUB","BBD","MELI","NU","VIST","ABEV","SQM","GGAL",
  // Other Emerging (10)
  "IBN","INFY","WIT","HDB","SIFY","YTRA","RDY","TCOM","VIPS","EDU",
  // European Mid-Caps (15)
  "BMW.DE","DAI.DE","VOW3.DE","SAF.PA","SU.PA","TEF","TEF.MC","INGA.AS",
  "ABN.AS","MT","ENEL.MI","UCG.MI","ISP.MI","BBVA","SAN"
];

async function fetchInternational() {
  console.log(`Starting fetch of ${SYMBOLS.length} international stocks...`);
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
      if (i % 20 === 0) {
        console.log(`Progress: ${i}/${SYMBOLS.length} (${results.length} successful)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1050));
      
    } catch (error) {
      console.log(`Error fetching ${sym}: ${error.message}`);
      i++;
    }
  }
  
  fs.writeFileSync("international-stocks-new.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} international stocks saved to international-stocks-new.json`);
}

fetchInternational();
