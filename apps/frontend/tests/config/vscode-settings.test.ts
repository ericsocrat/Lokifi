import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * VS Code Configuration Validation Tests
 *
 * Validates VS Code workspace settings for:
 * - JSON syntax correctness (JSONC format support)
 * - Required extension configurations
 * - Path mappings accuracy
 * - No deprecated settings
 */

// Helper function to parse JSONC (JSON with comments)
function parseJSONC(content: string): any {
  // Remove single-line comments
  let cleaned = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before closing brackets/braces
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(cleaned);
}

describe('VS Code Configuration', () => {
  const vscodeDir = join(process.cwd(), '.vscode');
  const settingsPath = join(vscodeDir, 'settings.json');
  const tasksPath = join(vscodeDir, 'tasks.json');
  const launchPath = join(vscodeDir, 'launch.json');
  const extensionsPath = join(vscodeDir, 'extensions.json');
  const keybindingsPath = join(vscodeDir, 'keybindings.json');

  describe('settings.json', () => {
    it('should exist and be valid JSONC', () => {
      expect(existsSync(settingsPath)).toBe(true);

      const content = readFileSync(settingsPath, 'utf-8');
      expect(() => parseJSONC(content)).not.toThrow();
    });
    it('should have proper TypeScript configuration', () => {
      const settings = parseJSONC(readFileSync(settingsPath, 'utf-8'));

      // TypeScript settings
      expect(settings['typescript.tsdk']).toBe('node_modules/typescript/lib');
      expect(settings['typescript.enablePromptUseWorkspaceTsdk']).toBe(true);
      expect(settings['typescript.preferences.importModuleSpecifier']).toBe('relative');
    });

    it('should have proper formatter configuration', () => {
      const settings = parseJSONC(readFileSync(settingsPath, 'utf-8'));

      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');

      // Language-specific formatters
      expect(settings['[typescript]']['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
      expect(settings['[typescriptreact]']['editor.defaultFormatter']).toBe(
        'esbenp.prettier-vscode'
      );
    });

    it('should have proper path mappings', () => {
      const settings = parseJSONC(readFileSync(settingsPath, 'utf-8'));

      const pathMappings = settings['path-intellisense.mappings'];
      expect(pathMappings).toBeDefined();
      expect(pathMappings['@']).toBe('${workspaceFolder}/');
      expect(pathMappings['@/components']).toBe('${workspaceFolder}/components');
      expect(pathMappings['@/lib']).toBe('${workspaceFolder}/lib');
    });

    it('should have Vitest configuration (not Jest)', () => {
      const settings = parseJSONC(readFileSync(settingsPath, 'utf-8'));

      expect(settings['vitest.enable']).toBe(true);
      expect(settings['vitest.commandLine']).toBe('npm run test');

      // Should NOT have Jest settings
      expect(settings['jest.enable']).toBeUndefined();
    });

    it('should exclude proper files and folders', () => {
      const settings = parseJSONC(readFileSync(settingsPath, 'utf-8'));

      const filesExclude = settings['files.exclude'];
      expect(filesExclude['**/.next']).toBe(true);
      expect(filesExclude['**/node_modules']).toBe(true);
      expect(filesExclude['**/coverage']).toBe(true);
      expect(filesExclude['**/.turbo']).toBe(true);
    });

    it('should not contain deprecated settings', () => {
      const content = readFileSync(settingsPath, 'utf-8');

      // Check for deprecated settings
      expect(content).not.toContain('typescript.check.npmIsInstalled');
      expect(content).not.toContain('typescript.tsc.autoDetect');
      expect(content).not.toContain('jest.enable'); // Jest removed
    });
  });

  describe('tasks.json', () => {
    it('should exist and be valid JSON', () => {
      expect(existsSync(tasksPath)).toBe(true);

      const content = readFileSync(tasksPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have correct task structure', () => {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));

      expect(tasks.version).toBe('2.0.0');
      expect(Array.isArray(tasks.tasks)).toBe(true);
      expect(tasks.tasks.length).toBeGreaterThan(0);
    });

    it('should have valid PowerShell task commands', () => {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));

      for (const task of tasks.tasks) {
        expect(task.label).toBeDefined();
        expect(task.type).toBe('shell');
        expect(task.command).toContain('pwsh');
        expect(task.command).toContain('.ps1');
      }
    });

    it('should reference existing PowerShell scripts', () => {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));

      for (const task of tasks.tasks) {
        if (task.command.includes('./start-frontend.ps1')) {
          expect(existsSync(join(process.cwd(), 'start-frontend.ps1'))).toBe(true);
        }
        if (task.command.includes('../backend/start-backend.ps1')) {
          expect(existsSync(join(process.cwd(), '..', 'backend', 'start-backend.ps1'))).toBe(true);
        }
      }
    });
  });

  describe('launch.json', () => {
    it('should exist and be valid JSON', () => {
      expect(existsSync(launchPath)).toBe(true);

      const content = readFileSync(launchPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have Next.js debug configuration', () => {
      const launch = JSON.parse(readFileSync(launchPath, 'utf-8'));

      expect(launch.version).toBe('0.2.0');
      expect(Array.isArray(launch.configurations)).toBe(true);

      const nextConfig = launch.configurations.find(
        (config: any) => config.name.includes('Frontend') || config.name.includes('Next.js')
      );
      expect(nextConfig).toBeDefined();
      expect(nextConfig.type).toBe('node');
    });
  });

  describe('extensions.json', () => {
    it('should exist and be valid JSON', () => {
      expect(existsSync(extensionsPath)).toBe(true);

      const content = readFileSync(extensionsPath, 'utf-8');
      expect(() => parseJSONC(content)).not.toThrow();
    });

    it('should recommend essential development extensions', () => {
      const extensions = parseJSONC(readFileSync(extensionsPath, 'utf-8'));

      expect(Array.isArray(extensions.recommendations)).toBe(true);

      // Should include essential extensions
      const recs = extensions.recommendations;
      expect(recs.some((ext: string) => ext.includes('prettier'))).toBe(true);
      expect(recs.some((ext: string) => ext.includes('eslint'))).toBe(true);
      expect(recs.some((ext: string) => ext.includes('tailwindcss'))).toBe(true);
      expect(recs.some((ext: string) => ext.includes('vitest'))).toBe(true);
    });
  });

  describe('keybindings.json', () => {
    it('should exist and be valid JSONC array', () => {
      expect(existsSync(keybindingsPath)).toBe(true);

      const content = readFileSync(keybindingsPath, 'utf-8');
      const bindings = parseJSONC(content);
      expect(Array.isArray(bindings)).toBe(true);
    });

    it('should have frontend-specific keybindings', () => {
      const bindings = parseJSONC(readFileSync(keybindingsPath, 'utf-8'));

      // Should have task and debug shortcuts
      expect(
        bindings.some((binding: any) => binding.command === 'workbench.action.tasks.runTask')
      ).toBe(true);

      expect(bindings.some((binding: any) => binding.command === 'vitest.run')).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should have complete VS Code workspace setup', () => {
      // Validates that all essential VS Code configuration files exist
      expect(existsSync(settingsPath)).toBe(true);
      expect(existsSync(tasksPath)).toBe(true);
      expect(existsSync(launchPath)).toBe(true);
      expect(existsSync(extensionsPath)).toBe(true);
      expect(existsSync(keybindingsPath)).toBe(true);
    });
  });
});
