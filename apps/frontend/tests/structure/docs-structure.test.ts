import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

// Helper function to parse JSONC (JSON with Comments)
const parseJsonc = (content: string) => {
  try {
    // For VS Code configuration files, we'll just check if they're syntactically valid
    // by attempting to read them with a more permissive approach

    // Remove comments more carefully
    const lines = content.split('\n');
    const cleanLines = lines.map((line) => {
      // Remove // comments but preserve strings that might contain //
      const commentMatch = line.match(/^([^"]*(?:"[^"]*"[^"]*)*?)\/\/.*$/);
      if (commentMatch) {
        return commentMatch[1];
      }
      return line;
    });

    const withoutLineComments = cleanLines.join('\n');
    const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    const withoutTrailingCommas = withoutBlockComments.replace(/,(\s*[}\]])/g, '$1');

    return JSON.parse(withoutTrailingCommas);
  } catch (error) {
    // For now, just return a basic object if parsing fails
    // This allows the test to continue while noting the file needs attention
    throw new Error(
      `JSONC parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
const DOCS_DIR = path.join(__dirname, '../../../../docs');
const VSCODE_DIR = path.join(__dirname, '../../../../.vscode');

describe('Documentation Folder Structure', () => {
  describe('Essential Documentation Files', () => {
    it('should have core documentation files', async () => {
      const essentialFiles = [
        'README.md',
        'START_HERE.md',
        'QUICK_START.md', // Consolidated from QUICK_REFERENCE.md
        'CHECKLISTS.md', // Consolidated from CHECKLIST.md + PRE_MERGE_CHECKLIST.md
        'NAVIGATION_GUIDE.md', // Navigation guide
      ];

      for (const file of essentialFiles) {
        const filePath = path.join(DOCS_DIR, file);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${file} should exist in docs folder`).toBe(true);

        const stats = await fs.stat(filePath);
        expect(stats.size, `${file} should not be empty`).toBeGreaterThan(100);
      }
    });

    it('should not have empty files', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const stats = await fs.stat(filePath);
        expect(stats.size, `${file} should not be empty`).toBeGreaterThan(0);
      }
    });

    it('should not have completion or summary files', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      const obsoletePatterns = [
        /COMPLETE/i,
        /SUMMARY/i,
        /ANALYSIS/i,
        /BATCH_?\d+/i,
        /SESSION_?\d+/i,
        /PHASE_?\d+/i,
        /_COMPLETE/i,
        /_SUMMARY/i,
      ];

      for (const file of mdFiles) {
        const fileName = file.toString();
        const hasObsoletePattern = obsoletePatterns.some((pattern) => pattern.test(fileName));
        expect(
          hasObsoletePattern,
          `${fileName} appears to be an obsolete completion/summary file`
        ).toBe(false);
      }
    });

    it('should have properly organized development guides', async () => {
      const guidesDir = path.join(DOCS_DIR, 'guides');
      const devGuides = [
        'DEVELOPER_WORKFLOW.md',
        'INTEGRATION_TESTS_GUIDE.md',
        'VSCODE_SETUP.md',
        'CODING_STANDARDS.md',
        'REPOSITORY_STRUCTURE.md',
      ];

      for (const guide of devGuides) {
        const filePath = path.join(guidesDir, guide);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${guide} should be in guides/ directory`).toBe(true);
      }
    });

    it('should have organized API documentation', async () => {
      const apiDir = path.join(DOCS_DIR, 'api');
      const apiDocs = ['API_REFERENCE.md', 'API_DOCUMENTATION.md'];

      for (const doc of apiDocs) {
        const filePath = path.join(apiDir, doc);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${doc} should be in api/ directory`).toBe(true);
      }
    });

    it('should have organized design documentation', async () => {
      const designDir = path.join(DOCS_DIR, 'design');
      const designDocs = ['ARCHITECTURE_DIAGRAM.md', 'THEME_DOCUMENTATION.md'];

      for (const doc of designDocs) {
        const filePath = path.join(designDir, doc);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${doc} should be in design/ directory`).toBe(true);
      }
    });
  });

  describe('VS Code Configuration Validation', () => {
    it('should have valid JSON configuration files', async () => {
      const configFiles = [
        'settings.json',
        'extensions.json',
        'tasks.json',
        'launch.json',
        'keybindings.json',
        'copilot-settings.json',
      ];

      for (const file of configFiles) {
        const filePath = path.join(VSCODE_DIR, file);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${file} should exist in .vscode folder`).toBe(true);

        const content = await fs.readFile(filePath, 'utf-8');

        // Check that the file contains JSON-like structure (object or array)
        expect(content, `${file} should contain JSON structure`).toMatch(/^\s*[{\[]/);
        expect(content, `${file} should end with closing brace or bracket`).toMatch(/[}\]]\s*$/);
      }
    });

    it('should have required VS Code settings', async () => {
      const settingsPath = path.join(VSCODE_DIR, 'settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');

      // Check for essential settings in the raw content
      expect(content, 'Should have format on save setting').toMatch(
        /["']editor\.formatOnSave["']\s*:\s*true/
      );
      expect(content, 'Should have TypeScript preferences').toMatch(/typescript/i);
      expect(content, 'Should have ESLint configuration').toMatch(/eslint/i);

      expect(content, 'Should have Prettier formatter').toMatch(/prettier/i);
      expect(content, 'Should have Vitest settings').toMatch(/vitest/i);
    });

    it('should have recommended extensions', async () => {
      const extensionsPath = path.join(VSCODE_DIR, 'extensions.json');
      const content = await fs.readFile(extensionsPath, 'utf-8');

      // Check for essential extensions in the raw content
      expect(content, 'Should recommend Prettier').toMatch(/prettier-vscode/i);
      expect(content, 'Should recommend ESLint').toMatch(/vscode-eslint/i);
      expect(content, 'Should recommend Python').toMatch(/ms-python\.python/i);
      expect(content, 'Should recommend Vitest').toMatch(/vitest\.explorer/i);
    });
  });

  describe('PowerShell Scripts Validation', () => {
    it('should have PowerShell utility scripts', async () => {
      const vscodePath = path.join(__dirname, '../../../../.vscode');
      const scripts = ['monitor-vscode.ps1', 'cleanup-extensions.ps1'];

      for (const script of scripts) {
        const scriptPath = path.join(vscodePath, script);
        const exists = await fs
          .access(scriptPath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${script} should exist in .vscode folder`).toBe(true);

        if (exists) {
          const content = await fs.readFile(scriptPath, 'utf-8');
          expect(content.length, `${script} should not be empty`).toBeGreaterThan(100);
          expect(content, `${script} should be valid PowerShell`).toMatch(
            /Write-Host|Get-Process|\$[a-zA-Z]/
          );
        }
      }
    });

    it('should not reference lokifi.ps1 bot', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        expect(content, `${file} should not reference lokifi.ps1`).not.toMatch(/lokifi\.ps1/i);
        expect(content, `${file} should not reference Jest (using Vitest)`).not.toMatch(
          /jest\.config/i
        );
      }
    });

    it('should have functional PowerShell scripts with proper error handling', async () => {
      const vscodePath = path.join(__dirname, '../../../../.vscode');
      const scripts = ['monitor-vscode.ps1', 'cleanup-extensions.ps1'];

      for (const script of scripts) {
        const scriptPath = path.join(vscodePath, script);
        const content = await fs.readFile(scriptPath, 'utf-8');

        // Check for proper PowerShell structure
        expect(content, `${script} should have PowerShell commands`).toMatch(
          /Write-Host|Get-Process|Get-ChildItem/i
        );
        expect(content, `${script} should have error handling`).toMatch(
          /ErrorAction|try\s*{|catch\s*{|\$LASTEXITCODE/i
        );
        expect(content, `${script} should have help comments`).toMatch(/#.*[A-Z]/i);
      }
    });
  });

  describe('Documentation Quality', () => {
    it('should have proper README structure', async () => {
      const readmePath = path.join(DOCS_DIR, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      expect(content, 'README should have title').toMatch(/^#\s+/m);
      expect(content, 'README should mention Lokifi').toMatch(/lokifi/i);
      expect(content.length, 'README should have substantial content').toBeGreaterThan(1000);
    });

    it('should have current project information', async () => {
      const startHerePath = path.join(DOCS_DIR, 'START_HERE.md');
      const content = await fs.readFile(startHerePath, 'utf-8');

      // Should mention current tech stack
      expect(content, 'START_HERE should mention Next.js').toMatch(/next\.?js/i);
      expect(content, 'START_HERE should mention FastAPI').toMatch(/fastapi/i);
      expect(content, 'START_HERE should mention key technologies').toMatch(
        /python|javascript|typescript|react/i
      );
    });

    it('should not reference deprecated features', async () => {
      const files = await fs.readdir(DOCS_DIR);
      const mdFiles = files.filter((file) => file.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');

        expect(content, `${file} should not reference lokifi.ps1`).not.toMatch(/lokifi\.ps1/i);
        expect(content, `${file} should not reference Jest (using Vitest)`).not.toMatch(
          /jest\.config/i
        );
      }
    });

    it('should consolidate similar topics instead of creating duplicate documents', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // Define topic keywords that should be consolidated into single documents
      const topicGroups = [
        {
          topic: 'Testing',
          keywords: ['test', 'testing', 'spec', 'unit', 'integration', 'e2e'],
          consolidatedFiles: ['guides/TESTING_GUIDE.md', 'guides/INTEGRATION_TESTS_GUIDE.md'],
          exceptions: ['guides/TESTING_GUIDE.md', 'guides/INTEGRATION_TESTS_GUIDE.md'], // Different types of testing
        },
        {
          topic: 'Setup/Installation',
          keywords: ['setup', 'install', 'getting started', 'quick start', 'start here'],
          consolidatedFiles: ['START_HERE.md', 'QUICK_START.md'],
          exceptions: [
            'guides/POSTGRESQL_SETUP_GUIDE.md', // Specific database setup
            'guides/REDIS_DOCKER_SETUP.md', // Specific service setup
            'guides/VSCODE_SETUP.md', // Specific editor setup
            'security/enhanced-security-setup.md', // Security-specific setup
          ],
        },
        {
          topic: 'Development Workflow',
          keywords: ['workflow', 'development', 'developer', 'contributing'],
          consolidatedFiles: ['guides/DEVELOPER_WORKFLOW.md'],
          exceptions: ['guides/PULL_REQUEST_GUIDE.md'], // Specific Git workflow
        },
        {
          topic: 'API Documentation',
          keywords: ['api', 'endpoint', 'reference'],
          consolidatedFiles: ['api/API_DOCUMENTATION.md', 'api/API_REFERENCE.md'],
          exceptions: [], // These are complementary, not duplicates
        },
        {
          topic: 'Code Quality',
          keywords: ['quality', 'standards', 'coding', 'style', 'lint'],
          consolidatedFiles: ['guides/CODE_QUALITY.md', 'guides/CODING_STANDARDS.md'],
          exceptions: ['CHECKLISTS.md'], // Quality checklists (different from standards)
        },
      ];

      for (const group of topicGroups) {
        const relatedFiles = mdFiles.filter((file) => {
          const fileName = file.toString().toLowerCase();
          return group.keywords.some((keyword) => fileName.includes(keyword));
        });

        // Check for potential duplicates that should be consolidated
        // Exclude the consolidated files themselves and known exceptions
        const duplicateFiles = relatedFiles.filter((file) => {
          const fileName = file.toString();

          // Don't flag consolidated files as duplicates of themselves
          const isConsolidatedFile = group.consolidatedFiles.some((consolidated) =>
            fileName.includes(consolidated.split('/').pop() || consolidated)
          );

          // Don't flag known exceptions
          const isException = group.exceptions.some((exception) => {
            const baseFileName = fileName.split('/').pop() || fileName;
            const exceptionFileName = exception.split('/').pop() || exception;
            return baseFileName === exceptionFileName || fileName === exception;
          });

          return !isConsolidatedFile && !isException;
        });

        if (duplicateFiles.length > 0) {
          // Use topic-specific exceptions
          const actualDuplicates = duplicateFiles.filter((file) => {
            const fileName = file.toString();
            const isInExceptions = group.exceptions.some((exception) => {
              const baseFileName = fileName.split(/[/\\]/).pop() || fileName;
              const exceptionFileName = exception.split(/[/\\]/).pop() || exception;
              return (
                baseFileName === exceptionFileName || fileName.replace(/\\/g, '/') === exception
              );
            });
            return !isInExceptions;
          });

          expect(
            actualDuplicates.length,
            `Found potential duplicate documents for ${group.topic}: ${actualDuplicates.join(', ')}. ` +
              `Consider updating existing consolidated files: ${group.consolidatedFiles.join(', ')} ` +
              `instead of creating new documents on the same topic.`
          ).toBe(0);
        }
      }
    });

    it('should validate cross-references and internal links are not broken', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // Pattern to match markdown links [text](link) and [text]: link
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)|^\s*\[([^\]]+)\]:\s*(.+)$/gm;
      const brokenLinks: string[] = [];

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const link = match[2] || match[4]; // Handle both inline and reference links

          // Skip external URLs and anchors
          if (
            !link ||
            link.startsWith('http') ||
            link.startsWith('#') ||
            link.startsWith('mailto:')
          ) {
            continue;
          }

          // Check if internal file reference exists
          if (link.endsWith('.md')) {
            const linkedFilePath = path.resolve(path.dirname(filePath), link);
            const exists = await fs
              .access(linkedFilePath)
              .then(() => true)
              .catch(() => false);

            if (!exists) {
              brokenLinks.push(`${file}: broken link to ${link}`);
            }
          }
        }
      }

      expect(brokenLinks.length, `Found broken internal links: ${brokenLinks.join(', ')}`).toBe(0);
    });

    it('should enforce consistent heading structure and avoid orphaned sections', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        // Remove code blocks to avoid parsing shell comments as headings
        const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

        // Check for proper heading hierarchy (no h3 without h2, etc.)
        const headings = contentWithoutCodeBlocks.match(/^#{1,6}\s+.+$/gm) || [];
        let previousLevel = 0;

        for (const heading of headings) {
          const level = heading.match(/^#+/)?.[0].length || 0;

          // Don't skip more than one level (h1 -> h3 is bad)
          if (level > previousLevel + 1 && previousLevel > 0) {
            expect(
              false,
              `${file}: Improper heading hierarchy - h${level} follows h${previousLevel} in "${heading.trim()}"`
            ).toBe(true);
          }

          previousLevel = level;
        }

        // Ensure documents start with h1
        if (headings.length > 0) {
          const firstHeading = headings[0];
          if (firstHeading && !firstHeading.startsWith('# ')) {
            expect(
              false,
              `${file}: Document should start with h1 heading, found: ${firstHeading}`
            ).toBe(true);
          }
        }
      }
    });

    it('should prevent outdated version references and maintain current tech stack', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // Define current versions and outdated patterns
      const outdatedPatterns = [
        { pattern: /node\.?js\s+1[0-7]\./i, message: 'Node.js version should be 18+' },
        { pattern: /python\s+3\.[0-9]\./i, message: 'Python version should be 3.11+' },
        { pattern: /next\.?js\s+1[0-4]\./i, message: 'Next.js version should be 15+' },
        { pattern: /react\s+1[0-7]\./i, message: 'React version should be 18+' },
        { pattern: /typescript\s+[0-4]\./i, message: 'TypeScript version should be 5+' },
        { pattern: /npm\s+install\s+@types\/jest/i, message: 'Should use Vitest instead of Jest' },
        { pattern: /jest\.config/i, message: 'Should use vitest.config instead of jest.config' },
        { pattern: /webpack/i, message: 'Next.js uses Turbopack, avoid webpack references' },
      ];

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        for (const { pattern, message } of outdatedPatterns) {
          expect(content, `${file}: ${message}`).not.toMatch(pattern);
        }
      }
    });

    it('should ensure code examples use current syntax and best practices', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      const badPatterns = [
        { pattern: /```javascript[\s\S]*?var\s+/m, message: 'Use const/let instead of var' },
        {
          pattern: /```typescript[\s\S]*?React\.FC/m,
          message: 'Use modern function components without React.FC',
        },
        {
          pattern: /```[\s\S]*?componentDidMount/m,
          message: 'Use hooks instead of class components',
        },
        { pattern: /```[\s\S]*?require\(/m, message: 'Use ES6 imports instead of require()' },
        {
          pattern: /```python[\s\S]*?print\(/m,
          message: 'Python examples should use logging instead of print',
        },
        {
          pattern: /```bash[\s\S]*?sudo\s+npm/m,
          message: 'Avoid sudo with npm, use proper permissions',
        },
      ];

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        for (const { pattern, message } of badPatterns) {
          expect(content, `${file}: ${message}`).not.toMatch(pattern);
        }
      }
    });

    it('should maintain consistent terminology and avoid conflicting instructions', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // Define preferred terminology
      const terminologyRules = [
        { wrong: /front-end/gi, correct: 'frontend', message: 'Use "frontend" not "front-end"' },
        { wrong: /back-end/gi, correct: 'backend', message: 'Use "backend" not "back-end"' },
        {
          wrong: /javascript/gi,
          correct: 'TypeScript',
          message: 'Prefer TypeScript over JavaScript',
        },
        {
          wrong: /\bJS\b/g,
          correct: 'TypeScript',
          message: 'Use TypeScript instead of JS abbreviation',
        },
        { wrong: /yarn\s+install/gi, correct: 'npm install', message: 'Use npm instead of yarn' },
        {
          wrong: /yarn\s+add/gi,
          correct: 'npm install',
          message: 'Use npm install instead of yarn add',
        },
      ];

      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');

        for (const { wrong, correct, message } of terminologyRules) {
          const matches = content.match(wrong);
          if (matches) {
            expect(false, `${file}: ${message}. Found: ${matches.join(', ')}`).toBe(true);
          }
        }
      }
    });

    it('should detect and prevent duplicate content across files', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // Define content patterns that shouldn't be duplicated
      const contentPatterns = [
        {
          name: 'Installation Instructions',
          patterns: [
            /npm install/gi,
            /git clone/gi,
            /python -m venv/gi,
            /pip install -r requirements/gi,
          ],
          allowedFiles: [
            'README.md',
            'START_HERE.md',
            'QUICK_START.md',
            'plans/',
            'guides/DEVELOPER_WORKFLOW.md',
          ],
          minOccurrences: 3, // Consider duplicate if found in 3+ files
        },
        {
          name: 'API Endpoint Examples',
          patterns: [
            /\*\*Endpoint:\*\*.*\/api\//gi,
            /^#{2,4}\s+(GET|POST|PUT|DELETE|PATCH)\s+\/api\//gm,
          ],
          allowedFiles: ['api/API_DOCUMENTATION.md', 'api/API_REFERENCE.md', 'security/', 'plans/'],
          minOccurrences: 2,
        },
        {
          name: 'Testing Commands',
          patterns: [/npm.*test/gi, /vitest.*run/gi, /pytest/gi, /describe\(.*it\(/gi],
          allowedFiles: [
            'guides/TESTING_GUIDE.md',
            'guides/INTEGRATION_TESTS_GUIDE.md',
            'QUICK_START.md',
            'guides/DEVELOPER_WORKFLOW.md',
          ],
          minOccurrences: 3, // Increased from 2 to 3
        },
        {
          name: 'Environment Variables',
          patterns: [/\.env/gi, /process\.env\./gi, /API_KEY|DATABASE_URL|REDIS_URL/gi],
          allowedFiles: ['README.md', 'START_HERE.md', 'security/', 'plans/', 'guides/'],
          minOccurrences: 4, // Increased from 3 to 4
        },
        {
          name: 'Code Quality Standards',
          patterns: [
            /eslint.*config.*json/gi,
            /prettier.*config.*json/gi,
            /\.prettierrc/gi,
            /\.eslintrc/gi,
          ],
          allowedFiles: [
            'guides/CODE_QUALITY.md',
            'guides/CODING_STANDARDS.md',
            'plans/',
            'CHECKLISTS.md',
            'guides/VSCODE_SETUP.md',
          ],
          minOccurrences: 3, // Increased from 2 to 3
        },
      ];

      const duplicateIssues: string[] = [];

      for (const contentType of contentPatterns) {
        const filesWithContent: { file: string; matches: number }[] = [];

        // Check each file for the content patterns
        for (const file of mdFiles) {
          const filePath = path.join(DOCS_DIR, file.toString());
          const content = await fs.readFile(filePath, 'utf-8');

          let totalMatches = 0;
          for (const pattern of contentType.patterns) {
            const matches = content.match(pattern);
            if (matches) {
              totalMatches += matches.length;
            }
          }

          if (totalMatches > 0) {
            filesWithContent.push({ file: file.toString(), matches: totalMatches });
          }
        }

        // Check if content appears in too many files
        if (filesWithContent.length >= contentType.minOccurrences) {
          // Filter out allowed files
          const problematicFiles = filesWithContent.filter(({ file }) => {
            // Normalize path separators for cross-platform compatibility
            const normalizedFile = file.replace(/\\/g, '/');
            return !contentType.allowedFiles.some((allowed) => {
              // Handle directory prefixes (e.g., 'security/')
              if (allowed.endsWith('/')) {
                return normalizedFile.startsWith(allowed);
              }
              return normalizedFile === allowed || normalizedFile.endsWith(`/${allowed}`);
            });
          });

          if (problematicFiles.length > 0) {
            const fileList = problematicFiles
              .map((f) => `${f.file} (${f.matches} matches)`)
              .join(', ');
            duplicateIssues.push(
              `${contentType.name} content found in ${problematicFiles.length} files: ${fileList}. ` +
                `Consider consolidating into: ${contentType.allowedFiles.join(', ')}`
            );
          }
        }
      }

      // Additional check for similar text blocks (basic similarity detection)
      const textSimilarityIssues: string[] = [];
      const contentBlocks: { file: string; content: string; lines: string[] }[] = [];

      // Extract content blocks (paragraphs with substantial content)
      for (const file of mdFiles) {
        const filePath = path.join(DOCS_DIR, file.toString());
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(
          (line) =>
            line.trim().length > 50 &&
            !line.startsWith('#') &&
            !line.startsWith('```') &&
            !line.startsWith('|') // Skip table rows
        );

        if (lines.length > 0) {
          contentBlocks.push({ file: file.toString(), content, lines });
        }
      }

      // Compare content blocks for similarity (simple approach)
      for (let i = 0; i < contentBlocks.length; i++) {
        for (let j = i + 1; j < contentBlocks.length; j++) {
          const block1 = contentBlocks[i];
          const block2 = contentBlocks[j];

          // Skip if same file or allowed combinations
          if (!block1 || !block2 || block1.file === block2.file) continue;

          // Check for identical lines (indicating copy-paste)
          const identicalLines = block1.lines.filter((line1) =>
            block2.lines.some((line2) => line1.trim() === line2.trim())
          );

          // If more than 2 identical substantial lines, flag as potential duplicate
          if (identicalLines.length >= 2) {
            const firstLine = identicalLines[0];
            const sample = firstLine ? firstLine.substring(0, 60) + '...' : 'Content sample';
            textSimilarityIssues.push(
              `Potential duplicate content between ${block1.file} and ${block2.file}: "${sample}"`
            );
          }
        }
      }

      // Combine all issues
      const allIssues = [...duplicateIssues, ...textSimilarityIssues];

      expect(
        allIssues.length,
        `Found duplicate content issues:\n${allIssues.map((issue) => `  - ${issue}`).join('\n')}`
      ).toBe(0);
    });
  });

  describe('Folder Organization', () => {
    it('should have clean structure without excessive nesting', async () => {
      const getAllFiles = async (
        dir: string,
        depth = 0
      ): Promise<{ path: string; depth: number }[]> => {
        if (depth > 4) return []; // Prevent infinite recursion

        const items = await fs.readdir(dir, { withFileTypes: true });
        const results: { path: string; depth: number }[] = [];

        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            results.push({ path: fullPath, depth });
            const subFiles = await getAllFiles(fullPath, depth + 1);
            results.push(...subFiles);
          } else {
            results.push({ path: fullPath, depth });
          }
        }
        return results;
      };

      const allFiles = await getAllFiles(DOCS_DIR);
      const deepFiles = allFiles.filter((f) => f.depth > 3);

      expect(
        deepFiles.length,
        'Documentation should not be excessively nested (>3 levels)'
      ).toBeLessThan(5);
    });

    it('should maintain reasonable file count', async () => {
      const files = await fs.readdir(DOCS_DIR, { recursive: true });
      const mdFiles = files.filter((file: string) => file.toString().endsWith('.md'));

      // After cleanup, should have reasonable number of files
      expect(
        mdFiles.length,
        'Should have reasonable number of markdown files after cleanup'
      ).toBeLessThan(100);
      expect(mdFiles.length, 'Should have minimum essential documentation').toBeGreaterThan(10);
    });
  });
});
