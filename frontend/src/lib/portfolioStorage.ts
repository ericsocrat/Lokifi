export interface Asset {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  value: number;
  change: number;
}

export interface PortfolioSection {
  title: string;
  assets: Asset[];
}

// Load portfolio from localStorage
export function loadPortfolio(): PortfolioSection[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('portfolio');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading portfolio:', error);
  }
  
  return [];
}

// Save portfolio to localStorage
export function savePortfolio(sections: PortfolioSection[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('portfolio', JSON.stringify(sections));
  } catch (error) {
    console.error('Error saving portfolio:', error);
  }
}

// Add assets to a section
export function addAssets(sectionTitle: string, assets: Asset[]): void {
  const sections = loadPortfolio();
  const sectionIndex = sections.findIndex(s => s.title === sectionTitle);
  
  if (sectionIndex >= 0) {
    sections[sectionIndex].assets.push(...assets);
  } else {
    sections.push({ title: sectionTitle, assets });
  }
  
  savePortfolio(sections);
}

// Add a new section
export function addSection(section: PortfolioSection): void {
  const sections = loadPortfolio();
  sections.push(section);
  savePortfolio(sections);
}

// Delete an asset
export function deleteAsset(sectionTitle: string, assetId: string): void {
  const sections = loadPortfolio();
  const section = sections.find((s: any) => s.title === sectionTitle);
  
  if (section) {
    section.assets = section.assets.filter((a: any) => a.id !== assetId);
    savePortfolio(sections);
  }
}

// Calculate total portfolio value
export function totalValue(): number {
  const sections = loadPortfolio();
  return sections.reduce((total: any, section: any) => {
    return total + section.assets.reduce((sum, asset) => sum + asset.value, 0);
  }, 0);
}
