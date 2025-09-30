import { ExpectedToken, ParserContext, PartialParser, ParserError, PossibleCases, SuggestionProvider } from '../partial-parser';
import { DictionaryStats, DictionaryTag } from '../types';
import { CompareOperator, NumberBase, NumberGen, SpecialCharGen, EmojiGen, Selector } from '../parser-types';

// Type guards for interface checking
function isNumberGen(obj: any): obj is NumberGen {
    return obj &&
        typeof obj.maxLength === 'number' &&
        typeof obj.base === 'string';
}

function isSpecialCharGen(obj: any): obj is SpecialCharGen {
    return obj &&
        typeof obj.minLength === 'number' &&
        typeof obj.maxLength === 'number';
}

function isEmojiGen(obj: any): obj is EmojiGen {
    return obj &&
        obj.kind === 'emoji' &&
        Array.isArray(obj.includeTags) &&
        Array.isArray(obj.excludeTags) &&
        typeof obj.options === 'object';
}

function isSelector(obj: any): obj is Selector {
    return obj &&
        Array.isArray(obj.includeTags) &&
        Array.isArray(obj.excludeTags) &&
        (typeof obj.options === 'object' || obj.options === undefined) &&
        obj.kind !== 'emoji'; // Exclude emoji generators
}

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
        { kind: 'verb', count: 1200 },
        { kind: 'emoji', count: 500 }
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

    async getDictionaries(): Promise<DictionaryStats[]> {
        return this.dictionaries;
    }

    async getDictionaryTags(): Promise<DictionaryTag[]> {
        return this.dictionaryTags;
    }
}

describe('basic tests', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should get metadata from slugkit', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const dictionaryData = parser.getDictionaryData();
        expect(dictionaryData.dictionaryNames).toEqual(['adjective', 'adverb', 'noun', 'verb']);
        expect(dictionaryData.tagsByDictionary).toEqual({
            noun: ['object', 'person', 'place', 'animal', 'plant', 'artifact', 'art'],
            adjective: ['color', 'size', 'shape', 'texture', 'taste'],
            adverb: ['manner', 'time', 'degree', 'place', 'frequency'],
            verb: ['action', 'motion', 'thought', 'communication', 'emotion'],
            emoji: ['face', 'animal', 'food', 'nature', 'activity', 'object'],
            '__global__': [
                "action",
                "motion",
                "thought",
                "communication",
                "emotion",
                "object",
                "person",
                "place",
                "animal",
                "plant",
                "artifact",
                "art",
                "manner",
                "time",
                "degree",
                "frequency",
                "color",
                "size",
                "shape",
                "texture",
                "taste",
                "face",
                "food",
                "nature",
                "activity",
            ],
        });
    });

    it('should support bitmask combinations for tokens and contexts', () => {
        // Single flags behave as expected
        expect(ExpectedToken.OPEN_BRACE & ExpectedToken.OPEN_BRACE).toBe(ExpectedToken.OPEN_BRACE);
        expect(ExpectedToken.OPEN_BRACE & ExpectedToken.CLOSE_BRACE).toBe(0);

        // Combine multiple flags and test membership
        const punctuation =
            ExpectedToken.OPEN_BRACE |
            ExpectedToken.CLOSE_BRACE |
            ExpectedToken.OPEN_BRACKET |
            ExpectedToken.CLOSE_BRACKET;

        expect(punctuation & ExpectedToken.OPEN_BRACE).toBe(ExpectedToken.OPEN_BRACE);
        expect(punctuation & ExpectedToken.COMMA).toBe(0);

        // Context flags are independent bitmasks
        expect(ParserContext.ARBITRARY & ParserContext.IN_PLACEHOLDER).toBe(0);
        const anyContext = ParserContext.ARBITRARY | ParserContext.IN_PLACEHOLDER | ParserContext.IN_GLOBAL_SETTINGS;
        expect(anyContext & ParserContext.IN_GLOBAL_SETTINGS).toBe(ParserContext.IN_GLOBAL_SETTINGS);
    });

    it('should be in arbitrary context by default', () => {
        {
            const parser = new PartialParser('');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE);
            expect(state.parsedSoFar.textChunks).toEqual(['']);
            expect(parser.isValid()).toBe(true);
        }
        {
            const parser = new PartialParser('some arbitrary text');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE);
            expect(state.parsedSoFar.textChunks).toEqual(['some arbitrary text']);
            expect(parser.isValid()).toBe(true);
        }
    });

    it('should parse escape sequences', () => {
        {
            const parser = new PartialParser('text with escaped chars \\{\\\}\\[\\]\\\\');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE);
            expect(parser.isValid()).toBe(true);
        }
        {
            const parser = new PartialParser('text with escaped chars \\');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.ESCAPED_CHARACTER);
            expect(parser.isValid()).toBe(false);
        }
    });

    it('should thow on an invalid escape sequence', () => {
        expect(() => new PartialParser('\\n')).toThrow(ParserError);
    });

    it('should be in in_placeholder context when inside a placeholder', () => {
        const parser = new PartialParser('{');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER);
        expect(state.expectedTokens).toBe(ExpectedToken.GENERATOR);
        expect(parser.isValid()).toBe(false);
    });

    it('should detect case', () => {
        expect(PartialParser.detectCase('')).toBe(PossibleCases.NONE);
        expect(PartialParser.detectCase('a')).toBe(PossibleCases.LOWER | PossibleCases.MIXED);
        expect(PartialParser.detectCase('A')).toBe(PossibleCases.UPPER | PossibleCases.TITLE | PossibleCases.MIXED);
        expect(PartialParser.detectCase('Ab')).toBe(PossibleCases.TITLE | PossibleCases.MIXED);
        expect(PartialParser.detectCase('ab')).toBe(PossibleCases.LOWER);
        expect(PartialParser.detectCase('AB')).toBe(PossibleCases.UPPER);
        expect(PartialParser.detectCase('AbC')).toBe(PossibleCases.MIXED);
        expect(PartialParser.detectCase('Abc')).toBe(PossibleCases.TITLE);
        expect(PartialParser.detectCase('AbcD')).toBe(PossibleCases.MIXED);
    });

    it('should mix the case properly', () => {
        expect(PartialParser.toMixedCase('', '')).toBe('');
        expect(PartialParser.toMixedCase('noun', '')).toBe('nOuN');
        expect(PartialParser.toMixedCase('noun', 'n')).toBe('nOuN');
        expect(PartialParser.toMixedCase('noun', 'nO')).toBe('nOuN');
        expect(PartialParser.toMixedCase('adjective', 'Ad')).toBe('AdJeCtIvE');
        expect(PartialParser.toMixedCase('adjective', 'aDj')).toBe('aDjEcTiVe');
        expect(PartialParser.toMixedCase('adjective', 'adJ')).toBe('adJeCtIvE');
        expect(PartialParser.toMixedCase('adjective', 'AdjE')).toBe('AdjEcTiVe');
    });

    it('should generate casing variants properly', () => {
        expect(PartialParser.generateCasingVariants('noun', PossibleCases.NONE, '')).toEqual([]);
        expect(PartialParser.generateCasingVariants('noun', PossibleCases.LOWER, '')).toEqual(['noun']);
        expect(PartialParser.generateCasingVariants('noun', PossibleCases.UPPER, '')).toEqual(['NOUN']);
        expect(PartialParser.generateCasingVariants('noun', PossibleCases.TITLE, '')).toEqual(['Noun']);
        expect(PartialParser.generateCasingVariants('noun', PossibleCases.MIXED, '')).toEqual(['nOuN']);
        expect(PartialParser.generateCasingVariants('noun',
            PossibleCases.LOWER | PossibleCases.UPPER | PossibleCases.TITLE | PossibleCases.MIXED, ''))
            .toEqual(['noun', 'NOUN', 'Noun', 'nOuN']);
        expect(PartialParser.generateCasingVariants('noun',
            PossibleCases.LOWER | PossibleCases.UPPER | PossibleCases.TITLE | PossibleCases.MIXED, 'No'))
            .toEqual(['noun', 'NOUN', 'Noun', 'NoUn']);
    });
});

//--------------------------------
// LastParsedToken verification
//--------------------------------
describe('lastParsedToken verification', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should track lastParsedToken correctly in single placeholder', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        
        // Test empty pattern
        parser.parse('');
        let state = parser.getState();
        expect(state.lastParsedToken).toBeNull();

        // Test after opening brace
        parser.parse('{');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('{');

        // Test partial generator
        parser.parse('{no');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('no');

        // Test complete generator
        parser.parse('{noun');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('noun');
    });

    it('should track lastParsedToken correctly with settings', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);

        // Test with colon
        parser.parse('{noun:');
        let state = parser.getState();
        expect(state.lastParsedToken).toBe(':');

        // Test with plus operator
        parser.parse('{noun:+');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('+');

        // Test with tag (full match with no more suggestions clears lastParsedToken)
        parser.parse('{noun:+animal');
        state = parser.getState();
        expect(state.lastParsedToken).toBe(''); // Cleared to allow fresh option suggestions
    });

    it('should track lastParsedToken correctly in multi-placeholder patterns', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);

        // Test first placeholder complete
        parser.parse('{adjective}');
        let state = parser.getState();
        expect(state.lastParsedToken).toBe('}');

        // Test with space after first placeholder
        parser.parse('{adjective} ');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('}'); // Should still be }, not the space

        // Test second placeholder opening
        parser.parse('{adjective} {');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('{');

        // Test partial generator in second placeholder
        parser.parse('{adjective} {adv');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('adv');

        // Test complete second placeholder
        parser.parse('{adjective} {adverb}');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('}');

        // Test third placeholder
        parser.parse('{adjective} {adverb} {');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('{');

        // Test partial generator in third placeholder
        parser.parse('{adjective} {adverb} {no');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('no');
    });

    it('should track lastParsedToken with complex patterns', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);

        // Test pattern with multiple placeholders and spaces (simpler case)
        parser.parse('{adjective} some text {no');
        let state = parser.getState();
        expect(state.lastParsedToken).toBe('no');

        // Test completed multi-placeholder pattern
        parser.parse('{adjective} {noun}');
        state = parser.getState();
        expect(state.lastParsedToken).toBe('}'); // Should be the closing brace of the last placeholder
    });
});

//--------------------------------
// Partial generator search
//--------------------------------
describe('partial generator search', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should suggest all generators when input is empty', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialGeneratorSearch('');
        expect(result.suggestions).toEqual(
            [
                'number',
                'special',
                'emoji',
                'adjective',
                'ADJECTIVE',
                'Adjective',
                'aDjEcTiVe',
                'adverb',
                'ADVERB',
                'Adverb',
                'aDvErB',
                'noun',
                'NOUN',
                'Noun',
                'nOuN',
                'verb',
                'VERB',
                'Verb',
                'vErB',
            ]);
    });

    it('should suggest matching generators when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialGeneratorSearch('n');
        expect(result.suggestions).toEqual(['number', 'noun', 'nOuN']);
    });

    it('should suggest matching generators when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialGeneratorSearch('N');
        expect(result.suggestions).toEqual(['NOUN', 'Noun', 'NoUn']);
    });

    it('should return empty search when nothing matches', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialGeneratorSearch('xyz');
        expect(result.suggestions).toEqual([]);
    });

    it('should return full matches when input is complete', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialGeneratorSearch('noun');
        expect(result.suggestions).toEqual([]);
        expect(result.fullMatch).toBe(true);
    });

    it('should suggest all tags for a dictionary', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('noun', '');
        expect(result.suggestions).toEqual(['object', 'person', 'place', 'animal', 'plant', 'artifact', 'art']);
    });

    it('should suggest all tags for global settings', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('__global__', '');
        expect(result.suggestions).toEqual(['action', 'motion', 'thought', 'communication', 'emotion', 'object', 'person', 'place', 'animal', 'plant', 'artifact', 'art', 'manner', 'time', 'degree', 'frequency', 'color', 'size', 'shape', 'texture', 'taste', 'face', 'food', 'nature', 'activity']);
    });

    it('should return empty search when nothing matches', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('xyz', '');
        expect(result.suggestions).toEqual([]);
    });

    it('should suggest matching tags when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('noun', 'a');
        expect(result.suggestions).toEqual(['animal', 'artifact', 'art']);
        expect(result.fullMatch).toBe(false);
    });

    it('should suggest extra matches when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('noun', 'art');
        expect(result.suggestions).toEqual(['artifact']);
        expect(result.fullMatch).toBe(true);
    });

    it('should suggest global tags when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('__global__', 'a');
        expect(result.suggestions).toEqual(['action', 'animal', 'artifact', 'art', 'activity']);
        expect(result.fullMatch).toBe(false);
    });

    it('should suggest extra global tags when input is partial', async () => {
        const parser = await PartialParser.withMetadata('', mockSlugKit);
        const result = parser.partialTagSearch('__global__', 'art');
        expect(result.suggestions).toEqual(['artifact']);
        expect(result.fullMatch).toBe(true);
    });
});

//--------------------------------
// Number generator
//--------------------------------
describe('number generator', () => {
    it('should be in number_gen context when inside a number generator', () => {
        const parser = new PartialParser('{number');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.NUMBER_GEN);
        expect(state.expectedTokens).toBe(ExpectedToken.COLON);
        expect(parser.isValid()).toBe(false);
    });

    it('should be in setting_options context when inside a setting or options', () => {
        const parser = new PartialParser('{number:');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.NUMBER_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
        expect(parser.isValid()).toBe(false);
    });

    it('should throw on invalid number', () => {
        expect(() => new PartialParser('{number:0}')).toThrow(ParserError);
    });

    it('should parse the number', () => {
        const parser = new PartialParser('{number:5');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.NUMBER_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.NUMBER_BASE_SHORT | ExpectedToken.COMMA | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
        expect(state.currentElement).not.toBeUndefined();
        expect(isNumberGen(state.currentElement)).toBe(true);
        if (isNumberGen(state.currentElement)) {
            expect(state.currentElement.maxLength).toBe(5);
            expect(state.currentElement.base).toBe(NumberBase.Dec);
        }
    });

    it('should throw on invalid number base', () => {
        expect(() => new PartialParser('{number:5,invalid}')).toThrow(ParserError);
        expect(() => new PartialParser('{number:5f}')).toThrow(ParserError);
    });

    it('should parse the number with default decimal base', () => {
        const parser = new PartialParser('{number:5}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.currentElement).toBeUndefined();
        expect(isNumberGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isNumberGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].maxLength).toBe(5);
            expect(state.parsedSoFar.elements[0].base).toBe(NumberBase.Dec);
        }
    });

    it('should parse the number with short base', () => {
        const parser = new PartialParser('{number:5x}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.currentElement).toBeUndefined();
        expect(isNumberGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isNumberGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].maxLength).toBe(5);
            expect(state.parsedSoFar.elements[0].base).toBe(NumberBase.Hex);
        }
    });

    it('should parse the number with full base', () => {
        const parser = new PartialParser('{number:5,hex}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.currentElement).toBeUndefined();
        expect(isNumberGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isNumberGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].maxLength).toBe(5);
            expect(state.parsedSoFar.elements[0].base).toBe(NumberBase.Hex);
        }
    });

    it('should parse the full placeholder', () => {
        const parser = new PartialParser('{number:5,hex}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.parsedSoFar.elements).toHaveLength(1);
        expect(isNumberGen(state.parsedSoFar.elements[0])).toBe(true);
    });
});

//--------------------------------
// Special character generator
//--------------------------------
describe('special character generator', () => {
    it('should be in special_gen context when inside a special character generator', () => {
        const parser = new PartialParser('{special');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN);
        expect(state.expectedTokens).toBe(ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });

    it('should be in setting_options context when inside a setting or options', () => {
        const parser = new PartialParser('{special:');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse the min/max length', () => {
        const parser = new PartialParser('{special:5');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.DASH | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
        expect(state.currentElement).not.toBeUndefined();
        expect(isSpecialCharGen(state.currentElement)).toBe(true);
        if (isSpecialCharGen(state.currentElement)) {
            expect(state.currentElement.minLength).toBe(5);
            expect(state.currentElement.maxLength).toBe(5);
        }
    });

    it('should expect number after dash', () => {
        const parser = new PartialParser('{special:5-');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect close brace after range', () => {
        const parser = new PartialParser('{special:5-6');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse correct placeholder with default range', () => {
        const parser = new PartialParser('{special}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.parsedSoFar.elements).toHaveLength(1);
        expect(isSpecialCharGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isSpecialCharGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].minLength).toBe(1);
            expect(state.parsedSoFar.elements[0].maxLength).toBe(1);
        }
    });

    it('should parse correct placeholder with single number', () => {
        const parser = new PartialParser('{special:5}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.parsedSoFar.elements).toHaveLength(1);
        expect(isSpecialCharGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isSpecialCharGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].minLength).toBe(5);
            expect(state.parsedSoFar.elements[0].maxLength).toBe(5);
        }
    });

    it('should parse correct placeholder with range', () => {
        const parser = new PartialParser('{special:5-6}');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.parsedSoFar.elements).toHaveLength(1);
        expect(isSpecialCharGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isSpecialCharGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].minLength).toBe(5);
            expect(state.parsedSoFar.elements[0].maxLength).toBe(6);
        }
    });
});

//--------------------------------
// Emoji generator
//--------------------------------
describe('emoji generator', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should be in emoji_gen context when inside an emoji generator', () => {
        const parser = new PartialParser('{emoji');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN);
        expect(state.expectedTokens).toBe(ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });

    it('should throw on invalid emoji generator', () => {
        expect(() => new PartialParser('{emoji:invalid}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:+-}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:-+}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:+ face}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:count=1 count=2}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:count=invalid}')).toThrow(ParserError);
        expect(() => new PartialParser('{emoji:unique=invalid}')).toThrow(ParserError);
    });

    it('should be in setting_options context when inside a setting or options', () => {
        const parser = new PartialParser('{emoji:');
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect tag after tag start', () => {
        {
            const parser = new PartialParser('{emoji:+');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = new PartialParser('{emoji:-');
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
    });

    it('should parse partial tags', async () => {
        const parser = await PartialParser.withMetadata('{emoji:+f', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.TAGS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse full tags', async () => {
        {
            const parser = await PartialParser.withMetadata('{emoji:+face', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.includeTags).toEqual(['face']);
                expect(state.currentElement.excludeTags).toEqual([]);
                expect(state.currentElement.options).toEqual({});
            }
        }
        {
            const parser = await PartialParser.withMetadata('{emoji: +face', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.includeTags).toEqual(['face']);
                expect(state.currentElement.excludeTags).toEqual([]);
                expect(state.currentElement.options).toEqual({});
            }
        }
        {
            const parser = await PartialParser.withMetadata('{emoji:+face-object', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.includeTags).toEqual(['face']);
                expect(state.currentElement.excludeTags).toEqual(['object']);
                expect(state.currentElement.options).toEqual({});
            }
        }
        {
            const parser = await PartialParser.withMetadata('{emoji: +face -object', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.includeTags).toEqual(['face']);
                expect(state.currentElement.excludeTags).toEqual(['object']);
                expect(state.currentElement.options).toEqual({});
            }
        }
    });

    it('should parse partial options', async () => {
        const parser = await PartialParser.withMetadata('{emoji:co', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.OPTION);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse full option names', async () => {
        const parser = await PartialParser.withMetadata('{emoji:count', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.EQUALS);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect correct option type (boolean)', async () => {
        const parser = await PartialParser.withMetadata('{emoji:unique=', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.BOOLEAN);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect correct option type (boolean)', async () => {
        const parser = await PartialParser.withMetadata('{emoji:unique=', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.BOOLEAN);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect correct option type (number)', async () => {
        const parser = await PartialParser.withMetadata('{emoji:count=', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS | ParserContext.OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse correct option type (number)', async () => {
        const parser = await PartialParser.withMetadata('{emoji:count=5', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse correct option type (boolean)', async () => {
        {
            const parser = await PartialParser.withMetadata('{emoji:unique=true', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.options).toEqual({ unique: 'true' });
            }
        }
        {
            const parser = await PartialParser.withMetadata('{emoji:unique=false', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.options).toEqual({ unique: 'false' });
            }
        }
    });

    it('should parse correct option type (number or range)', async () => {
        {
            const parser = await PartialParser.withMetadata('{emoji:count=1', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.options).toEqual({ count: '1' });
            }
        }
        {
            const parser = await PartialParser.withMetadata('{emoji:count=1-2', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isEmojiGen(state.currentElement)).toBe(true);
            if (isEmojiGen(state.currentElement)) {
                expect(state.currentElement.options).toEqual({ count: '1-2' });
            }
        }
    });

    it('should parse full emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji:+face count=1-2 unique=true}', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.currentElement).toBeUndefined();
        expect(isEmojiGen(state.parsedSoFar.elements[0])).toBe(true);
        if (isEmojiGen(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].includeTags).toEqual(['face']);
            expect(state.parsedSoFar.elements[0].excludeTags).toEqual([]);
            expect(state.parsedSoFar.elements[0].options).toEqual({ count: '1-2', unique: 'true' });
        }
    });
});

//--------------------------------
// Selector
//--------------------------------
describe('selector', () => {
    let mockSlugKit: MockSlugKit;
    const dictionaryNames: string[] = ['noun'];
    const tagsByDictionary: Record<string, string[]> = {
        noun: ['animal', 'art', 'artifact', 'plant', 'object', 'person', 'place'],
    };

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should throw on invalid selector', () => {
        expect(() => new PartialParser('{noun@}', dictionaryNames, tagsByDictionary)).toThrow(ParserError);
        expect(() => new PartialParser('{noun@:}', dictionaryNames, tagsByDictionary)).toThrow(ParserError);
    });

    it('should parse partial selector', async () => {
        const parser = await PartialParser.withMetadata('{no', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.PARTIAL_GENERATOR_NAME);
        expect(state.expectedTokens).toBe(ExpectedToken.GENERATOR);
        expect(parser.isValid()).toBe(false);
    });

    it('should be in selector context when inside a selector', async () => {
        const parser = await PartialParser.withMetadata('{noun', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR);
        expect(state.expectedTokens).toBe(ExpectedToken.COLON | ExpectedToken.AT_SIGN | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });
    it('should wait for language after @', async () => {
        const parser = await PartialParser.withMetadata('{noun@', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR);
        expect(state.expectedTokens).toBe(ExpectedToken.LANGUAGE);
        expect(parser.isValid()).toBe(false);
    });
    it('should parse language after @', async () => {
        const parser = await PartialParser.withMetadata('{noun@en', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR);
        expect(state.expectedTokens).toBe(ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });
    it('should expect correct tokens after colon', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
        expect(parser.isValid()).toBe(false);
    });
    it('shoud expect tags after tag start', async () => {
        {
            const parser = await PartialParser.withMetadata('{noun@en:+', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:-', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
    });
    it('should expect correct tokens after full tag', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:+animal', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS);
        expect(state.expectedTokens).toBe(ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE | ExpectedToken.TAG_START);
        expect(parser.isValid()).toBe(false);
    });
    it('should expect equals after `!` or `=`', async () => {
        {
            const parser = await PartialParser.withMetadata('{noun@en:!', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.EQUALS);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:=', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.EQUALS);
            expect(parser.isValid()).toBe(false);
        }
    });
    it('should expect equals or number after `<` or `>`', async () => {
        {
            const parser = await PartialParser.withMetadata('{noun@en:<', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER | ExpectedToken.EQUALS);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:>', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER | ExpectedToken.EQUALS);
            expect(parser.isValid()).toBe(false);
        }
    });
    it('should expect number after `==` or `!=` or `<=` or `>=`', async () => {
        {
            const parser = await PartialParser.withMetadata('{noun@en:==', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:!=', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:<=', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:>=', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS | ParserContext.SIZE_LIMIT);
            expect(state.expectedTokens).toBe(ExpectedToken.NUMBER);
            expect(parser.isValid()).toBe(false);
        }
    });
    it('should parse size limit', async () => {
        {
            const parser = await PartialParser.withMetadata('{noun@en:==5', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isSelector(state.currentElement)).toBe(true);
            if (isSelector(state.currentElement)) {
                expect(state.currentElement.sizeLimit).not.toBeUndefined();
                expect(state.currentElement.sizeLimit!.op).toEqual(CompareOperator.Eq);
                expect(state.currentElement.sizeLimit!.value).toEqual(5);
            }
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:!=5', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isSelector(state.currentElement)).toBe(true);
            if (isSelector(state.currentElement)) {
                expect(state.currentElement.sizeLimit).not.toBeUndefined();
                expect(state.currentElement.sizeLimit!.op).toEqual(CompareOperator.Ne);
                expect(state.currentElement.sizeLimit!.value).toEqual(5);
            }
        }
        {
            const parser = await PartialParser.withMetadata('{noun@en:<5', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR | ParserContext.SETTING_OPTIONS);
            expect(state.expectedTokens).toBe(ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE);
            expect(parser.isValid()).toBe(false);
            expect(state.currentElement).not.toBeUndefined();
            expect(isSelector(state.currentElement)).toBe(true);
            if (isSelector(state.currentElement)) {
                expect(state.currentElement.sizeLimit).not.toBeUndefined();
                expect(state.currentElement.sizeLimit!.op).toEqual(CompareOperator.Lt);
                expect(state.currentElement.sizeLimit!.value).toEqual(5);
            }
        }
    });
    it('should parse full selector', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:+animal -art >3}', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
        expect(parser.isValid()).toBe(true);
        expect(state.currentElement).toBeUndefined();
        expect(isSelector(state.parsedSoFar.elements[0])).toBe(true);
        if (isSelector(state.parsedSoFar.elements[0])) {
            expect(state.parsedSoFar.elements[0].kind).toEqual('noun');
            expect(state.parsedSoFar.elements[0].language).toEqual('en');
            expect(state.parsedSoFar.elements[0].includeTags).toEqual(['animal']);
            expect(state.parsedSoFar.elements[0].excludeTags).toEqual(['art']);
            expect(state.parsedSoFar.elements[0].sizeLimit).not.toBeUndefined();
            expect(state.parsedSoFar.elements[0].sizeLimit!.op).toEqual(CompareOperator.Gt);
            expect(state.parsedSoFar.elements[0].sizeLimit!.value).toEqual(3);
        }
    });
});

//--------------------------------
// Global settings
//--------------------------------
describe('global settings', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should throw on invalid global settings', () => {
        // expect(() => new PartialParser('[]', mockSlugKit)).toThrow(ParserError);
        // expect(() => new PartialParser('{__global__:+}', mockSlugKit)).toThrow(ParserError);
        // expect(() => new PartialParser('{__global__:-}', mockSlugKit)).toThrow(ParserError);
        // expect(() => new PartialParser('{__global__:==}', mockSlugKit)).toThrow(ParserError);
        // expect(() => new PartialParser('{__global__:!=}', mockSlugKit)).toThrow(ParserError);
    });

    it('should be in global settings context when inside a global settings', async () => {
        const parser = await PartialParser.withMetadata('{number:5}[', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.AT_SIGN | ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect language after @', async () => {
        const parser = await PartialParser.withMetadata('{number:5}[@', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.LANGUAGE);
        expect(parser.isValid()).toBe(false);
    });
    it('should parse language after @', async () => {
        const parser = await PartialParser.withMetadata('{number:5}[@en', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET);
        expect(parser.isValid()).toBe(false);
    });

    it('should expect tags after + or -', async () => {
        {
            const parser = await PartialParser.withMetadata('{number:5}[+', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
        {
            const parser = await PartialParser.withMetadata('{number:5}[-', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS | ParserContext.TAGS);
            expect(state.expectedTokens).toBe(ExpectedToken.TAG);
            expect(parser.isValid()).toBe(false);
        }
    });

    it('should parse partial tags', async () => {
        const parser = await PartialParser.withMetadata('{number:5}[+f', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS | ParserContext.TAGS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse full tags', async () => {
        const parser = await PartialParser.withMetadata('{emoji}[+food -animal', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse size limit', async () => {
        const parser = await PartialParser.withMetadata('{emoji}[>=3', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse lang, tags and size limit', async () => {
        const parser = await PartialParser.withMetadata('{emoji}[@en +food -animal >=3', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.IN_GLOBAL_SETTINGS);
        expect(state.expectedTokens).toBe(ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET);
        expect(parser.isValid()).toBe(false);
    });

    it('should parse full global settings', async () => {
        const parser = await PartialParser.withMetadata('{emoji}[@en +food -animal >=3]', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.NONE);
        expect(parser.isValid()).toBe(true);
    });

});

//--------------------------------
// Full pattern parser tests
//--------------------------------
describe('full pattern parser', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });
    it('should parse full pattern', async () => {
        const parser = await PartialParser.withMetadata('{emoji}[@en +food -animal >=3]', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.NONE);
        expect(parser.isValid()).toBe(true);
    });
    it('should parse multiple placeholders', async () => {
        const parser = await PartialParser.withMetadata('{emoji} {special:5-6}', mockSlugKit);
        const state = parser.getState();
        expect(state.context).toBe(ParserContext.ARBITRARY);
        expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET
        );
        expect(parser.isValid()).toBe(true);
    });
    it('should parse arbitrary text after placeholders', async () => {
        {
            const parser = await PartialParser.withMetadata('{emoji} {special:5-6} arbitrary text', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
            expect(parser.isValid()).toBe(true);
        }
        {
            const parser = await PartialParser.withMetadata('{noun} arbitrary text', mockSlugKit);
            const state = parser.getState();
            expect(state.context).toBe(ParserContext.ARBITRARY);
            expect(state.expectedTokens).toBe(ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET);
            expect(parser.isValid()).toBe(true);
        }
    });
});

//--------------------------------
// Partial parser suggestions
//--------------------------------
describe('partial parser suggestions', () => {
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
    });

    it('should suggest all generators when input is empty', async () => {
        const parser = await PartialParser.withMetadata('{', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([
            'number',
            'special',
            'emoji',
            'adjective',
            'ADJECTIVE',
            'Adjective',
            'aDjEcTiVe',
            'adverb',
            'ADVERB',
            'Adverb',
            'aDvErB',
            'noun',
            'NOUN',
            'Noun',
            'nOuN',
            'verb',
            'VERB',
            'Verb',
            'vErB',
        ]);
    });

    it('should suggest matching generators when input is partial', async () => {
        {
            const parser = await PartialParser.withMetadata('{n', mockSlugKit);
            const suggestionProvider = new SuggestionProvider(parser);
            const suggestions = suggestionProvider.getSuggestions();
            expect(suggestions.map(s => s.text)).toEqual(['number', 'noun', 'nOuN']);
        }
        {
            const parser = await PartialParser.withMetadata('{N', mockSlugKit);
            const suggestionProvider = new SuggestionProvider(parser);
            const suggestions = suggestionProvider.getSuggestions();
            expect(suggestions.map(s => s.text)).toEqual(['NOUN', 'Noun', 'NoUn']);
        }
    });

    it('should suggest colon after number generator', async () => {
        const parser = await PartialParser.withMetadata('{number', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':']);
    });

    it('should suggest colon and `}` after special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':', '}']);
    });

    it('should suggest colon and `}` after emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':', '}']);
    });

    it('should suggest `@`, colon and `}` after dictionary generator', async () => {
        const parser = await PartialParser.withMetadata('{adjective', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['@', ':', '}']);
    });

    // number generator checks
    it('should suggest nothing after colon in number generator', async () => {
        const parser = await PartialParser.withMetadata('{number:', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([]);
    });
    it('should suggest short number bases or a comma after colon in number generator', async () => {
        const parser = await PartialParser.withMetadata('{number:5', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['d', 'x', 'X', 'r', 'R', ',', '}']);
    });
    it('should suggest full number bases after comma in number generator', async () => {
        const parser = await PartialParser.withMetadata('{number:5,', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['dec', 'hex', 'HEX', 'roman', 'ROMAN']);
    });
    it('should suggest `}` after any number base in number generator', async () => {
        {
            const parser = await PartialParser.withMetadata('{number:5x', mockSlugKit);
            const suggestionProvider = new SuggestionProvider(parser);
            const suggestions = suggestionProvider.getSuggestions();
            expect(suggestions.map(s => s.text)).toEqual(['}']);
        }
        {
            const parser = await PartialParser.withMetadata('{number:5,hex', mockSlugKit);
            const suggestionProvider = new SuggestionProvider(parser);
            const suggestions = suggestionProvider.getSuggestions();
            expect(suggestions.map(s => s.text)).toEqual(['}']);
        }
    });
    // special char generator checks
    it('should suggest a colon or `}` in special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':', '}']);
    });
    it('should suggest nothing after colon in special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special:', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([]);
    });
    it('should suggest a range separator or `}` in special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special:5', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['-', '}']);
    });
    it('should suggest nothing after range separator in special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special:5-', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([]);
    });
    it('should suggest `}` after full range in special char generator', async () => {
        const parser = await PartialParser.withMetadata('{special:5-6', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['}']);
    });
    // emoji generator checks
    it('should suggest `:` after emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':', '}']);
    });
    it('should suggest tag start or options after `:` in emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji:', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['count=', 'unique=', '+', '-', '}']);
    });
    it('shoud suggest tags after tag start in emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji:+', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['face', 'animal', 'food', 'nature', 'activity', 'object']);
    });
    it('shoud suggest tags after partial tag input in emoji generator', async () => {
        const parser = await PartialParser.withMetadata('{emoji:+f', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['face', 'food']);
    });
    // dictionary selector checks
    it('should suggest `@`, `:`, `}` after dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{adjective', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['@', ':', '}']);
    });
    it('should suggest language after @ in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{adjective@', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['en']);
    });
    it('should suggest `:` and `}` after language in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{adjective@en', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([':', '}']);
    });
    it('should suggest tag start, comparison ops or options after `:` in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{adjective@en:', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['+', '-', '==', '!=', '<', '>', '<=', '>=', '}']);
    });
    it('should suggest tags after tag start in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:+', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([
            "object",
            "person",
            "place",
            "animal",
            "plant",
            "artifact",
            "art"
        ]);
    });
    it('should suggest tags after partial tag input in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:+a', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual(['animal', 'artifact', 'art']);
    });
    it('should suggest more tags after full tag input in dictionary selector', async () => {
        const parser = await PartialParser.withMetadata('{noun@en:+art', mockSlugKit);
        const suggestionProvider = new SuggestionProvider(parser);
        const suggestions = suggestionProvider.getSuggestions();
        expect(suggestions.map(s => s.text)).toEqual([
            "artifact", // Now properly suggests matching tags
            "+",        // Tag operators for additional tags
            "-",        // Tag operators for additional tags
            "==",
            "!=",
            "<",
            ">",
            "<=",
            ">=",
            "}"
        ]);
    });
});