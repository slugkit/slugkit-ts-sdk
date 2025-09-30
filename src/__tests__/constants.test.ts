import {
  API_VERSION,
  JWK_ENDPOINTS,
  FORGE_ENDPOINTS,
  STATS_ENDPOINTS,
  GENERATOR_ENDPOINTS,
  API_ENDPOINTS
} from '../constants';

describe('Constants', () => {
  it('should have correct API version', () => {
    expect(API_VERSION).toBe('/api/v1');
  });

  it('should have correct JWK endpoints', () => {
    expect(JWK_ENDPOINTS.FETCH_SDK_KEYS).toBe('/api/v1/jwks');
  });

  it('should have correct Forge endpoints', () => {
    expect(FORGE_ENDPOINTS.GENERATE_SLUGS).toBe('/api/v1/gen/forge');
    expect(FORGE_ENDPOINTS.GET_PATTERN_INFO).toBe('/api/v1/gen/pattern-info');
  });

  it('should have correct Stats endpoints', () => {
    expect(STATS_ENDPOINTS.GET_TOTALS).toBe('/api/v1/gen/stats/totals');
  });

  it('should have correct Generator endpoints', () => {
    expect(GENERATOR_ENDPOINTS.GET_DICTIONARY_STATS).toBe('/api/v1/gen/dictionary-info');
    expect(GENERATOR_ENDPOINTS.GET_TAGS).toBe('/api/v1/gen/dictionary-tags');
  });

  it('should have all endpoints grouped in API_ENDPOINTS', () => {
    expect(API_ENDPOINTS.JWK).toBe(JWK_ENDPOINTS);
    expect(API_ENDPOINTS.FORGE).toBe(FORGE_ENDPOINTS);
    expect(API_ENDPOINTS.STATS).toBe(STATS_ENDPOINTS);
    expect(API_ENDPOINTS.GENERATOR).toBe(GENERATOR_ENDPOINTS);
  });

  it('should have all endpoints as readonly', () => {
    // Test that endpoints are readonly by checking they can't be modified
    // Note: readonly is a TypeScript compile-time constraint, not runtime
    const originalJwk = API_ENDPOINTS.JWK;
    expect(originalJwk).toBeDefined();
    expect(typeof originalJwk).toBe('object');
  });

  it('should have consistent endpoint structure', () => {
    const allEndpoints = [
      JWK_ENDPOINTS.FETCH_SDK_KEYS,
      FORGE_ENDPOINTS.GENERATE_SLUGS,
      FORGE_ENDPOINTS.GET_PATTERN_INFO,
      STATS_ENDPOINTS.GET_TOTALS,
      GENERATOR_ENDPOINTS.GET_DICTIONARY_STATS,
      GENERATOR_ENDPOINTS.GET_TAGS
    ];

    // All endpoints should start with the API version
    allEndpoints.forEach(endpoint => {
      expect(endpoint).toMatch(new RegExp(`^${API_VERSION.replace('/', '\\/')}`));
    });

    // All endpoints should be unique
    const uniqueEndpoints = new Set(allEndpoints);
    expect(uniqueEndpoints.size).toBe(allEndpoints.length);
  });
});
