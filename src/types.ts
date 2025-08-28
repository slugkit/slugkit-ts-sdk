/**
 * Core data structures for the SlugKit SDK
 */

/**
 * Statistics for a dictionary kind
 */
export interface DictionaryStats {
  kind: string;
  count: number;
}

/**
 * Tag information for dictionary entries
 */
export interface DictionaryTag {
  kind: string;
  tag: string;
  description: string;
  opt_in: boolean;
  word_count: number;
}

/**
 * Pattern info
 */
export interface PatternInfo {
  pattern: string;
  capacity: string;
  max_slug_length: number; /** Maximum length of the generated slug */
  complexity: number; /** Complexity of the pattern */
  components: number; /** Number of components in the pattern */
}

/**
 * Request to shorten a pattern to a slug for sharing
 */
export interface ShortenPatternRequest {
  pattern: string;
  seed?: string;
  sequence?: number;
}

/**
 * Response from shortening a pattern
 */
export interface ShortenPatternResponse {
  slug: string;
}
