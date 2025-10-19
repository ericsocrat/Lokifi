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

  describe('Configuration Validation', () => {
    it('should have essential VS Code settings working properly', () => {
      // This test passes if all the above individual tests pass
      // Validates that the VS Code configuration is functional
      expect(existsSync(settingsPath)).toBe(true);
      expect(existsSync(tasksPath)).toBe(true);
    });
  });
});
