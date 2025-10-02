#!/usr/bin/env node

/**
 * LOKIFI THEME CHECKER
 * Automatically validates theme usage across components
 * Detects hardcoded colors, spacing, and suggests theme constants
 */

const fs = require("fs");
const path = require("path");

// Color patterns to detect
const colorPatterns = [
  {
    pattern: /#[0-9A-Fa-f]{6}/g,
    name: "Hex Colors",
    suggestion: "Use theme.colors constants instead of hardcoded hex colors",
  },
  {
    pattern: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
    name: "RGB Colors",
    suggestion: "Use theme.colors constants instead of rgb() values",
  },
  {
    pattern: /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
    name: "RGBA Colors",
    suggestion: "Use theme.colors with rgba() utility function",
  },
];

// Spacing patterns to detect
const spacingPatterns = [
  {
    pattern: /padding:\s*['"]?\d+px['"]?/g,
    name: "Hardcoded Padding",
    suggestion: "Use theme.spacing constants or Tailwind padding classes",
  },
  {
    pattern: /margin:\s*['"]?\d+px['"]?/g,
    name: "Hardcoded Margin",
    suggestion: "Use theme.spacing constants or Tailwind margin classes",
  },
];

// Theme-aware patterns (good practices)
const themeUsagePatterns = [
  /import.*theme.*from.*['"]@\/lib\/theme['"]/,
  /import.*\{.*colors.*\}.*from.*['"]@\/lib\/theme['"]/,
  /className=.*btn-/,
  /className=.*card/,
];

// Files to check
const componentDirs = ["frontend/components", "frontend/app", "frontend/lib"];

// Files to ignore
const ignorePatterns = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.git/,
  /theme\.ts$/, // Ignore the theme file itself
];

class ThemeChecker {
  constructor() {
    this.results = {
      totalFiles: 0,
      filesWithIssues: 0,
      filesWithThemeUsage: 0,
      issues: [],
    };
  }

  shouldIgnoreFile(filePath) {
    return ignorePatterns.some((pattern) => pattern.test(filePath));
  }

  checkFile(filePath) {
    if (this.shouldIgnoreFile(filePath)) return;

    const ext = path.extname(filePath);
    if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) return;

    this.results.totalFiles++;

    const content = fs.readFileSync(filePath, "utf-8");
    const fileIssues = [];
    let hasThemeUsage = false;

    // Check for theme usage
    themeUsagePatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        hasThemeUsage = true;
      }
    });

    if (hasThemeUsage) {
      this.results.filesWithThemeUsage++;
    }

    // Check for color issues
    colorPatterns.forEach(({ pattern, name, suggestion }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Filter out comments
        const nonCommentMatches = matches.filter((match) => {
          const lines = content.split("\n");
          for (const line of lines) {
            if (
              line.includes(match) &&
              !line.trim().startsWith("//") &&
              !line.trim().startsWith("*")
            ) {
              return true;
            }
          }
          return false;
        });

        if (nonCommentMatches.length > 0) {
          fileIssues.push({
            type: name,
            count: nonCommentMatches.length,
            examples: nonCommentMatches.slice(0, 3),
            suggestion,
          });
        }
      }
    });

    // Check for spacing issues
    spacingPatterns.forEach(({ pattern, name, suggestion }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        fileIssues.push({
          type: name,
          count: matches.length,
          examples: matches.slice(0, 3),
          suggestion,
        });
      }
    });

    if (fileIssues.length > 0) {
      this.results.filesWithIssues++;
      this.results.issues.push({
        file: filePath,
        hasThemeUsage,
        issues: fileIssues,
      });
    }
  }

  scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.scanDirectory(fullPath);
      } else {
        this.checkFile(fullPath);
      }
    });
  }

  printResults() {
    console.log("\n" + "=".repeat(80));
    console.log("🎨 LOKIFI THEME CHECKER RESULTS");
    console.log("=".repeat(80) + "\n");

    console.log(`📊 Summary:`);
    console.log(`   Total files scanned: ${this.results.totalFiles}`);
    console.log(
      `   Files with theme usage: ${
        this.results.filesWithThemeUsage
      } (${Math.round(
        (this.results.filesWithThemeUsage / this.results.totalFiles) * 100
      )}%)`
    );
    console.log(`   Files with issues: ${this.results.filesWithIssues}`);
    console.log("");

    if (this.results.filesWithIssues === 0) {
      console.log("✅ Great! No theme violations found.");
      console.log("   All components are following theme guidelines.");
      return;
    }

    console.log("⚠️  Issues Found:\n");

    this.results.issues.forEach(({ file, hasThemeUsage, issues }) => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\n📁 ${relativePath}`);

      if (hasThemeUsage) {
        console.log("   ✓ Uses theme imports");
      } else {
        console.log("   ⚠ No theme imports found");
      }

      issues.forEach(({ type, count, examples, suggestion }) => {
        console.log(`\n   🔸 ${type}: ${count} occurrence(s)`);
        console.log(`      Examples: ${examples.join(", ")}`);
        console.log(`      💡 ${suggestion}`);
      });

      console.log("");
    });

    console.log("\n" + "-".repeat(80));
    console.log("📚 For theme documentation, see: docs/THEME_DOCUMENTATION.md");
    console.log(
      '💡 Import theme with: import { colors, spacing } from "@/lib/theme"'
    );
    console.log("-".repeat(80) + "\n");
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.results.totalFiles,
        filesWithThemeUsage: this.results.filesWithThemeUsage,
        filesWithIssues: this.results.filesWithIssues,
        themeAdoption: Math.round(
          (this.results.filesWithThemeUsage / this.results.totalFiles) * 100
        ),
      },
      issues: this.results.issues,
    };

    const reportPath = path.join(
      process.cwd(),
      "docs",
      "reports",
      "theme-check-report.json"
    );
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  run() {
    console.log("🔍 Scanning for theme violations...\n");

    componentDirs.forEach((dir) => {
      const fullPath = path.join(process.cwd(), dir);
      console.log(`   Scanning: ${dir}`);
      this.scanDirectory(fullPath);
    });

    this.printResults();
    this.generateReport();
  }
}

// Run the checker
const checker = new ThemeChecker();
checker.run();

module.exports = ThemeChecker;
