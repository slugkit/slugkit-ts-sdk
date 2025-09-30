import { SlugKit } from '../slugkit';
import { GENERATOR_ENDPOINTS } from '../constants';

// Mock fetch globally
global.fetch = jest.fn();

describe('SlugKit', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe('fetchDictionaries', () => {
    it('should fetch dictionary statistics successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          { kind: 'noun', count: 1000 },
          { kind: 'adjective', count: 500 },
          { kind: 'verb', count: 300 }
        ])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
      
      // Create a mock SlugKit instance
      const slugkit = new SlugKit();
      
      // Mock the private fetch method by setting it directly
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaries();
      
      expect(result).toEqual([
        { kind: 'noun', count: 1000 },
        { kind: 'adjective', count: 500 },
        { kind: 'verb', count: 300 }
      ]);
              expect((slugkit as any).fetch).toHaveBeenCalledWith('GET', GENERATOR_ENDPOINTS.GET_DICTIONARY_STATS, '');
    });

    it('should handle empty response array', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaries();
      
      expect(result).toEqual([]);
    });

    it('should handle non-array response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ error: 'Invalid response' })
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaries();
      
      expect(result).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(slugkit.fetchDictionaries()).rejects.toThrow('Network error');
    });
  });

  describe('fetchDictionaryTags', () => {
    it('should fetch dictionary tags successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            kind: 'noun',
            name: 'formal',
            description: 'Formal language',
            opt_in: true,
            word_count: 100
          },
          {
            kind: 'noun',
            name: 'casual',
            description: 'Casual language',
            opt_in: false,
            word_count: 200
          }
        ])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaryTags();
      
      expect(result).toEqual([
        {
          kind: 'noun',
          name: 'formal',
          description: 'Formal language',
          opt_in: true,
          word_count: 100
        },
        {
          kind: 'noun',
          name: 'casual',
          description: 'Casual language',
          opt_in: false,
          word_count: 200
        }
      ]);
              expect((slugkit as any).fetch).toHaveBeenCalledWith('GET', GENERATOR_ENDPOINTS.GET_TAGS, '');
    });

    it('should handle empty response array', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaryTags();
      
      expect(result).toEqual([]);
    });

    it('should handle non-array response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ error: 'Invalid response' })
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.fetchDictionaryTags();
      
      expect(result).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(slugkit.fetchDictionaryTags()).rejects.toThrow('Network error');
    });
  });

  describe('getDictionaries (cached)', () => {
    it('should return cached data on subsequent calls', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          { kind: 'noun', count: 1000 },
          { kind: 'verb', count: 500 }
        ])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      // First call should fetch from backend
      const result1 = await slugkit.getDictionaries();
      expect(result1).toEqual([
        { kind: 'noun', count: 1000 },
        { kind: 'verb', count: 500 }
      ]);
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(1);
      
      // Second call should return cached data
      const result2 = await slugkit.getDictionaries();
      expect(result2).toEqual([
        { kind: 'noun', count: 1000 },
        { kind: 'verb', count: 500 }
      ]);
      // fetch should not be called again
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and not cache failed responses', async () => {
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // First call should fail
      await expect(slugkit.getDictionaries()).rejects.toThrow('Network error');
      
      // Cache should still be null
      expect((slugkit as any).dictionariesCache).toBeNull();
      
      // Second call should still fail (not cached)
      await expect(slugkit.getDictionaries()).rejects.toThrow('Network error');
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(2);
    });

    it('should cache successful responses', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          { kind: 'adjective', count: 750 }
        ])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.getDictionaries();
      expect(result).toEqual([{ kind: 'adjective', count: 750 }]);
      
      // Verify cache is set
      expect((slugkit as any).dictionariesCache).toEqual([
        { kind: 'adjective', count: 750 }
      ]);
    });
  });

  describe('getDictionaryTags (cached)', () => {
    it('should return cached data on subsequent calls', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            kind: 'noun',
            name: 'technical',
            description: 'Technical terminology',
            opt_in: true,
            word_count: 150
          }
        ])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      // First call should fetch from backend
      const result1 = await slugkit.getDictionaryTags();
      expect(result1).toEqual([
        {
          kind: 'noun',
          name: 'technical',
          description: 'Technical terminology',
          opt_in: true,
          word_count: 150
        }
      ]);
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(1);
      
      // Second call should return cached data
      const result2 = await slugkit.getDictionaryTags();
      expect(result2).toEqual([
        {
          kind: 'noun',
          name: 'technical',
          description: 'Technical terminology',
          opt_in: true,
          word_count: 150
        }
      ]);
      // fetch should not be called again
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and not cache failed responses', async () => {
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // First call should fail
      await expect(slugkit.getDictionaryTags()).rejects.toThrow('Network error');
      
      // Cache should still be null
      expect((slugkit as any).dictionaryTagsCache).toBeNull();
      
      // Second call should still fail (not cached)
      await expect(slugkit.getDictionaryTags()).rejects.toThrow('Network error');
      expect((slugkit as any).fetch).toHaveBeenCalledTimes(2);
    });

    it('should cache successful responses', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            kind: 'verb',
            name: 'informal',
            description: 'Informal language',
            opt_in: false,
            word_count: 300
          }
        ])
      };
      
      const slugkit = new SlugKit();
      (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await slugkit.getDictionaryTags();
      expect(result).toEqual([
        {
          kind: 'verb',
          name: 'informal',
          description: 'Informal language',
          opt_in: false,
          word_count: 300
        }
      ]);
      
      // Verify cache is set
      expect((slugkit as any).dictionaryTagsCache).toEqual([
        {
          kind: 'verb',
          name: 'informal',
          description: 'Informal language',
          opt_in: false,
          word_count: 300
        }
      ]);
    });
  });

  describe('API Key Authentication', () => {
    describe('fromApiKey factory method', () => {
      it('should create SlugKit instance with API key', () => {
        const backend = 'https://api.example.com';
        const apiKey = 'sk_test_123456';
        
        const slugkit = SlugKit.fromApiKey(backend, apiKey);
        
        expect((slugkit as any).backend).toBe(backend);
        expect((slugkit as any).apiKey).toBe(apiKey);
        expect((slugkit as any).sdkSlug).toBeUndefined();
        expect((slugkit as any).privateKey).toBeUndefined();
      });

      it('should not schedule refresh for API key mode', () => {
        const backend = 'https://api.example.com';
        const apiKey = 'sk_test_123456';
        
        const slugkit = SlugKit.fromApiKey(backend, apiKey);
        
        expect((slugkit as any).refreshTimeout).toBeNull();
      });
    });

    describe('fetch with API key authentication', () => {
      let slugkit: SlugKit;
      
      beforeEach(() => {
        slugkit = SlugKit.fromApiKey('https://api.example.com', 'sk_test_123456');
      });

      it('should include x-api-key header in requests', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await (slugkit as any).fetch('GET', '/test', '');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'content-type': 'application/json',
              'x-api-key': 'sk_test_123456'
            })
          })
        );
      });

      it('should not include JWK headers for API key requests', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await (slugkit as any).fetch('POST', '/test', '{"test": "data"}');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'POST',
            headers: expect.not.objectContaining({
              'x-timestamp': expect.any(String),
              'x-sdk-slug': expect.any(String),
              'x-signature': expect.any(String)
            })
          })
        );
      });

      it('should include request body for non-GET requests', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        const testBody = '{"pattern": "{adjective}-{noun}"}';
        await (slugkit as any).fetch('POST', '/test', testBody);
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'POST',
            body: testBody
          })
        );
      });
    });

    describe('API key error handling', () => {
      let slugkit: SlugKit;
      
      beforeEach(() => {
        slugkit = SlugKit.fromApiKey('https://api.example.com', 'sk_test_invalid');
      });

      it('should handle 401 errors without refresh attempts', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: jest.fn().mockResolvedValue({ message: 'Invalid API key' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await expect((slugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow('Authentication failed: Invalid API key');
        
        // Should only make one request (no retry)
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should handle 403 errors without refresh attempts', async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: jest.fn().mockResolvedValue({ message: 'API key lacks required permissions' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await expect((slugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow('Authentication failed: API key lacks required permissions');
        
        // Should only make one request (no retry)
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should handle other HTTP errors normally', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: jest.fn().mockResolvedValue({ message: 'Resource not found' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await expect((slugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow('Resource not found: Resource not found');
      });

      it('should handle rate limiting errors', async () => {
        const mockResponse = {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: jest.fn().mockResolvedValue({ message: 'Rate limit exceeded' })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        await expect((slugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow('Rate limit exceeded: Rate limit exceeded');
      });
    });

    describe('API key integration with existing methods', () => {
      let slugkit: SlugKit;
      
      beforeEach(() => {
        slugkit = SlugKit.fromApiKey('https://api.example.com', 'sk_test_123456');
      });

      it('should work with forgeSlugs method', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(['happy-cat', 'brave-dog', 'clever-fox'])
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        const result = await slugkit.forgeSlugs('{adjective}-{noun}', 3, undefined, undefined);
        
        expect(result).toEqual(['happy-cat', 'brave-dog', 'clever-fox']);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/forge'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-api-key': 'sk_test_123456'
            })
          })
        );
      });

      it('should work with getDictionaries method', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue([
            { kind: 'noun', count: 1000 },
            { kind: 'adjective', count: 500 }
          ])
        };
        
        // Mock the private fetch method
        (slugkit as any).fetch = jest.fn().mockResolvedValue(mockResponse);
        
        const result = await slugkit.getDictionaries();
        
        expect(result).toEqual([
          { kind: 'noun', count: 1000 },
          { kind: 'adjective', count: 500 }
        ]);
      });

      it('should work with getPatternInfo method', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            pattern: '{adjective}-{noun}',
            capacity: '500000',
            max_slug_length: 20,
            complexity: 2,
            components: 2
          })
        };
        
        mockFetch.mockResolvedValue(mockResponse as any);
        
        const result = await slugkit.getPatternInfo('{adjective}-{noun}');
        
        expect(result).toEqual({
          pattern: '{adjective}-{noun}',
          capacity: '500000',
          max_slug_length: 20,
          complexity: 2,
          components: 2
        });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/pattern-info'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-api-key': 'sk_test_123456'
            })
          })
        );
      });
    });

    describe('Comparison with JWK mode', () => {
      it('should handle 403 differently for JWK vs API key modes', async () => {
        // JWK mode setup - create a mock instance
        const jwkSlugkit = new SlugKit();
        (jwkSlugkit as any).backend = 'https://api.example.com';
        (jwkSlugkit as any).sdkSlug = 'test-sdk';
        (jwkSlugkit as any).privateKey = {} as CryptoKey; // Mock key
        (jwkSlugkit as any).apiKey = undefined; // Ensure this is JWK mode
        
        // Mock refresh method for JWK mode
        (jwkSlugkit as any).refresh = jest.fn().mockResolvedValue(undefined);
        (jwkSlugkit as any).signRequest = jest.fn().mockResolvedValue('mock-signature');
        
        // API key mode setup
        const apiKeySlugkit = SlugKit.fromApiKey('https://api.example.com', 'sk_test_123');
        
        const mockResponse403 = {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: jest.fn().mockResolvedValue({ message: 'Access denied' })
        };
        
        // Test API key mode - should NOT attempt refresh
        mockFetch.mockResolvedValue(mockResponse403 as any);
        
        await expect((apiKeySlugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow('Authentication failed: Access denied');
        
        expect(mockFetch).toHaveBeenCalledTimes(1); // No retry for API key mode
        
        // Reset mock for JWK test
        mockFetch.mockClear();
        mockFetch.mockResolvedValue(mockResponse403 as any);
        
        // Test JWK mode - should attempt refresh (will fail in test but that's expected)
        await expect((jwkSlugkit as any).fetch('GET', '/test', ''))
          .rejects.toThrow(); // Will throw due to mocking limitations
        
        // Verify refresh was called for JWK mode
        expect((jwkSlugkit as any).refresh).toHaveBeenCalled();
      });
    });
  });
});
