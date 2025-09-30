// Partial Parser for SlugKit patterns
// Based on the EBNF grammar

import { DictionaryStats, DictionaryTag } from './types';

import {
    CompareOperator,
    NumberBase,
    ShortNumberBase,
    SizeLimit,
    Selector,
    NumberGen,
    SpecialCharGen,
    EmojiGen,
    PatternElement,
    GlobalSettings,
    ParsedPattern
} from "./parser-types";


export const enum ExpectedToken {
    NONE = 0,
    WHITESPACE = 1 << 0,    // whitespace
    // Punctuation
    OPEN_BRACE = 1 << 1,    // {
    CLOSE_BRACE = 1 << 2,   // }
    OPEN_BRACKET = 1 << 3,  // [
    CLOSE_BRACKET = 1 << 4, // ]
    COLON = 1 << 5,         // :
    TAG_START = 1 << 7,     // + or -
    DASH = 1 << 8,          // - (for ranges)
    EQUALS = 1 << 9,        // =
    COMPARISON_OP = 1 << 10, // >, <, >=, <=, ==, !=
    COMMA = 1 << 11,         // ,
    AT_SIGN = 1 << 12,       // @
    // Identifiers and literals
    IDENTIFIER = 1 << 13,    // identifier [A-Za-z_][A-Za-z0-9_]*
    TAG = 1 << 14,            // tag [A-Za-z0-9_]+
    NUMBER = 1 << 15,        // number
    STRING = 1 << 16,        // string "[^} ]*"
    BOOLEAN = 1 << 17,       // boolean true or false
    // Specific identifiers
    GENERATOR = 1 << 18,    // generator (number, special, emoji, dictionary name)
    OPTION = 1 << 19,       // option (count, unique, tone, gender)
    NUMBER_BASE_SHORT = 1 << 20, // short number base (d, x, X, r, R)
    NUMBER_BASE_FULL = 1 << 21, // full number base (dec, hex, HEX, roman, ROMAN)
    LANGUAGE = 1 << 22, // language
    // Escaped characters
    ESCAPED_CHARACTER = 1 << 31, // escaped character []{}\
}

// @ts-ignore
function debugExpectedTokens(tokens: ExpectedToken): string {
    // Since ExpectedToken is a const enum, we need to define the token names manually
    // but we can do it more concisely with an array of [value, name] pairs
    const tokenDefinitions: [ExpectedToken, string][] = [
        [ExpectedToken.WHITESPACE, 'WHITESPACE'],
        [ExpectedToken.OPEN_BRACE, 'OPEN_BRACE'],
        [ExpectedToken.CLOSE_BRACE, 'CLOSE_BRACE'],
        [ExpectedToken.OPEN_BRACKET, 'OPEN_BRACKET'],
        [ExpectedToken.CLOSE_BRACKET, 'CLOSE_BRACKET'],
        [ExpectedToken.COLON, 'COLON'],
        [ExpectedToken.TAG_START, 'TAG_START'],
        [ExpectedToken.DASH, 'DASH'],
        [ExpectedToken.EQUALS, 'EQUALS'],
        [ExpectedToken.COMPARISON_OP, 'COMPARISON_OP'],
        [ExpectedToken.COMMA, 'COMMA'],
        [ExpectedToken.AT_SIGN, 'AT_SIGN'],
        [ExpectedToken.IDENTIFIER, 'IDENTIFIER'],
        [ExpectedToken.TAG, 'TAG'],
        [ExpectedToken.NUMBER, 'NUMBER'],
        [ExpectedToken.STRING, 'STRING'],
        [ExpectedToken.BOOLEAN, 'BOOLEAN'],
        [ExpectedToken.GENERATOR, 'GENERATOR'],
        [ExpectedToken.OPTION, 'OPTION'],
        [ExpectedToken.NUMBER_BASE_SHORT, 'NUMBER_BASE_SHORT'],
        [ExpectedToken.NUMBER_BASE_FULL, 'NUMBER_BASE_FULL'],
        [ExpectedToken.LANGUAGE, 'LANGUAGE'],
        [ExpectedToken.ESCAPED_CHARACTER, 'ESCAPED_CHARACTER'],
    ];

    const parts = tokenDefinitions
        .filter(([tokenValue]) => tokens & tokenValue)
        .map(([, tokenName]) => tokenName);

    return parts.length > 0 ? parts.join(' | ') : 'NONE';
}

export const enum ParserContext {
    ARBITRARY = 1 << 0, // outside of placeholder
    IN_PLACEHOLDER = 1 << 1, // inside of placeholder, between { and }
    IN_GLOBAL_SETTINGS = 1 << 2, // inside global settings, between [ and ]
    // 
    PARTIAL_GENERATOR_NAME = 1 << 3, // partial generator name
    NUMBER_GEN = 1 << 4, // inside number generator, after generator name
    SPECIAL_GEN = 1 << 5, // inside special generator, after generator name
    EMOJI_GEN = 1 << 6, // inside emoji generator, after generator name
    SELECTOR = 1 << 7, // inside selector, after generator name
    // 
    SETTING_OPTIONS = 1 << 8, // inside setting or options, between : and }
    TAGS = 1 << 9, // inside tags
    OPTIONS = 1 << 10, // inside options
    SIZE_LIMIT = 1 << 11, // inside size limit
}

export const enum PossibleCases {
    NONE = 0,
    LOWER = 1 << 0,
    UPPER = 1 << 1,
    TITLE = 1 << 2,
    MIXED = 1 << 3,
}

export const enum CaseTransformation {
    NONE = 0,
    LOWER = 1 << 0,
    UPPER = 1 << 1,
}

function nextTransformation(currentTransformation: CaseTransformation): CaseTransformation {
    if (currentTransformation === CaseTransformation.LOWER) {
        return CaseTransformation.UPPER;
    }
    return CaseTransformation.LOWER;
}

export class ParserError extends Error {
    constructor(
        message: string,
        public position: number,
        public expectedTokens: ExpectedToken,
        public context: ParserContext
    ) {
        super(message);
        this.name = 'ParserError';
    }
}


export const enum PredefinedGenerators {
    NUMBER = 'number',
    SPECIAL = 'special',
    EMOJI = 'emoji',
}

interface PartialSearchResult {
    fullMatch: boolean;
    suggestions: string[];
}


// Interface for the methods that PartialParser actually uses
interface SlugKitInterface {
    getDictionaries(): Promise<DictionaryStats[]>;
    getDictionaryTags(): Promise<DictionaryTag[]>;
}

interface TaggedElement {
    kind: string;
    includeTags: string[];
    excludeTags: string[];

    exectedTagTokens(): ExpectedToken;
}

interface OptionedElement {
    options: Record<string, string>;

    exectedOptionTokens(): ExpectedToken;
    getOptionType(input: string): OptionType | undefined;
    getOptionSuggestions(input: string): PartialSearchResult;
}

const enum OptionType {
    RANGE = "range",
    RANGE_OR_SINGLE = "range_or_single",
    BOOLEAN = "boolean",
    TONE = "tone",
    GENDER = "gender",
};

interface RangeOrSingle {
    min: number;
    max: number;
}

function rangeToString(rangeOrSingle: RangeOrSingle): string {
    if (rangeOrSingle.min === rangeOrSingle.max) {
        return rangeOrSingle.min.toString();
    }
    return `${rangeOrSingle.min}-${rangeOrSingle.max}`;
}

class BaseElement {
    public validate(_pos: number, _expectedTokens: ExpectedToken, _context: ParserContext): void { }
    public getOptions(): Record<string, OptionType> { return {}; }

    public getOptionSuggestions(input: string): PartialSearchResult {
        const allOptions = this.getOptions();
        if (input === '') {
            return { fullMatch: false, suggestions: Object.keys(allOptions) };
        }
        const fullMatch = Object.keys(allOptions).some((option) => option === input);
        const suggestions = Object.entries(allOptions).filter(([option, _type]) => option.startsWith(input)).map(([option, _type]) => option);
        return { fullMatch, suggestions };
    }

    public getOptionType(input: string): OptionType | undefined {
        const allOptions = this.getOptions();
        if (input in allOptions) {
            return allOptions[input];
        }
        return undefined;
    }
}

// Type guard functions
function isNumberGenClass(element: BaseElement): element is NumberGenClass {
    return element instanceof NumberGenClass;
}

function isSpecialCharGenClass(element: BaseElement): element is SpecialCharGenClass {
    return element instanceof SpecialCharGenClass;
}

function isEmojiGenClass(element: BaseElement): element is EmojiGenClass {
    return element instanceof EmojiGenClass;
}

function isSelectorClass(element: BaseElement): element is SelectorClass {
    return element instanceof SelectorClass;
}

function isGlobalSettingsClass(element: BaseElement): element is GlobalSettingsClass {
    return element instanceof GlobalSettingsClass;
}

// Type guard functions for interfaces
function isTaggedElement(element: any): element is TaggedElement {
    return element &&
        typeof element.kind === 'string' &&
        Array.isArray(element.includeTags) &&
        Array.isArray(element.excludeTags) &&
        typeof element.exectedTagTokens === 'function';
}

function isOptionedElement(element: any): element is OptionedElement {
    return element &&
        typeof element.options === 'object' &&
        typeof element.exectedOptionTokens === 'function' &&
        typeof element.getOptionType === 'function' &&
        typeof element.getOptionSuggestions === 'function';
}

class SelectorClass extends BaseElement implements Selector {
    constructor(
        public kind: string,
        public language: string | undefined,
        public includeTags: string[],
        public excludeTags: string[],
        public sizeLimit: SizeLimit | undefined,
        public options: Record<string, string>) {
        super();
    }

    exectedTagTokens(): ExpectedToken {
        return ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
    }

    exectedOptionTokens(): ExpectedToken {
        return ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
    }
}

class NumberGenClass extends BaseElement implements NumberGen {
    constructor(public maxLength: number, public base: NumberBase) {
        super();
    }

    validate(pos: number, expectedTokens: ExpectedToken, context: ParserContext): void {
        if (this.maxLength <= 0) {
            throw new ParserError('Max length must be greater than 0', pos, expectedTokens, context);
        }
        if (this.base === undefined) {
            throw new ParserError('Base must be defined', pos, expectedTokens, context);
        }
    }
}

class SpecialCharGenClass extends BaseElement implements SpecialCharGen {
    constructor(public minLength: number, public maxLength: number) {
        super();
    }

    validate(pos: number, expectedTokens: ExpectedToken, context: ParserContext): void {
        if (this.minLength < 0) {
            throw new ParserError('Min length must be greater than or equal to 0', pos, expectedTokens, context);
        }
        if (this.maxLength <= 0) {
            throw new ParserError('Max length must be greater than 0', pos, expectedTokens, context);
        }
        if (this.minLength > this.maxLength) {
            throw new ParserError('Min length must be less than or equal to max length', pos, expectedTokens, context);
        }
    }
}

class EmojiGenClass extends BaseElement implements EmojiGen {
    constructor(
        public kind: 'emoji',
        public includeTags: string[],
        public excludeTags: string[],
        public options: Record<string, string>) {
        super();
    }

    validate(): void {
    }

    getOptions(): Record<string, OptionType> {
        return {
            count: OptionType.RANGE_OR_SINGLE,
            unique: OptionType.BOOLEAN,
            // tone: OptionType.TONE,       // Not implemented on backend yet
            // gender: OptionType.GENDER,   // Not implemented on backend yet
        };
    }

    exectedTagTokens(): ExpectedToken {
        return ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
    }

    exectedOptionTokens(): ExpectedToken {
        return ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
    }
}

class GlobalSettingsClass extends BaseElement implements GlobalSettings {
    public kind: string = '__global__';
    constructor(
        public language: string | undefined,
        public includeTags: string[],
        public excludeTags: string[],
        public sizeLimit: SizeLimit | undefined,
        public options: Record<string, string>) {
        super();
    }
    exectedTagTokens(): ExpectedToken {
        return ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET;
    }

    exectedOptionTokens(): ExpectedToken {
        return ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET;
    }
}

export interface Suggestion {
    text: string;
    type: 'generator' | 'tag' | 'operator' | 'symbol' | 'language' | 'base';
}

const ESCAPED_CHARS = new Set(['{', '}', '[', ']', '\\']);
const NON_ARBITRARY_CHARS = new Set(['{', '}', '[', ']', '\\']);
const COMPARISON_START_CHARS = new Set(['>', '<', '=', '!']);
const REQUIRE_EQUAL_CHARS = new Set(['=', '!']);

interface ParserState {
    context: ParserContext;
    expectedTokens: ExpectedToken;
    lastParsedToken: string | null;
    lastParsedTokenStart: number; // Position where the last token starts
    lastParsedTokenEnd: number;   // Position where the last token ends
    currentElement?: BaseElement;
    parsedSoFar: ParsedPattern;
}

export class PartialParser {
    private pos = 0;
    private input: string;
    private currentContext: ParserContext = ParserContext.ARBITRARY;
    private expectedTokens: ExpectedToken = ExpectedToken.OPEN_BRACE;

    private dictionaryNames: string[] = [];
    private tagsByDictionary: Record<string, string[]> = {};

    private parsedSoFar: ParsedPattern = {
        elements: [],
        textChunks: [],
        globalSettings: undefined,
    };
    private lastParsedToken: string | null = null;
    private lastParsedTokenStart: number = 0;
    private lastParsedTokenEnd: number = 0;
    private currentElement?: BaseElement;

    // TODO: add dictionary names and tags by dictionary
    constructor(input: string, dictionaryNames: string[] = [], tagsByDictionary: Record<string, string[]> = {}) {
        this.input = input;
        if (dictionaryNames && tagsByDictionary) {
            this.dictionaryNames = dictionaryNames;
            this.tagsByDictionary = tagsByDictionary;
        }
        this.run();
    }

    public parse(input: string): void {
        this.input = input;
        this.pos = 0;
        this.currentContext = ParserContext.ARBITRARY;
        this.expectedTokens = ExpectedToken.OPEN_BRACE;
        this.lastParsedToken = null;
        this.lastParsedTokenStart = 0;
        this.lastParsedTokenEnd = 0;
        this.currentElement = undefined;
        this.parsedSoFar = {
            elements: [],
            textChunks: [],
            globalSettings: undefined,
        };
        this.run();
    }

    public getState(): ParserState {
        return {
            context: this.currentContext,
            expectedTokens: this.expectedTokens,
            lastParsedToken: this.lastParsedToken,
            lastParsedTokenStart: this.lastParsedTokenStart,
            lastParsedTokenEnd: this.lastParsedTokenEnd,
            currentElement: this.currentElement,
            parsedSoFar: this.parsedSoFar,
        };
    }

    public getDictionaryData(): { dictionaryNames: string[]; tagsByDictionary: Record<string, string[]> } {
        return {
            dictionaryNames: this.dictionaryNames,
            tagsByDictionary: this.tagsByDictionary,
        };
    }

    public static async withMetadata(input: string, slugkit: SlugKitInterface): Promise<PartialParser> {
        const dictionaries = await slugkit.getDictionaries();
        const dictionaryNames = dictionaries.map((dictionary) => dictionary.kind)
            .filter((name) => name !== 'emoji') // emoji is a special kind, we don't need to show it as a dictionary
            .sort();
        // const languagesByDictionary = dictionaries.reduce((acc, dictionary) => {
        //     acc[dictionary.kind] = dictionary.language;
        //     return acc;
        // }, {} as Record<string, string>);
        const tags = await slugkit.getDictionaryTags();
        let tagsByDictionary = tags.sort((a, b) => b.word_count - a.word_count).reduce((acc, tag) => {
            acc[tag.kind] = [...(acc[tag.kind] || []), tag.tag];
            return acc;
        }, {} as Record<string, string[]>);
        // find an intersection of tags for global settings
        let globalTags: string[] = [];
        for (const dictionary of tags) {
            globalTags.push(...tagsByDictionary[dictionary.kind]);
        }
        globalTags = globalTags.filter((tag, index, self) => self.indexOf(tag) === index);
        tagsByDictionary['__global__'] = globalTags;
        return new PartialParser(input, dictionaryNames, tagsByDictionary);
    }


    public static toTitleCase(identifier: string): string {
        if (!identifier) {
            return '';
        }
        return identifier.charAt(0).toUpperCase() + identifier.slice(1).toLowerCase();
    }

    private static getCaseTransformation(userInput: string, position: number): CaseTransformation {
        if (position >= userInput.length) {
            return CaseTransformation.NONE;
        }
        if (userInput[position].toUpperCase() === userInput[position]) {
            return CaseTransformation.UPPER;
        }
        return CaseTransformation.LOWER;
    }

    /// Converts the identifier to mixed case, preserving the casing of the user partial input
    /// If the user input is empty, the identifier converted to aBcD (lower, upper, lower, upper)
    /// While the user input is not empty, the identifier is converted to the same casing as the user input
    public static toMixedCase(identifier: string, userInput: string = ''): string {
        if (!identifier) {
            return '';
        }
        let result = '';
        let currentTransformation = CaseTransformation.UPPER;
        for (let i = 0; i < identifier.length; i++) {
            const userTransformation = this.getCaseTransformation(userInput, i);
            if (userTransformation !== CaseTransformation.NONE) {
                currentTransformation = userTransformation;
            } else {
                currentTransformation = nextTransformation(currentTransformation);
            }
            result += currentTransformation === CaseTransformation.UPPER ? identifier[i].toUpperCase() : identifier[i].toLowerCase();
        }
        return result;
    }

    public static detectCase(identifier: string): PossibleCases {
        if (!identifier) {
            return PossibleCases.NONE;
        }
        if (identifier.length === 1) {
            if (identifier.toLowerCase() === identifier) {
                return PossibleCases.LOWER | PossibleCases.MIXED;
            }
            if (identifier.toUpperCase() === identifier) {
                return PossibleCases.UPPER | PossibleCases.TITLE | PossibleCases.MIXED;
            }
        } else if (identifier.length === 2) {
            if (identifier.toLowerCase() === identifier) {
                return PossibleCases.LOWER;
            }
            if (identifier.toUpperCase() === identifier) {
                return PossibleCases.UPPER;
            }
            if (this.toTitleCase(identifier) === identifier) {
                return PossibleCases.TITLE | PossibleCases.MIXED;
            }
            return PossibleCases.MIXED;
        }

        if (identifier.toLowerCase() === identifier) {
            return PossibleCases.LOWER;
        }
        if (identifier.toUpperCase() === identifier) {
            return PossibleCases.UPPER;
        }
        if (this.toTitleCase(identifier) === identifier) {
            return PossibleCases.TITLE;
        }
        return PossibleCases.MIXED;
    }

    public static generateCasingVariants(identifier: string, cases: PossibleCases, userInput: string = ''): string[] {
        let variants: string[] = [];
        if (cases & PossibleCases.LOWER) {
            variants.push(identifier.toLowerCase());
        }
        if (cases & PossibleCases.UPPER) {
            variants.push(identifier.toUpperCase());
        }
        if (cases & PossibleCases.TITLE) {
            variants.push(this.toTitleCase(identifier));
        }
        if (cases & PossibleCases.MIXED) {
            variants.push(this.toMixedCase(identifier, userInput));
        }
        return variants;
    }

    public allGenerators(): string[] {
        // TODO mutate case for the dictionaries to title, upper or mixed case variants
        const allDicts: string[] = [];
        for (const name of this.dictionaryNames) {
            if (name) { // Add null check
                allDicts.push(...PartialParser.generateCasingVariants(name, PossibleCases.LOWER | PossibleCases.TITLE | PossibleCases.UPPER | PossibleCases.MIXED, ''));
            }
        }
        return [PredefinedGenerators.NUMBER, PredefinedGenerators.SPECIAL, PredefinedGenerators.EMOJI, ...allDicts];
    }

    /// Returns true if the string matches a beginning of a generator name
    /// dictionaries are matched case insensitively
    /// Also special generator names are matched case sensitively (number, special, emoji)
    public partialGeneratorSearch(identifier: string): PartialSearchResult {
        if (!identifier || identifier.length === 0) {
            return { fullMatch: false, suggestions: this.allGenerators() };
        }
        const search = identifier.toLowerCase();
        const fullMatch = this.dictionaryNames.some(name => name.toLowerCase() === search);
        const baseSuggestions = this.dictionaryNames.filter(name => name.toLowerCase().startsWith(search) && name.toLowerCase() !== search);
        // TODO mutate case for the dictionaries to title, upper or mixed case variants
        const possibleCases = PartialParser.detectCase(identifier);
        /// Generate suggestions grouped by casing: all names in one case first, then other cases
        const caseArrays: string[][] = [];

        // Generate casing variants for each suggestion and collect by case position
        for (const suggestion of baseSuggestions) {
            const variants = PartialParser.generateCasingVariants(suggestion, possibleCases, identifier);
            variants.forEach((variant, index) => {
                if (!caseArrays[index]) {
                    caseArrays[index] = [];
                }
                caseArrays[index].push(variant);
            });
        }

        // Join all case arrays in order
        const dictSuggestions = caseArrays.flat();

        const specialMatches = [PredefinedGenerators.NUMBER, PredefinedGenerators.SPECIAL, PredefinedGenerators.EMOJI].filter(name => name.startsWith(identifier));
        const suggestions = [...specialMatches, ...dictSuggestions];
        return { fullMatch, suggestions };
    }

    public partialTagSearch(dictionaryName: string, identifier: string): PartialSearchResult {
        const lc_dictionaryName = dictionaryName.toLowerCase();
        if (!identifier) {
            return { fullMatch: false, suggestions: this.tagsByDictionary[lc_dictionaryName] || [] };
        }
        const search = identifier.toLowerCase();
        const fullMatch = this.tagsByDictionary[lc_dictionaryName].some(tag => tag.toLowerCase() === search);
        const suggestions = this.tagsByDictionary[lc_dictionaryName].filter(tag => tag.toLowerCase().startsWith(search) && tag.toLowerCase() !== search);
        return { fullMatch, suggestions };
    }

    public isValid(): boolean {
        return this.currentContext === ParserContext.ARBITRARY && (this.expectedTokens === ExpectedToken.NONE || (this.expectedTokens & ExpectedToken.OPEN_BRACE) !== 0 || (this.expectedTokens & ExpectedToken.OPEN_BRACKET) !== 0);
    }

    private isEof(): boolean {
        return this.peek() === null;
    }

    private isEndOfPlaceholder(): boolean {
        return this.peek() === '}';
    }

    private peek(): string | null {
        if (this.pos >= this.input.length) {
            return null;
        }
        return this.input[this.pos];
    }

    private next(): void {
        const char = this.peek();
        // Only update lastParsedToken for significant characters (not whitespace)
        if (char && char.trim() !== '') {
            this.lastParsedToken = char;
            // Don't update token positions here - they should be updated in extractToken
        }
        this.pos++;
    }

    /**
     * Extract and track a token from start position to current position
     */
    private extractToken(start: number): string {
        const result = this.input.slice(start, this.pos);
        if (result) {
            this.lastParsedToken = result;
            this.lastParsedTokenStart = start;
            this.lastParsedTokenEnd = this.pos;
        }
        return result;
    }

    private match(expected: string): boolean {
        const result = this.peek() === expected;
        if (result) {
            this.next();
        }
        return result;
    }

    private skipWhitespace(): void {
        while (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\n') {
            this.next();
        }
    }

    private finishElement(): void {
        if (!this.currentElement) {
            throw new ParserError('Current element is undefined', this.pos, this.expectedTokens, this.currentContext);
        }
        this.currentElement.validate(this.pos, this.expectedTokens, this.currentContext);
        this.parsedSoFar.elements.push(this.currentElement as unknown as PatternElement);
        this.currentElement = undefined;
        this.expectedTokens = ExpectedToken.OPEN_BRACE | ExpectedToken.OPEN_BRACKET;
        this.currentContext = ParserContext.ARBITRARY;
    }

    private finishGlobalSettings(): void {
        if (!this.currentElement) {
            throw new ParserError('Current element is undefined', this.pos, this.expectedTokens, this.currentContext);
        }
        this.parsedSoFar.globalSettings = this.currentElement as unknown as GlobalSettings;
        this.currentElement = undefined;
        this.expectedTokens = ExpectedToken.NONE;
        this.currentContext = ParserContext.ARBITRARY;
    }

    /// Store arbitrary text chunk to parsed so far
    private storeTextChunk(start: number): void {
        this.parsedSoFar.textChunks.push(this.input.slice(start, this.pos));
    }

    private skipArbitrary(): void {
        // need to check for escaped characters
        const start = this.pos;
        while (true) {
            while (!this.isEof() && !NON_ARBITRARY_CHARS.has(this.peek() || '')) {
                this.next();
            }
            if (this.isEof()) {
                break;
            }
            if (this.peek() === '\\') {
                this.next();
                if (this.isEof()) {
                    this.storeTextChunk(start)
                    this.expectedTokens = ExpectedToken.ESCAPED_CHARACTER;
                    return;
                }
                if (ESCAPED_CHARS.has(this.peek() || '')) {
                    // valid escape sequence
                    this.next();
                    continue;
                }
                throw new ParserError('Invalid escape sequence', this.pos, ExpectedToken.ESCAPED_CHARACTER, this.currentContext);
            } else {
                break;
            }
        }
        this.storeTextChunk(start)
    }

    private parseIdentifier(): string {
        const start = this.pos;
        if (this.isEof()) {
            // we don't throw in partial parsing, except for invalid input
            return '';
        }
        // the first character must be a letter or underscore
        if (!/[A-Za-z_]/.test(this.peek() || '')) {
            return '';
        }
        while (!this.isEof() && /[A-Za-z0-9_]/.test(this.peek() || '')) {
            this.next();
        }
        return this.extractToken(start);
    }

    private parseTag(): string {
        const start = this.pos;
        if (this.isEof()) {
            // we don't throw in partial parsing, except for invalid input
            return '';
        }
        while (!this.isEof() && /[A-Za-z0-9_]/.test(this.peek() || '')) {
            this.next();
        }
        return this.extractToken(start);
    }

    private parseNumber(): number {
        const start = this.pos;
        while (!this.isEof() && /[0-9]/.test(this.peek() || '')) {
            this.next();
        }
        const result = this.extractToken(start);
        return parseInt(result);
    }

    private parseRangeOrSingle(): RangeOrSingle | undefined {
        this.expectedTokens = ExpectedToken.NUMBER;
        if (this.isEof()) {
            return undefined;
        }
        let min = 0;
        let max = 0;
        min = this.parseNumber();
        this.expectedTokens = ExpectedToken.DASH | ExpectedToken.CLOSE_BRACE; // need more tokens depending on the context
        if (this.isEof()) {
            return { min, max: min };
        }
        if (this.match('-')) {
            this.expectedTokens = ExpectedToken.NUMBER;
            if (this.isEof()) {
                return undefined;
            }
            max = this.parseNumber();
        } else {
            max = min;
        }
        this.expectedTokens = ExpectedToken.CLOSE_BRACE;
        return { min, max };
    }

    private parseBoolean(): boolean | undefined {
        this.expectedTokens = ExpectedToken.BOOLEAN;
        if (this.isEof()) {
            return undefined;
        }
        const value = this.parseIdentifier();
        if (!value) {
            return undefined;
        }
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
        throw new ParserError('Expected boolean', this.pos, ExpectedToken.BOOLEAN, this.currentContext);
    }

    private parseStringLiteral(): string | undefined {
        this.expectedTokens = ExpectedToken.STRING;
        if (this.isEof()) {
            return undefined;
        }
        const start = this.pos;
        // grab anythins expcept whitespace or }
        while (!this.isEof() && !/\s|\}/.test(this.peek() || '')) {
            this.next();
        }
        const value = this.extractToken(start);
        return value || undefined;
    }

    /// Returns undefined if we don't have a number base
    private parseNumberBase(): NumberBase | undefined {
        // if we have a comma, then we parse the full number base
        if (this.match(',')) {
            this.expectedTokens = ExpectedToken.NUMBER_BASE_FULL;
            if (this.isEof()) {
                return undefined;
            }
            const identifier = this.parseIdentifier();
            if (!identifier) {
                throw new ParserError('Expected number base', this.pos, ExpectedToken.NUMBER_BASE_FULL, this.currentContext);
            }
            this.expectedTokens = ExpectedToken.CLOSE_BRACE;
            const base = NumberBase.fromString(identifier);
            if (!base) {
                throw new ParserError('Invalid number base', this.pos, ExpectedToken.NUMBER_BASE_FULL, this.currentContext);
            }
            return base;
        } else { // match short number base
            if (!/[dxXrR]/.test(this.peek() || '')) {
                this.expectedTokens = ExpectedToken.CLOSE_BRACE;
                return NumberBase.Dec;
            }
            const base = NumberBase.fromShort(this.peek() as ShortNumberBase);
            this.next();
            this.expectedTokens = ExpectedToken.CLOSE_BRACE;
            return base;
        }
    }

    private parseLanguage(): string | undefined {
        this.expectedTokens = ExpectedToken.LANGUAGE;
        if (this.isEof()) {
            return undefined;
        }
        const language = this.parseIdentifier();
        if (!language) {
            throw new ParserError('Expected language', this.pos, ExpectedToken.LANGUAGE, this.currentContext);
        }
        return language;
    }

    private parseComparisonOp(): CompareOperator | undefined {
        if (this.isEof()) {
            return undefined;
        }
        if (!COMPARISON_START_CHARS.has(this.peek() || '')) {
            return undefined;
        }
        let op = this.peek() || '';
        this.next();
        if (REQUIRE_EQUAL_CHARS.has(op)) {
            this.expectedTokens = ExpectedToken.EQUALS;
            if (this.isEof()) {
                return undefined;
            }
            if (!this.match('=')) {
                throw new ParserError('Expected = after comparison operator', this.pos, ExpectedToken.EQUALS, this.currentContext);
            }
            op += '=';
            this.expectedTokens = ExpectedToken.NUMBER;
            return op as CompareOperator;
        } else {
            this.expectedTokens = ExpectedToken.EQUALS | ExpectedToken.NUMBER;
            if (this.isEof()) {
                return op as CompareOperator;
            }
            this.expectedTokens = ExpectedToken.NUMBER;
            if (this.match('=')) {
                op += '=';
                return op as CompareOperator;
            }
            return op as CompareOperator;
        }
    }

    private parseSizeLimit(): SizeLimit | undefined {
        if (this.isEof()) {
            return undefined;
        }
        this.currentContext |= ParserContext.SIZE_LIMIT;
        const op = this.parseComparisonOp();
        if (!op) {
            if (!(this.expectedTokens & ExpectedToken.EQUALS)) {
                // we expect the comparison op to be fully parsed
                this.currentContext &= ~ParserContext.SIZE_LIMIT;
            }
            return undefined;
        }
        if (this.isEof()) {
            return undefined;
        }
        const value = this.parseNumber();
        this.currentContext &= ~ParserContext.SIZE_LIMIT;
        return { op, value };
    }

    private parseTags(element: TaggedElement): void {
        this.skipWhitespace()
        while (!this.isEof()) {
            let tagType: string | null = null;
            if (this.peek() == '+' || this.peek() == '-') {
                this.currentContext |= ParserContext.TAGS;
                tagType = this.peek();
                this.next();
                this.expectedTokens = ExpectedToken.TAG;
                if (this.isEof()) {
                    return;
                }
                const tag = this.parseTag();
                if (!tag) {
                    return;
                }
                // now search if we have full match for the tag
                const searchResult = this.partialTagSearch(element.kind, tag);
                if (searchResult.fullMatch) {
                    if (tagType == '+') {
                        element.includeTags.push(tag);
                    } else {
                        element.excludeTags.push(tag);
                    }
                    this.currentContext &= ~ParserContext.TAGS;
                    if (searchResult.suggestions.length === 0) {
                        // We've got a full match, no more tag options available for this search
                        // Clear lastParsedToken so option suggestions start fresh
                        this.lastParsedToken = '';
                        // But we should still allow adding more tags with + or -
                        if (isTaggedElement(element)) {
                            this.expectedTokens = element.exectedTagTokens();
                        }
                    } else {
                        // We've got additional suggestions, so we can continue parsing this tag name or start new ones
                        if (isTaggedElement(element)) {
                            this.expectedTokens = element.exectedTagTokens() | ExpectedToken.TAG;
                        }
                    }
                } else {
                    // We've got a partial match, so we need to continue parsing
                }
            } else {
                break;
            }
            this.skipWhitespace();
            if (this.isEof() || this.isEndOfPlaceholder()) {
                return;
            }
        }
    }

    private parseOptions(element: OptionedElement): void {
        while (!this.isEof()) {
            this.skipWhitespace();
            this.currentContext |= ParserContext.OPTIONS;
            if (isOptionedElement(element)) {
                this.expectedTokens = element.exectedOptionTokens();
            }
            const option = this.parseIdentifier();
            if (!option) {
                // finished parsing options
                break;
            }
            const optionSearch = element.getOptionSuggestions(option);
            if (optionSearch.fullMatch) {
                // first we check if the option is not already there
                if (option in element.options) {
                    throw new ParserError('Option already set', this.pos, ExpectedToken.OPTION, this.currentContext);
                }
                // we've got an option full name
                this.expectedTokens = ExpectedToken.EQUALS;
                if (this.isEof()) {
                    return;
                }
                if (!this.match('=')) {
                    throw new ParserError('Expected = after option name', this.pos, ExpectedToken.EQUALS, this.currentContext);
                }
                // now we need to grab the option type
                const optionType = element.getOptionType(option);
                if (!optionType) {
                    throw new ParserError('Invalid option', this.pos, ExpectedToken.OPTION, this.currentContext);
                }
                // now we need to parse the option value
                switch (optionType) {
                    case OptionType.RANGE_OR_SINGLE: {
                        const range = this.parseRangeOrSingle();
                        if (!range) {
                            // we can run out of input, so we break
                            return;
                        }
                        element.options[option] = rangeToString(range);
                        continue;
                    }
                    case OptionType.BOOLEAN: {
                        const value = this.parseBoolean();
                        if (value === undefined) {
                            // we can run out of input, so we break
                            return;
                        }
                        element.options[option] = `${value}`;
                        continue;
                    }
                    default: {
                        const value = this.parseStringLiteral();
                        if (value === undefined) {
                            // we can run out of input, so we break
                            return;
                        }
                        element.options[option] = value;
                        continue;
                    }
                }
            } else if (optionSearch.suggestions.length > 0) {
                // we've got an option partial name
                this.expectedTokens = ExpectedToken.OPTION;
                return;
            } else {
                // we've got an invalid option
                throw new ParserError('Invalid option', this.pos, ExpectedToken.OPTION, this.currentContext);
            }
        }
        this.currentContext &= ~ParserContext.OPTIONS;
    }

    /// Parse number generator
    private parseNumberGen(): void {
        this.currentElement = new NumberGenClass(0, NumberBase.Dec);
        this.expectedTokens = ExpectedToken.COLON;
        this.currentContext = ParserContext.IN_PLACEHOLDER | ParserContext.NUMBER_GEN;

        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (!this.match(':')) {
            throw new ParserError('Expected : after number generator name', this.pos, ExpectedToken.COLON, this.currentContext);
        }
        this.expectedTokens = ExpectedToken.NUMBER;
        this.currentContext |= ParserContext.SETTING_OPTIONS;
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        const number = this.parseNumber();
        if (number === 0) {
            throw new ParserError('Number must be greater than 0', this.pos, ExpectedToken.NUMBER, this.currentContext);
        }
        if (isNumberGenClass(this.currentElement)) {
            this.currentElement.maxLength = number;
        }
        this.expectedTokens = ExpectedToken.NUMBER_BASE_SHORT | ExpectedToken.COMMA | ExpectedToken.CLOSE_BRACE;
        if (this.isEof()) {
            return;
        }
        const numberBase = this.parseNumberBase();
        if (numberBase && isNumberGenClass(this.currentElement)) {
            this.currentElement.base = numberBase;
        } else {
            // nothing parsed
            if (isNumberGenClass(this.currentElement)) {
                this.currentElement.base = NumberBase.Dec;
            }
            // we don't change the expected tokens, since we don't have a number base
            // but we can default to dec
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (this.expectedTokens !== ExpectedToken.CLOSE_BRACE) {
            // we are expecting something else, e.g. number base full, that failed to parse
            throw new ParserError('Expected number base after comma', this.pos, this.expectedTokens, this.currentContext);
        }
        if (!this.match('}')) {
            throw new ParserError('Expected `}` after number generator', this.pos, ExpectedToken.CLOSE_BRACE, this.currentContext);
        }
        // we are done parsing the number generator
        this.finishElement();
    }

    private parseSpecialGen(): void {
        this.currentElement = new SpecialCharGenClass(0, 0);
        this.expectedTokens = ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE;
        this.currentContext = ParserContext.IN_PLACEHOLDER | ParserContext.SPECIAL_GEN;

        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (this.isEndOfPlaceholder()) {
            if (isSpecialCharGenClass(this.currentElement)) {
                this.currentElement.minLength = 1;
                this.currentElement.maxLength = 1;
            }
            this.next();
            this.finishElement();
            return;
        }
        if (!this.match(':')) {
            throw new ParserError('Expected `:` after special generator name', this.pos, ExpectedToken.COLON, this.currentContext);
        }

        this.expectedTokens = ExpectedToken.NUMBER; // we can apply default of 1-1
        this.currentContext |= ParserContext.SETTING_OPTIONS;
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        const range = this.parseRangeOrSingle();
        if (!range) {
            // we can run out of input, so we break
            return;
        }
        if (isSpecialCharGenClass(this.currentElement)) {
            this.currentElement.minLength = range.min;
            this.currentElement.maxLength = range.max;
        }
        // if (range.min != range.max) {
        //     // reset expected tokens to close brace
        //     this.expectedTokens = ExpectedToken.CLOSE_BRACE;
        // }
        if (this.isEof()) {
            return;
        }
        if (!this.match('}')) {
            throw new ParserError('Expected `}` after special generator', this.pos, ExpectedToken.CLOSE_BRACE, this.currentContext);
        }
        // we are done parsing the special generator
        this.finishElement();
    }

    private parseEmojiGen(): void {
        this.currentElement = new EmojiGenClass("emoji", [], [], {});
        this.expectedTokens = ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE;
        this.currentContext = ParserContext.IN_PLACEHOLDER | ParserContext.EMOJI_GEN;

        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (this.isEndOfPlaceholder()) {
            this.next();
            this.finishElement();
            return;
        }
        if (!this.match(':')) {
            throw new ParserError('Expected `:` after emoji generator name', this.pos, ExpectedToken.COLON, this.currentContext);
        }
        this.expectedTokens = ExpectedToken.TAG_START | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
        this.currentContext |= ParserContext.SETTING_OPTIONS;
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (isTaggedElement(this.currentElement)) {
            this.parseTags(this.currentElement);
        }
        if (this.isEof()) {
            return;
        }
        if (isOptionedElement(this.currentElement)) {
            this.parseOptions(this.currentElement);
        }
        if (!(this.currentContext & ParserContext.OPTIONS)) {
            this.expectedTokens = ExpectedToken.CLOSE_BRACE;
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (!this.match('}')) {
            throw new ParserError('Expected `}` after emoji generator', this.pos, ExpectedToken.CLOSE_BRACE, this.currentContext);
        }
        this.finishElement();
    }

    private parseSelector(): void {
        this.currentElement = new SelectorClass(this.lastParsedToken || '', undefined, [], [], undefined, {});
        this.expectedTokens = ExpectedToken.COLON | ExpectedToken.AT_SIGN | ExpectedToken.CLOSE_BRACE;
        this.currentContext = ParserContext.IN_PLACEHOLDER | ParserContext.SELECTOR;
        if (this.isEof()) {
            return;
        }
        if (this.match('@')) {
            const language = this.parseLanguage();
            if (!language) {
                // we ran out of input, so we break
                return;
            }
            if (isSelectorClass(this.currentElement)) {
                this.currentElement.language = language;
            }
            this.expectedTokens = ExpectedToken.COLON | ExpectedToken.CLOSE_BRACE;
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (this.isEndOfPlaceholder()) {
            this.next();
            this.finishElement();
            return;
        }

        if (!this.match(':')) {
            throw new ParserError('Expected `:` after selector name', this.pos, ExpectedToken.COLON, this.currentContext);
        }
        this.currentContext |= ParserContext.SETTING_OPTIONS;
        if (isSelectorClass(this.currentElement) || isEmojiGenClass(this.currentElement) || isGlobalSettingsClass(this.currentElement)) {
            this.expectedTokens = this.currentElement.exectedTagTokens();
        }
        if (this.isEof()) {
            return;
        }
        if (isTaggedElement(this.currentElement)) {
            this.parseTags(this.currentElement);
        }
        if (!(this.currentContext & ParserContext.TAGS)) {
            // Preserve TAG and TAG_START bits if they were set (indicates tag completions/additions available)
            const hadTagExpected = this.expectedTokens & ExpectedToken.TAG;
            const hadTagStartExpected = this.expectedTokens & ExpectedToken.TAG_START;
            this.expectedTokens = ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACE;
            if (hadTagExpected) {
                this.expectedTokens |= ExpectedToken.TAG;
            }
            if (hadTagStartExpected) {
                this.expectedTokens |= ExpectedToken.TAG_START;
            }
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        const sizeLimit = this.parseSizeLimit();
        if (sizeLimit) {
            if (isSelectorClass(this.currentElement) || isGlobalSettingsClass(this.currentElement)) {
                this.currentElement.sizeLimit = sizeLimit;
            }
        }
        if (!(this.currentContext & ParserContext.SIZE_LIMIT)) {
            if (isSelectorClass(this.currentElement) || isEmojiGenClass(this.currentElement) || isGlobalSettingsClass(this.currentElement)) {
                this.expectedTokens = this.currentElement.exectedOptionTokens();
            }
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (isOptionedElement(this.currentElement)) {
            this.parseOptions(this.currentElement);
        }
        if (!(this.currentContext & ParserContext.OPTIONS)) {
            this.expectedTokens = ExpectedToken.CLOSE_BRACE;
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (!this.match('}')) {
            throw new ParserError('Expected `}` after selector', this.pos, ExpectedToken.CLOSE_BRACE, this.currentContext);
        }
        this.finishElement();
    }

    private parsePlaceholder(): void {
        if (this.parsedSoFar.globalSettings) {
            throw new ParserError('Unexpected placeholder after global settings', this.pos, ExpectedToken.GENERATOR, this.currentContext);
        }
        this.currentContext = ParserContext.IN_PLACEHOLDER;
        this.expectedTokens = ExpectedToken.GENERATOR;
        this.next();
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        const identifier = this.parseIdentifier();
        if (identifier === '') {
            return;
        }
        if (identifier === PredefinedGenerators.NUMBER) {
            this.parseNumberGen();
        } else if (identifier === PredefinedGenerators.SPECIAL) {
            this.parseSpecialGen();
        } else if (identifier === PredefinedGenerators.EMOJI) {
            this.parseEmojiGen();
        } else {
            if (this.dictionaryNames.includes(identifier.toLowerCase())) {
                this.parseSelector();
            } else {
                this.currentContext |= ParserContext.PARTIAL_GENERATOR_NAME;
            }
        }
    }

    private parseGlobalOptions(): void {
        if (this.parsedSoFar.elements.length == 0) {
            throw new ParserError('Unexpected global settings', this.pos, ExpectedToken.OPEN_BRACKET, this.currentContext);
        }
        this.currentElement = new GlobalSettingsClass(undefined, [], [], undefined, {});
        this.currentContext = ParserContext.IN_GLOBAL_SETTINGS;
        this.expectedTokens = ExpectedToken.AT_SIGN | ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET;
        this.next();
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (this.match('@')) {
            const language = this.parseLanguage();
            if (!language) {
                return;
            }
            if (isGlobalSettingsClass(this.currentElement)) {
                this.currentElement.language = language;
            }
        }
        this.expectedTokens = ExpectedToken.TAG_START | ExpectedToken.COMPARISON_OP | ExpectedToken.OPTION | ExpectedToken.CLOSE_BRACKET;
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        if (isTaggedElement(this.currentElement)) {
            this.parseTags(this.currentElement);
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        const sizeLimit = this.parseSizeLimit();
        if (sizeLimit) {
            if (isSelectorClass(this.currentElement) || isGlobalSettingsClass(this.currentElement)) {
                this.currentElement.sizeLimit = sizeLimit;
            }
        }
        if (!(this.currentContext & ParserContext.SIZE_LIMIT)) {
            if (isSelectorClass(this.currentElement) || isEmojiGenClass(this.currentElement) || isGlobalSettingsClass(this.currentElement)) {
                this.expectedTokens = this.currentElement.exectedOptionTokens();
            }
        }
        this.skipWhitespace();
        if (this.isEof()) {
            return;
        }
        // we won't parse options here, becaurse I'm not sure yet how to handle them
        if (this.match(']')) {
            this.finishGlobalSettings();
            return;
        } else {
            throw new ParserError('Expected `]` after global settings', this.pos, ExpectedToken.CLOSE_BRACKET, this.currentContext);
        }
    }

    private run(): void {
        this.skipArbitrary();
        while (!this.isEof()) {
            if (this.expectedTokens === ExpectedToken.NONE) {
                throw new ParserError('Unexpected character', this.pos, this.expectedTokens, this.currentContext);
            }
            if (this.peek() === '{') {
                this.parsePlaceholder();
            } else if (this.peek() === '[') {
                this.parseGlobalOptions();
                break;
            } else {
                throw new ParserError('Unexpected character', this.pos, this.expectedTokens, this.currentContext);
            }
            this.skipArbitrary();
        }
        if (!this.isEof()) {
            throw new ParserError('Unexpected character', this.pos, this.expectedTokens, this.currentContext);
        }
    }
}


export class SuggestionProvider {

    private parser: PartialParser;
    constructor(parser: PartialParser) {
        this.parser = parser;
    }

    public getSuggestions(): Suggestion[] {
        const state = this.parser.getState();
        if (state.context === ParserContext.ARBITRARY) {
            return [];
        }
        let suggestions: Suggestion[] = [];
        if (state.expectedTokens & ExpectedToken.TAG) {
            // get tags suggestions
            if (state.currentElement instanceof SelectorClass || state.currentElement instanceof EmojiGenClass) {
                let search = state.lastParsedToken || '';
                if (search === '+' || search === '-') {
                    search = '';
                }
                const result = this.parser.partialTagSearch(state.currentElement.kind, search || '');
                // Filter out already used tags (both include and exclude tags)
                const usedTags = [...state.currentElement.includeTags, ...state.currentElement.excludeTags];
                const filteredSuggestions = result.suggestions.filter(tag => !usedTags.includes(tag));
                suggestions.push(...filteredSuggestions.map(tag => ({
                    text: tag,
                    type: 'tag' as const
                })));
            }
        }
        if (state.expectedTokens & ExpectedToken.GENERATOR) {
            // get generators suggestions
            let search = state.lastParsedToken || '';
            if (search === '{') {
                search = '';
            }
            const result = this.parser.partialGeneratorSearch(search);
            // should suggest `generator:`
            suggestions.push(...result.suggestions.map(generator => ({
                text: generator,
                type: 'generator' as const
            })));
        }
        if (state.expectedTokens & ExpectedToken.OPTION) {
            // get options suggestions
            if (state.currentElement instanceof BaseElement) {
                let search = state.lastParsedToken || '';
                if (search === ':') {
                    search = '';
                }
                const result = state.currentElement.getOptionSuggestions(search || '');
                suggestions.push(...result.suggestions.map(option => ({
                    text: `${option}=`,
                    type: 'operator' as const
                })));
            }
        }
        if (state.expectedTokens & ExpectedToken.LANGUAGE) {
            // get languages suggestions
            suggestions.push({
                text: 'en',
                type: 'language'
            });
        }
        if (state.expectedTokens & ExpectedToken.NUMBER_BASE_SHORT) {
            suggestions.push({
                text: 'd',
                type: 'base'
            });
            suggestions.push({
                text: 'x',
                type: 'base'
            });
            suggestions.push({
                text: 'X',
                type: 'base'
            });
            suggestions.push({
                text: 'r',
                type: 'base'
            });
            suggestions.push({
                text: 'R',
                type: 'base'
            });
        }
        if (state.expectedTokens & ExpectedToken.NUMBER_BASE_FULL) {
            suggestions.push({
                text: 'dec',
                type: 'base'
            });
            suggestions.push({
                text: 'hex',
                type: 'base'
            });
            suggestions.push({
                text: 'HEX',
                type: 'base'
            });
            suggestions.push({
                text: 'roman',
                type: 'base'
            });
            suggestions.push({
                text: 'ROMAN',
                type: 'base'
            });
        }

        if (state.expectedTokens & ExpectedToken.TAG_START) {
            suggestions.push({
                text: '+',
                type: 'symbol'
            });
            suggestions.push({
                text: '-',
                type: 'symbol'
            });
        }
        if (state.expectedTokens & ExpectedToken.COMPARISON_OP) {
            suggestions.push({
                text: '==',
                type: 'operator'
            });
            suggestions.push({
                text: '!=',
                type: 'operator'
            });
            suggestions.push({
                text: '<',
                type: 'operator'
            });
            suggestions.push({
                text: '>',
                type: 'operator'
            });
            suggestions.push({
                text: '<=',
                type: 'operator'
            });
            suggestions.push({
                text: '>=',
                type: 'operator'
            });
        }
        if (state.expectedTokens & ExpectedToken.EQUALS) {
            suggestions.push({
                text: '=',
                type: 'operator'
            });
        }
        if (state.expectedTokens & ExpectedToken.AT_SIGN) {
            suggestions.push({
                text: '@',
                type: 'symbol'
            });
        }
        if (state.expectedTokens & ExpectedToken.COMMA) {
            suggestions.push({
                text: ',',
                type: 'operator'
            });
        }
        if (state.expectedTokens & ExpectedToken.DASH) {
            suggestions.push({
                text: '-',
                type: 'operator'
            });
        }
        if (state.expectedTokens & ExpectedToken.COLON) {
            suggestions.push({
                text: ':',
                type: 'operator'
            });
        }
        if (state.expectedTokens & ExpectedToken.CLOSE_BRACE) {
            suggestions.push({
                text: '}',
                type: 'symbol'
            });
        }
        if (state.expectedTokens & ExpectedToken.CLOSE_BRACKET) {
            suggestions.push({
                text: ']',
                type: 'symbol'
            });
        }

        return suggestions;
    }
}