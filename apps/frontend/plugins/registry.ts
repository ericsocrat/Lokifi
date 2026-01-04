"use client";

import type { LokifiPlugin } from "./types";
import { pluginManager } from "./manager";
import { plugins } from "./index";

// Register all plugins
Object.values(plugins).forEach((plugin: LokifiPlugin) => pluginManager.register(plugin));

export { pluginManager };
