"use client";

import { pluginManager } from "./manager";
import { plugins } from "./index";

// Register all plugins
Object.values(plugins).forEach(plugin => pluginManager.register(plugin));

export { pluginManager };