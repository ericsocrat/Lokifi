/**
 * Asset and Investment type definitions
 */

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  value: number;
  change: number;
}

export interface SelectedAsset {
  name: string;
  symbol: string;
}

export interface AddAssetModalState {
  show: boolean;
  step: 'stocks' | 'metals' | 'quantity';
  selectedItems: SelectedAsset[];
}
