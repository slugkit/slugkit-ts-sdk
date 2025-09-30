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
    { kind: 'noun', tag: 'art', description: 'Art names', opt_in: true, word_count: 80 },
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
    { kind: 'verb', tag: 'thought', description: 'Thought verbs', opt_in: true, word_count: 220 },

    // Emoji tags
    { kind: 'emoji', tag: 'face', description: 'Face emojis', opt_in: true, word_count: 50 },
    { kind: 'emoji', tag: 'animal', description: 'Animal emojis', opt_in: true, word_count: 40 },
    { kind: 'emoji', tag: 'food', description: 'Food emojis', opt_in: true, word_count: 35 },
    { kind: 'emoji', tag: 'nature', description: 'Nature emojis', opt_in: true, word_count: 30 },
    { kind: 'emoji', tag: 'activity', description: 'Activity emojis', opt_in: true, word_count: 25 },
    { kind: 'emoji', tag: 'object', description: 'Object emojis', opt_in: true, word_count: 20 }
  ];

  // Helper methods to get counts for tests
  getNounTags() { return this.dictionaryTags.filter(tag => tag.kind === 'noun'); }
  getEmojiTags() { return this.dictionaryTags.filter(tag => tag.kind === 'emoji'); }

  async getDictionaries(): Promise<DictionaryStats[]> {
    return this.dictionaries;
  }

  async getDictionaryTags(): Promise<DictionaryTag[]> {
    return this.dictionaryTags;
  }
}

// Test constants for suggestion counts
const TAG_OPERATORS = ['+', '-']; // Tag start operators
const COMPARISON_OPERATORS = ['==', '!=', '<', '>', '<=', '>=']; // Size constraint operators  
const CLOSE_SYMBOLS = ['}']; // Close brace
const NUMBER_BASES = ['d', 'x', 'X', 'r', 'R']; // Number bases for {number:5}
// @ts-ignore
const SPECIAL_GENERATORS = ['number', 'special', 'emoji']; // Special generators

const TAG_OP_COUNT = TAG_OPERATORS.length;
const COMPARISON_OP_COUNT = COMPARISON_OPERATORS.length;
const CLOSE_COUNT = CLOSE_SYMBOLS.length;
const NUMBER_BASE_COUNT = NUMBER_BASES.length;
const EMOJI_OPTIONS = ['count=', 'unique=']; // Options for emoji generator (tone/gender not implemented on backend)
const EMOJI_OPTION_COUNT = EMOJI_OPTIONS.length;

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
        expect(suggestions).toHaveLength(0);
        // expect(suggestions[0].text).toBe('{');
        // expect(suggestions[0].type).toBe('symbol');
      });

    });

    describe('when cursor is at the beginning of a placeholder', () => {
      it('should suggest all generators when placeholder is empty', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{', 1);
        expect(suggestions).toHaveLength(19); // number + special + emoji + 4 dictionaries × 4 casing variants
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
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');
        expect(suggestions).toHaveLength(4); // Adjective, Adverb, AdJeCtIvE, AdVeRb
      });

      it('should suggest title case for three character title case input', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{Adj', 4);
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions).toHaveLength(1); // Adjective only
      });

      it('should suggest title case for noun with uppercase first letter', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{N', 2);
        expect(suggestions.map(s => s.text)).toContain('Noun');
        // Should also have uppercase suggestions  
        expect(suggestions.map(s => s.text)).toContain('NOUN');
        // Should also have alternating case suggestion
        expect(suggestions.map(s => s.text)).toContain('NoUn');
        // Should NOT have 'number' for uppercase N case transformations
        expect(suggestions.map(s => s.text)).not.toContain('number');
        expect(suggestions).toHaveLength(3); // Noun, NOUN, NoUn
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
      const suggestions = await patternSuggestions.getSuggestions('{no', 3);
      const nounSuggestion = suggestions.find(s => s.text === 'noun');
      expect(nounSuggestion).toBeDefined();
      expect(nounSuggestion!.replaceRange).toEqual({ start: 1, end: 3 });
    });

    it('should provide correct replacement range for complete generator suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun', 5);
      const closeSuggestion = suggestions.find(s => s.text === '}');
      expect(closeSuggestion).toBeDefined();
      expect(closeSuggestion!.replaceRange).toEqual({ start: 5, end: 5 });
    });

    it('should provide correct replacement range for tag suggestions', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun:+', 7);
      const animalSuggestion = suggestions.find(s => s.text === 'animal');
      expect(animalSuggestion).toBeDefined();
      expect(animalSuggestion!.replaceRange).toEqual({ start: 7, end: 7 });
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
      const closeSuggestion = suggestions.find(s => s.text === '}');
      expect(closeSuggestion).toBeDefined();
      // Should insert at cursor position for closing brace
      expect(closeSuggestion!.replaceRange).toEqual({ start: 14, end: 14 });
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
        expect(suggestions.map(s => s.text)).toContain('art');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions.map(s => s.text)).toContain('person');
        expect(suggestions.map(s => s.text)).toContain('place');
        expect(suggestions).toHaveLength(7); // All noun tags
      });

      it('should suggest tags after - operator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:-', 8);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('art');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions.map(s => s.text)).toContain('person');
        expect(suggestions.map(s => s.text)).toContain('place');
        expect(suggestions).toHaveLength(7); // All noun tags
      });

      it('should filter out already used tags with space separation', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+animal +', 15);
        expect(suggestions.map(s => s.text)).not.toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('plant');
        expect(suggestions.map(s => s.text)).toContain('object');
        expect(suggestions).toHaveLength(mockSlugKit.getNounTags().length - 1); // All noun tags except the used one
      });

      it('should suggest size constraint operators after tags', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
        expect(suggestions.map(s => s.text)).toContain('==');
        expect(suggestions.map(s => s.text)).toContain('!=');
        expect(suggestions.map(s => s.text)).toContain('<');
        expect(suggestions.map(s => s.text)).toContain('<=');
        expect(suggestions.map(s => s.text)).toContain('>');
        expect(suggestions.map(s => s.text)).toContain('>=');
        expect(suggestions).toHaveLength(TAG_OP_COUNT + COMPARISON_OP_COUNT + CLOSE_COUNT);
      });

      it('should suggest tags starting with partial input after + operator', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+a', 8);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions.map(s => s.text)).toContain('artifact');
        expect(suggestions.map(s => s.text)).toContain('art');
        expect(suggestions).toHaveLength(3);
      });

      it('should suggest single tag when partial input matches exactly', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+an', 9);
        expect(suggestions.map(s => s.text)).toContain('animal');
        expect(suggestions).toHaveLength(1);
      });

      it('should not suggest complete tag after full match, only partial matches and operators', async () => {
        const suggestions = await patternSuggestions.getSuggestions('{noun:+art', 10);
        // Should not suggest 'art' since it's already complete
        expect(suggestions.map(s => s.text)).not.toContain('art');
        // Should suggest 'artifact' as a partial match
        expect(suggestions.map(s => s.text)).toContain('artifact');
        // Should suggest operators for new tags and close
        expect(suggestions.map(s => s.text)).toContain('+');
        expect(suggestions.map(s => s.text)).toContain('-');
        expect(suggestions.map(s => s.text)).toContain('}');
        // Should also suggest size constraint operators
        expect(suggestions.map(s => s.text)).toContain('==');
        expect(suggestions.map(s => s.text)).toContain('!=');
        expect(suggestions.map(s => s.text)).toContain('<');
        expect(suggestions.map(s => s.text)).toContain('<=');
        expect(suggestions.map(s => s.text)).toContain('>');
        expect(suggestions.map(s => s.text)).toContain('>=');
        // Should have exactly 10 suggestions: artifact, +, -, }, ==, !=, <, <=, >, >=
        expect(suggestions).toHaveLength(10);
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
        expect(suggestions).toHaveLength(NUMBER_BASE_COUNT + 1 + CLOSE_COUNT); // bases + comma + close brace
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
      // ARBITRARY context doesn't suggest braces intentionally
      expect(suggestions).toHaveLength(0);
    });

    it('should handle pattern with only opening brace', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{', 1);
      expect(suggestions).toHaveLength(19); // number + special + emoji + 4 dictionaries × 4 casing variants

      // Verify we have the special generators
      expect(suggestions.map(s => s.text)).toContain('number');
      expect(suggestions.map(s => s.text)).toContain('special');
      expect(suggestions.map(s => s.text)).toContain('emoji');

      // Verify we have all dictionary variants
      expect(suggestions.map(s => s.text)).toContain('adjective');
      expect(suggestions.map(s => s.text)).toContain('ADJECTIVE');
      expect(suggestions.map(s => s.text)).toContain('Adjective');
      expect(suggestions.map(s => s.text)).toContain('aDjEcTiVe');
    });

    it('should handle pattern with only closing brace', async () => {
      const suggestions = await patternSuggestions.getSuggestions('}', 1);
      // Invalid pattern - should expect nothing
      expect(suggestions).toHaveLength(0);
    });

    it('should handle cursor at very beginning of pattern', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun}', 0);
      // ARBITRARY context doesn't suggest braces intentionally
      expect(suggestions).toHaveLength(0);
    });

    it('should handle cursor beyond pattern length', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{noun}', 10);
      // ARBITRARY context doesn't suggest braces intentionally
      expect(suggestions).toHaveLength(0);
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
      expect(suggestions).toHaveLength(mockSlugKit.getNounTags().length);
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

  describe('emoji generator suggestions', () => {
    it('should suggest tags and options but not size constraints for emoji generator', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji:', 8);
      expect(suggestions.map(s => s.text)).toContain('+');
      expect(suggestions.map(s => s.text)).toContain('-');
      expect(suggestions.map(s => s.text)).toContain('}');
      // Should NOT contain size constraint operators
      expect(suggestions.map(s => s.text)).not.toContain('==');
      expect(suggestions.map(s => s.text)).not.toContain('!=');
      expect(suggestions.map(s => s.text)).not.toContain('<');
      expect(suggestions.map(s => s.text)).not.toContain('<=');
      expect(suggestions.map(s => s.text)).not.toContain('>');
      expect(suggestions.map(s => s.text)).not.toContain('>=');
      expect(suggestions).toHaveLength(TAG_OP_COUNT + EMOJI_OPTION_COUNT + CLOSE_COUNT);
    });

    it('should suggest emoji tags after + operator', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji:+', 9);
      // Emoji should have its own tags
      expect(suggestions).toHaveLength(mockSlugKit.getEmojiTags().length);
      expect(suggestions.map(s => s.text)).toContain('face');
      expect(suggestions.map(s => s.text)).toContain('animal');
      expect(suggestions.map(s => s.text)).toContain('food');
      expect(suggestions.map(s => s.text)).toContain('nature');
      expect(suggestions.map(s => s.text)).toContain('activity');
      expect(suggestions.map(s => s.text)).toContain('object');
    });

    it('should suggest options after tags for emoji generator', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji:+face ', 13);
      // Should suggest options, additional tags, and close brace
      expect(suggestions.map(s => s.text)).toContain('count=');
      expect(suggestions.map(s => s.text)).toContain('unique=');
      expect(suggestions.map(s => s.text)).toContain('+');
      expect(suggestions.map(s => s.text)).toContain('-');
      expect(suggestions.map(s => s.text)).toContain('}');
      expect(suggestions).toHaveLength(EMOJI_OPTION_COUNT + TAG_OP_COUNT + CLOSE_COUNT);
    });

    it('should not suggest numbers after option equals for emoji generator', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji:count=', 13);
      // Numbers should never be suggested - user must type them
      // When expecting a number, no suggestions should be provided (including no close brace)
      expect(suggestions).toHaveLength(0);
    });

    it('should not suggest language specifier for emoji generator', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji', 7);
      expect(suggestions.map(s => s.text)).toContain(':');
      expect(suggestions.map(s => s.text)).toContain('}');
      // Should NOT contain @ (language specifier)
      expect(suggestions.map(s => s.text)).not.toContain('@');
      expect(suggestions).toHaveLength(2); // :, }
    });

    it('should suggest close brace after complete emoji with options', async () => {
      const suggestions = await patternSuggestions.getSuggestions('{emoji:+face count=5 unique=true', 33);
      expect(suggestions.map(s => s.text)).toContain('}');
      expect(suggestions).toHaveLength(1);
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

        // Should have exactly 4 suggestions (title case and mixed case variants)
        expect(suggestions).toHaveLength(4);

        // Should contain expected suggestions
        expect(suggestions.map(s => s.text)).toContain('Adjective');
        expect(suggestions.map(s => s.text)).toContain('Adverb');
        expect(suggestions.map(s => s.text)).toContain('AdJeCtIvE');
        expect(suggestions.map(s => s.text)).toContain('AdVeRb');

        // Should be ordered by casing: title case first, then mixed case
        // Order should be: Adjective, Adverb, AdJeCtIvE, AdVeRb
        expect(suggestions[0].text).toBe('Adjective');
        expect(suggestions[1].text).toBe('Adverb');
        expect(suggestions[2].text).toBe('AdJeCtIvE');
        expect(suggestions[3].text).toBe('AdVeRb');
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
          expect(suggestions).toHaveLength(1);
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain +/- operators after size constraints
          expect(suggestions.map(s => s.text)).not.toContain('+');
          expect(suggestions.map(s => s.text)).not.toContain('-');
          // Should NOT contain comparison operators
          expect(suggestions.map(s => s.text)).not.toContain('==');
          expect(suggestions.map(s => s.text)).not.toContain('!=');
          expect(suggestions.map(s => s.text)).not.toContain('<');
          expect(suggestions.map(s => s.text)).not.toContain('>');
        });

        it('should suggest next options for {noun:+animal <5 (no comparison ops)', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:+animal <5', 18);
          expect(suggestions).toHaveLength(1);
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain +/- operators after size constraints
          expect(suggestions.map(s => s.text)).not.toContain('+');
          expect(suggestions.map(s => s.text)).not.toContain('-');
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
          expect(suggestions).toHaveLength(TAG_OP_COUNT + COMPARISON_OP_COUNT + CLOSE_COUNT);
          expect(suggestions.map(s => s.text)).toContain('==');
          expect(suggestions.map(s => s.text)).toContain('!=');
          expect(suggestions.map(s => s.text)).toContain('<');
          expect(suggestions.map(s => s.text)).toContain('<=');
          expect(suggestions.map(s => s.text)).toContain('>');
          expect(suggestions.map(s => s.text)).toContain('>=');
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should contain +/- operators for adding more tags
          expect(suggestions.map(s => s.text)).toContain('+');
          expect(suggestions.map(s => s.text)).toContain('-');
        });

        it('should not suggest comparison operators when size constraint exists', async () => {
          const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ==5', 18);
          expect(suggestions).toHaveLength(1);
          expect(suggestions.map(s => s.text)).toContain('}');
          // Should NOT contain +/- operators after size constraints
          expect(suggestions.map(s => s.text)).not.toContain('+');
          expect(suggestions.map(s => s.text)).not.toContain('-');
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