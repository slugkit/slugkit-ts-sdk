import { PatternParser, ParserContext, ExpectedToken } from '../pattern-parser';

describe('PatternParser Context Tracking', () => {
  describe('parsePartial method', () => {
    it('should parse empty pattern', () => {
      const context = PatternParser.parsePartial('');
      expect(context.context).toBe(ParserContext.OUTSIDE_PLACEHOLDER);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('');
    });

    it('should parse partial selector', () => {
      const context = PatternParser.parsePartial('{noun');
      expect(context.context).toBe(ParserContext.PARTIAL_SELECTOR);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('{noun');
      expect(context.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });

    it('should parse partial selector with colon', () => {
      const context = PatternParser.parsePartial('{noun:');
      expect(context.context).toBe(ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('{noun:');
      expect(context.expectedNext).toContain(ExpectedToken.TAG_SPEC);
    });

    it('should parse partial selector with language', () => {
      const context = PatternParser.parsePartial('{noun@');
      expect(context.context).toBe(ParserContext.EXPECTING_LANGUAGE_IDENTIFIER);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('{noun@');
      expect(context.expectedNext).toContain(ExpectedToken.IDENTIFIER);
    });

    it('should parse partial number generator', () => {
      const context = PatternParser.parsePartial('{number:5');
      expect(context.context).toBe(ParserContext.EXPECTING_NUMBER_BASE);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('{number:5');
      expect(context.partialElement).toMatchObject({
        maxLength: 5,
        base: 'dec'
      });
    });

    it('should parse partial special generator', () => {
      const context = PatternParser.parsePartial('{special:3-');
      expect(context.context).toBe(ParserContext.EXPECTING_SPECIAL_RANGE);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('{special:3-');
    });

    it('should parse partial global settings', () => {
      const context = PatternParser.parsePartial('[@en');
      expect(context.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
      expect(context.isValid).toBe(true);
      expect(context.parsedSoFar).toBe('[@en');
    });
  });

  describe('Utility methods', () => {
    it('should check if pattern is complete', () => {
      expect(PatternParser.isComplete('{noun}')).toBe(true);
      expect(PatternParser.isComplete('{noun')).toBe(false);
      expect(PatternParser.isComplete('')).toBe(true);
    });

    it('should get valid prefix', () => {
      // For complete patterns, getValidPrefix returns the parsed content
      expect(PatternParser.getValidPrefix('{noun}')).toBe('{noun}');
      expect(PatternParser.getValidPrefix('{noun')).toBe('{noun');
      expect(PatternParser.getValidPrefix('{noun:')).toBe('{noun:');
    });

    it('should get expected next tokens', () => {
      const expectedNext = PatternParser.getExpectedNext('{noun:');
      expect(expectedNext).toContain(ExpectedToken.TAG_SPEC);
      expect(expectedNext).toContain(ExpectedToken.COMPARISON_OP);
    });
  });

  describe('Context-specific expected next tokens', () => {
    it('should provide appropriate expected next for expecting identifier', () => {
      const context = PatternParser.parsePartial('{');
      expect(context.context).toBe(ParserContext.EXPECTING_IDENTIFIER);
      expect(context.expectedNext).toContain(ExpectedToken.IDENTIFIER);
      expect(context.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });

    it('should provide appropriate expected next for expecting tag', () => {
      const context = PatternParser.parsePartial('{noun:');
      expect(context.context).toBe(ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT);
      expect(context.expectedNext).toContain(ExpectedToken.TAG_SPEC);
      expect(context.expectedNext).toContain(ExpectedToken.COMPARISON_OP);
    });

    it('should provide appropriate expected next for expecting size limit', () => {
      const context = PatternParser.parsePartial('{noun:>');
      expect(context.context).toBe(ParserContext.EXPECTING_SIZE_LIMIT);
      expect(context.expectedNext).toContain(ExpectedToken.NUMBER);
      expect(context.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });

    it('should provide appropriate expected next for expecting tag only (after size limit)', () => {
      const context = PatternParser.parsePartial('{noun:>5');
      expect(context.context).toBe(ParserContext.EXPECTING_TAG_ONLY);
      expect(context.expectedNext).toContain(ExpectedToken.TAG_SPEC);
      expect(context.expectedNext).toContain(ExpectedToken.OPTION);
      expect(context.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
      // Should NOT contain comparison operators since size limit is already present
      expect(context.expectedNext).not.toContain(ExpectedToken.COMPARISON_OP);
    });

    it('should provide appropriate expected next for number generator contexts', () => {
      // 'number:' expecting length
      const context1 = PatternParser.parsePartial('{number:');
      expect(context1.context).toBe(ParserContext.EXPECTING_NUMBER_LENGTH);
      expect(context1.expectedNext).toContain(ExpectedToken.NUMBER);

      // 'number:5' expecting base or close
      const context2 = PatternParser.parsePartial('{number:5');
      expect(context2.context).toBe(ParserContext.EXPECTING_NUMBER_BASE);
      expect(context2.expectedNext).toContain(ExpectedToken.NUMBER_BASE);
      expect(context2.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });

    it('should provide appropriate expected next for special generator contexts', () => {
      // 'special:' expecting length
      const context1 = PatternParser.parsePartial('{special:');
      expect(context1.context).toBe(ParserContext.EXPECTING_SPECIAL_LENGTH);
      expect(context1.expectedNext).toContain(ExpectedToken.NUMBER);

      // 'special:3-' expecting second number
      const context2 = PatternParser.parsePartial('{special:3-');
      expect(context2.context).toBe(ParserContext.EXPECTING_SPECIAL_RANGE);
      expect(context2.expectedNext).toContain(ExpectedToken.NUMBER);
      expect(context2.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });

    it('should handle == and != comparison operators', () => {
      const context1 = PatternParser.parsePartial('{noun:==');
      expect(context1.context).toBe(ParserContext.EXPECTING_SIZE_LIMIT);
      expect(context1.expectedNext).toContain(ExpectedToken.NUMBER);

      const context2 = PatternParser.parsePartial('{noun:!=');
      expect(context2.context).toBe(ParserContext.EXPECTING_SIZE_LIMIT);
      expect(context2.expectedNext).toContain(ExpectedToken.NUMBER);
    });

    it('should handle language identifier contexts correctly', () => {
      // 'noun@en' expecting ':' or '}'
      const context = PatternParser.parsePartial('{noun@en');
      expect(context.context).toBe(ParserContext.EXPECTING_AFTER_LANGUAGE);
      expect(context.expectedNext).toContain(ExpectedToken.COLON);
      expect(context.expectedNext).toContain(ExpectedToken.CLOSE_BRACE);
    });
  });
});
