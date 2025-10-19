import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Project Configuration Files Validation Tests
 * 
 * Validates project-level configuration files for:
 * - EditorConfig consistency
 * - Node.js version specification
 * - NPM configuration
 * - Development workflow optimization
 */
describe('Project Configuration Files', () => {
  describe('.editorconfig', () => {
    const editorconfigPath = join(process.cwd(), '.editorconfig');

    it('should exist and be properly formatted', () => {
      expect(existsSync(editorconfigPath)).toBe(true);
      
      const content = readFileSync(editorconfigPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('root = true');
    });

    it('should have consistent formatting rules', () => {
      const content = readFileSync(editorconfigPath, 'utf-8');
      
      // Should specify UTF-8 encoding
      expect(content).toContain('charset = utf-8');
      
      // Should have consistent indentation for JS/TS files
      expect(content).toMatch(/\[\*\.\{js,jsx,ts,tsx\}\]/);
      expect(content).toContain('indent_size = 2');
      
      // Should handle line endings consistently
      expect(content).toContain('end_of_line = lf');
      expect(content).toContain('insert_final_newline = true');
    });

    it('should have language-specific configurations', () => {
      const content = readFileSync(editorconfigPath, 'utf-8');
      
      // Should handle different file types appropriately
      expect(content).toContain('[*.{json,jsonc}]');
      expect(content).toContain('[*.{yml,yaml}]');
      expect(content).toContain('[*.css]');
      
      // Should handle PowerShell files for Windows compatibility
      expect(content).toContain('[*.{ps1,psm1}]');
    });
  });

  describe('.nvmrc', () => {
    const nvmrcPath = join(process.cwd(), '.nvmrc');

    it('should exist and specify Node.js version', () => {
      expect(existsSync(nvmrcPath)).toBe(true);
      
      const content = readFileSync(nvmrcPath, 'utf-8').trim();
      expect(content).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should match package.json engines requirement', () => {
      const nvmVersion = readFileSync(nvmrcPath, 'utf-8').trim();
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
      
      // Extract major version from both
      const nvmMajor = parseInt(nvmVersion.split('.')[0]);
      const enginesMajor = parseInt(packageJson.engines.node.replace('>=', '').split('.')[0]);
      
      expect(nvmMajor).toBeGreaterThanOrEqual(enginesMajor);
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent Node.js version across files', () => {
      // Check .nvmrc exists
      const nvmrcPath = join(process.cwd(), '.nvmrc');
      expect(existsSync(nvmrcPath)).toBe(true);
      
      // Check package.json has engines field
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toBeDefined();
    });

    it('should have proper gitignore for generated files', () => {
      const gitignorePath = join(process.cwd(), '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
      
      const content = readFileSync(gitignorePath, 'utf-8');
      
      // Should ignore build artifacts
      expect(content).toContain('.next');
      expect(content).toContain('coverage');
      expect(content).toContain('test-results');
      expect(content).toContain('*.tsbuildinfo');
    });

    it('should have EditorConfig rules aligned with Prettier', () => {
      const editorconfigContent = readFileSync(join(process.cwd(), '.editorconfig'), 'utf-8');
      const prettierConfig = JSON.parse(readFileSync(join(process.cwd(), '.prettierrc.json'), 'utf-8'));
      
      // Both should use 2 spaces for indentation (inferred from EditorConfig JS/TS rules)
      expect(editorconfigContent).toContain('indent_size = 2');
      expect(prettierConfig.tabWidth).toBe(2);
      
      // Both should insert final newline
      expect(editorconfigContent).toContain('insert_final_newline = true');
    });
  });

  describe('Development Workflow', () => {
    it('should support consistent development environment setup', () => {
      // Essential files for team consistency
      const essentialFiles = [
        '.editorconfig',
        '.nvmrc',
        '.prettierrc.json',
        '.eslintrc.json',
        'tsconfig.json'
      ];
      
      essentialFiles.forEach(file => {
        expect(existsSync(join(process.cwd(), file))).toBe(true);
      });
    });

    it('should have proper VS Code workspace integration', () => {
      // VS Code should be configured to use these project settings
      const vscodeSettingsPath = join(process.cwd(), '.vscode', 'settings.json');
      expect(existsSync(vscodeSettingsPath)).toBe(true);
      
      // Extensions should be recommended for the tech stack
      const vscodeExtensionsPath = join(process.cwd(), '.vscode', 'extensions.json');
      expect(existsSync(vscodeExtensionsPath)).toBe(true);
    });
  });
});