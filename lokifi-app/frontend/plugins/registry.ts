"use client";

import { pluginManager } from "./manager";
import { plugins } from "./index";

// Register all plugins
Object.values(plugins).forEach((plugin: any) => pluginManager.register(plugin));

export { pluginManager };