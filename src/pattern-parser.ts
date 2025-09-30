// Pattern Parser for SlugKit patterns
// Based on the EBNF grammar from the README and C++ implementation

import {
  CompareOperator,
  NumberBase,
  SizeLimit,
  Selector,
  NumberGen,
  SpecialCharGen,
  EmojiGen,
  PatternElement,
  GlobalSettings,
  ParsedPattern
} from "./parser-types";


export class PatternParser {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
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
        return CompareOperator.Le;
      }
      return CompareOperator.Lt;
    } else if (this.match('>')) {
      this.next();
      if (this.match('=')) {
        this.next();
        return CompareOperator.Ge;
      }
      return CompareOperator.Gt;
    } else if (this.match('=')) {
      this.next();
      if (this.match('=')) {
        this.next();
        return CompareOperator.Eq;
      }
      throw new Error(`Expected '==' at position ${this.pos - 1}`);
    } else if (this.match('!')) {
      this.next();
      if (this.match('=')) {
        this.next();
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
      this.skipWhitespace();
      const nextChar = this.peek();
      if (!nextChar || nextChar === '}' || !/[a-zA-Z_]/.test(nextChar)) {
        break;
      }

      const key = this.parseIdentifier();
      this.expect('=');

      // Parse value: any non-whitespace, excluding only '}'
      let value = '';
      while (!this.isEof()) {
        const char = this.peek()!;
        if (char === ',' || char === ']') {
          // Commas are not allowed; ']' cannot be part of option value
          break;
        }
        if (char === '}' || /\s/.test(char)) {
          break;
        }
        value += char;
        this.next();
      }

      options[key] = value;
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
      
      // Parse options if present (space-separated key=value)
      if (!this.isEof() && this.peek() !== '}' && /[a-zA-Z_]/.test(this.peek()!)) {
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
    } else if (identifier === 'emoji') {
      return this.parseEmojiGen();
    } else {
      // Reset position to before the identifier was consumed
      this.pos -= identifier.length;
      return this.parseSelector();
    }
  }

  private parseEmojiGen(): EmojiGen {
    // 'emoji' identifier was already consumed by parseElement
    // Forbid language
    if (this.match('@')) {
      throw new Error(`Emoji generator does not support language at position ${this.pos}`);
    }

    let includeTags: string[] = [];
    let excludeTags: string[] = [];
    let options: Record<string, string> = {};

    if (this.match(':')) {
      this.next();
      this.skipWhitespace();

      // Parse tags if present
      if (this.match('+') || this.match('-')) {
        const tags = this.parseTags();
        includeTags = tags.include;
        excludeTags = tags.exclude;
        this.skipWhitespace();
      }

      // Emoji does not support size constraints
      if (!this.isEof() && /[<>=!]/.test(this.peek()!)) {
        throw new Error(`Emoji generator does not support size constraints at position ${this.pos}`);
      }

      // Parse options if present
      if (!this.isEof() && this.peek() !== '}' && /[a-zA-Z_]/.test(this.peek()!)) {
        options = this.parseOptions();
      }
    }

    return {
      kind: 'emoji',
      includeTags,
      excludeTags,
      options
    };
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
        this.next();
        this.skipWhitespace();
        base = this.parseNumberBase();
      }
      // Do not alter existing base parsing beyond this
      this.skipWhitespace();
      // Optionally consume space-separated options (ignored by number generator)
      if (!this.isEof() && this.peek() !== '}' && /[a-zA-Z_]/.test(this.peek()!)) {
        void this.parseOptions();
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

      this.skipWhitespace();
      // Optionally consume space-separated options (ignored by special generator)
      if (!this.isEof() && this.peek() !== '}' && /[a-zA-Z_]/.test(this.peek()!)) {
        void this.parseOptions();
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
    
    // Parse options if present (space-separated key=value)
    this.skipWhitespace();
    if (!this.isEof() && this.peek() !== ']' && /[a-zA-Z_]/.test(this.peek()!)) {
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
}
