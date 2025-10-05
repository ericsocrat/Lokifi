const fs = require("fs");
const path = require("path");
const INPUT_FILE = "all-assets.json";
const OUTPUT_FILE = "generated-market-data.ts";
async function generateAssetCode() {
  console.log("Generating TypeScript code...\n");
  const inputPath = path.join(__dirname, INPUT_FILE);
  if (!fs.existsSync(inputPath)) { console.error(`ERROR: ${INPUT_FILE} not found!`); process.exit(1); }
  console.log(`Reading ${INPUT_FILE}...`);
  const assets = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(assets) || assets.length === 0) { console.error(`ERROR: ${INPUT_FILE} is empty!`); process.exit(1); }
  console.log(`  Loaded ${assets.length} assets\n`);
  assets.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const statsByType = {};
  assets.forEach(asset => { statsByType[asset.type] = (statsByType[asset.type] || 0) + 1; });
  console.log("Generating code...");
  const code = [];
  code.push("// AUTO-GENERATED - DO NOT EDIT");
  code.push(`// Generated: ${new Date().toISOString()}`);
  code.push(`// Total Assets: ${assets.length}`);
  code.push("");
  code.push("export interface Asset {");
  code.push("  symbol: string;");
  code.push("  name: string;");
  code.push("  type: 'stock' | 'crypto' | 'etf' | 'commodity';");
  code.push("  price: number;");
  code.push("  change?: number;");
  code.push("  changePercent?: number;");
  code.push("  volume?: number;");
  code.push("  marketCap?: number;");
  code.push("  [key: string]: any;");
  code.push("}");
  code.push("");
  code.push("export const ALL_ASSETS: Asset[] = " + JSON.stringify(assets, null, 2) + ";");
  code.push("");
  code.push("export const MARKET_DATA_MAP: Record<string, Asset> = ALL_ASSETS.reduce((map, asset) => { map[asset.symbol] = asset; return map; }, {} as Record<string, Asset>);");
  code.push("");
  code.push("export function getAsset(symbol: string): Asset | undefined { return MARKET_DATA_MAP[symbol.toUpperCase()]; }");
  code.push("export function searchAssets(query: string): Asset[] { const lowerQuery = query.toLowerCase(); return ALL_ASSETS.filter(asset => asset.symbol.toLowerCase().includes(lowerQuery) || asset.name.toLowerCase().includes(lowerQuery)).slice(0, 50); }");
  code.push("export const ASSET_COUNT = " + assets.length + ";");
  const outputPath = path.join(__dirname, OUTPUT_FILE);
  fs.writeFileSync(outputPath, code.join("\n"), "utf8");
  console.log("SUCCESS!\n");
  console.log(`Total Assets: ${assets.length}`);
  console.log(`Lines of Code: ${code.length}`);
  console.log(`File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log("");
  for (const [type, count] of Object.entries(statsByType).sort((a, b) => b[1] - a[1])) { console.log(`  ${type}: ${count}`); }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
  console.log("\nNEXT STEPS:");
  console.log("1. Move generated-market-data.ts to frontend/src/data/");
  console.log("2. Update marketData.ts to import from it");
  console.log("3. Test with: npm run dev");
}
generateAssetCode().catch(error => { console.error("ERROR:", error.message); process.exit(1); });
