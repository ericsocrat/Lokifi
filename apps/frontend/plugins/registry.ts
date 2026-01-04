'use client';

import { plugins } from './index';
import { pluginManager } from './manager';
import type { LokifiPlugin } from './types';

// Register all plugins
Object.values(plugins).forEach((plugin: LokifiPlugin) => pluginManager.register(plugin));

export { pluginManager };
