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

    async getDictionaries(): Promise<DictionaryStats[]> {
        return this.dictionaries;
    }

    async getDictionaryTags(): Promise<DictionaryTag[]> {
        return this.dictionaryTags;
    }
}

describe('Suggestion Substitution', () => {
    let patternSuggestions: PatternSuggestions;
    let mockSlugKit: MockSlugKit;

    beforeEach(() => {
        mockSlugKit = new MockSlugKit();
        patternSuggestions = new PatternSuggestions(mockSlugKit);
    });

    describe('Basic generator substitution', () => {
        it('should substitute empty placeholder with number generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{', 1);
            const numberSuggestion = suggestions.find(s => s.text === 'number');
            expect(numberSuggestion).toBeDefined();

            // Apply substitution: '{' + 'number' should result in '{number'
            const result = applySuggestion('{', numberSuggestion!);
            expect(result).toBe('{number');
        });

        it('should substitute empty placeholder with special generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{', 1);
            const specialSuggestion = suggestions.find(s => s.text === 'special');
            expect(specialSuggestion).toBeDefined();

            const result = applySuggestion('{', specialSuggestion!);
            expect(result).toBe('{special');
        });

        it('should substitute empty placeholder with emoji generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{', 1);
            const emojiSuggestion = suggestions.find(s => s.text === 'emoji');
            expect(emojiSuggestion).toBeDefined();

            const result = applySuggestion('{', emojiSuggestion!);
            expect(result).toBe('{emoji');
        });

        it('should substitute empty placeholder with dictionary generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{', 1);
            const nounSuggestion = suggestions.find(s => s.text === 'noun');
            expect(nounSuggestion).toBeDefined();

            const result = applySuggestion('{', nounSuggestion!);
            expect(result).toBe('{noun');
        });
    });

    describe('Partial generator substitution', () => {
        it('should substitute partial input with complete generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{no', 4);
            const nounSuggestion = suggestions.find(s => s.text === 'noun');
            expect(nounSuggestion).toBeDefined();


            // Apply substitution: '{no' + 'noun' at range {start: 1, end: 4} = '{noun'
            // Note: Should replace the entire "no" part with "noun"
            const result = applySuggestion('{no', nounSuggestion!);
            expect(result).toBe('{noun');
        });

        it('should substitute partial input with number generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{nu', 4);
            const numberSuggestion = suggestions.find(s => s.text === 'number');
            expect(numberSuggestion).toBeDefined();

            const result = applySuggestion('{nu', numberSuggestion!);
            expect(result).toBe('{number');
        });

        it('should substitute partial input with adjective generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{ad', 4);
            const adjectiveSuggestion = suggestions.find(s => s.text === 'adjective');
            expect(adjectiveSuggestion).toBeDefined();

            const result = applySuggestion('{ad', adjectiveSuggestion!);
            expect(result).toBe('{adjective');
        });

        it('should substitute partial input with adverb generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{adv', 5);
            const adverbSuggestion = suggestions.find(s => s.text === 'adverb');
            expect(adverbSuggestion).toBeDefined();

            const result = applySuggestion('{adv', adverbSuggestion!);
            expect(result).toBe('{adverb');
        });
    });

    describe('Casing variant substitution', () => {
        it('should substitute with title case variant', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{Ad', 3);
            const adjectiveSuggestion = suggestions.find(s => s.text === 'Adjective');
            expect(adjectiveSuggestion).toBeDefined();

            const result = applySuggestion('{Ad', adjectiveSuggestion!);
            expect(result).toBe('{Adjective');
        });

        it('should substitute with uppercase variant', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{AD', 3);
            const adjectiveSuggestion = suggestions.find(s => s.text === 'ADJECTIVE');
            expect(adjectiveSuggestion).toBeDefined();

            const result = applySuggestion('{AD', adjectiveSuggestion!);
            expect(result).toBe('{ADJECTIVE');
        });

        it('should substitute with mixed case variant', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{Ad', 3);
            const adjectiveSuggestion = suggestions.find(s => s.text === 'AdJeCtIvE');
            expect(adjectiveSuggestion).toBeDefined();

            const result = applySuggestion('{Ad', adjectiveSuggestion!);
            expect(result).toBe('{AdJeCtIvE');
        });
    });

    describe('Settings section substitution', () => {
        it('should substitute colon after complete generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun', 6);
            const colonSuggestion = suggestions.find(s => s.text === ':');
            expect(colonSuggestion).toBeDefined();

            const result = applySuggestion('{noun', colonSuggestion!);
            expect(result).toBe('{noun:');
        });

        it('should substitute plus operator for tags', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:', 7);
            const plusSuggestion = suggestions.find(s => s.text === '+');
            expect(plusSuggestion).toBeDefined();

            const result = applySuggestion('{noun:', plusSuggestion!);
            expect(result).toBe('{noun:+');
        });

        it('should substitute minus operator for tags', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:', 7);
            const minusSuggestion = suggestions.find(s => s.text === '-');
            expect(minusSuggestion).toBeDefined();

            const result = applySuggestion('{noun:', minusSuggestion!);
            expect(result).toBe('{noun:-');
        });

        it('should substitute tag after plus operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+', 8);
            const animalSuggestion = suggestions.find(s => s.text === 'animal');
            expect(animalSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+', animalSuggestion!);
            expect(result).toBe('{noun:+animal');
        });

        it('should substitute partial tag with complete tag', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+a', 8);
            const animalSuggestion = suggestions.find(s => s.text === 'animal');
            expect(animalSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+a', animalSuggestion!);
            expect(result).toBe('{noun:+animal');
        });

        it('should substitute longer partial tag with complete tag', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+an', 9);
            const animalSuggestion = suggestions.find(s => s.text === 'animal');
            expect(animalSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+an', animalSuggestion!);
            expect(result).toBe('{noun:+animal');
        });
    });

    describe('Size constraint substitution', () => {
        it('should substitute comparison operator after tags', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const equalSuggestion = suggestions.find(s => s.text === '==');
            expect(equalSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', equalSuggestion!);
            expect(result).toBe('{noun:+animal ==');
        });

        it('should substitute less than operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const lessThanSuggestion = suggestions.find(s => s.text === '<');
            expect(lessThanSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', lessThanSuggestion!);
            expect(result).toBe('{noun:+animal <');
        });

        it('should substitute greater than operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const greaterThanSuggestion = suggestions.find(s => s.text === '>');
            expect(greaterThanSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', greaterThanSuggestion!);
            expect(result).toBe('{noun:+animal >');
        });

        it('should substitute less than or equal operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const lessThanEqualSuggestion = suggestions.find(s => s.text === '<=');
            expect(lessThanEqualSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', lessThanEqualSuggestion!);
            expect(result).toBe('{noun:+animal <=');
        });

        it('should substitute greater than or equal operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const greaterThanEqualSuggestion = suggestions.find(s => s.text === '>=');
            expect(greaterThanEqualSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', greaterThanEqualSuggestion!);
            expect(result).toBe('{noun:+animal >=');
        });

        it('should substitute not equal operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal ', 15);
            const notEqualSuggestion = suggestions.find(s => s.text === '!=');
            expect(notEqualSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal ', notEqualSuggestion!);
            expect(result).toBe('{noun:+animal !=');
        });
    });



    describe('Emoji generator substitution', () => {
        it('should substitute emoji tags after plus operator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{emoji:+', 8);
            const faceSuggestion = suggestions.find(s => s.text === 'face');
            expect(faceSuggestion).toBeDefined();

            const result = applySuggestion('{emoji:+', faceSuggestion!);
            expect(result).toBe('{emoji:+face');
        });

        // it('should substitute emoji options after tags', async () => {
        //     const suggestions = await patternSuggestions.getSuggestions('{emoji:+face ', 13);
        //     const countSuggestion = suggestions.find(s => s.text === 'count=');
        //     expect(countSuggestion).toBeDefined();

        //     const result = applySuggestion('{emoji:+face ', countSuggestion!);
        //     expect(result).toBe('{emoji:+face count=');
        // });

        it('should substitute emoji options directly after colon', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{emoji:', 7);
            const countSuggestion = suggestions.find(s => s.text === 'count=');
            expect(countSuggestion).toBeDefined();

            const result = applySuggestion('{emoji:', countSuggestion!);
            expect(result).toBe('{emoji:count=');
        });
    });

    describe('Closing brace substitution', () => {
        it('should substitute closing brace after complete generator', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun', 6);
            const closeSuggestion = suggestions.find(s => s.text === '}');
            expect(closeSuggestion).toBeDefined();

            const result = applySuggestion('{noun', closeSuggestion!);
            expect(result).toBe('{noun}');
        });

        it('should substitute closing brace after complete tag', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:+animal', 14);
            const closeSuggestion = suggestions.find(s => s.text === '}');
            expect(closeSuggestion).toBeDefined();

            const result = applySuggestion('{noun:+animal', closeSuggestion!);
            expect(result).toBe('{noun:+animal}');
        });

        it('should substitute closing brace after size constraint', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{noun:==4', 9);
            const closeSuggestion = suggestions.find(s => s.text === '}');
            expect(closeSuggestion).toBeDefined();

            const result = applySuggestion('{noun:==4', closeSuggestion!);
            expect(result).toBe('{noun:==4}');
        });

        it('should substitute closing brace after number format', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{number:4d', 10);
            const closeSuggestion = suggestions.find(s => s.text === '}');
            expect(closeSuggestion).toBeDefined();

            const result = applySuggestion('{number:4d', closeSuggestion!);
            expect(result).toBe('{number:4d}');
        });
    });

    describe('Complex substitution scenarios', () => {
        it('should substitute multiple suggestions in sequence', async () => {
            // Start with empty placeholder
            let pattern = '{';
            let cursor = 1;

            // Add noun generator
            let suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let nounSuggestion = suggestions.find(s => s.text === 'noun');
            pattern = applySuggestion(pattern, nounSuggestion!);
            cursor = pattern.length;

            // Add colon
            suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let colonSuggestion = suggestions.find(s => s.text === ':');
            pattern = applySuggestion(pattern, colonSuggestion!);
            cursor = pattern.length;

            // Add plus operator
            suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let plusSuggestion = suggestions.find(s => s.text === '+');
            pattern = applySuggestion(pattern, plusSuggestion!);
            cursor = pattern.length;

            // Add animal tag
            suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let animalSuggestion = suggestions.find(s => s.text === 'animal');
            pattern = applySuggestion(pattern, animalSuggestion!);
            cursor = pattern.length;

            // Add space and comparison operator
            pattern += ' ';
            cursor = pattern.length;
            suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let equalSuggestion = suggestions.find(s => s.text === '==');
            pattern = applySuggestion(pattern, equalSuggestion!);
            cursor = pattern.length;

            // Add number
            pattern += '4';
            cursor = pattern.length;

            // Add closing brace
            suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
            let closeSuggestion = suggestions.find(s => s.text === '}');
            pattern = applySuggestion(pattern, closeSuggestion!);

            expect(pattern).toBe('{noun:+animal ==4}');
        });

        // it('should substitute emoji generator with options', async () => {
        //     let pattern = '{';
        //     let cursor = 1;

        //     // Add emoji generator
        //     let suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
        //     let emojiSuggestion = suggestions.find(s => s.text === 'emoji');
        //     pattern = applySuggestion(pattern, emojiSuggestion!);
        //     cursor = pattern.length;

        //     // Add colon
        //     suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
        //     let colonSuggestion = suggestions.find(s => s.text === ':');
        //     pattern = applySuggestion(pattern, colonSuggestion!);
        //     cursor = pattern.length;

        //     // Add count option
        //     suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
        //     let countSuggestion = suggestions.find(s => s.text === 'count=');
        //     pattern = applySuggestion(pattern, countSuggestion!);
        //     cursor = pattern.length;

        //     // Add count value
        //     pattern += '3';
        //     cursor = pattern.length;

        //     // Add closing brace
        //     suggestions = await patternSuggestions.getSuggestions(pattern, cursor);
        //     let closeSuggestion = suggestions.find(s => s.text === '}');
        //     pattern = applySuggestion(pattern, closeSuggestion!);

        //     expect(pattern).toBe('{emoji:count=3}');
        // });
    });

    describe('Multi-placeholder patterns', () => {
        it('should substitute generator in second placeholder', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{adjective} {adv', 16);
            const adverbSuggestion = suggestions.find(s => s.text === 'adverb');
            expect(adverbSuggestion).toBeDefined();

            const result = applySuggestion('{adjective} {adv', adverbSuggestion!);
            expect(result).toBe('{adjective} {adverb');
        });

        it('should substitute generator in third placeholder', async () => {
            const suggestions = await patternSuggestions.getSuggestions('{adjective} {adverb} {no', 24);
            const nounSuggestion = suggestions.find(s => s.text === 'noun');
            expect(nounSuggestion).toBeDefined();

            const result = applySuggestion('{adjective} {adverb} {no', nounSuggestion!);
            expect(result).toBe('{adjective} {adverb} {noun');
        });

        it('should substitute partial generator in middle of pattern', async () => {
            const suggestions = await patternSuggestions.getSuggestions('prefix {adjec} suffix', 12); // Cursor in middle of token (should be auto-adjusted)
            const adjectiveSuggestion = suggestions.find(s => s.text === 'adjective');
            expect(adjectiveSuggestion).toBeDefined();

            const result = applySuggestion('prefix {adjec} suffix', adjectiveSuggestion!);
            expect(result).toBe('prefix {adjective} suffix');
        });

        it('should handle complex patterns with spaces and punctuation', async () => {
            const suggestions = await patternSuggestions.getSuggestions('The {adjective}-looking {nou} walked', 28);
            const nounSuggestion = suggestions.find(s => s.text === 'noun');
            expect(nounSuggestion).toBeDefined();

            const result = applySuggestion('The {adjective}-looking {nou} walked', nounSuggestion!);
            expect(result).toBe('The {adjective}-looking {noun} walked');
        });
    });
});

// Helper function to apply a suggestion to a pattern
function applySuggestion(pattern: string, suggestion: { text: string; replaceRange: { start: number; end: number } }): string {
    const { text, replaceRange } = suggestion;
    const before = pattern.substring(0, replaceRange.start);
    const after = pattern.substring(replaceRange.end);
    return before + text + after;
}
