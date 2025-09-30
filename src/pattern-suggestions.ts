import { DictionaryStats, DictionaryTag } from './types';
import { PartialParser, SuggestionProvider, Suggestion as BaseSuggestion } from './partial-parser';


export interface Suggestion {
    text: string;
    description?: string;
    type: 'generator' | 'tag' | 'operator' | 'symbol' | 'language' | 'base';
    replaceRange: {
        start: number;
        end: number;
    };
}

export interface SuggestionContext {
    pattern: string;
    cursorPosition: number;
    placeholderStart: number;
    placeholderEnd: number;
    placeholderContent: string;
    isInSettings: boolean;
    isInTags: boolean;
    isInLengthConstraint: boolean;
    isInOptions: boolean;
}

// Interface for the methods that PatternSuggestions actually uses
interface SlugKitInterface {
    getDictionaries(): Promise<DictionaryStats[]>;
    getDictionaryTags(): Promise<DictionaryTag[]>;
}

export class PatternSuggestions {
    private slugkit: SlugKitInterface;
    private parser: PartialParser;
    private suggestionProvider: SuggestionProvider;

    constructor(slugkit: SlugKitInterface) {
        this.slugkit = slugkit;
        // Initialize with empty data - will be populated when getSuggestions is called
        this.parser = new PartialParser('', [], {});
        this.suggestionProvider = new SuggestionProvider(this.parser);
    }

    /**
     * Get suggestions based on pattern and cursor position
     */
    async getSuggestions(pattern: string, cursorPosition: number): Promise<Suggestion[]> {
        // Get dictionary data from slugkit
        const [dictionaries, dictionaryTags] = await Promise.all([
            this.slugkit.getDictionaries(),
            this.slugkit.getDictionaryTags()
        ]);

        // Build dictionary names and tags mapping
        const dictionaryNames = dictionaries.map(d => d.kind);
        const tagsByDictionary: Record<string, string[]> = {};

        for (const tag of dictionaryTags) {
            if (!tagsByDictionary[tag.kind]) {
                tagsByDictionary[tag.kind] = [];
            }
            tagsByDictionary[tag.kind].push(tag.tag);
        }

        // Reinitialize parser with dictionary data
        this.parser = new PartialParser('', dictionaryNames, tagsByDictionary);
        this.suggestionProvider = new SuggestionProvider(this.parser);

        // Adjust cursor position to end of current token if inside placeholder/global settings
        const adjustedCursorPosition = this.adjustCursorToTokenEnd(pattern, cursorPosition);

        // Parse the pattern up to the adjusted cursor position
        try {
            this.parser.parse(pattern.substring(0, adjustedCursorPosition));
        } catch (error) {
            // If parsing fails, we're likely outside any placeholder or in an invalid state
            // Return empty suggestions - the parser intentionally doesn't suggest '{'
            return [];
        }

        // Get basic suggestions from the suggestion provider
        const baseSuggestions = this.suggestionProvider.getSuggestions();

        // If no suggestions, we might be outside any placeholder
        if (baseSuggestions.length === 0) {
            return [];
        }

        // Enrich the suggestions with descriptions and correct replace ranges
        const enrichedSuggestions: Suggestion[] = [];

        for (const baseSuggestion of baseSuggestions) {
            const enrichedSuggestion = await this.enrichSuggestion(baseSuggestion, pattern, adjustedCursorPosition);
            enrichedSuggestions.push(enrichedSuggestion);
        }

        return enrichedSuggestions;
    }

    /**
     * Enrich a basic suggestion with description and correct replace range
     */
    private async enrichSuggestion(baseSuggestion: BaseSuggestion, pattern: string, cursorPosition: number): Promise<Suggestion> {
        const description = await this.getSuggestionDescription(baseSuggestion);
        const replaceRange = this.calculateReplaceRangeForSuggestion(baseSuggestion, pattern, cursorPosition);

        return {
            text: baseSuggestion.text,
            type: baseSuggestion.type,
            description,
            replaceRange
        };
    }

    /**
     * Get description for a suggestion based on its type and content
     */
    private async getSuggestionDescription(suggestion: BaseSuggestion): Promise<string> {
        switch (suggestion.type) {
            case 'generator':
                return this.getGeneratorDescription(suggestion.text);

            case 'tag':
                return this.getTagDescription(suggestion.text);

            case 'operator':
                return this.getOperatorDescription(suggestion.text);

            case 'symbol':
                return this.getSymbolDescription(suggestion.text);

            case 'language':
                return 'Language specifier';

            case 'base':
                return 'Number base';

            default:
                return '';
        }
    }

    /**
     * Calculate replace range for a suggestion
     */
    private calculateReplaceRangeForSuggestion(suggestion: BaseSuggestion, _pattern: string, cursorPosition: number): { start: number; end: number } {
        const state = this.parser.getState();
        const lastToken = state.lastParsedToken;

        // Default: insert at cursor position
        let start = cursorPosition;
        let end = cursorPosition;

        // If we have a last token, use the parser's token position information
        if (lastToken) {
            // Check if this is a structural token or operator that we should insert after
            const isStructuralOrOperator = lastToken === '{' || lastToken === '}' || lastToken === '[' || lastToken === ']' || 
                                         lastToken === '+' || lastToken === '-' || lastToken === ':' || lastToken === '=';
            
            // For structural tokens and operators, insert after them (don't replace)
            if (isStructuralOrOperator) {
                start = cursorPosition;
                end = cursorPosition;
            } 
            // For partial tokens (generators, tags, identifiers), replace the partial token
            else if (this.shouldReplaceLastToken(suggestion, lastToken)) {
                if (suggestion.type === 'generator') {
                    // For generators, replace the partial generator name
                    // Use parser's token position information
                    start = state.lastParsedTokenStart;
                    end = cursorPosition;
                } else {
                    // For tags and other tokens, use parser's token position information
                    start = state.lastParsedTokenStart;
                    end = cursorPosition; // Extend to cursor position for partial tokens
                }
            }
        }

        return { start, end };
    }


    /**
     * Determine if we should replace the last token
     */
    private shouldReplaceLastToken(suggestion: BaseSuggestion, lastToken: string): boolean {
        // Replace partial generators and tags
        if (suggestion.type === 'generator' || suggestion.type === 'tag') {
            return true;
        }

        // Replace partial comparison operators (e.g., '<' when suggesting '<=')
        if (suggestion.type === 'operator' && suggestion.text === '=') {
            return ['<', '>', '!', '='].includes(lastToken);
        }

        return false;
    }

    /**
     * Get generator description
     */
    private getGeneratorDescription(generator: string): string {
        switch (generator) {
            case 'number': return 'Number generator';
            case 'special': return 'Special character generator';
            case 'emoji': return 'Emoji generator';
            default: return 'Dictionary selector';
        }
    }

    /**
     * Get tag description
     */
    private getTagDescription(_tag: string): string {
        // This could be enhanced to provide more specific descriptions based on the tag
        return 'Dictionary tag';
    }

    /**
     * Get operator description
     */
    private getOperatorDescription(operator: string): string {
        switch (operator) {
            case '+': return 'Include tag';
            case '-': return 'Exclude tag';
            case ':': return 'Start settings';
            case '=': return 'Equals';
            case '==': return 'Size constraint';
            case '!=': return 'Size constraint';
            case '<': return 'Size constraint';
            case '<=': return 'Size constraint';
            case '>': return 'Size constraint';
            case '>=': return 'Size constraint';
            default: return 'Operator';
        }
    }

    /**
     * Get symbol description
     */
    private getSymbolDescription(symbol: string): string {
        switch (symbol) {
            case '{': return 'Start a new placeholder';
            case '}': return 'Close placeholder';
            case '@': return 'Language specifier';
            default: return 'Symbol';
        }
    }

    /**
     * Adjust cursor position to the end of current token if inside placeholder or global settings
     */
    private adjustCursorToTokenEnd(pattern: string, cursorPosition: number): number {
        // Find if we're inside a placeholder {...} or global settings [...]
        const beforeCursor = pattern.substring(0, cursorPosition);
        const afterCursor = pattern.substring(cursorPosition);

        // Check if we're inside a placeholder by finding unmatched { before cursor
        let placeholderDepth = 0;
        let globalSettingsDepth = 0;
        for (let i = 0; i < beforeCursor.length; i++) {
            if (beforeCursor[i] === '{') placeholderDepth++;
            else if (beforeCursor[i] === '}') placeholderDepth--;
            else if (beforeCursor[i] === '[') globalSettingsDepth++;
            else if (beforeCursor[i] === ']') globalSettingsDepth--;
        }

        // If we're not inside a placeholder or global settings, return original position
        if (placeholderDepth <= 0 && globalSettingsDepth <= 0) {
            return cursorPosition;
        }

        // We're inside a placeholder or global settings - move cursor to just before next punctuation
        const punctuation = /[{}[\]:+\-=<>!,@]/;
        for (let i = 0; i < afterCursor.length; i++) {
            if (punctuation.test(afterCursor[i])) {
                return cursorPosition + i; // Position just before the punctuation
            }
        }

        // If no punctuation found, return original position
        return cursorPosition;
    }
}
