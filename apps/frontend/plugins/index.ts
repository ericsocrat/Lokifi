'use client';

// PluginManager type is used by consumers of this module
export type { PluginManager } from './manager';

// Import all plugins
import { fibExtended } from './fibExtended';
import { parallelChannel } from './parallelChannel';
import { parallelChannel3 } from './parallelChannel3';
import { rulerMeasure } from './rulerMeasure';
import { trendlinePlus } from './trendlinePlus';

// Create namespace for plugin registration
export const plugins = {
  trendlinePlus,
  rulerMeasure,
  parallelChannel,
  fibExtended,
  parallelChannel3,
};
