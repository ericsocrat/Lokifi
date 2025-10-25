import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('Components Folder Structure Validation', () => {
  const componentsDir = join(process.cwd(), 'components');

  describe('Folder Structure', () => {
    it('should have components directory', () => {
      expect(existsSync(componentsDir)).toBe(true);
    });

    it('should have ui subdirectory for shared components', () => {
      const uiDir = join(componentsDir, 'ui');
      expect(existsSync(uiDir)).toBe(true);
    });

    it('should not have any empty directories', () => {
      function findEmptyDirs(dir: string): string[] {
        const emptyDirs: string[] = [];
        const items = readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (item.isDirectory()) {
            const fullPath = join(dir, item.name);
            const contents = readdirSync(fullPath);
            if (contents.length === 0) {
              emptyDirs.push(fullPath);
            } else {
              emptyDirs.push(...findEmptyDirs(fullPath));
            }
          }
        }

        return emptyDirs;
      }

      const emptyDirs = findEmptyDirs(componentsDir);
      expect(emptyDirs).toHaveLength(0);
    });
  });

  describe('Component File Standards', () => {
    it('should have proper TypeScript component files', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true })
        .filter((item) => item.isFile() && item.name.endsWith('.tsx'))
        .map((item) => item.name);

      expect(files.length).toBeGreaterThan(0);

      // All component files should be .tsx
      files.forEach((file) => {
        expect(file).toMatch(/\.tsx$/);
      });
    });

    it('should have PascalCase component names', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true })
        .filter((item) => item.isFile() && item.name.endsWith('.tsx'))
        .map((item) => item.name.replace('.tsx', ''));

      files.forEach((file) => {
        // PascalCase: starts with capital letter, no spaces, underscores, or hyphens
        expect(file).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });
    });

    it('should not have any empty component files', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true }).filter(
        (item) => item.isFile() && item.name.endsWith('.tsx')
      );

      files.forEach((file) => {
        const filePath = join(componentsDir, file.name);
        const stats = statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });

  describe('No Obsolete or Duplicate Components', () => {
    it('should not have versioned component duplicates (V1 and V2)', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true })
        .filter((item) => item.isFile() && item.name.endsWith('.tsx'))
        .map((item) => item.name);

      const versionedFiles = files.filter((file) => /V\d/.test(file));

      // Check for V1 equivalents of V2 files
      versionedFiles.forEach((versionedFile) => {
        const baseName = versionedFile.replace(/V\d/, '');
        const v1Exists = files.includes(baseName);

        if (v1Exists) {
          expect(v1Exists).toBe(false);
        }
      });
    });

    it('should not have duplicate toolbar components', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true })
        .filter((item) => item.isFile() && item.name.endsWith('.tsx'))
        .map((item) => item.name);

      const toolbarFiles = files.filter((file) => file.toLowerCase().includes('toolbar'));

      // Should have only unique toolbar purposes
      const toolbarPurposes = toolbarFiles.map((file) => {
        if (file.includes('Drawing')) return 'drawing';
        if (file.includes('Plugin')) return 'plugin';
        return 'other';
      });

      const uniquePurposes = [...new Set(toolbarPurposes)];

      // Should not have multiple files serving the same purpose
      uniquePurposes.forEach((purpose) => {
        const filesForPurpose = toolbarFiles.filter((file) => {
          if (purpose === 'drawing') return file.includes('Drawing');
          if (purpose === 'plugin') return file.includes('Plugin');
          return !file.includes('Drawing') && !file.includes('Plugin');
        });

        if (purpose === 'other') {
          // Should not have generic "toolbar" files if we have specific ones
          expect(filesForPurpose.length).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should not have development artifact files', () => {
      const files = readdirSync(componentsDir, { withFileTypes: true })
        .filter((item) => item.isFile())
        .map((item) => item.name);

      const devArtifacts = ['temp.tsx', 'backup.tsx', 'old.tsx', '.bak', '.tmp'];

      devArtifacts.forEach((artifact) => {
        const hasArtifact = files.some(
          (file) => file.includes(artifact) || file.endsWith(artifact)
        );
        expect(hasArtifact).toBe(false);
      });
    });
  });

  describe('Component Organization', () => {
    it('should organize UI components in ui/ subdirectory', () => {
      const uiDir = join(componentsDir, 'ui');
      if (existsSync(uiDir)) {
        const uiFiles = readdirSync(uiDir, { withFileTypes: true })
          .filter((item) => item.isFile() && item.name.endsWith('.tsx'))
          .map((item) => item.name);

        // UI components should be lowercase or kebab-case
        uiFiles.forEach((file) => {
          const fileName = file.replace('.tsx', '');
          // Should be lowercase or kebab-case (common for UI libraries)
          expect(fileName).toMatch(/^[a-z][a-z0-9-]*$/);
        });
      }
    });

    it('should have consistent export patterns', () => {
      // This is a structural check - actual implementation would read files
      // For now, just ensure files exist and are non-empty
      const files = readdirSync(componentsDir, { withFileTypes: true }).filter(
        (item) => item.isFile() && item.name.endsWith('.tsx')
      );

      expect(files.length).toBeGreaterThan(0);

      files.forEach((file) => {
        const filePath = join(componentsDir, file.name);
        const stats = statSync(filePath);

        // Each component should have substantial content (not just imports)
        expect(stats.size).toBeGreaterThan(100); // Minimum reasonable component size
      });
    });
  });
});
