
"use client";

// Import manager type
import type { PluginManager } from "./manager";

// Import all plugins
import { trendlinePlus } from "./trendlinePlus";
import { rulerMeasure } from "./rulerMeasure";
import { parallelChannel } from "./parallelChannel";
import { fibExtended } from "./fibExtended";
import { parallelChannel3 } from "./parallelChannel3";

// Create namespace for plugin registration
export const plugins = {
  trendlinePlus,
  rulerMeasure,
  parallelChannel,
  fibExtended,
  parallelChannel3
};

