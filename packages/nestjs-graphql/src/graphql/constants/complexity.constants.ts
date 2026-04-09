/**
 * GraphQL Query Complexity Constants
 *
 * Configuration thresholds and limits for query complexity analysis.
 */

// Query complexity thresholds
export const QUERY_COMPLEXITY_THRESHOLD = 1_000;
export const QUERY_DEPTH_LIMIT = 10;
export const QUERY_COMPLEXITY_SCALAR_WEIGHT = 10;

// Complexity calculation configuration
export const QUERY_COMPLEXITY_DEFAULT_DEPTH_MULTIPLIER = 2;
export const QUERY_COMPLEXITY_CACHE_CLEANUP_INTERVAL_MS = 600_000; // 10 minutes
export const QUERY_COMPLEXITY_CACHE_MAX_SIZE = 1_000;

// Cache eviction thresholds (in milliseconds)
export const QUERY_COMPLEXITY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const QUERY_COMPLEXITY_CACHE_IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
