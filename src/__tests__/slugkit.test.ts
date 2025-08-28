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
});
