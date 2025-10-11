import type { FynixPlugin } from './types';

export interface PluginMetadata extends FynixPlugin {
    name: string;
    description?: string;
    defaults: Record<string, any>;
}

export function getPluginMetadata(plugin: FynixPlugin): PluginMetadata {
    return {
        ...plugin,
        name: plugin.label || plugin.id,
        description: '',
        defaults: {}
    };
}
