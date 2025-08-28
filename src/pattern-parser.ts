// Pattern Parser for SlugKit patterns
// Based on the EBNF grammar from the README and C++ implementation

export enum CompareOperator {
  None = 'none',
  Eq = 'eq',
  Ne = 'ne',
  Lt = 'lt',
  Le = 'le',
  Gt = 'gt',
  Ge = 'ge'
}

export enum NumberBase {
  Dec = 'dec',
  Hex = 'hex',
  HexUpper = 'HEX',
  Roman = 'roman',
  RomanLower = 'ROMAN'
}

export enum ExpectedToken {
  IDENTIFIER = 'identifier',
  COLON = 'colon',
  CLOSE_BRACE = 'close_brace',        // '}'
  CLOSE_BRACKET = 'close_bracket',    // ']'
  TAG_SPEC = 'tag_spec',              // '+tag' or '-tag'
  COMPARISON_OP = 'comparison_op',    // '>', '<', '>=', '<=', '==', '!='
  NUMBER = 'number',
  OPTION = 'option',                  // ','
  OPEN_BRACE = 'open_brace',          // '{'
  OPEN_BRACKET = 'open_bracket',      // '['
  EQUALS = 'equals',                  // '='
  EXCLAMATION = 'exclamation',        // '!'
  PLUS = 'plus',                      // '+'
  MINUS = 'minus',                    // '-'
  DASH = 'dash',                      // '-' (for ranges)
  NUMBER_BASE = 'number_base',        // 'hex', 'HEX', 'roman', 'ROMAN'
  AT_SIGN = 'at_sign'                 // '@'
}

// Context tracking for pattern suggestions
export enum ParserContext {
  // Pattern state
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
  INVALID = 'invalid',
  
  // Current parsing position
  OUTSIDE_PLACEHOLDER = 'outside_placeholder',
  IN_PLACEHOLDER = 'in_placeholder',
  IN_GLOBAL_SETTINGS = 'in_global_settings',
  
  // What we're currently parsing
  EXPECTING_IDENTIFIER = 'expecting_identifier',
  EXPECTING_COLON = 'expecting_colon',
  EXPECTING_LANGUAGE_IDENTIFIER = 'expecting_language_identifier',  // 'noun@' expecting language
  EXPECTING_AFTER_LANGUAGE = 'expecting_after_language',            // 'noun@en' expecting ':' or '}'
  EXPECTING_TAG_OR_SIZE_LIMIT = 'expecting_tag_or_size_limit',
  EXPECTING_TAG_ONLY = 'expecting_tag_only',
  EXPECTING_TAG_IDENTIFIER = 'expecting_tag_identifier',        // after '+' or '-' expecting tag name
  EXPECTING_SIZE_LIMIT = 'expecting_size_limit',
  EXPECTING_NUMBER_LENGTH = 'expecting_number_length',      // 'number:' expecting length
  EXPECTING_NUMBER_BASE = 'expecting_number_base',          // 'number:5' expecting base
  EXPECTING_SPECIAL_LENGTH = 'expecting_special_length',    // 'special:' expecting length
  EXPECTING_SPECIAL_RANGE = 'expecting_special_range',      // 'special:3-' expecting second number
  EXPECTING_OPTION = 'expecting_option',
  EXPECTING_CLOSE_BRACE = 'expecting_close_brace',
  EXPECTING_CLOSE_BRACKET = 'expecting_close_bracket',
  
  // What we've parsed so far
  PARTIAL_SELECTOR = 'partial_selector',
  PARTIAL_NUMBER_GEN = 'partial_number_gen',
  PARTIAL_SPECIAL_GEN = 'partial_special_gen'
}

export interface ParserContextInfo {
  context: ParserContext;
  position: number;
  parsedSoFar: string;
  expectedNext: ExpectedToken[];
  lastParsedToken?: string; // The last literal string that was successfully parsed
  isValid: boolean;
  errorMessage?: string;
  partialElement?: any; // The partially parsed element
}

export interface SizeLimit {
  op: CompareOperator;
  value: number;
}

export interface Selector {
  kind: string;
  language?: string;
  includeTags: string[];
  excludeTags: string[];
  sizeLimit?: SizeLimit;
  options: Record<string, string>;
}

export interface NumberGen {
  maxLength: number;
  base: NumberBase;
}

export interface SpecialCharGen {
  minLength: number;
  maxLength: number;
}

export type PatternElement = Selector | NumberGen | SpecialCharGen;

export interface GlobalSettings {
  language?: string;
  includeTags: string[];
  excludeTags: string[];
  sizeLimit?: SizeLimit;
  options: Record<string, string>;
}

export interface ParsedPattern {
  elements: PatternElement[];
  globalSettings?: GlobalSettings;
  textChunks: string[];
}

export class PatternParser {
  private pos = 0;
  private input: string;
  
  // Context tracking for parsing state
  private currentContext: ParserContext = ParserContext.OUTSIDE_PLACEHOLDER;
  private contextStack: ParserContext[] = [];
  private partialContext: ParserContextInfo | null = null;
  private lastParsedToken: string | undefined = undefined;

  constructor(input: string) {
    this.input = input;
  }

  // Context tracking methods
  private pushContext(context: ParserContext): void {
    this.contextStack.push(this.currentContext);
    this.currentContext = context;
  }

  private setContext(context: ParserContext): void {
    this.currentContext = context;
  }

  private getContext(): ParserContext {
    return this.currentContext;
  }

  private isEof(): boolean {
    return this.pos >= this.input.length;
  }

  private peek(): string | null {
    return this.isEof() ? null : this.input[this.pos];
  }

  private next(): string | null {
    if (this.isEof()) return null;
    const char = this.input[this.pos];
    this.pos++;
    this.lastParsedToken = char || undefined;
    return char;
  }

  private match(expected: string): boolean {
    const char = this.peek();
    return char === expected;
  }

  private expect(expected: string): void {
    const char = this.next();
    if (char !== expected) {
      throw new Error(`Expected '${expected}', got '${char}' at position ${this.pos - 1}`);
    }
  }

  private skipWhitespace(): void {
    while (!this.isEof() && /\s/.test(this.peek()!)) {
      this.next();
    }
  }

  private parseNumber(): number {
    let result = '';
    while (!this.isEof()) {
      const char = this.peek()!;
      if (/\d/.test(char)) {
        result += char;
        this.next();
      } else {
        break;
      }
    }
    if (result === '') {
      throw new Error(`Expected number at position ${this.pos}`);
    }
    this.lastParsedToken = result;
    return parseInt(result, 10);
  }

  private parseIdentifier(): string {
    let result = '';
    const firstChar = this.peek();
    if (!firstChar || !/[a-zA-Z_]/.test(firstChar)) {
      throw new Error(`Expected identifier start at position ${this.pos}`);
    }
    
    result += firstChar;
    this.next();
    
    while (!this.isEof()) {
      const char = this.peek()!;
      if (/[a-zA-Z0-9_]/.test(char)) {
        result += char;
        this.next();
      } else {
        break;
      }
    }
    
    this.lastParsedToken = result;
    return result;
  }

  private parseTag(): string {
    let result = '';
    while (!this.isEof()) {
      const char = this.peek()!;
      if (/[a-zA-Z0-9_]/.test(char)) {
        result += char;
        this.next();
      } else {
        break;
      }
    }
    if (result === '') {
      throw new Error(`Empty tag at position ${this.pos}`);
    }
    this.lastParsedToken = result;
    return result;
  }

  private parseTags(): { include: string[]; exclude: string[] } {
    const include: string[] = [];
    const exclude: string[] = [];
    
    while (!this.isEof()) {
      const char = this.peek();
      if (char === '+') {
        this.next(); // consume '+'
        include.push(this.parseTag());
        this.skipWhitespace(); // Allow optional whitespace between tags
      } else if (char === '-') {
        this.next(); // consume '-'
        exclude.push(this.parseTag());
        this.skipWhitespace(); // Allow optional whitespace between tags
      } else {
        break;
      }
    }
    
    return { include, exclude };
  }

  private parsePartialTags(): { include: string[]; exclude: string[] } | null {
    const include: string[] = [];
    const exclude: string[] = [];
    
    while (!this.isEof()) {
      const char = this.peek();
      if (char === '+') {
        this.next(); // consume '+'
        if (this.isEof()) {
          // We consumed + but no tag identifier follows
          this.setContext(ParserContext.EXPECTING_TAG_IDENTIFIER);
          this.partialContext = this.createContextInfo();
          return null;
        }
        try {
          include.push(this.parseTag());
          this.skipWhitespace(); // Allow optional whitespace between tags
        } catch (error) {
          // Failed to parse tag identifier after +
          this.setContext(ParserContext.EXPECTING_TAG_IDENTIFIER);
          this.partialContext = this.createContextInfo();
          return null;
        }
      } else if (char === '-') {
        this.next(); // consume '-'
        if (this.isEof()) {
          // We consumed - but no tag identifier follows
          this.setContext(ParserContext.EXPECTING_TAG_IDENTIFIER);
          this.partialContext = this.createContextInfo();
          return null;
        }
        try {
          exclude.push(this.parseTag());
          this.skipWhitespace(); // Allow optional whitespace between tags
        } catch (error) {
          // Failed to parse tag identifier after -
          this.setContext(ParserContext.EXPECTING_TAG_IDENTIFIER);
          this.partialContext = this.createContextInfo();
          return null;
        }
      } else {
        break;
      }
    }
    
    return { include, exclude };
  }

  private parseSizeLimit(): SizeLimit {
    const op = this.parseComparisonOp();
    this.skipWhitespace(); // Skip optional whitespace after comparison operator
    const value = this.parseNumber();
    return { op, value };
  }

  private parseComparisonOp(): CompareOperator {
    if (this.match('<')) {
      this.next();
      if (this.match('=')) {
        this.next();
        this.lastParsedToken = '<=';
        return CompareOperator.Le;
      }
      this.lastParsedToken = '<';
      return CompareOperator.Lt;
    } else if (this.match('>')) {
      this.next();
      if (this.match('=')) {
        this.next();
        this.lastParsedToken = '>=';
        return CompareOperator.Ge;
      }
      this.lastParsedToken = '>';
      return CompareOperator.Gt;
    } else if (this.match('=')) {
      this.next();
      if (this.match('=')) {
        this.next();
        this.lastParsedToken = '==';
        return CompareOperator.Eq;
      }
      throw new Error(`Expected '==' at position ${this.pos - 1}`);
    } else if (this.match('!')) {
      this.next();
      if (this.match('=')) {
        this.next();
        this.lastParsedToken = '!=';
        return CompareOperator.Ne;
      }
      throw new Error(`Expected '!=' at position ${this.pos - 1}`);
    } else {
      throw new Error(`Expected comparison operator at position ${this.pos}`);
    }
  }

  private parseOptions(): Record<string, string> {
    const options: Record<string, string> = {};
    
    while (!this.isEof()) {
      const key = this.parseIdentifier();
      this.expect('=');
      
      // Parse value (can be empty)
      let value = '';
      while (!this.isEof()) {
        const char = this.peek()!;
        if (/[a-zA-Z0-9_]/.test(char)) {
          value += char;
          this.next();
        } else if (char === ',' || char === '}' || char === ']') {
          break;
        } else {
          break;
        }
      }
      
      options[key] = value;
      
      if (this.match(',')) {
        this.next(); // consume ','
        this.skipWhitespace();
      } else {
        break;
      }
    }
    
    return options;
  }

  private parseShortNumberBase(): NumberBase {
    const char = this.next()!;
    switch (char) {
      case 'd':
        return NumberBase.Dec;
      case 'x':
        return NumberBase.Hex;
      case 'r':
        return NumberBase.RomanLower;
      default:
        throw new Error(`Invalid short number base: ${char}`);
    }
  }

  private parseNumberBase(): NumberBase {
    const base = this.parseIdentifier();
    switch (base) {
      case 'dec':
        return NumberBase.Dec;
      case 'hex':
        return NumberBase.Hex;
      case 'HEX':
        return NumberBase.HexUpper;
      case 'roman':
        return NumberBase.RomanLower;
      case 'ROMAN':
        return NumberBase.Roman;
      default:
        throw new Error(`Invalid number base: ${base}`);
    }
  }

  private parseSelector(): Selector {
    const kind = this.parseIdentifier();
    
    let language: string | undefined;
    if (this.match('@')) {
      this.next(); // consume '@'
      language = this.parseIdentifier();
    }
    
    let includeTags: string[] = [];
    let excludeTags: string[] = [];
    let sizeLimit: SizeLimit | undefined;
    let options: Record<string, string> = {};
    
    if (this.match(':')) {
      this.next(); // consume ':'
      this.skipWhitespace(); // Skip optional whitespace after colon
      
      // Parse tags if present (start with + or -)
      if (this.match('+') || this.match('-')) {
        const tags = this.parseTags();
        includeTags = tags.include;
        excludeTags = tags.exclude;
        this.skipWhitespace(); // Skip whitespace after tags
      }
      
      // Parse size limit if present (starts with comparison operator)
      if (!this.isEof() && /[<>=!]/.test(this.peek()!)) {
        sizeLimit = this.parseSizeLimit();
        this.skipWhitespace(); // Skip whitespace after size limit
      }
      
      // Parse options if present (either after comma or directly if no tags/size limit)
      if (this.match(',')) {
        this.next(); // consume ','
        this.skipWhitespace();
        options = this.parseOptions();
      } else if (includeTags.length === 0 && !sizeLimit && !this.isEof() && this.peek() !== '}') {
        // No tags or size limit found, but there's more content - must be options
        options = this.parseOptions();
      }
    }
    
    return {
      kind,
      language,
      includeTags,
      excludeTags,
      sizeLimit,
      options
    };
  }

  private parseElement(): PatternElement {
    const identifier = this.parseIdentifier();
    
    // Check for special generator keywords
    if (identifier === 'number') {
      return this.parseNumberGen();
    } else if (identifier === 'special') {
      return this.parseSpecialCharGen();
    } else {
      // Reset position to before the identifier was consumed
      this.pos -= identifier.length;
      return this.parseSelector();
    }
  }

  private parseNumberGen(): NumberGen {
    // The identifier "number" has already been consumed by parseElement
    // so we don't need to consume it again
    
    let maxLength = 1;
    let base = NumberBase.Dec;
    
    if (this.match(':')) {
      this.next(); // consume ':'
      maxLength = this.parseNumber();
      
      // Check for short notation first (no comma)
      if (!this.isEof() && /[dxr]/.test(this.peek()!)) {
        base = this.parseShortNumberBase();
      } else if (this.match(',')) {
        // Full notation with comma
        this.next(); // consume ','
        this.skipWhitespace();
        base = this.parseNumberBase();
      }
    }
    
    return { maxLength, base };
  }

  private parseSpecialCharGen(): SpecialCharGen {
    // The identifier "special" has already been consumed by parseElement
    // so we don't need to consume it again
    
    let minLength = 1;
    let maxLength = 1;
    
    if (this.match(':')) {
      this.next(); // consume ':'
      minLength = this.parseNumber();
      
      if (this.match('-')) {
        this.next(); // consume '-'
        maxLength = this.parseNumber();
        
        // Validate range
        if (minLength > maxLength) {
          throw new Error(`Invalid range: start (${minLength}) cannot be greater than end (${maxLength})`);
        }
      } else {
        maxLength = minLength;
      }
    }
    
    return { minLength, maxLength };
  }

  private parseGlobalSettings(): GlobalSettings {
    let language: string | undefined;
    if (this.match('@')) {
      this.next(); // consume '@'
      language = this.parseIdentifier();
      this.skipWhitespace(); // Skip whitespace after language
    }
    
    let includeTags: string[] = [];
    let excludeTags: string[] = [];
    let sizeLimit: SizeLimit | undefined;
    let options: Record<string, string> = {};
    
    // Parse tags if present (start with + or -)
    if (this.match('+') || this.match('-')) {
      const tags = this.parseTags();
      includeTags = tags.include;
      excludeTags = tags.exclude;
      this.skipWhitespace(); // Skip whitespace after tags
    }
    
    // Parse size limit if present (starts with comparison operator)
    if (!this.isEof() && /[<>=!]/.test(this.peek()!)) {
      sizeLimit = this.parseSizeLimit();
      this.skipWhitespace(); // Skip whitespace after size limit
    }
    
    // Parse options if present (either after comma or directly if no tags/size limit)
    if (this.match(',')) {
      this.next(); // consume ','
      this.skipWhitespace();
      options = this.parseOptions();
    } else if (includeTags.length === 0 && !sizeLimit && !this.isEof() && this.peek() !== ']') {
      // No tags or size limit found, but there's more content - must be options
      options = this.parseOptions();
    }
    
    return {
      language,
      includeTags,
      excludeTags,
      sizeLimit,
      options
    };
  }

  public parse(): ParsedPattern {
    const elements: PatternElement[] = [];
    const textChunks: string[] = [];
    let globalSettings: GlobalSettings | undefined;
    
    let arbitraryStart = 0;
    let arbitraryEnd = this.input.length;
    
    while (!this.isEof()) {
      if (this.match('{')) {
        // Push arbitrary text before the placeholder
        textChunks.push(this.input.slice(arbitraryStart, this.pos));
        this.next(); // consume '{'
        
        const element = this.parseElement();
        elements.push(element);
        
        this.expect('}');
        arbitraryStart = this.pos;
      } else if (this.match('[')) {
        arbitraryEnd = this.pos;
        this.next(); // consume '['
        
        globalSettings = this.parseGlobalSettings();
        this.expect(']');
        
        this.skipWhitespace();
        if (!this.isEof()) {
          throw new Error(`Unexpected character after global settings at position ${this.pos}`);
        }
        break;
      } else if (this.match('\\')) {
        this.next(); // consume '\'
        if (this.isEof()) {
          throw new Error(`Unexpected end of pattern after escape character at position ${this.pos - 1}`);
        }
        const escapedChar = this.next();
        if (!['{', '}', '\\'].includes(escapedChar!)) {
          throw new Error(`Invalid escaped character '${escapedChar}' at position ${this.pos - 1}`);
        }
        // For now, we'll just skip escaped characters in the arbitrary text
      } else if (this.match('}')) {
        throw new Error(`Unmatched closing brace at position ${this.pos}`);
      } else if (this.match(']')) {
        throw new Error(`Unmatched closing bracket at position ${this.pos}`);
      } else {
        this.next(); // consume arbitrary character
      }
    }
    
    // Add the final text chunk
    if (textChunks.length === elements.length) {
      textChunks.push(this.input.slice(arbitraryStart, arbitraryEnd));
    }
    
    return {
      elements,
      globalSettings,
      textChunks
    };
  }

  public static parse(pattern: string): ParsedPattern {
    const parser = new PatternParser(pattern);
    return parser.parse();
  }

  /**
   * Parses a partial pattern and returns context information for parsing state.
   * This method is designed to be used by pattern suggestion systems.
   * 
   * @param pattern - The partial pattern string to parse
   * @returns ParserContextInfo with parsing context and expected next tokens
   * 
   * @example
   * ```typescript
   * // Parse partial selector
   * const context = PatternParser.parsePartial('{noun:');
   * console.log(context.context); // 'expecting_tag'
   * console.log(context.expectedNext); // ['+tag', '-tag', '>', '<', '>=', '<=', ',', '}']
   * 
   * // Parse partial number generator
   * const context2 = PatternParser.parsePartial('{number:5');
   * console.log(context2.context); // 'partial_number_gen'
   * console.log(context2.partialElement); // { maxLength: 5, base: 'dec' }
   * ```
   */
  public static parsePartial(pattern: string): ParserContextInfo {
    const parser = new PatternParser(pattern);
    return parser.parsePartial(pattern);
  }

  /**
   * Checks if a pattern is complete (fully valid).
   * 
   * @param pattern - The pattern string to check
   * @returns true if the pattern is complete and valid
   */
  public static isComplete(pattern: string): boolean {
    try {
      PatternParser.parse(pattern);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the valid prefix of a pattern (the part that can be parsed without errors).
   * 
   * @param pattern - The pattern string to analyze
   * @returns The valid prefix string
   */
  public static getValidPrefix(pattern: string): string {
    // For complete patterns, return the full pattern
    if (PatternParser.isComplete(pattern)) {
      return pattern;
    }
    // For incomplete patterns, return the parsed content so far
    const context = PatternParser.parsePartial(pattern);
    return context.parsedSoFar;
  }

  /**
   * Gets the expected next tokens for a partial pattern.
   * 
   * @param pattern - The partial pattern string
   * @returns Array of expected next token types
   */
  public static getExpectedNext(pattern: string): ExpectedToken[] {
    const context = PatternParser.parsePartial(pattern);
    return context.expectedNext;
  }

  /**
   * Validates a pattern string without throwing exceptions.
   * This is a non-throwing version of the parse() method.
   * 
   * @param pattern - The pattern string to validate
   * @returns true if the pattern is valid according to the EBNF grammar, false otherwise
   * 
   * @example
   * ```typescript
   * // Valid patterns
   * PatternParser.validate('{noun}')           // true
   * PatternParser.validate('{noun@en}')       // true
   * PatternParser.validate('{number:5,hex}')  // true
   * 
   * // Invalid patterns
   * PatternParser.validate('{noun')           // false - unclosed brace
   * PatternParser.validate('{noun:>abc}')     // false - non-numeric size limit
   * PatternParser.validate('{number:5,invalid}') // false - invalid base
   * ```
   */
  public static validate(pattern: string): boolean {
    try {
      PatternParser.parse(pattern);
      return true;
    } catch {
      return false;
    }
  }

  // Partial parsing support
  public parsePartial(pattern: string): ParserContextInfo {
    this.input = pattern;
    this.pos = 0;
    this.currentContext = ParserContext.OUTSIDE_PLACEHOLDER;
    this.contextStack = [];
    this.partialContext = null;
    
    try {
      this.parsePartialInternal();
      return this.partialContext || this.createContextInfo();
    } catch (error) {
      return this.createContextInfo(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private parsePartialInternal(): void {
    while (!this.isEof()) {
      if (this.match('{')) {
        this.pushContext(ParserContext.IN_PLACEHOLDER);
        this.next(); // consume '{'
        this.parsePartialElement();
        // Don't expect closing brace for partial parsing
        break;
      } else if (this.match('[')) {
        this.pushContext(ParserContext.IN_GLOBAL_SETTINGS);
        this.next(); // consume '['
        this.parsePartialGlobalSettings();
        // Don't expect closing bracket for partial parsing
        break;
      } else if (this.match('\\')) {
        this.next(); // consume '\'
        if (!this.isEof()) {
          this.next(); // consume escaped character
        }
      } else {
        this.next(); // consume arbitrary character
      }
    }
  }

  private parsePartialElement(): void {
          if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_IDENTIFIER);
        this.partialContext = this.createContextInfo();
        return;
      }

      try {
        const identifier = this.parseIdentifier();
        
        if (identifier === 'number') {
          this.setContext(ParserContext.PARTIAL_NUMBER_GEN);
          this.parsePartialNumberGen();
        } else if (identifier === 'special') {
          this.setContext(ParserContext.PARTIAL_SPECIAL_GEN);
          this.parsePartialSpecialGen();
        } else {
          this.setContext(ParserContext.PARTIAL_SELECTOR);
          this.parsePartialSelector(identifier);
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_IDENTIFIER);
        this.partialContext = this.createContextInfo();
      }
  }

  private parsePartialSelector(kind: string): void {
    const partialSelector: Partial<Selector> = { kind };
    
    if (this.isEof()) {
      this.partialContext = this.createContextInfo(undefined, partialSelector);
      return;
    }

    if (this.match('@')) {
      this.next(); // consume '@'
      if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_LANGUAGE_IDENTIFIER);
        this.partialContext = this.createContextInfo(undefined, partialSelector);
        return;
      }
      try {
        const language = this.parseIdentifier();
        partialSelector.language = language;
        
        if (this.isEof()) {
          this.setContext(ParserContext.EXPECTING_AFTER_LANGUAGE);
          this.partialContext = this.createContextInfo(undefined, partialSelector);
          return;
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_LANGUAGE_IDENTIFIER);
        this.partialContext = this.createContextInfo(undefined, partialSelector);
        return;
      }
    }

    if (this.isEof()) {
      this.partialContext = this.createContextInfo(undefined, partialSelector);
      return;
    }

    if (this.match(':')) {
      this.next(); // consume ':'
      this.skipWhitespace();
      
      if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT);
        this.partialContext = this.createContextInfo(undefined, partialSelector);
        return;
      }

      // Try to parse tags
      if (this.match('+') || this.match('-')) {
        try {
          const tags = this.parsePartialTags();
          if (tags) {
            partialSelector.includeTags = tags.include;
            partialSelector.excludeTags = tags.exclude;
          } else {
            // We parsed + or - but didn't complete the tag - set specific context
            return;
          }
        } catch (error) {
          this.setContext(ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT);
          this.partialContext = this.createContextInfo(undefined, partialSelector);
          return;
        }
      }

      // Try to parse size limit
      if (!this.isEof() && /[<>=!]/.test(this.peek()!)) {
        try {
          const sizeLimit = this.parseSizeLimit();
          partialSelector.sizeLimit = sizeLimit;
          // After parsing size limit, we can only expect tags (no more comparison operators)
          if (this.isEof()) {
            this.setContext(ParserContext.EXPECTING_TAG_ONLY);
            this.partialContext = this.createContextInfo(undefined, partialSelector);
            return;
          }
          
          // Try to parse tags after size limit
          if (this.match('+') || this.match('-')) {
            try {
              const tags = this.parsePartialTags();
              if (tags) {
                if (partialSelector.includeTags) {
                  partialSelector.includeTags.push(...tags.include);
                } else {
                  partialSelector.includeTags = tags.include;
                }
                if (partialSelector.excludeTags) {
                  partialSelector.excludeTags.push(...tags.exclude);
                } else {
                  partialSelector.excludeTags = tags.exclude;
                }
              } else {
                // We parsed + or - but didn't complete the tag - context already set
                return;
              }
            } catch (error) {
              this.setContext(ParserContext.EXPECTING_TAG_ONLY);
              this.partialContext = this.createContextInfo(undefined, partialSelector);
              return;
            }
          }
        } catch (error) {
          this.setContext(ParserContext.EXPECTING_SIZE_LIMIT);
          this.partialContext = this.createContextInfo(undefined, partialSelector);
          return;
        }
      }

      // Try to parse options
      if (this.match(',')) {
        this.next(); // consume ','
        this.skipWhitespace();
        try {
          const options = this.parseOptions();
          partialSelector.options = options;
        } catch (error) {
          this.setContext(ParserContext.EXPECTING_OPTION);
          this.partialContext = this.createContextInfo(undefined, partialSelector);
          return;
        }
      }
    }

    this.partialContext = this.createContextInfo(undefined, partialSelector);
  }

  private parsePartialNumberGen(): void {
    const partialNumberGen: Partial<NumberGen> = { maxLength: 1, base: NumberBase.Dec };
    
    if (this.isEof()) {
      this.partialContext = this.createContextInfo(undefined, partialNumberGen);
      return;
    }

    if (this.match(':')) {
      this.next(); // consume ':'
      
      if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_NUMBER_LENGTH);
        this.partialContext = this.createContextInfo(undefined, partialNumberGen);
        return;
      }

      try {
        const maxLength = this.parseNumber();
        partialNumberGen.maxLength = maxLength;
        
        if (this.isEof()) {
          this.setContext(ParserContext.EXPECTING_NUMBER_BASE);
          this.partialContext = this.createContextInfo(undefined, partialNumberGen);
          return;
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_NUMBER_LENGTH);
        this.partialContext = this.createContextInfo(undefined, partialNumberGen);
        return;
      }

      // Try to parse base
      if (!this.isEof() && /[dxr]/.test(this.peek()!)) {
        try {
          const base = this.parseShortNumberBase();
          partialNumberGen.base = base;
        } catch (error) {
          // Continue without base
        }
      } else if (this.match(',')) {
        this.next(); // consume ','
        this.skipWhitespace();
        try {
          const base = this.parseNumberBase();
          partialNumberGen.base = base;
        } catch (error) {
          this.setContext(ParserContext.EXPECTING_OPTION);
          this.partialContext = this.createContextInfo(undefined, partialNumberGen);
          return;
        }
      }
    }

    this.partialContext = this.createContextInfo(undefined, partialNumberGen);
  }

  private parsePartialSpecialGen(): void {
    const partialSpecialGen: Partial<SpecialCharGen> = { minLength: 1, maxLength: 1 };
    
    if (this.isEof()) {
      this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
      return;
    }

    if (this.match(':')) {
      this.next(); // consume ':'
      
      if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_SPECIAL_LENGTH);
        this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
        return;
      }

      try {
        const minLength = this.parseNumber();
        partialSpecialGen.minLength = minLength;
        partialSpecialGen.maxLength = minLength;
        
        if (this.isEof()) {
          this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
          return;
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_SPECIAL_LENGTH);
        this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
        return;
      }

      if (this.match('-')) {
        this.next(); // consume '-'
        if (this.isEof()) {
          this.setContext(ParserContext.EXPECTING_SPECIAL_RANGE);
          this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
          return;
        }
        try {
          const maxLength = this.parseNumber();
          partialSpecialGen.maxLength = maxLength;
        } catch (error) {
          this.setContext(ParserContext.EXPECTING_SPECIAL_RANGE);
          this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
          return;
        }
      }
    }

    this.partialContext = this.createContextInfo(undefined, partialSpecialGen);
  }

  private parsePartialGlobalSettings(): void {
    const partialGlobalSettings: Partial<GlobalSettings> = {};
    
    if (this.isEof()) {
      this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
      return;
    }

    if (this.match('@')) {
      this.next(); // consume '@'
      if (this.isEof()) {
        this.setContext(ParserContext.EXPECTING_IDENTIFIER);
        this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
        return;
      }
      try {
        const language = this.parseIdentifier();
        partialGlobalSettings.language = language;
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_IDENTIFIER);
        this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
        return;
      }
    }

    // Try to parse tags
    if (this.match('+') || this.match('-')) {
      try {
        const tags = this.parsePartialTags();
        if (tags) {
          partialGlobalSettings.includeTags = tags.include;
          partialGlobalSettings.excludeTags = tags.exclude;
        } else {
          // We parsed + or - but didn't complete the tag - set specific context
          return;
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT);
        this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
        return;
      }
    }

    // Try to parse size limit
    if (!this.isEof() && /[<>=!]/.test(this.peek()!)) {
      try {
        const sizeLimit = this.parseSizeLimit();
        partialGlobalSettings.sizeLimit = sizeLimit;
        // After parsing size limit, we can only expect tags (no more comparison operators)
        if (this.isEof()) {
          this.setContext(ParserContext.EXPECTING_TAG_ONLY);
          this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
          return;
        }
        
        // Try to parse tags after size limit
        if (this.match('+') || this.match('-')) {
          try {
            const tags = this.parsePartialTags();
            if (tags) {
              if (partialGlobalSettings.includeTags) {
                partialGlobalSettings.includeTags.push(...tags.include);
              } else {
                partialGlobalSettings.includeTags = tags.include;
              }
              if (partialGlobalSettings.excludeTags) {
                partialGlobalSettings.excludeTags.push(...tags.exclude);
              } else {
                partialGlobalSettings.excludeTags = tags.exclude;
              }
            } else {
              // We parsed + or - but didn't complete the tag - context already set
              return;
            }
          } catch (error) {
            this.setContext(ParserContext.EXPECTING_TAG_ONLY);
            this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
            return;
          }
        }
      } catch (error) {
        this.setContext(ParserContext.EXPECTING_SIZE_LIMIT);
        this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
        return;
      }
    }

    // Try to parse options
    if (this.match(',')) {
      this.next(); // consume ','
      this.skipWhitespace();
      try {
        const options = this.parseOptions();
        partialGlobalSettings.options = options;
              } catch (error) {
          this.setContext(ParserContext.EXPECTING_OPTION);
          this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
          return;
        }
    }

    this.partialContext = this.createContextInfo(undefined, partialGlobalSettings);
  }

  private createContextInfo(errorMessage?: string, partialElement?: any): ParserContextInfo {
    const context = this.getContext();
    const parsedSoFar = this.input.substring(0, this.pos);
    
    const expectedNext = this.getExpectedNext(context);
    
    return {
      context,
      position: this.pos,
      parsedSoFar,
      expectedNext,
      lastParsedToken: this.lastParsedToken,
      isValid: !errorMessage,
      errorMessage,
      partialElement
    };
  }

  private getExpectedNext(context: ParserContext): ExpectedToken[] {
    switch (context) {
      case ParserContext.EXPECTING_IDENTIFIER:
        return [ExpectedToken.IDENTIFIER, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_COLON:
        return [ExpectedToken.COLON];
      case ParserContext.EXPECTING_LANGUAGE_IDENTIFIER:
        return [ExpectedToken.IDENTIFIER];
      case ParserContext.EXPECTING_AFTER_LANGUAGE:
        return [ExpectedToken.COLON, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_TAG_OR_SIZE_LIMIT:
        return [ExpectedToken.TAG_SPEC, ExpectedToken.COMPARISON_OP, ExpectedToken.OPTION, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_TAG_ONLY:
        return [ExpectedToken.TAG_SPEC, ExpectedToken.OPTION, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_TAG_IDENTIFIER:
        return [ExpectedToken.IDENTIFIER];
      case ParserContext.EXPECTING_SIZE_LIMIT:
        return [ExpectedToken.NUMBER, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_NUMBER_LENGTH:
        return [ExpectedToken.NUMBER];
      case ParserContext.EXPECTING_NUMBER_BASE:
        return [ExpectedToken.NUMBER_BASE, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_SPECIAL_LENGTH:
        return [ExpectedToken.NUMBER];
      case ParserContext.EXPECTING_SPECIAL_RANGE:
        return [ExpectedToken.NUMBER, ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_OPTION:
        return [ExpectedToken.IDENTIFIER, ExpectedToken.CLOSE_BRACE]; // key=value format
      case ParserContext.EXPECTING_CLOSE_BRACE:
        return [ExpectedToken.CLOSE_BRACE];
      case ParserContext.EXPECTING_CLOSE_BRACKET:
        return [ExpectedToken.CLOSE_BRACKET];
      case ParserContext.PARTIAL_SELECTOR:
        return [ExpectedToken.AT_SIGN, ExpectedToken.COLON, ExpectedToken.CLOSE_BRACE];
      case ParserContext.PARTIAL_NUMBER_GEN:
        return [ExpectedToken.COLON]; // Must have settings, can't close directly
      case ParserContext.PARTIAL_SPECIAL_GEN:
        return [ExpectedToken.COLON, ExpectedToken.CLOSE_BRACE];
      case ParserContext.IN_PLACEHOLDER:
        return [ExpectedToken.IDENTIFIER, ExpectedToken.CLOSE_BRACE];
      case ParserContext.IN_GLOBAL_SETTINGS:
        return [ExpectedToken.IDENTIFIER, ExpectedToken.TAG_SPEC, ExpectedToken.COMPARISON_OP, ExpectedToken.CLOSE_BRACKET];
      default:
        return [];
    }
  }


}
