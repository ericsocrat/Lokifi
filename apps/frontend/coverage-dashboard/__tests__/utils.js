/**
 * Dashboard Utility Functions - Extracted for Testing
 * These are the core business logic functions from the dashboard
 */

/**
 * Sort gaps based on selected criteria
 * @param {Array} gaps - Array of gap objects
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted array
 */
export function sortGaps(gaps, sortBy) {
  const sorted = [...gaps];

  switch (sortBy) {
    case 'priority':
      // Default: HIGH > MEDIUM > LOW
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;

    case 'impact-desc':
      sorted.sort((a, b) => (b.metrics?.impact || 0) - (a.metrics?.impact || 0));
      break;

    case 'impact-asc':
      sorted.sort((a, b) => (a.metrics?.impact || 0) - (b.metrics?.impact || 0));
      break;

    case 'complexity-desc':
      sorted.sort((a, b) => (b.metrics?.complexity || 0) - (a.metrics?.complexity || 0));
      break;

    case 'complexity-asc':
      sorted.sort((a, b) => (a.metrics?.complexity || 0) - (b.metrics?.complexity || 0));
      break;

    case 'coverage-asc':
      sorted.sort((a, b) => a.coverage - b.coverage);
      break;

    case 'coverage-desc':
      sorted.sort((a, b) => b.coverage - a.coverage);
      break;

    case 'filename':
      sorted.sort((a, b) => a.file.localeCompare(b.file));
      break;
  }

  return sorted;
}

/**
 * Calculate pagination values
 * @param {number} totalItems - Total number of items
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {Object} Pagination data
 */
export function calculatePagination(totalItems, currentPage, itemsPerPage) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const startItem = totalItems === 0 ? 0 : startIndex + 1; // Fix: handle zero items
  const endItem = endIndex;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    totalPages,
    startIndex,
    endIndex,
    startItem,
    endItem,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Generate CSV content from gaps
 * @param {Array} gaps - Array of gap objects
 * @param {Object} options - Export options
 * @returns {string} CSV content
 */
export function generateCSV(gaps, options = {}) {
  const { includeMetadata = false, includeTimestamp = true } = options;

  let csv = '';

  // Timestamp header (default true to match dashboard behavior)
  if (includeTimestamp) {
    csv += `# Generated: ${new Date().toISOString()}\n`;
  }

  // Column headers (match actual dashboard format)
  csv += `File,Coverage %,Priority,Uncovered Lines,Complexity,Impact\n`;

  // Data rows
  gaps.forEach((gap) => {
    const file = gap.file.includes(',') ? `"${gap.file}"` : gap.file;
    const coverage = gap.coverage; // Just the number, no %
    const priority = gap.priority;
    const uncoveredLines = gap.metrics?.uncoveredLines || 0;
    const complexity = gap.metrics?.complexity || 0;
    const impact = gap.metrics?.impact || 0;

    csv += `${file},${coverage},${priority},${uncoveredLines},${complexity},${impact}\n`;
  });

  // Metadata footer
  csv += `\n# Total Gaps: ${gaps.length}\n`;

  if (includeMetadata) {
    const avgCoverage = gaps.length
      ? (gaps.reduce((sum, g) => sum + g.coverage, 0) / gaps.length).toFixed(2)
      : '0.00';
    csv += `# Average Coverage: ${avgCoverage}%\n`;
  }

  return csv;
}

/**
 * Generate JSON content from gaps
 * @param {Array} gaps - Array of gap objects
 * @param {Object} options - Export options
 * @returns {Object} JSON object (not stringified)
 */
export function generateJSON(gaps, options = {}) {
  const { includeMetadata = false } = options;

  const result = { gaps };

  if (includeMetadata) {
    const totalFiles = gaps.length;
    const avgCoverage =
      totalFiles > 0
        ? parseFloat((gaps.reduce((sum, g) => sum + g.coverage, 0) / totalFiles).toFixed(2))
        : 0;

    const priorityCounts = {
      high: gaps.filter((g) => g.priority === 'HIGH').length,
      medium: gaps.filter((g) => g.priority === 'MEDIUM').length,
      low: gaps.filter((g) => g.priority === 'LOW').length,
    };

    const totalImpact = gaps.reduce((sum, g) => sum + (g.metrics?.impact || 0), 0);
    const totalComplexity = gaps.reduce((sum, g) => sum + (g.metrics?.complexity || 0), 0);

    result.metadata = {
      totalFiles,
      averageCoverage: avgCoverage,
      highPriorityCount: priorityCounts.high,
      mediumPriorityCount: priorityCounts.medium,
      lowPriorityCount: priorityCounts.low,
      totalImpact,
      totalComplexity,
    };
  }

  // Return the object, not stringified (tests expect object, can stringify later)
  return result;
}

/**
 * Create a debounced version of a function
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function createDebounce(callback, delay = 300) {
  let timeoutId = null;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}

/**
 * Calculate velocity (change rate) from trends data
 * @param {Array} trends - Array of trend objects with coverage data
 * @returns {Object|null} Velocity statistics or null if insufficient data
 */
export function calculateVelocity(trends) {
  if (!trends || trends.length < 2) {
    return null; // Return null for insufficient data
  }

  const velocities = [];
  for (let i = 1; i < trends.length; i++) {
    // Support both {coverage: number} and {coverage: {lines: number}} formats
    const current =
      typeof trends[i].coverage === 'number' ? trends[i].coverage : trends[i].coverage.lines;
    const previous =
      typeof trends[i - 1].coverage === 'number'
        ? trends[i - 1].coverage
        : trends[i - 1].coverage.lines;
    const velocity = parseFloat((current - previous).toFixed(2));
    velocities.push(velocity);
  }

  if (velocities.length === 0) {
    return null;
  }

  const avgVelocity =
    parseFloat((velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(2)) || 0;

  // Find max increase (only from positive values)
  const positiveVelocities = velocities.filter((v) => v > 0);
  const maxIncrease = positiveVelocities.length > 0 ? Math.max(...positiveVelocities) : 0;

  // Find max decrease (only from negative values)
  const negativeVelocities = velocities.filter((v) => v < 0);
  const maxDecrease = negativeVelocities.length > 0 ? Math.min(...negativeVelocities) : 0;

  // Calculate standard deviation for volatility
  const variance =
    velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
  const volatility = parseFloat(Math.sqrt(variance).toFixed(2));

  return {
    velocities,
    avgVelocity,
    maxIncrease,
    maxDecrease,
    volatility,
  };
}

/**
 * Get color for heatmap based on coverage percentage
 * @param {number} percentage - Coverage percentage (0-100)
 * @returns {string} RGB color string
 */
export function getHeatmapColor(percentage) {
  if (percentage >= 90) return 'rgb(34, 197, 94)'; // green-500
  if (percentage >= 80) return 'rgb(74, 222, 128)'; // green-400
  if (percentage >= 70) return 'rgb(132, 204, 22)'; // lime-500
  if (percentage >= 60) return 'rgb(234, 179, 8)'; // yellow-500
  if (percentage >= 50) return 'rgb(251, 146, 60)'; // orange-400
  if (percentage >= 40) return 'rgb(249, 115, 22)'; // orange-500
  if (percentage >= 30) return 'rgb(239, 68, 68)'; // red-500
  if (percentage >= 20) return 'rgb(220, 38, 38)'; // red-600
  if (percentage >= 10) return 'rgb(185, 28, 28)'; // red-700
  return 'rgb(153, 27, 27)'; // red-900
}
