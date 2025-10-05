const axios = require("axios");
const fs = require("fs");
const FINNHUB_API_KEY = "d38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0";

const SYMBOLS = [
  // Regional Banks (20)
  "USB","PNC","TFC","MTB","FITB","KEY","RF","CFG","HBAN","EWBC",
  "ZION","SNV","CMA","FCNCA","FHN","ONB","UBSI","WTFC","CBSH","UMBF",
  // Mid-Cap Tech (30)
  "DKNG","RBLX","HOOD","SOFI","AFRM","UPST","BMBL","MTCH","PINS","TWLO",
  "DOCU","ZM","OKTA","MDB","TEAM","WDAY","SPLK","HUBS","ZI","ESTC",
  "CFLT","BILL","SMAR","PCTY","PAYC","WEX","GPN","JKHY","FOUR","EVTC",
  // Mid-Cap Healthcare (20)
  "EXAS","PODD","DXCM","TDOC","VEEV","CERN","HOLX","ALGN","TECH","HSIC",
  "IDXX","EW","STE","BAX","BDX","ZBH","RMD","ISRG","SYK","BSX",
  // Mid-Cap Consumer (20)
  "DPZ","WING","TXRH","CBRL","BLMN","CAKE","DENN","JACK","PLAY","SHAK",
  "CMG","CAVA","BROS","DUTCH","PZZA","QSR","WEN","MCD","YUM","DRI",
  // Mid-Cap Industrials (20)
  "CARR","OTIS","AOS","BLDR","FLS","VMI","MLI","FELE","ATKR","CR",
  "DOV","EMR","ITW","PH","ROK","SWK","TT","XYL","ROP","IEX",
  // Mid-Cap Energy (15)
  "APA","DVN","EQT","MRO","HES","CHRD","AR","CTRA","SM","MGY",
  "FANG","OVV","PR","RRC","MTDR",
  // Mid-Cap Materials (15)
  "ALB","CE","FMC","MP","LAD","UFPI","TREX","SUM","AZEK","WY",
  "IP","PKG","SEE","AVY","BALL",
  // Mid-Cap REITs (10)
  "AVB","EQR","ESS","MAA","UDR","CPT","AIV","ELS","SUI","CSR"
];

async function fetchMidcaps() {
  console.log(`Starting fetch of ${SYMBOLS.length} mid-cap stocks...`);
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
  
  fs.writeFileSync("midcap-stocks.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} mid-cap stocks saved to midcap-stocks.json`);
}

fetchMidcaps();
