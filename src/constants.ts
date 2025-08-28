/**
 * API endpoint constants for the SlugKit SDK
 */

/**
 * API version prefix
 */
export const API_VERSION = '/api/v1';

/**
 * JWK (JSON Web Key) endpoints
 */
export const JWK_ENDPOINTS = {
  /** Fetch SDK keys from backend */
  FETCH_SDK_KEYS: `${API_VERSION}/jwks`,
} as const;

/**
 * Forge endpoints for generating slugs
 */
export const FORGE_ENDPOINTS = {
  /** Generate random slugs from a pattern */
  GENERATE_SLUGS: `${API_VERSION}/gen/forge`,
  /** Check pattern capacity */
  CHECK_CAPACITY: `${API_VERSION}/forge/capacity`,
  /** Get pattern info */
  GET_PATTERN_INFO: `${API_VERSION}/gen/pattern-info`,
} as const;

/**
 * Statistics endpoints
 */
export const STATS_ENDPOINTS = {
  /** Get total stats for all events */
  GET_TOTALS: `${API_VERSION}/gen/stats/totals`,
} as const;

/**
 * Generator endpoints
 */
export const GENERATOR_ENDPOINTS = {
  /** Get dictionary statistics */
  GET_DICTIONARY_STATS: `${API_VERSION}/gen/dictionary-info`,
  GET_TAGS: `${API_VERSION}/gen/dictionary-tags`,
} as const;

/**
 * URL shortening endpoints
 */
export const SHORTEN_ENDPOINTS = {
  /** Shorten a pattern to a slug */
  SHORTEN_PATTERN: `${API_VERSION}/shorten`,
  /** Expand a shortened slug back to pattern */
  EXPAND_PATTERN: `${API_VERSION}/expand`,
} as const;



/**
 * All API endpoints grouped by category
 */
export const API_ENDPOINTS = {
  JWK: JWK_ENDPOINTS,
  FORGE: FORGE_ENDPOINTS,
  STATS: STATS_ENDPOINTS,
  GENERATOR: GENERATOR_ENDPOINTS,
  SHORTEN: SHORTEN_ENDPOINTS,
} as const;
