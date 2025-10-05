const axios = require("axios");
const fs = require("fs");
const FINNHUB_API_KEY = "d38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0";

const SYMBOLS = [
  // Biotech & Healthcare Small-Caps (25)
  "SAVA","CRNC","SMMT","KRTX","IONS","RARE","FOLD","CRSP","NTLA","EDIT",
  "BEAM","BLUE","FATE","VERV","SYRS","BBIO","VCYT","BMRN","INCY","ACAD",
  "ARVN","ARWR","MDGL","SRPT","MGNX",
  // Tech Small-Caps (25)
  "SOUN","BBAI","IONQ","PATH","BBBY","AI","CPNG","PTON","OUST","LAZR",
  "VLDR","LIDR","AEVA","INVZ","MVST","GOEV","WKHS","RIDE","FSR","LEV",
  "HYLN","SOLO","AYRO","GEV","ENVX",
  // Energy Small-Caps (15)
  "TELL","FCEL","PLUG","BE","CLNE","AMTX","GEVO","REI","RIG","VAL",
  "PBF","DK","VLO","MPC","PSX",
  // Consumer Small-Caps (15)
  "BYND","TTCF","APPH","PTLO","LFVN","REAL","SEED","HAIN","NOMD","BGS",
  "CALM","FARM","VITL","GRUB","UBER",
  // Financial Small-Caps (10)
  "OPFI","DAVE","AVAL","NU","PAGS","STNE","MELI","GLOB","VIRT","IBKR",
  // REITs Small-Caps (10)
  "CORR","MITT","NRZ","PMT","TWO","CIM","AGNC","NLY","STWD","BXMT"
];

async function fetchSmallcaps() {
  console.log(`Starting fetch of ${SYMBOLS.length} small-cap stocks...`);
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
  
  fs.writeFileSync("smallcap-stocks-new.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} small-cap stocks saved to smallcap-stocks-new.json`);
}

fetchSmallcaps();
