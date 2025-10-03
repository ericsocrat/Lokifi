export interface StoredAsset {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'metal';
  shares: number;
  value: number;
}
export interface PortfolioSection {
  id: string;
  name: string;
  assets: StoredAsset[];
}
export interface PortfolioDataV2 {
  version: 2;
  sections: PortfolioSection[];
  updatedAt: number;
}
const KEY_V2 = 'portfolio.v2';
export function loadPortfolio(): PortfolioDataV2 {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    const legacy = localStorage.getItem('portfolioAssets');
    if (legacy) {
      const assets: StoredAsset[] = JSON.parse(legacy);
      const migrated: PortfolioDataV2 = {
        version: 2,
        sections: [{ id: 'section-1', name: 'Section 1', assets }],
        updatedAt: Date.now(),
      };
      savePortfolio(migrated);
      return migrated;
    }
  } catch {}
  const empty: PortfolioDataV2 = {
    version: 2,
    sections: [{ id: 'section-1', name: 'Section 1', assets: [] }],
    updatedAt: Date.now(),
  };
  savePortfolio(empty);
  return empty;
}
export function savePortfolio(data: PortfolioDataV2) {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify({ ...data, updatedAt: Date.now() }));
  } catch {}
}
export function addSection(name?: string) {
  const data = loadPortfolio();
  const idx = data.sections.length + 1;
  data.sections.push({ id: `section-${idx}`, name: name || `Section ${idx}`, assets: [] });
  savePortfolio(data);
  return data;
}
export function addAssets(assets: Omit<StoredAsset, 'id'>[], sectionId?: string) {
  const data = loadPortfolio();
  const section =
    data.sections.find((s) => s.id === (sectionId || data.sections[0].id)) || data.sections[0];
  assets.forEach((a) =>
    section.assets.push({
      ...a,
      id: `${a.symbol}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
  );
  savePortfolio(data);
  return data;
}
export function deleteAsset(id: string) {
  const data = loadPortfolio();
  data.sections.forEach((s) => (s.assets = s.assets.filter((a) => a.id !== id)));
  savePortfolio(data);
  return data;
}
export function totalValue(d?: PortfolioDataV2) {
  const data = d || loadPortfolio();
  return data.sections.reduce((sum, s) => sum + s.assets.reduce((s2, a) => s2 + a.value, 0), 0);
}
