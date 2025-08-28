import { PatternParser, CompareOperator, NumberBase } from '../pattern-parser';

describe('PatternParser', () => {
  describe('Basic parsing', () => {
    it('should parse empty pattern', () => {
      const result = PatternParser.parse('');
      expect(result.elements).toHaveLength(0);
      expect(result.textChunks).toEqual(['']);
      expect(result.globalSettings).toBeUndefined();
    });

    it('should parse pattern with only text', () => {
      const result = PatternParser.parse('hello world');
      expect(result.elements).toHaveLength(0);
      expect(result.textChunks).toEqual(['hello world']);
      expect(result.globalSettings).toBeUndefined();
    });

    it('should parse pattern with single placeholder', () => {
      const result = PatternParser.parse('{noun}');
      expect(result.elements).toHaveLength(1);
      expect(result.textChunks).toEqual(['', '']);
      expect(result.globalSettings).toBeUndefined();
      
      const element = result.elements[0];
      expect(element).toHaveProperty('kind', 'noun');
    });
  });

  describe('Selector parsing', () => {
    it('should parse basic selector', () => {
      const result = PatternParser.parse('{noun}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        language: undefined,
        includeTags: [],
        excludeTags: [],
        sizeLimit: undefined,
        options: {}
      });
    });

    it('should parse selector with language', () => {
      const result = PatternParser.parse('{noun@en}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        language: 'en',
        includeTags: [],
        excludeTags: [],
        sizeLimit: undefined,
        options: {}
      });
    });

    it('should parse selector with include tags', () => {
      const result = PatternParser.parse('{noun:+animal +wild}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        includeTags: ['animal', 'wild'],
        excludeTags: []
      });
    });

    it('should parse selector with exclude tags', () => {
      const result = PatternParser.parse('{noun:-nsfw -violent}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        includeTags: [],
        excludeTags: ['nsfw', 'violent']
      });
    });

    it('should parse selector with mixed tags', () => {
      const result = PatternParser.parse('{noun:+animal -nsfw +wild}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        includeTags: ['animal', 'wild'],
        excludeTags: ['nsfw']
      });
    });

    it('should parse selector with size limit', () => {
      const result = PatternParser.parse('{noun:>5}');
      const element = result.elements[0];
      expect('sizeLimit' in element && element.sizeLimit).toMatchObject({
        op: CompareOperator.Gt,
        value: 5
      });
    });

    it('should parse selector with different size limit operators', () => {
      const testCases = [
        { pattern: '{noun:>5}', op: CompareOperator.Gt, value: 5 },
        { pattern: '{noun:>=5}', op: CompareOperator.Ge, value: 5 },
        { pattern: '{noun:<5}', op: CompareOperator.Lt, value: 5 },
        { pattern: '{noun:<=5}', op: CompareOperator.Le, value: 5 }
      ];

      testCases.forEach(({ pattern, op, value }) => {
        const result = PatternParser.parse(pattern);
        const element = result.elements[0];
        expect('sizeLimit' in element && element.sizeLimit).toMatchObject({ op, value });
      });
    });

    it('should parse selector with options', () => {
      const result = PatternParser.parse('{noun:case=lower,style=formal}');
      const element = result.elements[0];
      expect('options' in element && element.options).toEqual({
        case: 'lower',
        style: 'formal'
      });
    });

    it('should parse complex selector', () => {
      const result = PatternParser.parse('{noun@en:+animal -nsfw >3,case=lower}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        kind: 'noun',
        language: 'en',
        includeTags: ['animal'],
        excludeTags: ['nsfw'],
        sizeLimit: { op: CompareOperator.Gt, value: 3 },
        options: { case: 'lower' }
      });
    });
  });

  describe('Number generator parsing', () => {
    it('should parse basic number generator', () => {
      const result = PatternParser.parse('{number}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        maxLength: 1,
        base: NumberBase.Dec
      });
    });

    it('should parse number generator with length', () => {
      const result = PatternParser.parse('{number:5}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        maxLength: 5,
        base: NumberBase.Dec
      });
    });

    it('should parse number generator with base', () => {
      const result = PatternParser.parse('{number:5,hex}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        maxLength: 5,
        base: NumberBase.Hex
      });
    });

    it('should parse number generator with short base notation', () => {
      const testCases = [
        { pattern: '{number:5d}', base: NumberBase.Dec },
        { pattern: '{number:5x}', base: NumberBase.Hex },
        { pattern: '{number:5r}', base: NumberBase.RomanLower }
      ];

      testCases.forEach(({ pattern, base }) => {
        const result = PatternParser.parse(pattern);
        const element = result.elements[0];
        expect('base' in element && element.base).toBe(base);
      });
    });

    it('should parse number generator with full base notation', () => {
      const testCases = [
        { pattern: '{number:5,dec}', base: NumberBase.Dec },
        { pattern: '{number:5,hex}', base: NumberBase.Hex },
        { pattern: '{number:5,HEX}', base: NumberBase.HexUpper },
        { pattern: '{number:5,roman}', base: NumberBase.RomanLower },
        { pattern: '{number:5,ROMAN}', base: NumberBase.Roman }
      ];

      testCases.forEach(({ pattern, base }) => {
        const result = PatternParser.parse(pattern);
        const element = result.elements[0];
        expect('base' in element && element.base).toBe(base);
      });
    });
  });

  describe('Special character generator parsing', () => {
    it('should parse basic special character generator', () => {
      const result = PatternParser.parse('{special}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        minLength: 1,
        maxLength: 1
      });
    });

    it('should parse special character generator with length', () => {
      const result = PatternParser.parse('{special:5}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        minLength: 5,
        maxLength: 5
      });
    });

    it('should parse special character generator with range', () => {
      const result = PatternParser.parse('{special:3-7}');
      const element = result.elements[0];
      expect(element).toMatchObject({
        minLength: 3,
        maxLength: 7
      });
    });
  });

  describe('Global settings parsing', () => {
    it('should parse global settings with language', () => {
      const result = PatternParser.parse('{noun}[@en]');
      expect(result.globalSettings).toMatchObject({
        language: 'en',
        includeTags: [],
        excludeTags: [],
        sizeLimit: undefined,
        options: {}
      });
    });

    it('should parse global settings with tags', () => {
      const result = PatternParser.parse('{noun}[+formal -nsfw]');
      expect(result.globalSettings).toMatchObject({
        language: undefined,
        includeTags: ['formal'],
        excludeTags: ['nsfw'],
        sizeLimit: undefined,
        options: {}
      });
    });

    it('should parse global settings with size limit', () => {
      const result = PatternParser.parse('{noun}[>5]');
      expect(result.globalSettings?.sizeLimit).toMatchObject({
        op: CompareOperator.Gt,
        value: 5
      });
    });

    it('should parse global settings with options', () => {
      const result = PatternParser.parse('{noun}[case=lower,style=formal]');
      expect(result.globalSettings?.options).toEqual({
        case: 'lower',
        style: 'formal'
      });
    });

    it('should parse complex global settings', () => {
      const result = PatternParser.parse('{noun}[@en +formal -nsfw >3,case=lower]');
      expect(result.globalSettings).toMatchObject({
        language: 'en',
        includeTags: ['formal'],
        excludeTags: ['nsfw'],
        sizeLimit: { op: CompareOperator.Gt, value: 3 },
        options: { case: 'lower' }
      });
    });
  });

  describe('Complex patterns', () => {
    it('should parse pattern with multiple elements', () => {
      const result = PatternParser.parse('{adjective} {noun} {number:3}');
      expect(result.elements).toHaveLength(3);
      expect(result.textChunks).toEqual(['', ' ', ' ', '']);
      
      expect(result.elements[0]).toHaveProperty('kind', 'adjective');
      expect(result.elements[1]).toHaveProperty('kind', 'noun');
      expect(result.elements[2]).toHaveProperty('maxLength', 3);
    });

    it('should parse pattern with mixed elements and global settings', () => {
      const result = PatternParser.parse('{adjective} {noun} {number:3,hex}[@en +formal]');
      expect(result.elements).toHaveLength(3);
      expect(result.globalSettings).toMatchObject({
        language: 'en',
        includeTags: ['formal']
      });
    });

    it('should parse pattern with escaped characters', () => {
      const result = PatternParser.parse('\\{literal\\} {noun}');
      expect(result.elements).toHaveLength(1);
      expect(result.textChunks).toEqual(['\\{literal\\} ', '']);
      expect(result.elements[0]).toHaveProperty('kind', 'noun');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unmatched opening brace', () => {
      expect(() => PatternParser.parse('{noun')).toThrow();
    });

    it('should throw error for unmatched closing brace', () => {
      expect(() => PatternParser.parse('noun}')).toThrow();
    });

    it('should throw error for unmatched opening bracket', () => {
      expect(() => PatternParser.parse('{noun}[')).toThrow();
    });

    it('should throw error for unmatched closing bracket', () => {
      expect(() => PatternParser.parse('{noun}]')).toThrow();
    });

    it('should throw error for invalid comparison operator', () => {
      expect(() => PatternParser.parse('{noun:?5}')).toThrow();
    });

    it('should throw error for invalid number base', () => {
      expect(() => PatternParser.parse('{number:5,invalid}')).toThrow();
    });

    it('should throw error for invalid escape sequence', () => {
      expect(() => PatternParser.parse('\\a')).toThrow();
    });

    it('should throw error for unexpected character after global settings', () => {
      expect(() => PatternParser.parse('{noun}[@en] extra')).toThrow();
    });
  });

  describe('Invalid pattern syntax', () => {
    it('should reject selector with invalid tag syntax', () => {
      expect(() => PatternParser.parse('{noun:++animal}')).toThrow(); // Double +
      expect(() => PatternParser.parse('{noun:--animal}')).toThrow(); // Double -
      expect(() => PatternParser.parse('{noun:+animal,}')).toThrow(); // Comma after tag
    });

    it('should reject selector with invalid size limit syntax', () => {
      expect(() => PatternParser.parse('{noun:>}')).toThrow(); // Missing value
      expect(() => PatternParser.parse('{noun:>=}')).toThrow(); // Missing value
      expect(() => PatternParser.parse('{noun:<>3}')).toThrow(); // Invalid operator
      expect(() => PatternParser.parse('{noun:=>3}')).toThrow(); // Invalid operator
      expect(() => PatternParser.parse('{noun:>3.5}')).toThrow(); // Non-integer
      expect(() => PatternParser.parse('{noun:>abc}')).toThrow(); // Non-numeric
    });

    it('should reject selector with invalid options syntax', () => {
      expect(() => PatternParser.parse('{noun:key}')).toThrow(); // Missing =
      expect(() => PatternParser.parse('{noun:=value}')).toThrow(); // Missing key
      expect(() => PatternParser.parse('{noun:key=value,}')).toThrow(); // Comma after option
    });

    it('should reject number generator with invalid syntax', () => {
      expect(() => PatternParser.parse('{number:}')).toThrow(); // Missing length
      expect(() => PatternParser.parse('{number:abc}')).toThrow(); // Non-numeric length
      expect(() => PatternParser.parse('{number:5,}')).toThrow(); // Missing base after comma
      expect(() => PatternParser.parse('{number:5,invalid}')).toThrow(); // Invalid base
      expect(() => PatternParser.parse('{number:5d,dec}')).toThrow(); // Mixed short and full syntax
      expect(() => PatternParser.parse('{number:5,dec,hex}')).toThrow(); // Multiple bases
    });

    it('should reject special character generator with invalid syntax', () => {
      expect(() => PatternParser.parse('{special:}')).toThrow(); // Missing length
      expect(() => PatternParser.parse('{special:abc}')).toThrow(); // Non-numeric length
      expect(() => PatternParser.parse('{special:5-}')).toThrow(); // Missing range end
      expect(() => PatternParser.parse('{special:5-abc}')).toThrow(); // Non-numeric range end
      expect(() => PatternParser.parse('{special:5-3}')).toThrow(); // Range start > end
      expect(() => PatternParser.parse('{special:5--3}')).toThrow(); // Double dash
    });

    it('should reject global settings with invalid syntax', () => {
      expect(() => PatternParser.parse('{[@]}')).toThrow(); // Empty language
      expect(() => PatternParser.parse('{[@en,]}')).toThrow(); // Comma after language
      expect(() => PatternParser.parse('{[>]}')).toThrow(); // Missing size value
      expect(() => PatternParser.parse('{[key]}')).toThrow(); // Invalid option syntax
    });

    it('should reject malformed placeholders', () => {
      expect(() => PatternParser.parse('{noun:')).toThrow(); // Unclosed with colon
      expect(() => PatternParser.parse('{noun:+animal')).toThrow(); // Unclosed with tags
      expect(() => PatternParser.parse('{noun:>3')).toThrow(); // Unclosed with size limit
    });

    it('should reject malformed global settings', () => {
      expect(() => PatternParser.parse('[@en')).toThrow(); // Unclosed with language
      expect(() => PatternParser.parse('[+animal')).toThrow(); // Unclosed with tags
      expect(() => PatternParser.parse('[>3')).toThrow(); // Unclosed with size limit
    });

    it('should reject invalid comparison operators', () => {
      expect(() => PatternParser.parse('{noun:=>3}')).toThrow(); // Invalid operator
      expect(() => PatternParser.parse('{noun:<>3}')).toThrow(); // Invalid operator
      // == and != are now valid operators
      expect(() => PatternParser.parse('{noun:==3}')).not.toThrow();
      expect(() => PatternParser.parse('{noun:!=3}')).not.toThrow();
    });

    it('should reject invalid number bases', () => {
      expect(() => PatternParser.parse('{number:5,Dec}')).toThrow(); // Wrong case
      expect(() => PatternParser.parse('{number:5,invalid}')).toThrow(); // Invalid base
    });

    it('should reject invalid short number base syntax', () => {
      expect(() => PatternParser.parse('{number:5a}')).toThrow(); // Invalid short base
      expect(() => PatternParser.parse('{number:5A}')).toThrow(); // Invalid short base
      expect(() => PatternParser.parse('{number:5z}')).toThrow(); // Invalid short base
      expect(() => PatternParser.parse('{number:5Z}')).toThrow(); // Invalid short base
    });

    it('should reject patterns with invalid structure', () => {
      expect(() => PatternParser.parse('{noun}{')).toThrow(); // Nested placeholders
      expect(() => PatternParser.parse('{noun}[{')).toThrow(); // Placeholder in global settings
      expect(() => PatternParser.parse('{[noun]}')).toThrow(); // Selector in global settings
      expect(() => PatternParser.parse('{noun:animal}')).toThrow(); // Tag without + or -
    });

    it('should reject patterns with invalid whitespace handling', () => {
      expect(() => PatternParser.parse('{noun :animal}')).toThrow(); // Space before colon
      expect(() => PatternParser.parse('{noun:+ animal}')).toThrow(); // Space after +
      expect(() => PatternParser.parse('{noun:- animal}')).toThrow(); // Space after -
    });

    it('should reject patterns with invalid option values', () => {
      expect(() => PatternParser.parse('{noun:key=value,key2}')).toThrow(); // Missing = in second option
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace correctly', () => {
      const result = PatternParser.parse('  {noun}  ');
      expect(result.elements).toHaveLength(1);
      expect(result.textChunks).toEqual(['  ', '  ']);
    });

    it('should handle whitespace after colon and comparison operators', () => {
      const result1 = PatternParser.parse('{noun: +animal}');
      expect(result1.elements[0]).toMatchObject({
        kind: 'noun',
        includeTags: ['animal'],
        excludeTags: []
      });

      const result2 = PatternParser.parse('{noun: >3}');
      expect('sizeLimit' in result2.elements[0] && result2.elements[0].sizeLimit).toMatchObject({
        op: CompareOperator.Gt,
        value: 3
      });
    });

    it('should reject empty tags', () => {
      expect(() => PatternParser.parse('{noun:+}')).toThrow(); // Empty tag
      expect(() => PatternParser.parse('{noun:-}')).toThrow(); // Empty tag
    });

    it('should handle empty options', () => {
      const result = PatternParser.parse('{noun:key=}');
      expect('options' in result.elements[0] && result.elements[0].options).toEqual({ key: '' });
    });

    it('should handle zero values', () => {
      const result = PatternParser.parse('{number:0}');
      expect('maxLength' in result.elements[0] && result.elements[0]).toMatchObject({
        maxLength: 0,
        base: NumberBase.Dec
      });
    });
  });

  describe('Text chunk handling', () => {
    it('should correctly split text around placeholders', () => {
      const result = PatternParser.parse('hello {noun} world');
      expect(result.textChunks).toEqual(['hello ', ' world']);
      expect(result.elements).toHaveLength(1);
    });

    it('should handle empty text chunks', () => {
      const result = PatternParser.parse('{noun}{adjective}');
      expect(result.textChunks).toEqual(['', '', '']);
      expect(result.elements).toHaveLength(2);
    });

    it('should handle text chunks with escaped characters', () => {
      const result = PatternParser.parse('\\{literal\\} {noun}');
      expect(result.textChunks).toEqual(['\\{literal\\} ', '']);
    });
  });

  describe('Pattern validation', () => {
    it('should validate valid patterns', () => {
      const validPatterns = [
        '',
        'hello world',
        '{noun}',
        '{noun@en}',
        '{noun:+animal}',
        '{noun: +animal}',
        '{noun:>3}',
        '{noun:> 3}',
        '{noun:case=lower}',
        '{number:5}',
        '{number:5,hex}',
        '{number:5d}',
        '{special:3}',
        '{special:3-5}',
        '[@en]',
        '[+formal]',
        '[>3]',
        '[case=lower]',
        '{noun} [@en]',
        'hello {noun} world [@en +formal]'
      ];

      validPatterns.forEach(pattern => {
        expect(PatternParser.validate(pattern)).toBe(true);
      });
    });

    it('should reject invalid patterns', () => {
      const invalidPatterns = [
        '{',
        '}',
        '[',
        ']',
        '{noun',
        '{noun:',
        '{noun:+',
        '{noun:>',
        '{noun:>abc}',
        '{noun:key}',
        '{noun:key}',
        '{number:}',
        '{number:abc}',
        '{number:5,}',
        '{number:5,invalid}',
        '{number:5a}',
        '{special:}',
        '{special:abc}',
        '{special:5-}',
        '{special:5-abc}',
        '{special:5-3}',
        '[@]',
        '[+]',
        '[>]',
        '[key]',
        '{noun}{',
        '{noun}[{',
        '{noun:animal}',
        '{noun :animal}'
      ];

      invalidPatterns.forEach(pattern => {
        const isValid = PatternParser.validate(pattern);
        if (isValid) {
          console.log(`Pattern "${pattern}" is unexpectedly valid`);
        }
        expect(isValid).toBe(false);
      });
    });

    it('should handle edge cases in validation', () => {
      // Valid edge cases
      expect(PatternParser.validate('{noun:+}')).toBe(false); // Empty tag
      expect(PatternParser.validate('{noun:key=}')).toBe(true); // Empty option value is valid
      expect(PatternParser.validate('{number:0}')).toBe(true); // Zero is valid
      
      // Invalid edge cases
      expect(PatternParser.validate('{noun:++animal}')).toBe(false); // Double +
      expect(PatternParser.validate('{noun:<>3}')).toBe(false); // Invalid operator
      expect(PatternParser.validate('{number:5,Dec}')).toBe(false); // Wrong case
    });
  });
});
