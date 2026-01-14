#!/usr/bin/env node

/**
 * MCP Server: lokifi-ci
 * Purpose: GitHub Actions CI/CD workflow analysis and debugging
 * Tools: 7 (workflow status, logs, artifacts, job analysis, failure patterns, performance metrics, workflow recommendations)
 * Status: Production-ready
 * Integration: GitHub CLI (gh) + GitHub REST API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');
const REPO_OWNER = 'ericsocrat';
const REPO_NAME = 'Lokifi';
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;

// Helper: Execute GitHub CLI command
function execGH(command, options = {}) {
  try {
    const result = execSync(`gh ${command} --repo ${REPO_FULL}`, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large logs
      ...options,
    });
    return result.trim();
  } catch (error) {
    throw new Error(`GitHub CLI error: ${error.message}`);
  }
}

// Helper: Parse JSON from GitHub CLI
function execGHJson(command) {
  const output = execGH(command);
  return JSON.parse(output);
}

// Tool 1: Get workflow run status
function getWorkflowStatus({ workflow_name, limit = 10, branch = 'main' }) {
  const filters = [];
  if (workflow_name) filters.push(`--workflow="${workflow_name}"`);
  if (branch) filters.push(`--branch=${branch}`);
  filters.push(`--limit=${limit}`);

  const runs = execGHJson(
    `run list ${filters.join(' ')} --json databaseId,displayTitle,headBranch,status,conclusion,createdAt,updatedAt,workflowName,url`
  );

  const summary = {
    total: runs.length,
    successful: runs.filter((r) => r.conclusion === 'success').length,
    failed: runs.filter((r) => r.conclusion === 'failure').length,
    cancelled: runs.filter((r) => r.conclusion === 'cancelled').length,
    in_progress: runs.filter((r) => r.status === 'in_progress').length,
    recent_runs: runs.map((r) => ({
      id: r.databaseId,
      title: r.displayTitle,
      workflow: r.workflowName,
      branch: r.headBranch,
      status: r.status,
      conclusion: r.conclusion,
      created: r.createdAt,
      url: r.url,
    })),
  };

  return summary;
}

// Tool 2: Get detailed workflow logs
function getWorkflowLogs({ run_id, job_name, failed_only = true }) {
  // Get run details
  const runInfo = execGHJson(`run view ${run_id} --json jobs,conclusion,url`);

  let jobs = runInfo.jobs;
  if (failed_only) {
    jobs = jobs.filter((j) => j.conclusion === 'failure');
  }
  if (job_name) {
    jobs = jobs.filter((j) => j.name.includes(job_name));
  }

  const results = {
    run_id,
    run_url: runInfo.url,
    run_conclusion: runInfo.conclusion,
    jobs: jobs.map((job) => {
      // Get logs for this job
      let logs = '';
      try {
        logs = execGH(`run view ${run_id} --log --job=${job.databaseId}`, {
          maxBuffer: 50 * 1024 * 1024, // 50MB for logs
        });

        // Extract error patterns
        const errorLines = logs
          .split('\n')
          .filter(
            (line) =>
              line.includes('ERROR') ||
              line.includes('FAIL') ||
              line.includes('Error:') ||
              line.includes('✗')
          )
          .slice(0, 50); // Limit to first 50 error lines

        return {
          job_id: job.databaseId,
          name: job.name,
          conclusion: job.conclusion,
          started: job.startedAt,
          completed: job.completedAt,
          error_summary: errorLines,
          full_logs_available: true,
        };
      } catch (error) {
        return {
          job_id: job.databaseId,
          name: job.name,
          conclusion: job.conclusion,
          error: `Could not fetch logs: ${error.message}`,
        };
      }
    }),
  };

  return results;
}

// Tool 3: Analyze workflow artifacts
function analyzeArtifacts({ run_id }) {
  const artifacts = execGHJson(`run view ${run_id} --json artifacts`).artifacts || [];

  const summary = {
    run_id,
    total_artifacts: artifacts.length,
    artifacts: artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      size_bytes: a.sizeInBytes,
      size_mb: (a.sizeInBytes / (1024 * 1024)).toFixed(2),
      expired: a.expired,
      created: a.createdAt,
      expires: a.expiresAt,
    })),
    total_size_mb: artifacts
      .reduce((sum, a) => sum + a.sizeInBytes, 0)
      / (1024 * 1024),
  };

  return summary;
}

// Tool 4: Get job-level analysis
function analyzeJobPerformance({ run_id, include_steps = false }) {
  const runInfo = execGHJson(
    `run view ${run_id} --json jobs,workflowName,conclusion,startedAt,completedAt`
  );

  const jobs = runInfo.jobs.map((job) => {
    const startTime = new Date(job.startedAt);
    const endTime = new Date(job.completedAt);
    const durationMs = endTime - startTime;
    const durationMin = (durationMs / 60000).toFixed(2);

    const jobData = {
      name: job.name,
      conclusion: job.conclusion,
      duration_minutes: durationMin,
      started: job.startedAt,
      completed: job.completedAt,
    };

    if (include_steps && job.steps) {
      jobData.steps = job.steps.map((step) => {
        const stepStart = new Date(step.startedAt);
        const stepEnd = new Date(step.completedAt);
        const stepDuration = ((stepEnd - stepStart) / 1000).toFixed(1);

        return {
          name: step.name,
          conclusion: step.conclusion,
          duration_seconds: stepDuration,
          number: step.number,
        };
      });
    }

    return jobData;
  });

  const totalDuration = jobs.reduce(
    (sum, job) => sum + parseFloat(job.duration_minutes),
    0
  );

  return {
    run_id,
    workflow: runInfo.workflowName,
    total_duration_minutes: totalDuration.toFixed(2),
    job_count: jobs.length,
    jobs,
  };
}

// Tool 5: Identify failure patterns
function identifyFailurePatterns({ workflow_name, lookback_runs = 20 }) {
  const runs = execGHJson(
    `run list --workflow="${workflow_name}" --limit=${lookback_runs} --json databaseId,conclusion,jobs`
  );

  const failures = runs.filter((r) => r.conclusion === 'failure');
  const failureRate = ((failures.length / runs.length) * 100).toFixed(1);

  // Collect all failed jobs
  const failedJobs = failures.flatMap((run) =>
    run.jobs
      .filter((j) => j.conclusion === 'failure')
      .map((j) => ({ run_id: run.databaseId, job_name: j.name }))
  );

  // Count job failures
  const jobFailureCounts = {};
  failedJobs.forEach(({ job_name }) => {
    jobFailureCounts[job_name] = (jobFailureCounts[job_name] || 0) + 1;
  });

  // Sort by failure count
  const topFailingJobs = Object.entries(jobFailureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ job_name: name, failure_count: count }));

  return {
    workflow: workflow_name,
    analyzed_runs: runs.length,
    total_failures: failures.length,
    failure_rate: `${failureRate}%`,
    top_failing_jobs: topFailingJobs,
    recommendation:
      failureRate > 20
        ? 'High failure rate - investigate top failing jobs'
        : failureRate > 10
        ? 'Moderate failure rate - monitor trends'
        : 'Healthy workflow',
  };
}

// Tool 6: Get workflow performance metrics
function getPerformanceMetrics({ workflow_name, lookback_runs = 10 }) {
  const runs = execGHJson(
    `run list --workflow="${workflow_name}" --limit=${lookback_runs} --json databaseId,conclusion,createdAt,updatedAt`
  );

  const durations = runs
    .filter((r) => r.conclusion === 'success')
    .map((r) => {
      const start = new Date(r.createdAt);
      const end = new Date(r.updatedAt);
      return (end - start) / 60000; // minutes
    });

  if (durations.length === 0) {
    return {
      workflow: workflow_name,
      error: 'No successful runs found in lookback period',
    };
  }

  const avgDuration = (
    durations.reduce((sum, d) => sum + d, 0) / durations.length
  ).toFixed(2);
  const minDuration = Math.min(...durations).toFixed(2);
  const maxDuration = Math.max(...durations).toFixed(2);

  return {
    workflow: workflow_name,
    analyzed_runs: durations.length,
    avg_duration_minutes: avgDuration,
    min_duration_minutes: minDuration,
    max_duration_minutes: maxDuration,
    performance_rating:
      avgDuration < 5
        ? 'Excellent'
        : avgDuration < 10
        ? 'Good'
        : avgDuration < 20
        ? 'Average'
        : 'Needs optimization',
  };
}

// Tool 7: Get workflow recommendations
function getWorkflowRecommendations({ workflow_name }) {
  try {
    // Analyze recent performance
    const performance = getPerformanceMetrics({ workflow_name, lookback_runs: 20 });
    const patterns = identifyFailurePatterns({ workflow_name, lookback_runs: 30 });

    const recommendations = [];

    // Duration recommendations
    if (performance.avg_duration_minutes > 15) {
      recommendations.push({
        category: 'Performance',
        severity: 'medium',
        issue: `Average run time is ${performance.avg_duration_minutes} minutes`,
        suggestion: 'Consider parallelizing jobs or caching dependencies',
      });
    }

    // Failure rate recommendations
    const failureRate = parseFloat(patterns.failure_rate);
    if (failureRate > 20) {
      recommendations.push({
        category: 'Reliability',
        severity: 'high',
        issue: `Failure rate is ${patterns.failure_rate}`,
        suggestion: `Investigate top failing jobs: ${patterns.top_failing_jobs
          .slice(0, 3)
          .map((j) => j.job_name)
          .join(', ')}`,
      });
    } else if (failureRate > 10) {
      recommendations.push({
        category: 'Reliability',
        severity: 'medium',
        issue: `Failure rate is ${patterns.failure_rate}`,
        suggestion: 'Monitor trends and add retry logic for flaky tests',
      });
    }

    // Check for common issues
    if (patterns.top_failing_jobs.length > 0) {
      const topJob = patterns.top_failing_jobs[0];
      if (topJob.failure_count > 5) {
        recommendations.push({
          category: 'Stability',
          severity: 'high',
          issue: `Job "${topJob.job_name}" failed ${topJob.failure_count} times`,
          suggestion: 'This job is consistently failing - prioritize fixing it',
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        category: 'Health',
        severity: 'info',
        issue: 'No issues detected',
        suggestion: 'Workflow is performing well',
      });
    }

    return {
      workflow: workflow_name,
      overall_health:
        recommendations.some((r) => r.severity === 'high')
          ? 'Poor'
          : recommendations.some((r) => r.severity === 'medium')
          ? 'Fair'
          : 'Good',
      recommendations,
      metrics: {
        avg_duration: performance.avg_duration_minutes,
        failure_rate: patterns.failure_rate,
      },
    };
  } catch (error) {
    return {
      workflow: workflow_name,
      error: `Could not analyze workflow: ${error.message}`,
    };
  }
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'lokifi-ci',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_workflow_status',
      description:
        'Get status of recent workflow runs with filtering by workflow name and branch',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_name: {
            type: 'string',
            description: 'Filter by workflow name (e.g., "CI", "security.yml")',
          },
          limit: {
            type: 'number',
            description: 'Number of recent runs to fetch (default: 10)',
            default: 10,
          },
          branch: {
            type: 'string',
            description: 'Filter by branch (default: main)',
            default: 'main',
          },
        },
      },
    },
    {
      name: 'get_workflow_logs',
      description:
        'Get detailed logs from a workflow run with error extraction and filtering',
      inputSchema: {
        type: 'object',
        properties: {
          run_id: {
            type: 'number',
            description: 'Workflow run ID (from get_workflow_status)',
          },
          job_name: {
            type: 'string',
            description: 'Filter logs by job name (partial match)',
          },
          failed_only: {
            type: 'boolean',
            description: 'Only show failed jobs (default: true)',
            default: true,
          },
        },
        required: ['run_id'],
      },
    },
    {
      name: 'analyze_artifacts',
      description: 'List and analyze artifacts from a workflow run (test reports, coverage, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          run_id: {
            type: 'number',
            description: 'Workflow run ID',
          },
        },
        required: ['run_id'],
      },
    },
    {
      name: 'analyze_job_performance',
      description:
        'Analyze job-level performance including duration and step breakdown',
      inputSchema: {
        type: 'object',
        properties: {
          run_id: {
            type: 'number',
            description: 'Workflow run ID',
          },
          include_steps: {
            type: 'boolean',
            description: 'Include step-by-step timing breakdown (default: false)',
            default: false,
          },
        },
        required: ['run_id'],
      },
    },
    {
      name: 'identify_failure_patterns',
      description:
        'Identify patterns in workflow failures across multiple runs to find recurring issues',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_name: {
            type: 'string',
            description: 'Workflow to analyze',
          },
          lookback_runs: {
            type: 'number',
            description: 'Number of recent runs to analyze (default: 20)',
            default: 20,
          },
        },
        required: ['workflow_name'],
      },
    },
    {
      name: 'get_performance_metrics',
      description:
        'Get performance metrics for a workflow (avg duration, min/max, rating)',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_name: {
            type: 'string',
            description: 'Workflow to analyze',
          },
          lookback_runs: {
            type: 'number',
            description: 'Number of recent runs to analyze (default: 10)',
            default: 10,
          },
        },
        required: ['workflow_name'],
      },
    },
    {
      name: 'get_workflow_recommendations',
      description:
        'Get actionable recommendations for improving workflow reliability and performance',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_name: {
            type: 'string',
            description: 'Workflow to analyze',
          },
        },
        required: ['workflow_name'],
      },
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    let result;
    switch (name) {
      case 'get_workflow_status':
        result = getWorkflowStatus(args);
        break;
      case 'get_workflow_logs':
        result = getWorkflowLogs(args);
        break;
      case 'analyze_artifacts':
        result = analyzeArtifacts(args);
        break;
      case 'analyze_job_performance':
        result = analyzeJobPerformance(args);
        break;
      case 'identify_failure_patterns':
        result = identifyFailurePatterns(args);
        break;
      case 'get_performance_metrics':
        result = getPerformanceMetrics(args);
        break;
      case 'get_workflow_recommendations':
        result = getWorkflowRecommendations(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('lokifi-ci MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
