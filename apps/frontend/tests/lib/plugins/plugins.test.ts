import {
  getHooks,
  listPlugins,
  registerPlugin,
  setPluginEnabled,
  unregisterPlugin,
  type PluginHooks,
  type PluginMeta,
} from '@/lib/plugins/plugins';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Plugin Registry', () => {
  // Clear registry between tests by unregistering all plugins
  beforeEach(() => {
    const plugins = listPlugins();
    plugins.forEach((p) => unregisterPlugin(p.meta.id));
  });

  describe('registerPlugin', () => {
    it('should register a plugin with meta and hooks', () => {
      const meta: PluginMeta = {
        id: 'test-plugin',
        name: 'Test Plugin',
        description: 'A test plugin',
        version: '1.0.0',
      };
      const hooks: PluginHooks = {};

      registerPlugin(meta, hooks);

      const plugins = listPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].meta.id).toBe('test-plugin');
    });

    it('should register plugin with permissions', () => {
      const meta: PluginMeta = {
        id: 'permission-plugin',
        name: 'Permission Plugin',
        permissions: ['read', 'write', 'draw'],
      };
      const hooks: PluginHooks = {};

      registerPlugin(meta, hooks);

      const plugins = listPlugins();
      expect(plugins[0].meta.permissions).toEqual(['read', 'write', 'draw']);
    });

    it('should register plugin with settings', () => {
      const meta: PluginMeta = {
        id: 'settings-plugin',
        name: 'Settings Plugin',
        settings: { color: 'blue', lineWidth: 2 },
      };
      const hooks: PluginHooks = {};

      registerPlugin(meta, hooks);

      const plugins = listPlugins();
      expect(plugins[0].meta.settings).toEqual({ color: 'blue', lineWidth: 2 });
    });

    it('should throw error when registering duplicate plugin', () => {
      const meta: PluginMeta = { id: 'duplicate', name: 'Duplicate' };
      const hooks: PluginHooks = {};

      registerPlugin(meta, hooks);

      expect(() => registerPlugin(meta, hooks)).toThrow('Plugin duplicate already registered');
    });

    it('should register plugin as enabled by default', () => {
      const meta: PluginMeta = { id: 'enabled-plugin', name: 'Enabled Plugin' };
      const hooks: PluginHooks = {};

      registerPlugin(meta, hooks);

      const plugins = listPlugins();
      expect(plugins[0].enabled).toBe(true);
    });

    it('should register plugin with hooks', () => {
      const onSelect = () => {};
      const onAlert = () => {};
      const meta: PluginMeta = { id: 'hooks-plugin', name: 'Hooks Plugin' };
      const hooks: PluginHooks = { onSelect, onAlert };

      registerPlugin(meta, hooks);

      const plugins = listPlugins();
      expect(plugins[0].hooks.onSelect).toBe(onSelect);
      expect(plugins[0].hooks.onAlert).toBe(onAlert);
    });
  });

  describe('unregisterPlugin', () => {
    it('should remove a registered plugin', () => {
      const meta: PluginMeta = { id: 'remove-me', name: 'Remove Me' };
      registerPlugin(meta, {});

      expect(listPlugins()).toHaveLength(1);

      unregisterPlugin('remove-me');

      expect(listPlugins()).toHaveLength(0);
    });

    it('should handle unregistering non-existent plugin', () => {
      // Should not throw
      expect(() => unregisterPlugin('non-existent')).not.toThrow();
    });
  });

  describe('listPlugins', () => {
    it('should return empty array when no plugins registered', () => {
      expect(listPlugins()).toEqual([]);
    });

    it('should return all registered plugins', () => {
      registerPlugin({ id: 'plugin-1', name: 'Plugin 1' }, {});
      registerPlugin({ id: 'plugin-2', name: 'Plugin 2' }, {});
      registerPlugin({ id: 'plugin-3', name: 'Plugin 3' }, {});

      const plugins = listPlugins();
      expect(plugins).toHaveLength(3);
      expect(plugins.map((p) => p.meta.id)).toEqual(['plugin-1', 'plugin-2', 'plugin-3']);
    });
  });

  describe('setPluginEnabled', () => {
    it('should disable an enabled plugin', () => {
      registerPlugin({ id: 'toggle-plugin', name: 'Toggle Plugin' }, {});

      setPluginEnabled('toggle-plugin', false);

      const plugins = listPlugins();
      expect(plugins[0].enabled).toBe(false);
    });

    it('should enable a disabled plugin', () => {
      registerPlugin({ id: 'enable-plugin', name: 'Enable Plugin' }, {});
      setPluginEnabled('enable-plugin', false);

      setPluginEnabled('enable-plugin', true);

      const plugins = listPlugins();
      expect(plugins[0].enabled).toBe(true);
    });

    it('should handle setting enabled on non-existent plugin', () => {
      // Should not throw
      expect(() => setPluginEnabled('non-existent', true)).not.toThrow();
    });
  });

  describe('getHooks', () => {
    it('should return empty array when no plugins registered', () => {
      expect(getHooks()).toEqual([]);
    });

    it('should return hooks from enabled plugins only', () => {
      const hooks1: PluginHooks = { onSelect: () => {} };
      const hooks2: PluginHooks = { onAlert: () => {} };
      const hooks3: PluginHooks = { onSelect: () => {} };

      registerPlugin({ id: 'p1', name: 'P1' }, hooks1);
      registerPlugin({ id: 'p2', name: 'P2' }, hooks2);
      registerPlugin({ id: 'p3', name: 'P3' }, hooks3);

      // Disable p2
      setPluginEnabled('p2', false);

      const allHooks = getHooks();
      expect(allHooks).toHaveLength(2);
      expect(allHooks).toContain(hooks1);
      expect(allHooks).toContain(hooks3);
      expect(allHooks).not.toContain(hooks2);
    });

    it('should return all hooks when all plugins enabled', () => {
      registerPlugin({ id: 'e1', name: 'E1' }, { onSelect: () => {} });
      registerPlugin({ id: 'e2', name: 'E2' }, { onAlert: () => {} });

      const allHooks = getHooks();
      expect(allHooks).toHaveLength(2);
    });

    it('should return empty array when all plugins disabled', () => {
      registerPlugin({ id: 'd1', name: 'D1' }, { onSelect: () => {} });
      registerPlugin({ id: 'd2', name: 'D2' }, { onAlert: () => {} });

      setPluginEnabled('d1', false);
      setPluginEnabled('d2', false);

      expect(getHooks()).toEqual([]);
    });
  });

  describe('PluginHooks Types', () => {
    it('should support onContextMenu hook', () => {
      const contextMenuHook: PluginHooks = {
        onContextMenu: ({ selection, add }) => {
          add([{ label: 'Test Action', action: () => {} }]);
        },
      };

      registerPlugin({ id: 'context-plugin', name: 'Context Plugin' }, contextMenuHook);

      const plugins = listPlugins();
      expect(plugins[0].hooks.onContextMenu).toBeDefined();
    });
  });
});
