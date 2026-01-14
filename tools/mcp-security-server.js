#!/usr/bin/env node

/**
 * Lokifi Security Analysis MCP Server
 * 
 * Provides centralized security analysis and alert management tools for GitHub Copilot.
 * Integrates with GitHub CodeQL, Dependabot, and local security scanning.
 * 
 * Tools:
 * 1. list_security_alerts - All open CodeQL + Dependabot alerts
 * 2. get_alert_details - Full context, code location, remediation
 * 3. dismiss_false_positive - Dismiss alert with reason + comment
 * 4. get_security_trends - Historical alert counts, MTTR
 * 5. scan_for_secrets - Find hardcoded secrets in codebase
 * 6. analyze_dependency_risk - CVE scores, update recommendations
 * 
 * @requires @modelcontextprotocol/sdk >=0.5.0
 * @requires Node.js >=18.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REPO_OWNER = "ericsocrat";
const REPO_NAME = "Lokifi";

// Secret patterns for scanning
const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/, severity: "high" },
  { name: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/, severity: "high" },
  { name: "API Key", pattern: /api[_-]?key[\s]*[=:]+[\s]*["']?([A-Za-z0-9_\-]{20,})["']?/i, severity: "medium" },
  { name: "Private Key", pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, severity: "critical" },
  { name: "Password", pattern: /password[\s]*[=:]+[\s]*["']?([^"'\s]{8,})["']?/i, severity: "medium" },
  { name: "JWT Token", pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/, severity: "high" },
  { name: "Database URL", pattern: /(?:postgres|mysql|mongodb):\/\/[^\s"']+/, severity: "high" }
];

/**
 * Get GitHub CLI command output
 */
async function getGitHubData(command) {
  try {
    const { stdout } = await execAsync(`gh ${command}`, { 
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large responses
    });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`GitHub CLI error: ${error.message}`);
  }
}

/**
 * Tool 1: list_security_alerts
 * Lists all open CodeQL and Dependabot alerts
 */
async function listSecurityAlerts({ type = "all", severity = "all", limit = 50 }) {
  const alerts = {
    codeql: [],
    dependabot: [],
    summary: {
      total: 0,
      byType: {},
      bySeverity: {},
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  try {
    // Fetch CodeQL alerts
    if (type === "all" || type === "codeql") {
      const codeqlAlerts = await getGitHubData(
        `api /repos/${REPO_OWNER}/${REPO_NAME}/code-scanning/alerts --jq '[.[] | select(.state=="open")]'`
      );
      
      for (const alert of codeqlAlerts.slice(0, limit)) {
        const severityLevel = alert.rule.severity.toLowerCase();
        if (severity === "all" || severityLevel === severity.toLowerCase()) {
          alerts.codeql.push({
            number: alert.number,
            rule: alert.rule.id,
            severity: alert.rule.severity,
            description: alert.rule.description,
            location: `${alert.most_recent_instance.location.path}:${alert.most_recent_instance.location.start_line}`,
            created_at: alert.created_at,
            state: alert.state,
            url: alert.html_url
          });
          alerts.summary.bySeverity[severityLevel] = (alerts.summary.bySeverity[severityLevel] || 0) + 1;
          alerts.summary[severityLevel] = (alerts.summary[severityLevel] || 0) + 1;
        }
      }
      alerts.summary.byType.codeql = alerts.codeql.length;
    }

    // Fetch Dependabot alerts
    if (type === "all" || type === "dependabot") {
      const dependabotAlerts = await getGitHubData(
        `api /repos/${REPO_OWNER}/${REPO_NAME}/dependabot/alerts --jq '[.[] | select(.state=="open")]'`
      );
      
      for (const alert of dependabotAlerts.slice(0, limit)) {
        const severityLevel = alert.security_advisory.severity.toLowerCase();
        if (severity === "all" || severityLevel === severity.toLowerCase()) {
          alerts.dependabot.push({
            number: alert.number,
            package: alert.security_vulnerability.package.name,
            severity: alert.security_advisory.severity,
            summary: alert.security_advisory.summary,
            cve: alert.security_advisory.cve_id || "N/A",
            vulnerable_version: alert.security_vulnerability.vulnerable_version_range,
            patched_version: alert.security_vulnerability.first_patched_version?.identifier || "None",
            created_at: alert.created_at,
            state: alert.state,
            url: alert.html_url
          });
          alerts.summary.bySeverity[severityLevel] = (alerts.summary.bySeverity[severityLevel] || 0) + 1;
          alerts.summary[severityLevel] = (alerts.summary[severityLevel] || 0) + 1;
        }
      }
      alerts.summary.byType.dependabot = alerts.dependabot.length;
    }

    alerts.summary.total = alerts.codeql.length + alerts.dependabot.length;
    
    return {
      success: true,
      alerts,
      filters: { type, severity, limit },
      message: `Found ${alerts.summary.total} open security alerts (CodeQL: ${alerts.summary.byType.codeql || 0}, Dependabot: ${alerts.summary.byType.dependabot || 0})`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch security alerts. Ensure GitHub CLI is authenticated and has repo access."
    };
  }
}

/**
 * Tool 2: get_alert_details
 * Get detailed information about a specific alert
 */
async function getAlertDetails({ type, alert_number }) {
  try {
    let alert;
    
    if (type === "codeql") {
      alert = await getGitHubData(
        `api /repos/${REPO_OWNER}/${REPO_NAME}/code-scanning/alerts/${alert_number}`
      );
      
      return {
        success: true,
        alert: {
          number: alert.number,
          rule: {
            id: alert.rule.id,
            name: alert.rule.name,
            severity: alert.rule.severity,
            security_severity_level: alert.rule.security_severity_level,
            description: alert.rule.description,
            help: alert.rule.help,
            tags: alert.rule.tags
          },
          location: {
            path: alert.most_recent_instance.location.path,
            start_line: alert.most_recent_instance.location.start_line,
            end_line: alert.most_recent_instance.location.end_line,
            message: alert.most_recent_instance.message.text
          },
          state: alert.state,
          created_at: alert.created_at,
          updated_at: alert.updated_at,
          url: alert.html_url,
          instances: alert.instances_url
        }
      };
    } else if (type === "dependabot") {
      alert = await getGitHubData(
        `api /repos/${REPO_OWNER}/${REPO_NAME}/dependabot/alerts/${alert_number}`
      );
      
      return {
        success: true,
        alert: {
          number: alert.number,
          package: {
            ecosystem: alert.security_vulnerability.package.ecosystem,
            name: alert.security_vulnerability.package.name
          },
          severity: alert.security_advisory.severity,
          summary: alert.security_advisory.summary,
          description: alert.security_advisory.description,
          cve: {
            id: alert.security_advisory.cve_id,
            cvss_score: alert.security_advisory.cvss?.score || "N/A",
            cvss_vector: alert.security_advisory.cvss?.vector_string || "N/A"
          },
          vulnerable_version: alert.security_vulnerability.vulnerable_version_range,
          patched_version: alert.security_vulnerability.first_patched_version?.identifier || "None",
          references: alert.security_advisory.references,
          state: alert.state,
          created_at: alert.created_at,
          updated_at: alert.updated_at,
          url: alert.html_url
        }
      };
    } else {
      return {
        success: false,
        error: `Invalid alert type: ${type}. Must be 'codeql' or 'dependabot'.`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Failed to fetch alert #${alert_number} details.`
    };
  }
}

/**
 * Tool 3: dismiss_false_positive
 * Dismiss a CodeQL alert as false positive with reason
 */
async function dismissFalsePositive({ alert_number, reason, comment }) {
  try {
    const validReasons = ["false positive", "won't fix", "used in tests"];
    const dismissReason = reason.toLowerCase();
    
    if (!validReasons.includes(dismissReason)) {
      return {
        success: false,
        error: `Invalid reason: ${reason}. Must be one of: ${validReasons.join(", ")}`
      };
    }

    // GitHub API requires specific format for dismissal reason
    const apiReason = dismissReason.replace(" ", "_");
    
    await execAsync(
      `gh api -X PATCH /repos/${REPO_OWNER}/${REPO_NAME}/code-scanning/alerts/${alert_number} ` +
      `-f state=dismissed -f dismissed_reason=${apiReason} -f dismissed_comment="${comment}"`,
      { cwd: REPO_ROOT }
    );
    
    return {
      success: true,
      message: `Alert #${alert_number} dismissed as '${reason}' with comment: ${comment}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Failed to dismiss alert #${alert_number}.`
    };
  }
}

/**
 * Tool 4: get_security_trends
 * Get historical security alert trends and MTTR
 */
async function getSecurityTrends({ days = 30 }) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    // Fetch all alerts (open + closed)
    const codeqlAll = await getGitHubData(
      `api /repos/${REPO_OWNER}/${REPO_NAME}/code-scanning/alerts`
    );
    
    const dependabotAll = await getGitHubData(
      `api /repos/${REPO_OWNER}/${REPO_NAME}/dependabot/alerts`
    );

    // Calculate trends
    const trends = {
      period: `${days} days`,
      codeql: {
        total: codeqlAll.length,
        open: codeqlAll.filter(a => a.state === "open").length,
        closed: codeqlAll.filter(a => a.state === "dismissed" || a.state === "fixed").length,
        created_in_period: codeqlAll.filter(a => new Date(a.created_at) > cutoffDate).length,
        closed_in_period: codeqlAll.filter(a => 
          a.dismissed_at && new Date(a.dismissed_at) > cutoffDate ||
          a.fixed_at && new Date(a.fixed_at) > cutoffDate
        ).length
      },
      dependabot: {
        total: dependabotAll.length,
        open: dependabotAll.filter(a => a.state === "open").length,
        closed: dependabotAll.filter(a => a.state === "dismissed" || a.state === "fixed").length,
        created_in_period: dependabotAll.filter(a => new Date(a.created_at) > cutoffDate).length,
        closed_in_period: dependabotAll.filter(a => 
          a.dismissed_at && new Date(a.dismissed_at) > cutoffDate ||
          a.fixed_at && new Date(a.fixed_at) > cutoffDate
        ).length
      }
    };

    // Calculate MTTR (Mean Time To Resolution) for closed alerts
    const closedCodeQL = codeqlAll.filter(a => a.dismissed_at || a.fixed_at);
    const closedDependabot = dependabotAll.filter(a => a.dismissed_at || a.fixed_at);
    
    const codeqlMTTR = closedCodeQL.length > 0
      ? closedCodeQL.reduce((sum, a) => {
          const resolvedAt = new Date(a.dismissed_at || a.fixed_at);
          const createdAt = new Date(a.created_at);
          return sum + (resolvedAt - createdAt);
        }, 0) / closedCodeQL.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;
    
    const dependabotMTTR = closedDependabot.length > 0
      ? closedDependabot.reduce((sum, a) => {
          const resolvedAt = new Date(a.dismissed_at || a.fixed_at);
          const createdAt = new Date(a.created_at);
          return sum + (resolvedAt - createdAt);
        }, 0) / closedDependabot.length / (1000 * 60 * 60 * 24)
      : 0;

    trends.mttr = {
      codeql_days: codeqlMTTR.toFixed(2),
      dependabot_days: dependabotMTTR.toFixed(2),
      overall_days: ((codeqlMTTR + dependabotMTTR) / 2).toFixed(2)
    };

    return {
      success: true,
      trends,
      message: `Security trends for the last ${days} days analyzed successfully.`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to calculate security trends."
    };
  }
}

/**
 * Tool 5: scan_for_secrets
 * Scan codebase for potential hardcoded secrets
 */
async function scanForSecrets({ paths = ["apps/", "infra/"], exclude_patterns = [".env.example", "test", "mock", ".md"] }) {
  const findings = [];
  
  try {
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(REPO_ROOT, fullPath);
        
        // Skip excluded patterns
        if (exclude_patterns.some(pattern => relativePath.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Skip common directories
          if (["node_modules", ".git", "venv", "__pycache__", "dist", "build"].includes(entry.name)) {
            continue;
          }
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // Only scan text files
          const ext = path.extname(entry.name);
          if ([".js", ".ts", ".tsx", ".py", ".env", ".yml", ".yaml", ".json", ".sh"].includes(ext)) {
            const content = await fs.readFile(fullPath, "utf-8");
            const lines = content.split("\n");
            
            for (let i = 0; i < lines.length; i++) {
              for (const pattern of SECRET_PATTERNS) {
                if (pattern.pattern.test(lines[i])) {
                  findings.push({
                    severity: pattern.severity,
                    type: pattern.name,
                    file: relativePath,
                    line: i + 1,
                    content: lines[i].trim().substring(0, 100) + (lines[i].length > 100 ? "..." : "")
                  });
                }
              }
            }
          }
        }
      }
    }
    
    for (const scanPath of paths) {
      const fullPath = path.join(REPO_ROOT, scanPath);
      try {
        await scanDirectory(fullPath);
      } catch (err) {
        // Path might not exist, skip it
        continue;
      }
    }
    
    // Group by severity
    const summary = {
      critical: findings.filter(f => f.severity === "critical").length,
      high: findings.filter(f => f.severity === "high").length,
      medium: findings.filter(f => f.severity === "medium").length,
      total: findings.length
    };
    
    return {
      success: true,
      findings: findings.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary,
      message: `Scanned ${paths.join(", ")} - Found ${summary.total} potential secrets (${summary.critical} critical, ${summary.high} high, ${summary.medium} medium)`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to scan for secrets."
    };
  }
}

/**
 * Tool 6: analyze_dependency_risk
 * Analyze dependency vulnerabilities with CVE scores and update recommendations
 */
async function analyzeDependencyRisk({ ecosystem = "all" }) {
  try {
    const alerts = await getGitHubData(
      `api /repos/${REPO_OWNER}/${REPO_NAME}/dependabot/alerts --jq '[.[] | select(.state=="open")]'`
    );
    
    const analysis = {
      total_vulnerabilities: 0,
      by_ecosystem: {},
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      high_risk_packages: [],
      update_recommendations: []
    };
    
    for (const alert of alerts) {
      const pkg = alert.security_vulnerability.package;
      const advisory = alert.security_advisory;
      
      if (ecosystem === "all" || pkg.ecosystem.toLowerCase() === ecosystem.toLowerCase()) {
        analysis.total_vulnerabilities++;
        
        // Count by ecosystem
        analysis.by_ecosystem[pkg.ecosystem] = (analysis.by_ecosystem[pkg.ecosystem] || 0) + 1;
        
        // Count by severity
        const severity = advisory.severity.toLowerCase();
        analysis.by_severity[severity]++;
        
        // Track high-risk packages (critical or high severity)
        if (severity === "critical" || severity === "high") {
          analysis.high_risk_packages.push({
            package: pkg.name,
            ecosystem: pkg.ecosystem,
            severity: advisory.severity,
            cve: advisory.cve_id || "N/A",
            cvss_score: advisory.cvss?.score || "N/A",
            vulnerable_version: alert.security_vulnerability.vulnerable_version_range,
            patched_version: alert.security_vulnerability.first_patched_version?.identifier || "None available",
            summary: advisory.summary
          });
          
          // Generate update recommendation
          if (alert.security_vulnerability.first_patched_version) {
            analysis.update_recommendations.push({
              action: "upgrade",
              package: pkg.name,
              from: alert.security_vulnerability.vulnerable_version_range,
              to: alert.security_vulnerability.first_patched_version.identifier,
              priority: severity === "critical" ? "URGENT" : "HIGH",
              reason: advisory.summary
            });
          } else {
            analysis.update_recommendations.push({
              action: "investigate",
              package: pkg.name,
              priority: "HIGH",
              reason: "No patched version available - consider alternative package or mitigation"
            });
          }
        }
      }
    }
    
    // Sort high-risk packages by severity
    analysis.high_risk_packages.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity.toLowerCase()] - severityOrder[b.severity.toLowerCase()];
    });
    
    return {
      success: true,
      analysis,
      message: `Analyzed ${analysis.total_vulnerabilities} dependency vulnerabilities. ${analysis.high_risk_packages.length} high-risk packages found.`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to analyze dependency risk."
    };
  }
}

// Initialize MCP Server
const server = new Server(
  {
    name: "lokifi-security",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_security_alerts",
        description: "List all open security alerts from CodeQL and Dependabot. Filter by type, severity, or limit results.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["all", "codeql", "dependabot"],
              description: "Type of alerts to list (default: all)",
              default: "all"
            },
            severity: {
              type: "string",
              enum: ["all", "critical", "high", "medium", "low"],
              description: "Filter by severity level (default: all)",
              default: "all"
            },
            limit: {
              type: "number",
              description: "Maximum number of alerts per type (default: 50)",
              default: 50
            }
          }
        }
      },
      {
        name: "get_alert_details",
        description: "Get detailed information about a specific security alert including remediation guidance.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["codeql", "dependabot"],
              description: "Type of alert (codeql or dependabot)"
            },
            alert_number: {
              type: "number",
              description: "Alert number from GitHub"
            }
          },
          required: ["type", "alert_number"]
        }
      },
      {
        name: "dismiss_false_positive",
        description: "Dismiss a CodeQL alert as false positive with a reason and comment.",
        inputSchema: {
          type: "object",
          properties: {
            alert_number: {
              type: "number",
              description: "CodeQL alert number to dismiss"
            },
            reason: {
              type: "string",
              enum: ["false positive", "won't fix", "used in tests"],
              description: "Reason for dismissal"
            },
            comment: {
              type: "string",
              description: "Explanation for why this is being dismissed"
            }
          },
          required: ["alert_number", "reason", "comment"]
        }
      },
      {
        name: "get_security_trends",
        description: "Get historical security alert trends including creation/resolution rates and MTTR (Mean Time To Resolution).",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days to analyze (default: 30)",
              default: 30
            }
          }
        }
      },
      {
        name: "scan_for_secrets",
        description: "Scan codebase for potential hardcoded secrets using pattern matching. Detects API keys, passwords, tokens, etc.",
        inputSchema: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Paths to scan (default: ['apps/', 'infra/'])",
              default: ["apps/", "infra/"]
            },
            exclude_patterns: {
              type: "array",
              items: { type: "string" },
              description: "Patterns to exclude from scan (default: ['.env.example', 'test', 'mock', '.md'])",
              default: [".env.example", "test", "mock", ".md"]
            }
          }
        }
      },
      {
        name: "analyze_dependency_risk",
        description: "Analyze dependency vulnerabilities with CVE scores and provide prioritized update recommendations.",
        inputSchema: {
          type: "object",
          properties: {
            ecosystem: {
              type: "string",
              enum: ["all", "npm", "pip", "docker"],
              description: "Filter by package ecosystem (default: all)",
              default: "all"
            }
          }
        }
      }
    ]
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case "list_security_alerts":
        result = await listSecurityAlerts(args || {});
        break;
      case "get_alert_details":
        result = await getAlertDetails(args);
        break;
      case "dismiss_false_positive":
        result = await dismissFalsePositive(args);
        break;
      case "get_security_trends":
        result = await getSecurityTrends(args || {});
        break;
      case "scan_for_secrets":
        result = await scanForSecrets(args || {});
        break;
      case "analyze_dependency_risk":
        result = await analyzeDependencyRisk(args || {});
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            tool: name
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lokifi Security Analysis MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
