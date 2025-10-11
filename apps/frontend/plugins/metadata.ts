import type { LokifiPlugin } from './types';

export interface PluginMetadata extends LokifiPlugin {
    name: string;
    description?: string;
    defaults: Record<string, any>;
}

export function getPluginMetadata(plugin: LokifiPlugin): PluginMetadata {
    return {
        ...plugin,
        name: plugin.label || plugin.id,
        description: '',
        defaults: {}
    };
}

