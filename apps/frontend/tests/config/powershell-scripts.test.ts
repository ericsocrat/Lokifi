import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * PowerShell Scripts Validation Tests
 *
 * Validates PowerShell scripts for:
 * - File existence and readability
 * - Basic syntax validation
 * - Required functionality presence
 * - Security best practices
 */

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

describe('PowerShell Scripts', () => {
  const scriptsToTest = [
    {
      name: 'start-frontend.ps1',
      path: join(process.cwd(), 'start-frontend.ps1'),
      required: true,
    },
  ];

  describe('Script Files', () => {
    scriptsToTest.forEach(({ name, path, required }) => {
      describe(name, () => {
        let scriptContent: string;

        beforeAll(() => {
          if (existsSync(path)) {
            scriptContent = readFileSync(path, 'utf-8');
          }
        });

        it('should exist when required', () => {
          if (required) {
            expect(existsSync(path)).toBe(true);
            expect(statSync(path).isFile()).toBe(true);
          }
        });

        if (required || existsSync(join(process.cwd(), name))) {
          it('should be readable and non-empty', () => {
            expect(scriptContent).toBeDefined();
            expect(scriptContent.length).toBeGreaterThan(0);
          });

          it('should have proper PowerShell syntax basics', () => {
            // Should not have common syntax errors
            expect(scriptContent).not.toMatch(/\]\s*\[/); // Invalid bracket sequence

            // Note: $( is valid PowerShell syntax for subexpressions

            // Should use proper PowerShell conventions
            if (scriptContent.includes('Write-Host')) {
              expect(scriptContent).toMatch(/Write-Host\s+['"]/); // Proper Write-Host usage
            }
          });

          it('should use secure execution practices', () => {
            // Should not contain dangerous patterns
            expect(scriptContent).not.toContain('Invoke-Expression');
            expect(scriptContent).not.toContain('iex ');
            expect(scriptContent).not.toMatch(/&\s*\(/); // Avoid dynamic execution

            // Should handle errors properly
            if (scriptContent.includes('Start-Process') || scriptContent.includes('Invoke-')) {
              expect(scriptContent).toMatch(/-ErrorAction\s+(Stop|Continue|SilentlyContinue)/);
            }
          });

          it('should have proper error handling', () => {
            // Should have some form of error handling
            const hasErrorHandling =
              scriptContent.includes('try {') ||
              scriptContent.includes('catch {') ||
              scriptContent.includes('-ErrorAction') ||
              scriptContent.includes('$?') ||
              scriptContent.includes('$LastExitCode') ||
              scriptContent.includes('Test-Path'); // Basic validation

            expect(hasErrorHandling).toBe(true);
          });
        }
      });
    });
  });

  describe('Frontend Startup Script', () => {
    const startScript = join(process.cwd(), 'start-frontend.ps1');

    it('should contain Next.js development server commands', () => {
      if (existsSync(startScript)) {
        const content = readFileSync(startScript, 'utf-8');

        // Should reference npm or Next.js commands
        const hasNextCommands =
          content.includes('npm') ||
          content.includes('yarn') ||
          content.includes('pnpm') ||
          content.includes('next');

        expect(hasNextCommands).toBe(true);
      }
    });

    it('should handle port configuration', () => {
      if (existsSync(startScript)) {
        const content = readFileSync(startScript, 'utf-8');

        // Should reference port 3000 (Next.js default)
        expect(content).toMatch(/3000|port/i);
      }
    });

    it('should have proper dependencies check', () => {
      if (existsSync(startScript)) {
        const content = readFileSync(startScript, 'utf-8');

        // Should check for node_modules or install dependencies
        const hasDependencyCheck =
          content.includes('node_modules') ||
          content.includes('npm install') ||
          content.includes('package.json');

        expect(hasDependencyCheck).toBe(true);
      }
    });
  });

  describe('Script Integration', () => {
    it('should match VS Code tasks configuration', () => {
      // Note: .vscode is at repository root, not in apps/frontend/
      const tasksPath = join(process.cwd(), '..', '..', '.vscode', 'tasks.json');

      if (existsSync(tasksPath)) {
        const tasks = parseJSONC(readFileSync(tasksPath, 'utf-8'));

        // Find tasks that reference PowerShell scripts
        const scriptTasks =
          tasks.tasks?.filter((task: any) => task.command && task.command.includes('.ps1')) || [];

        // Verify referenced scripts exist
        scriptTasks.forEach((task: any) => {
          // Extract script path from command
          if (task.command.includes('./start-frontend.ps1')) {
            expect(existsSync(join(process.cwd(), 'start-frontend.ps1'))).toBe(true);
          }
          // Note: Backend script validation would be in backend tests
        });
      }
    });
  });
});
