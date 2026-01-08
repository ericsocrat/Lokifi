import { createLogger, sanitizeLogInput } from '@/lib/utils/logger';

const logger = createLogger('PortfolioStorage');

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
    logger.error('Error loading portfolio', { error: sanitizeLogInput(error) });
  }

  return [];
}

// Save portfolio to localStorage
export function savePortfolio(sections: PortfolioSection[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('portfolio', JSON.stringify(sections));
  } catch (error) {
    logger.error('Error saving portfolio', { error: sanitizeLogInput(error) });
  }
}

// Add assets to a section
export function addAssets(sectionTitle: string, assets: Asset[]): void {
  const sections = loadPortfolio();
  const sectionIndex = sections.findIndex((s: PortfolioSection) => s.title === sectionTitle);

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
  const section = sections.find((s: PortfolioSection) => s.title === sectionTitle);

  if (section) {
    section.assets = section.assets.filter((a: Asset) => a.id !== assetId);
    savePortfolio(sections);
  }
}

// Calculate total portfolio value
export function totalValue(): number {
  const sections = loadPortfolio();
  return sections.reduce((total: number, section: PortfolioSection) => {
    return total + section.assets.reduce((sum: number, asset: Asset) => sum + asset.value, 0);
  }, 0);
}

