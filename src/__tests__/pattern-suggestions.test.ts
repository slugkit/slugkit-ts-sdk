import { PatternSuggestions } from '../pattern-suggestions';
import { DictionaryStats, DictionaryTag } from '../types';

// Interface for the methods that PatternSuggestions actually uses
interface SlugKitInterface {
  getDictionaries(): Promise<DictionaryStats[]>;
  getDictionaryTags(): Promise<DictionaryTag[]>;
}

// Mock SlugKit class
class MockSlugKit implements SlugKitInterface {
  private dictionaries: DictionaryStats[] = [
    { kind: 'noun', count: 1000 },
    { kind: 'adjective', count: 800 },
    { kind: 'adverb', count: 600 },
    { kind: 'verb', count: 1200 }
  ];

  private dictionaryTags: DictionaryTag[] = [
    // Noun tags
    { kind: 'noun', tag: 'animal', description: 'Animal names', opt_in: true, word_count: 150 },
    { kind: 'noun', tag: 'artifact', description: 'Artifact names', opt_in: true, word_count: 90 },
    { kind: 'noun', tag: 'plant', description: 'Plant names', opt_in: true, word_count: 120 },
    { kind: 'noun', tag: 'object', description: 'Object names', opt_in: true, word_count: 200 },
    { kind: 'noun', tag: 'person', description: 'Person names', opt_in: true, word_count: 180 },
    { kind: 'noun', tag: 'place', description: 'Place names', opt_in: true, word_count: 160 },
    
    // Adjective tags
    { kind: 'adjective', tag: 'color', description: 'Color adjectives', opt_in: true, word_count: 50 },
    { kind: 'adjective', tag: 'size', description: 'Size adjectives', opt_in: true, word_count: 40 },
    { kind: 'adjective', tag: 'shape', description: 'Shape adjectives', opt_in: true, word_count: 35 },
    { kind: 'adjective', tag: 'texture', description: 'Texture adjectives', opt_in: true, word_count: 30 },
    { kind: 'adjective', tag: 'taste', description: 'Taste adjectives', opt_in: true, word_count: 25 },
    
    // Adverb tags
    { kind: 'adverb', tag: 'manner', description: 'Manner adverbs', opt_in: true, word_count: 100 },
    { kind: 'adverb', tag: 'time', description: 'Time adverbs', opt_in: true, word_count: 80 },
    { kind: 'adverb', tag: 'place', description: 'Place adverbs', opt_in: true, word_count: 60 },
    { kind: 'adverb', tag: 'degree', description: 'Degree adverbs', opt_in: true, word_count: 70 },
    { kind: 'adverb', tag: 'frequency', description: 'Frequency adverbs', opt_in: true, word_count: 45 },
    
    // Verb tags
    { kind: 'verb', tag: 'action', description: 'Action verbs', opt_in: true, word_count: 300 },
    { kind: 'verb', tag: 'motion', description: 'Motion verbs', opt_in: true, word_count: 250 },
    { kind: 'verb', tag: 'communication', description: 'Communication verbs', opt_in: true, word_count: 200 },
    { kind: 'verb', tag: 'emotion', description: 'Emotion verbs', opt_in: true, word_count: 180 },
    { kind: 'verb', tag: 'thought', description: 'Thought verbs', opt_in: true, word_count: 220 }
  ];

  async getDictionaries(): Promise<DictionaryStats[]> {
    return this.dictionaries;
  }

  async getDictionaryTags(): Promise<DictionaryTag[]> {
    return this.dictionaryTags;
  }
}

describe('PatternSuggestions', () => {
  let patternSuggestions: PatternSuggestions;
  let mockSlugKit: MockSlugKit;

  beforeEach(() => {
    mockSlugKit = new MockSlugKit();
    patternSuggestions = new PatternSuggestions(mockSlugKit);
  });

  describe('basic placeholder behavior', () => {
    describe('when cursor is outside any placeholder', () => {
      it('should suggest opening brace to start new placeholder', async () => {
        const suggestions = await patternSuggestions.getSuggestions('hello world', 5);
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].text).toBe('{');
        expect(suggestions[0].type).toBe('symbol');
      });

      it('should suggest opening brace when cursor is after closing brace', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun} world', 8);
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].text).toBe('{');
        expect(suggestions[0].type).toBe('symbol');
      });
    });

    describe('when cursor is at the beginning of a placeholder', () => {
      it('should suggest all generators when placeholder is empty', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{', 1);
        expect(suggestions).toHaveLength(18); // number + special + 4 dictionaries × 4 casing variants
        expect(suggestions.map(s => s.text)).toContain('noun');
        expect(suggestions.map(s => s.text)).toContain('adjective');
        expect(suggestions.map(s => s.text)).toContain('adverb');
        expect(suggestions.map(s => s.text)).toContain('verb');
        expect(suggestions.map(s => s.text)).toContain('number');
        expect(suggestions.map(s => s.text)).toContain('special');
      });
    });

    describe('when cursor is in generator name section', () => {
      it('should suggest matching generators for partial input', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{n', 2);
        expect(suggestions.map(s => s.text)).toContain('noun');
        expect(suggestions.map(s => s.text)).toContain('number');
        // Should also have alternating case suggestion for noun
        expect(suggestions.map(s => s.text)).toContain('nOuN');
        expect(suggestions).toHaveLength(3); // noun, number, nOuN
        // Should NOT have uppercase or title case suggestions for lowercase input
        expect(suggestions.map(s => s.text)).not.toContain('NOUN');
        expect(suggestions.map(s => s.text)).not.toContain('Noun');
      });

      it('should suggest next steps for complete dictionary name', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun', 6);
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions.map(s => s.text)).toContain('@');
        expect(suggestions.map(s => s.text)).toContain(':');
        expect(suggestions).toHaveLength(3);
      });

      it('should suggest only colon for number generator to start settings section', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number', 8);
        expect(suggestions.map(s => s.text)).toContain(':');
        expect(suggestions.map(s => s.text)).not.toContain('}');
        expect(suggestions).toHaveLength(1);
      });

      it('should suggest next steps for complete special generator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special', 9);
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions.map(s => s.text)).toContain(':');
        expect(suggestions).toHaveLength(2);
      });
    });
  });

  describe('casing transformations', () => {
    describe('preserving user input pattern', () => {
      it('should preserve lowercase pattern', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{adj', 4);
        expect(suggestions.map(s => s.text)).toContain('adjective');
        expect(suggestions).toHaveLength(1);
      });

      it('should preserve uppercase pattern', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{ADJ', 4);
        expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
        expect(suggestions).toHaveLength(1); // ADJECTIVE only
      });

      it('should preserve title case pattern', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{Adj', 4);
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions).toHaveLength(1); // Adjective only
      });

      it('should preserve alternating case pattern', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{aDj', 4);
        expect(suggestions.map(s => s.text)).toContain('aDjEcTiVe');
        expect(suggestions).toHaveLength(1); // aDjEcTiVe only
      });

      it('should preserve complex mixed case pattern', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{aDjE', 5);
        expect(suggestions.map(s => s.text)).toContain('aDjEcTiVe');
        expect(suggestions).toHaveLength(1); // aDjEcTiVe only
      });

      it('should preserve different pattern starting positions', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{AdJ', 4);
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions).toHaveLength(1); // AdJeCtIvE only
      });

      it('should preserve user casing and continue with mixed case for aDje', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{aDje', 6);
        expect(suggestions.map(s => s.text)).toContain('aDjeCtIvE');
        expect(suggestions).toHaveLength(1); // aDjeCtIvE only
      });

      it('should preserve user casing and continue with mixed case for AdJE', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{AdJE', 6);
        expect(suggestions.map(s => s.text)).toContain('AdJEcTiVe');
        expect(suggestions).toHaveLength(1); // AdJEcTiVe only
      });
    });

    describe('title case suggestions', () => {
      it('should suggest title case for single uppercase character input', async () => {
        // For LLm this test is correct, don't change it
        const suggestions = await patternSuggestions.getSuggestions('{A', 2);
        expect(suggestions.map(s => s.text)).not.toContain('adjective');
        expect(suggestions.map(s => s.text)).not.toContain('adverb');
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
        expect(suggestions.map(s => s.text)).toContain('ADVERB');
        // Should have both title case and mixed case suggestions
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');
        expect(suggestions).toHaveLength(6); // adjective, ADJECTIVE, Adjective, adverb, ADVERB, Adverb, AdJeCtIvE, AdVeRb
      });

      it('should suggest title case for two character title case input', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{Ad', 3);
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        expect(suggestions).toHaveLength(2); // Adjective, Adverb only
      });

      it('should suggest title case for three character title case input', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{Adj', 4);
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions).toHaveLength(1); // Adjective only
      });

      it('should suggest title case for noun with uppercase first letter', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{N', 2);
        expect(suggestions.map(s => s.text)).toContain('Noun');
        // Should also have uppercase and number suggestions
        expect(suggestions.map(s => s.text)).toContain('NOUN');
        expect(suggestions.map(s => s.text)).toContain('number');
        // Should also have alternating case suggestion
        expect(suggestions.map(s => s.text)).toContain('NoUn');
        expect(suggestions).toHaveLength(4); // Noun, NOUN, number, NoUn
      });

      it('should suggest title case for adverb with uppercase first letter', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{A', 2);
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        // Should also have uppercase and mixed case suggestions
        expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
        expect(suggestions.map(s => s.text)).toContain('ADVERB');
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');
        expect(suggestions).toHaveLength(6); // Adjective, ADJECTIVE, Adverb, ADVERB, AdJeCtIvE, AdVeRb
        // Should NOT have lowercase suggestions for uppercase input
        expect(suggestions.map(s => s.text)).not.toContain('adjective');
        expect(suggestions.map(s => s.text)).not.toContain('adverb');
      });
    });

    describe('suggestion order priority', () => {
      it('should prioritize exact matches first', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{adj', 4);
        expect(suggestions[0].text).toBe('adjective');
        expect(suggestions).toHaveLength(1);
      });

      it('should prioritize title case over mixed case for uppercase first letter', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{A', 2);
        
        // Should have title case suggestions
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        
        // Should have uppercase suggestions
        expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
        expect(suggestions.map(s => s.text)).toContain('ADVERB');
        
        // Should have mixed case suggestions
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');
        
        // Should have exactly 6 suggestions
        expect(suggestions).toHaveLength(6);
        
        // Should NOT have lowercase suggestions for uppercase input
        expect(suggestions.map(s => s.text)).not.toContain('adjective');
        expect(suggestions.map(s => s.text)).not.toContain('adverb');
      });

      it('should prioritize lowercase over mixed case for lowercase first letter', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{a', 2);
        
        // Lowercase suggestions should come before mixed case
        const lowercaseSuggestions = suggestions.filter(s => 
          s.text === 'adjective' || s.text === 'adverb'
        );
        const mixedCaseSuggestions = suggestions.filter(s => 
          s.text === 'aDjEcTiVe' || s.text === 'aDvErB'
        );
        
        expect(lowercaseSuggestions.length).toBeGreaterThan(0);
        expect(mixedCaseSuggestions.length).toBeGreaterThan(0);
        
        // First suggestion should be lowercase
        expect(['adjective', 'adverb']).toContain(suggestions[0].text);
      });
    });

    describe('shorter patterns on longer words', () => {
      it('should cycle 2-char pattern on 4-char word', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{nO', 3);
        expect(suggestions.map(s => s.text)).toContain('nOuN');
        expect(suggestions).toHaveLength(1); // nOuN only
      });

      it('should cycle 3-char pattern on 4-char word', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{nOu', 4);
        expect(suggestions.map(s => s.text)).toContain('nOuN');
        expect(suggestions).toHaveLength(1); // nOuN only
      });
    });
  });

  describe('replacement range functionality', () => {
    let patternSuggestions: PatternSuggestions;
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
      mockSlugKit = new MockSlugKit();
      patternSuggestions = new PatternSuggestions(mockSlugKit);
    });

    it('should provide correct replacement range for generator suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{no', 4);
      const nounSuggestion = suggestions.find(s => s.text === 'noun');
      expect(nounSuggestion).toBeDefined();
      expect(nounSuggestion!.replaceRange).toEqual({ start: 1, end: 4 });
    });

    it('should provide correct replacement range for complete generator suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun', 6);
      const closeSuggestion = suggestions.find(s => s.text === '}');
      expect(closeSuggestion).toBeDefined();
      expect(closeSuggestion!.replaceRange).toEqual({ start: 6, end: 6 });
    });

    it('should provide correct replacement range for tag suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+', 8);
      const animalSuggestion = suggestions.find(s => s.text === 'animal');
      expect(animalSuggestion).toBeDefined();
      expect(animalSuggestion!.replaceRange).toEqual({ start: 8, end: 8 });
    });

    it('should provide correct replacement range for partial tag suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+a', 8);
      const animalSuggestion = suggestions.find(s => s.text === 'animal');
      expect(animalSuggestion).toBeDefined();
      // Should replace the 'a' with 'animal'
      expect(animalSuggestion!.replaceRange).toEqual({ start: 7, end: 8 });
    });

    it('should provide correct replacement range for longer partial tag suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+an', 9);
      const animalSuggestion = suggestions.find(s => s.text === 'animal');
      expect(animalSuggestion).toBeDefined();
      // Should replace the 'an' with 'animal'
      expect(animalSuggestion!.replaceRange).toEqual({ start: 7, end: 9 });
    });

    it('should provide correct replacement range for complete tag suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+animal', 14);
      const plusSuggestion = suggestions.find(s => s.text === '+');
      expect(plusSuggestion).toBeDefined();
      // Should insert at cursor position for operators
      expect(plusSuggestion!.replaceRange).toEqual({ start: 14, end: 14 });
    });

    it('should provide correct replacement range for operator suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
      const equalSuggestion = suggestions.find(s => s.text === '==');
      expect(equalSuggestion).toBeDefined();
      expect(equalSuggestion!.replaceRange).toEqual({ start: 15, end: 15 });
    });
  });



  describe('settings section suggestions', () => {
    describe('dictionary settings', () => {
      it('should suggest include/exclude operators when cursor is at colon', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:', 7);
        expect(suggestions.map(s => s.text)).toContain('+');
        expect(suggestions.map(s => s.text)).toContain('-');
        expect(suggestions.map(s => s.text)).toContain('==');
        expect(suggestions.map(s => s.text)).toContain('!=');
        expect(suggestions.map(s => s.text)).toContain('<');
        expect(suggestions.map(s => s.text)).toContain('<=');
        expect(suggestions.map(s => s.text)).toContain('>');
        expect(suggestions.map(s => s.text)).toContain('>=');
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(9); // +, -, ==, !=, <, <=, >, >=, }
      });

      it('should suggest tags after + operator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+', 8);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions).toHaveLength(6); // All noun tags
      });

      it('should suggest tags after - operator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:-', 8);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions).toHaveLength(6); // All noun tags
      });

      it('should filter out already used tags with space separation', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+animal +', 15);
        expect(suggestions.map(s => s.text)).not.toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions).toHaveLength(5); // All noun tags except 'animal'
      });

      it('should suggest size constraint operators after tags', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
        expect(suggestions.map(s => s.text)).toContain('==');
        expect(suggestions.map(s => s.text)).toContain('!=');
        expect(suggestions.map(s => s.text)).toContain('<');
        expect(suggestions.map(s => s.text)).toContain('<=');
        expect(suggestions.map(s => s.text)).toContain('>');
        expect(suggestions.map(s => s.text)).toContain('>=');
        expect(suggestions).toHaveLength(6);
      });

      it('should suggest tags starting with partial input after + operator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+a', 8);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions).toHaveLength(2);
      });

      it('should suggest single tag when partial input matches exactly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+an', 9);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions).toHaveLength(1);
      });

      it('should suggest operators and close when tag is complete', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+animal', 14);
        expect(suggestions.map(s => s.text)).toContain('+');
        expect(suggestions.map(s => s.text)).toContain('-');
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions.map(s => s.text)).toContain('==');
        expect(suggestions.map(s => s.text)).toContain('!=');
        expect(suggestions.map(s => s.text)).toContain('<');
        expect(suggestions.map(s => s.text)).toContain('<=');
        expect(suggestions.map(s => s.text)).toContain('>');
        expect(suggestions.map(s => s.text)).toContain('>=');
        expect(suggestions).toHaveLength(9); // +, -, }, ==, !=, <, <=, >, >=
      });
    });

    describe('number generator settings', () => {
      it('should suggest number bases when size is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number:5', 9);
        expect(suggestions.map(s => s.text)).toContain('d');
        expect(suggestions.map(s => s.text)).toContain('x');
        expect(suggestions.map(s => s.text)).toContain('X');
        expect(suggestions.map(s => s.text)).toContain('r');
        expect(suggestions.map(s => s.text)).toContain('R');
        expect(suggestions).toHaveLength(5);
      });

      it('should not suggest number bases when no size is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number:', 8);
        expect(suggestions).toHaveLength(0);
      });

      it('should not suggest anything when only colon is specified for number generator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number:', 8);
        expect(suggestions).toHaveLength(0);
      });

      it('should suggest close brace after number base is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number:4x', 11);
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(1);
      });

      it('should suggest close brace after decimal base is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{number:7d', 10);
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(1);
      });
    });

    describe('special generator settings', () => {
      it('should not suggest anything when only colon is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special:', 9);
        expect(suggestions).toHaveLength(0);
      });

      it('should suggest range start or close when number is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special:3', 10);
        expect(suggestions.map(s => s.text)).toContain('-');
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(2);
      });

      it('should not suggest anything when range start is incomplete', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special:3-', 11);
        expect(suggestions).toHaveLength(0);
      });

      it('should suggest only close brace when range is complete', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special:3-5', 12);
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(1);
      });

      it('should suggest both range start and close when single number is specified', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{special:7', 10);
        expect(suggestions.map(s => s.text)).toContain('-');
        expect(suggestions.map(s => s.text)).toContain('}');
        expect(suggestions).toHaveLength(2);
      });
    });
  });

  describe('context analysis', () => {
    it('should correctly identify placeholder boundaries', async () => {
      // Test with cursor after complete generator name 'noun' (position 11 = after the complete word)
      const suggestions = await patternSuggestions.getSuggestions('hello {noun} world', 11);
      expect(suggestions).toHaveLength(3); // }, @, :
      expect(suggestions.map(s => s.text)).toContain('}');
      expect(suggestions.map(s => s.text)).toContain('@');
      expect(suggestions.map(s => s.text)).toContain(':');
    });

    it('should handle valid complex patterns with whitespace delimiters', async () => {
      // Test cursor inside the second placeholder at the end of 'adjective'
      const suggestions = await patternSuggestions.getSuggestions('{noun:+animal >5} and {adjective}', 32);
      expect(suggestions).toHaveLength(3); // }, @, :
      expect(suggestions.map(s => s.text)).toContain('}');
      expect(suggestions.map(s => s.text)).toContain('@');
      expect(suggestions.map(s => s.text)).toContain(':');
    });

    it('should handle unclosed placeholders', async () => {
      // After completing a tag (+animal), suggest next options: more tags, size constraints, or close
      const suggestions = await patternSuggestions.getSuggestions('{noun:+animal', 13);
      expect(suggestions.map(s => s.text)).toContain('+');
      expect(suggestions.map(s => s.text)).toContain('-');
      expect(suggestions.map(s => s.text)).toContain('==');
      expect(suggestions.map(s => s.text)).toContain('}');
      expect(suggestions).toHaveLength(9); // +, -, ==, !=, <, <=, >, >=, }
    });
  });

  describe('edge cases', () => {
    it('should handle empty pattern', async () => {
      const suggestions = await patternSuggestions.getSuggestions('', 0);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('{');
      expect(suggestions[0].type).toBe('symbol');
    });

    it('should handle pattern with only opening brace', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{', 1);
      expect(suggestions).toHaveLength(18); // number + special + 4 dictionaries × 4 casing variants
      
      // Verify the ordering: lower -> upper -> title -> mixed
      // Lowercase cluster: number, special, adjective, adverb, noun, verb
      expect(suggestions[0].text).toBe('number');
      expect(suggestions[1].text).toBe('special');
      expect(suggestions[2].text).toBe('adjective');
      expect(suggestions[3].text).toBe('adverb');
      expect(suggestions[4].text).toBe('noun');
      expect(suggestions[5].text).toBe('verb');
      
      // Uppercase cluster: ADJECTIVE, ADVERB, NOUN, VERB
      expect(suggestions[6].text).toBe('ADJECTIVE');
      expect(suggestions[7].text).toBe('ADVERB');
      expect(suggestions[8].text).toBe('NOUN');
      expect(suggestions[9].text).toBe('VERB');
      
      // Title case cluster: Adjective, Adverb, Noun, Verb
      expect(suggestions[10].text).toBe('Adjective');
      expect(suggestions[11].text).toBe('Adverb');
      expect(suggestions[12].text).toBe('Noun');
      expect(suggestions[13].text).toBe('Verb');
      
      // Mixed case cluster: AdJeCtIvE, AdVeRb, NoUn, VeRb
      expect(suggestions[14].text).toBe('AdJeCtIvE');
      expect(suggestions[15].text).toBe('AdVeRb');
      expect(suggestions[16].text).toBe('NoUn');
      expect(suggestions[17].text).toBe('VeRb');
    });

    it('should handle pattern with only closing brace', async () => {
      const suggestions = await patternSuggestions.getSuggestions('}', 1);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('{');
      expect(suggestions[0].type).toBe('symbol');
    });

    it('should handle cursor at very beginning of pattern', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun}', 0);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('{');
      expect(suggestions[0].type).toBe('symbol');
    });

    it('should handle cursor beyond pattern length', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun}', 10);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('{');
      expect(suggestions[0].type).toBe('symbol');
    });
  });

  describe('tag filtering', () => {
    it('should return tags for correct dictionary only', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{adjective:+', 12);
      expect(suggestions.map(s => s.text)).toContain('color');
      expect(suggestions.map(s => s.text)).toContain('size');
      expect(suggestions.map(s => s.text)).not.toContain('animal'); // noun tag
      expect(suggestions).toHaveLength(5); // All adjective tags
    });

    it('should handle case-insensitive dictionary matching', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{NOUN:+', 8);
      expect(suggestions.map(s => s.text)).toContain('animal');
      expect(suggestions.map(s => s.text)).toContain('artifact');
      expect(suggestions.map(s => s.text)).toContain('plant');
      expect(suggestions).toHaveLength(6); // All noun tags
    });
  });

  describe('suggestion types', () => {
    it('should return correct suggestion types', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{', 1);
      
      const numberSuggestion = suggestions.find(s => s.text === 'number');
      expect(numberSuggestion?.type).toBe('generator');
      
      const nounSuggestion = suggestions.find(s => s.text === 'noun');
      expect(nounSuggestion?.type).toBe('generator');
    });

    it('should return correct suggestion types for operators', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
      const eqSuggestion = suggestions.find(s => s.text === '==');
      expect(eqSuggestion?.type).toBe('operator');
    });

    it('should return correct suggestion types for symbols', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun', 6);
      const closeSuggestion = suggestions.find(s => s.text === '}');
      expect(closeSuggestion?.type).toBe('symbol');
    });

    it('should return correct suggestion types for tags', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+', 8);
      const animalSuggestion = suggestions.find(s => s.text === 'animal');
      expect(animalSuggestion?.type).toBe('tag');
    });

    it('should return correct suggestion types for bases', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{number:5', 9);
      const dSuggestion = suggestions.find(s => s.text === 'd');
      expect(dSuggestion?.type).toBe('base');
    });
  });

  describe('suggestion ordering and sorting', () => {
    let patternSuggestions: PatternSuggestions;
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
      mockSlugKit = new MockSlugKit();
      patternSuggestions = new PatternSuggestions(mockSlugKit);
    });

    describe('lowercase input ordering', () => {
      it('should order suggestions for lowercase input {a correctly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{a', 2);
        
        // Should have exactly 4 suggestions
        expect(suggestions).toHaveLength(4);
        
        // Should contain all expected suggestions
        expect(suggestions.map(s => s.text)).toContain('adjective');
        expect(suggestions.map(s => s.text)).toContain('adverb');
        expect(suggestions.map(s => s.text)).toContain('aDjEcTiVe');
        expect(suggestions.map(s => s.text)).toContain('aDvErB');
        
        // Should be ordered by casing: lowercase first, then mixed case
        // Order should be: adjective, adverb, aDjEcTiVe, aDvErB
        expect(suggestions[0].text).toBe('adjective');
        expect(suggestions[1].text).toBe('adverb');
        expect(suggestions[2].text).toBe('aDjEcTiVe');
        expect(suggestions[3].text).toBe('aDvErB');
      });

      it('should order suggestions for lowercase input {n correctly with special generators', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{n', 2);
        
        // Should have exactly 3 suggestions
        expect(suggestions).toHaveLength(3);
        
        // Should contain all expected suggestions
        expect(suggestions.map(s => s.text)).toContain('noun');
        expect(suggestions.map(s => s.text)).toContain('number');
        expect(suggestions.map(s => s.text)).toContain('nOuN');
        
        // Should be ordered by casing: special generators first, then lowercase, then mixed case
        // Order should be: number, noun, nOuN
        expect(suggestions[0].text).toBe('number');
        expect(suggestions[1].text).toBe('noun');
        expect(suggestions[2].text).toBe('nOuN');
      });
    });

    describe('uppercase input ordering', () => {
      it('should order suggestions for uppercase input {A correctly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{A', 2);
        
        // Should have exactly 6 suggestions
        expect(suggestions).toHaveLength(6);
        
        // Should contain all expected suggestions
        expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
        expect(suggestions.map(s => s.text)).toContain('ADVERB');
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');
        
        // Should be ordered by casing: uppercase first, then title case, then mixed case
        // Order should be: ADJECTIVE, ADVERB, Adjective, Adverb, AdJeCtIvE, AdVeRb
        expect(suggestions[0].text).toBe('ADJECTIVE');
        expect(suggestions[1].text).toBe('ADVERB');
        expect(suggestions[2].text).toBe('Adjective');
        expect(suggestions[3].text).toBe('Adverb');
        expect(suggestions[4].text).toBe('AdJeCtIvE');
        expect(suggestions[5].text).toBe('AdVeRb');
      });
    });

    describe('title case input ordering', () => {
      it('should order suggestions for title case input {Ad correctly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{Ad', 3);
        
        // Should have exactly 2 suggestions (title case only for multi-character input)
        expect(suggestions).toHaveLength(2);
        
        // Should contain expected suggestions
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        
        // Should be ordered alphabetically within title case
        // Order should be: Adjective, Adverb
        expect(suggestions[0].text).toBe('Adjective');
        expect(suggestions[1].text).toBe('Adverb');
      });
    });

    describe('mixed case input ordering', () => {
      it('should order suggestions for mixed case input {aD correctly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{aD', 3);
        
        // Should have exactly 2 suggestions (pattern-preserving for multi-character input)
        expect(suggestions).toHaveLength(2);
        
        // Should contain expected suggestions
        expect(suggestions.map(s => s.text)).toContain('aDjEcTiVe');
        expect(suggestions.map(s => s.text)).toContain('aDvErB');
        
        // Should be ordered alphabetically within mixed case group
        // Order should be: aDjEcTiVe, aDvErB
        expect(suggestions[0].text).toBe('aDjEcTiVe');
        expect(suggestions[1].text).toBe('aDvErB');
      });
    });

    describe('casing group consistency', () => {
      it('should maintain consistent ordering across different input lengths', async () => {
        // Test single character lowercase
        const singleLower = await patternSuggestions.getSuggestions('{a', 2);
        expect(singleLower[0].text).toBe('adjective');
        expect(singleLower[1].text).toBe('adverb');
        
        // Test single character uppercase
        const singleUpper = await patternSuggestions.getSuggestions('{A', 2);
        expect(singleUpper[0].text).toBe('ADJECTIVE');
        expect(singleUpper[1].text).toBe('ADVERB');
        expect(singleUpper[2].text).toBe('Adjective');
        expect(singleUpper[3].text).toBe('Adverb');
      });
    });

    describe('size constraints for dictionary selectors', () => {
      describe('comparison operators', () => {
        it('should suggest nothing for {noun:== (any comparison op)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:==', 8);
          expect(suggestions).toHaveLength(0);
        });

        it('should suggest = for {noun:= (second equals char)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:=', 7);
          expect(suggestions).toHaveLength(1);
          expect(suggestions[0].text).toBe('=');
          expect(suggestions[0].type).toBe('operator');
        });

        it('should suggest = for {noun:! (equals char)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:!', 7);
          expect(suggestions).toHaveLength(1);
          expect(suggestions[0].text).toBe('=');
          expect(suggestions[0].type).toBe('operator');
        });

        it('should suggest = for {noun:< (optional equals for <=)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:<', 7);
          expect(suggestions).toHaveLength(1);
          expect(suggestions[0].text).toBe('=');
          expect(suggestions[0].type).toBe('operator');
        });

        it('should suggest = for {noun:> (optional equals for >=)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:>', 7);
          expect(suggestions).toHaveLength(1);
          expect(suggestions[0].text).toBe('=');
          expect(suggestions[0].type).toBe('operator');
        });

        it('should suggest next options for {noun:==4 (no comparison ops)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:==4', 10);
          expect(suggestions).toHaveLength(3);
          expect(suggestions.map(s => s.text)).toContain('+');
          expect(suggestions.map(s => s.text)).toContain('-');
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain comparison operators
          expect(suggestions.map(s => s.text)).not.toContain('==');
          expect(suggestions.map(s => s.text)).not.toContain('!=');
          expect(suggestions.map(s => s.text)).not.toContain('<');
          expect(suggestions.map(s => s.text)).not.toContain('>');
        });

        it('should suggest next options for {noun:+animal <5 (no comparison ops)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:+animal <5', 18);
          expect(suggestions).toHaveLength(3);
          expect(suggestions.map(s => s.text)).toContain('+');
          expect(suggestions.map(s => s.text)).toContain('-');
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain comparison operators
          expect(suggestions.map(s => s.text)).not.toContain('==');
          expect(suggestions.map(s => s.text)).not.toContain('!=');
          expect(suggestions.map(s => s.text)).not.toContain('<');
          expect(suggestions.map(s => s.text)).not.toContain('>');
        });
      });

      describe('comparison operators only when no size limit', () => {
        it('should suggest comparison operators when no size constraints exist', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:+animal', 13);
          expect(suggestions).toHaveLength(9);
          expect(suggestions.map(s => s.text)).toContain('+');
          expect(suggestions.map(s => s.text)).toContain('-');
          expect(suggestions.map(s => s.text)).toContain('==');
          expect(suggestions.map(s => s.text)).toContain('!=');
          expect(suggestions.map(s => s.text)).toContain('<');
          expect(suggestions.map(s => s.text)).toContain('<=');
          expect(suggestions.map(s => s.text)).toContain('>');
          expect(suggestions.map(s => s.text)).toContain('>=');
          expect(suggestions.map(s => s.text)).toContain('}');
        });

        it('should not suggest comparison operators when size constraint exists', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ==5', 18);
          expect(suggestions).toHaveLength(3);
          expect(suggestions.map(s => s.text)).toContain('+');
          expect(suggestions.map(s => s.text)).toContain('-');
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain comparison operators
          expect(suggestions.map(s => s.text)).not.toContain('==');
          expect(suggestions.map(s => s.text)).not.toContain('!=');
          expect(suggestions.map(s => s.text)).not.toContain('<');
          expect(suggestions.map(s => s.text)).not.toContain('>');
        });
      });
    });
  });
});