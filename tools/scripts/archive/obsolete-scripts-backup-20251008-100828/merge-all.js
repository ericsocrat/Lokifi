const fs = require("fs");
const path = require("path");
const INPUT_FILES = ["top-270-cryptos.json", "largecap-stocks.json", "midcap-stocks.json", "smallcap-stocks.json", "international-stocks.json"];
const OUTPUT_FILE = "all-assets.json";
const stats = {totalAssets:0, byType:{}, filesProcessed:0, filesSkipped:0, duplicates:0};
async function mergeAllAssets() {
  console.log("Merging all asset files...\n");
  const allAssets = [];
  const seenSymbols = new Set();
  for (const filename of INPUT_FILES) {
    const filepath = path.join(__dirname, filename);
    if (!fs.existsSync(filepath)) { console.log(`Warning: ${filename} - Skipping`); stats.filesSkipped++; continue; }
    console.log(`Reading ${filename}...`);
    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
    if (!Array.isArray(data) || data.length === 0) { console.log(`  Empty file\n`); stats.filesSkipped++; continue; }
    let addedCount = 0;
    for (const asset of data) {
      if (!asset.symbol || !asset.name || !asset.type) continue;
      const key = `${asset.symbol}-${asset.type}`;
      if (seenSymbols.has(key)) { stats.duplicates++; continue; }
      seenSymbols.add(key);
      allAssets.push(asset);
      addedCount++;
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
    }
    console.log(`  Added ${addedCount} assets\n`);
    stats.filesProcessed++;
  }
  allAssets.sort((a, b) => { if (a.type !== b.type) return a.type.localeCompare(b.type); return a.symbol.localeCompare(b.symbol); });
  stats.totalAssets = allAssets.length;
  const outputPath = path.join(__dirname, OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(allAssets, null, 2), "utf8");
  console.log("SUCCESS!\n");
  console.log(`Total Assets: ${stats.totalAssets}`);
  console.log(`Files Processed: ${stats.filesProcessed}`);
  console.log(`Files Skipped: ${stats.filesSkipped}`);
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) { console.log(`  ${type}: ${count}`); }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
  console.log(`Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log("\nNEXT: node generate-asset-code.js");
}
mergeAllAssets().catch(error => { console.error("ERROR:", error.message); process.exit(1); });
