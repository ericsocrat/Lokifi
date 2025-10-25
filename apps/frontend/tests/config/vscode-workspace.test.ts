import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Helper function to parse JSONC (JSON with Comments)
function parseJSONC(content: string): any {
  // Remove single-line comments
  let cleaned = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before closing brackets/braces
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(cleaned);
}

describe('VS Code Workspace Integration', () => {
  // Note: .vscode is at repository root, not in apps/frontend/
  const vscodeDir = join(process.cwd(), '..', '..', '.vscode');

  describe('Configuration Files Exist', () => {
    const requiredConfigs = [
      'settings.json',
      'extensions.json',
      'launch.json',
      'tasks.json',
      'keybindings.json',
    ];

    requiredConfigs.forEach((config) => {
      it(`should have ${config}`, () => {
        const configPath = join(vscodeDir, config);
        expect(existsSync(configPath)).toBe(true);
      });
    });
  });

  describe('Extensions Configuration', () => {
    it('should have valid extensions.json', () => {
      const extensionsPath = join(vscodeDir, 'extensions.json');
      const content = readFileSync(extensionsPath, 'utf-8');
      const config = parseJSONC(content);

      expect(config.recommendations).toBeDefined();
      expect(Array.isArray(config.recommendations)).toBe(true);
      expect(config.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend essential frontend extensions', () => {
      const extensionsPath = join(vscodeDir, 'extensions.json');
      const content = readFileSync(extensionsPath, 'utf-8');
      const config = parseJSONC(content);

      const essentialExtensions = [
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint',
        'bradlc.vscode-tailwindcss',
        'vitest.explorer',
      ];

      essentialExtensions.forEach((ext) => {
        expect(config.recommendations).toContain(ext);
      });
    });

    it('should NOT recommend Jest extension (using Vitest)', () => {
      const extensionsPath = join(vscodeDir, 'extensions.json');
      const content = readFileSync(extensionsPath, 'utf-8');
      const config = parseJSONC(content);

      expect(config.recommendations).not.toContain('orta.vscode-jest');
    });
  });

  describe('Launch Configuration', () => {
    it('should have valid launch.json', () => {
      const launchPath = join(vscodeDir, 'launch.json');
      const content = readFileSync(launchPath, 'utf-8');
      const config = parseJSONC(content);

      expect(config.version).toBe('0.2.0');
      expect(config.configurations).toBeDefined();
      expect(Array.isArray(config.configurations)).toBe(true);
    });

    it('should have Next.js debug configuration', () => {
      const launchPath = join(vscodeDir, 'launch.json');
      const content = readFileSync(launchPath, 'utf-8');
      const config = parseJSONC(content);

      const nextjsConfig = config.configurations.find(
        (c: any) => c.name.includes('Frontend') || c.name.includes('Next.js')
      );

      expect(nextjsConfig).toBeDefined();
      expect(nextjsConfig.runtimeExecutable).toBe('npm');
      expect(nextjsConfig.runtimeArgs).toContain('run');
      expect(nextjsConfig.runtimeArgs).toContain('dev');
    });

    it('should have Vitest debug configuration', () => {
      const launchPath = join(vscodeDir, 'launch.json');
      const content = readFileSync(launchPath, 'utf-8');
      const config = parseJSONC(content);

      const vitestConfig = config.configurations.find((c: any) => c.name.includes('Vitest'));

      expect(vitestConfig).toBeDefined();
      expect(vitestConfig.program).toContain('vitest');
    });
  });

  describe('Settings Configuration', () => {
    it('should have valid settings.json', () => {
      const settingsPath = join(vscodeDir, 'settings.json');
      const content = readFileSync(settingsPath, 'utf-8');

      // Should parse without throwing (valid JSON/JSONC)
      expect(() => parseJSONC(content)).not.toThrow();
    });

    it('should have proper formatting configuration', () => {
      const settingsPath = join(vscodeDir, 'settings.json');
      const content = readFileSync(settingsPath, 'utf-8');

      expect(content).toContain('editor.formatOnSave');
      expect(content).toContain('esbenp.prettier-vscode');
      expect(content).toContain('source.fixAll.eslint');
    });

    it('should have Vitest configuration', () => {
      const settingsPath = join(vscodeDir, 'settings.json');
      const content = readFileSync(settingsPath, 'utf-8');

      expect(content).toContain('vitest.enable');
      expect(content).toContain('vitest.commandLine');
    });

    it('should exclude build artifacts', () => {
      const settingsPath = join(vscodeDir, 'settings.json');
      const content = readFileSync(settingsPath, 'utf-8');

      expect(content).toContain('files.exclude');
      expect(content).toContain('**/.next');
      expect(content).toContain('**/node_modules');
      expect(content).toContain('**/coverage');
    });
  });

  describe('Tasks Configuration', () => {
    it('should have valid tasks.json', () => {
      const tasksPath = join(vscodeDir, 'tasks.json');
      const content = readFileSync(tasksPath, 'utf-8');
      const config = parseJSONC(content);

      expect(config.version).toBe('2.0.0');
      expect(config.tasks).toBeDefined();
      expect(Array.isArray(config.tasks)).toBe(true);
    });

    it('should have frontend development task', () => {
      const tasksPath = join(vscodeDir, 'tasks.json');
      const content = readFileSync(tasksPath, 'utf-8');
      const config = parseJSONC(content);

      const frontendTask = config.tasks.find((t: any) => t.label.includes('Frontend'));

      expect(frontendTask).toBeDefined();
      expect(frontendTask.type).toBe('shell');
      expect(frontendTask.isBackground).toBe(true);
    });
  });
});
