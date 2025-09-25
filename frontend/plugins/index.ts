
"use client";
import { pluginManager } from "./manager";
import { trendlinePlus } from "./trendlinePlus";

// Register built-in plugins here
pluginManager.register(trendlinePlus);

export { pluginManager };

import { rulerMeasure } from "./rulerMeasure";
import { parallelChannel } from "./parallelChannel";
import { fibExtended } from "./fibExtended";

pluginManager.register(rulerMeasure);
pluginManager.register(parallelChannel);
pluginManager.register(fibExtended);

import { parallelChannel3 } from "./parallelChannel3";
pluginManager.register(parallelChannel3);
