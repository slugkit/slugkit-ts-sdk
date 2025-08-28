import { DictionaryStats, DictionaryTag } from './types';

enum CaseType {
  LOWER = 'lower',
  UPPER = 'upper', 
  TITLE = 'title',
  MIXED = 'mixed'
}


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

  constructor(slugkit: SlugKitInterface) {
    this.slugkit = slugkit;
  }

  /**
   * Calculate the replacement range for a suggestion based on context
   */
  private calculateReplaceRange(context: SuggestionContext, suggestionType: 'generator' | 'tag' | 'operator' | 'symbol' | 'language' | 'base'): { start: number; end: number } {
    const { placeholderStart, cursorPosition, placeholderContent } = context;
    
    if (suggestionType === 'generator') {
      // For generator suggestions, replace from placeholder start + 1 to cursor position
      // This covers the entire generator name input
      return {
        start: placeholderStart + 1,
        end: cursorPosition
      };
    } else if (suggestionType === 'tag') {
      // For tag suggestions, check if we're replacing a partial tag
      const tagInputMatch = placeholderContent.match(/[+-]([a-zA-Z0-9_]*)$/);
      if (tagInputMatch && tagInputMatch[1]) {
        // We have a partial tag, replace it
        const partialTag = tagInputMatch[1];
        const partialTagStart = cursorPosition - partialTag.length;
        return { start: partialTagStart, end: cursorPosition };
      } else {
        // No partial tag, insert at cursor position
        return { start: cursorPosition, end: cursorPosition };
      }
    } else {
      // For other types, insert at cursor position
      return { start: cursorPosition, end: cursorPosition };
    }
  }

  /**
   * Create a suggestion with proper replaceRange
   */
  private createSuggestion(
    text: string, 
    type: 'generator' | 'tag' | 'operator' | 'symbol' | 'language' | 'base',
    context: SuggestionContext,
    description?: string
  ): Suggestion {
    return {
      text,
      type,
      description,
      replaceRange: this.calculateReplaceRange(context, type)
    };
  }

  /**
   * Get suggestions based on pattern and cursor position
   */
  async getSuggestions(pattern: string, cursorPosition: number): Promise<Suggestion[]> {
    const context = this.analyzeContext(pattern, cursorPosition);
    
    if (!context) {
      // No context means we're outside any placeholder, suggest opening brace
      return [{ 
        text: '{', 
        type: 'symbol',
        description: 'Start a new placeholder',
        replaceRange: { start: cursorPosition, end: cursorPosition }
      }];
    }



    // If cursor is not inside a placeholder, suggest opening brace
    if (context.placeholderStart === -1) {
      return [{ 
        text: '{', 
        type: 'symbol',
        description: 'Start a new placeholder',
        replaceRange: { start: cursorPosition, end: cursorPosition }
      }];
    }



    // If cursor is exactly at the colon, show settings suggestions
    if (context.isInSettings && !context.isInTags && !context.isInLengthConstraint && !context.isInOptions) {
      return this.getSettingsSuggestions(context);
    }

    // If cursor is in the generator name section
    if (!context.isInSettings) {
      return this.getGeneratorNameSuggestions(context);
    }

    // If cursor is in settings section
    if (context.isInSettings) {
      if (context.isInTags) {
        return this.getTagSuggestions(context);
      }
      if (context.isInLengthConstraint) {
        return this.getLengthConstraintSuggestions(context);
      }
      if (context.isInOptions) {
        return this.getOptionsSuggestions();
      }
      return this.getSettingsSuggestions(context);
    }

    // If we reach here, suggest closing brace
    return [{ 
      text: '}', 
      type: 'symbol',
      replaceRange: { start: context.cursorPosition, end: context.cursorPosition }
    }];
  }

  private analyzeContext(pattern: string, cursorPosition: number): SuggestionContext | null {
    // Find the placeholder that contains the cursor
    let placeholderStart = -1;
    let placeholderEnd = -1;
    let placeholderContent = '';
    let isInSettings = false;
    let isInTags = false;
    let isInLengthConstraint = false;
    let isInOptions = false;

    // Find the opening brace before cursor
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (pattern[i] === '{') {
        placeholderStart = i;
        break;
      }
      if (pattern[i] === '}') {
        // We're outside any placeholder
        return null;
      }
    }

    if (placeholderStart === -1) {
      return null;
    }

    // Find the closing brace after cursor
    for (let i = cursorPosition; i < pattern.length; i++) {
      if (pattern[i] === '}') {
        placeholderEnd = i;
        break;
      }
    }

    if (placeholderEnd === -1) {
      // Placeholder is not closed, treat end of pattern as end
      placeholderEnd = pattern.length;
    }

    placeholderContent = pattern.substring(placeholderStart + 1, placeholderEnd);

    // Calculate the relative cursor position within the placeholder content
    const relativeCursorPosition = cursorPosition - placeholderStart - 1;

    // Analyze the content to determine context
    const colonIndex = placeholderContent.indexOf(':');
    if (colonIndex !== -1 && relativeCursorPosition >= colonIndex) {
      isInSettings = true;
      
      if (relativeCursorPosition === colonIndex) {
        // Cursor is exactly at the colon, show settings suggestions
        isInTags = false;
      } else {
        const settingsContent = placeholderContent.substring(colonIndex + 1);
        const cursorInSettings = relativeCursorPosition - colonIndex - 1;
        
        // Parse the settings content to determine context
        // Settings can contain: [+/-tag]... [operator number]
        const lengthConstraintMatch = settingsContent.match(/([<>=!]+)\s*\d+/);
        
        if (lengthConstraintMatch) {
          const lengthConstraintStart = settingsContent.indexOf(lengthConstraintMatch[0]);
          if (cursorInSettings < lengthConstraintStart) {
            isInTags = true;
          } else {
            isInLengthConstraint = true;
          }
        } else {
          // Check if we're after a tag operator or in a tag
          const beforeCursor = settingsContent.substring(0, cursorInSettings);
          const afterLastSpace = beforeCursor.split(' ').pop() || '';
          
          // Check if we're in a generator that doesn't use tags (number, special)
          const generatorName = placeholderContent.substring(0, colonIndex);
          const isTaglessGenerator = generatorName === 'number' || generatorName === 'special';
          
          if (isTaglessGenerator) {
            // For number/special generators, only specific patterns are tags
            if (afterLastSpace.match(/^[+-]\w*$/)) {
              isInTags = true;
            } else {
              isInTags = false;
            }
          } else if (afterLastSpace.match(/^[+-][a-zA-Z0-9_]*$/)) {
            // We have a tag marker (+/-) followed by some characters
            // Always consider this as being in tag mode - the tag suggestions logic
            // will handle filtering based on whether it's a complete or partial tag
            isInTags = true;
          } else if (beforeCursor.trim() === '' || beforeCursor.endsWith(' ')) {
            // We're at the start of settings or after whitespace
            isInTags = false; // Show operators or tag operators
          } else {
            isInTags = true;
          }
        }
      }
    }

    return {
      pattern,
      cursorPosition,
      placeholderStart,
      placeholderEnd,
      placeholderContent,
      isInSettings,
      isInTags,
      isInLengthConstraint,
      isInOptions
    };
  }

  private async getGeneratorNameSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    const { placeholderContent, cursorPosition, placeholderStart } = context;
    const inputText = placeholderContent.substring(0, cursorPosition - placeholderStart - 1);
    

    
    if (inputText === '') {
      // Empty placeholder, suggest all generators
      return this.getAllGeneratorSuggestions(context);
    }

    // Check if it's a number generator (requires settings)
    if (inputText === 'number') {
      return [
        this.createSuggestion(':', 'symbol', context, 'Start settings section')
      ];
    }
    // Check if it's a special generator
    if (inputText === 'special') {
      return [
        this.createSuggestion('}', 'symbol', context, 'Close placeholder'),
        this.createSuggestion(':', 'symbol', context, 'Start settings section')
      ];
    }

    // Check if it's a complete dictionary name
    const dictionaries = await this.slugkit.getDictionaries();
    const matchingDict = dictionaries.find((d: DictionaryStats) => d.kind.toLowerCase() === inputText.toLowerCase());
    
    if (matchingDict) {
      // Complete dictionary name, suggest next steps
      return [
        this.createSuggestion('}', 'symbol', context),
        this.createSuggestion('@', 'symbol', context),
        this.createSuggestion(':', 'symbol', context)
      ];
    }

    // Partial input, suggest matching generators
    return this.getMatchingGeneratorSuggestions(inputText, context);
  }

  private async getAllGeneratorSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    const dictionaries = await this.slugkit.getDictionaries();
    const suggestions: Suggestion[] = [];

    // Add number and special generators (lowercase cluster)
    suggestions.push(
      this.createSuggestion('number', 'generator', context, 'Generate numeric values'),
      this.createSuggestion('special', 'generator', context, 'Generate special characters')
    );

    // Add all dictionaries in all casing variants
    dictionaries.forEach((dict: DictionaryStats) => {
      const baseName = dict.kind.toLowerCase();
      
      // Lowercase
      suggestions.push(
        this.createSuggestion(
          baseName,
          'generator',
          context,
          `Dictionary: ${dict.kind} (${dict.count} words)`
        )
      );
      
      // Uppercase
      suggestions.push(
        this.createSuggestion(
          baseName.toUpperCase(),
          'generator',
          context,
          `Dictionary: ${dict.kind} (${dict.count} words)`
        )
      );
      
      // Title case
      suggestions.push(
        this.createSuggestion(
          this.toTitleCase(baseName),
          'generator',
          context,
          `Dictionary: ${dict.kind} (${dict.count} words)`
        )
      );
      
      // Mixed case (starting with uppercase)
      suggestions.push(
        this.createSuggestion(
          this.generateAlternatingCase(baseName, false),
          'generator',
          context,
          `Dictionary: ${dict.kind} (${dict.count} words)`
        )
      );
    });

    // Sort suggestions by casing group priority and alphabetical order within groups
    return this.sortSuggestionsByCasing(suggestions);
  }

  private async getMatchingGeneratorSuggestions(inputText: string, context: SuggestionContext): Promise<Suggestion[]> {
    const dictionaries = await this.slugkit.getDictionaries();
    const suggestions: Suggestion[] = [];

    dictionaries.forEach((dict: DictionaryStats) => {
      const dictName = dict.kind.toLowerCase();
      if (dictName.startsWith(inputText.toLowerCase())) {
        if (inputText.length === 1) {
          // Single character input - generate suggestions based on input case
          const firstChar = inputText[0];
          
          if (firstChar === firstChar.toLowerCase()) {
            // Lowercase input - generate lowercase and mixed case suggestions
            suggestions.push(
              this.createSuggestion(
                dictName,
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
            
            // Mixed case suggestion starting with lowercase
            const mixedCaseName = this.generateAlternatingCase(dictName, true);
            suggestions.push(
              this.createSuggestion(
                mixedCaseName,
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          } else {
            // Uppercase input - generate uppercase, title case, and mixed case suggestions
            suggestions.push(
              this.createSuggestion(
                dictName.toUpperCase(),
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
            
            suggestions.push(
              this.createSuggestion(
                this.toTitleCase(dictName),
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
            
            // Mixed case suggestion starting with uppercase
            const mixedCaseName = this.generateAlternatingCase(dictName, false);
            suggestions.push(
              this.createSuggestion(
                mixedCaseName,
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          }
        } else {
          // Multi-character input - detect case type and generate appropriate suggestion
          const caseType = this.detectCaseType(inputText);
          
          if (caseType === CaseType.LOWER) {
            // Lowercase input - generate lowercase suggestion
            suggestions.push(
              this.createSuggestion(
                dictName,
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          } else if (caseType === CaseType.UPPER) {
            // Uppercase input - generate uppercase suggestion
            suggestions.push(
              this.createSuggestion(
                dictName.toUpperCase(),
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          } else if (caseType === CaseType.TITLE) {
            // Title case input - generate title case suggestion
            suggestions.push(
              this.createSuggestion(
                this.toTitleCase(dictName),
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          } else {
            // Mixed case input - preserve user's pattern and extend it
            const patternPreservingName = this.preserveUserPattern(dictName, inputText);
            suggestions.push(
              this.createSuggestion(
                patternPreservingName,
                'generator',
                context,
                `Dictionary: ${dict.kind} (${dict.count} words)`
              )
            );
          }
        }
      }
    });

    // Add special generators if they match
    if ('number'.startsWith(inputText.toLowerCase())) {
      suggestions.push(
        this.createSuggestion('number', 'generator', context, 'Generate numeric values')
      );
    }
    if ('special'.startsWith(inputText.toLowerCase())) {
      suggestions.push(
        this.createSuggestion('special', 'generator', context, 'Generate special characters')
      );
    }

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text === suggestion.text)
    );

    // Sort suggestions by casing group priority and alphabetical order within groups
    return this.sortSuggestionsByCasing(uniqueSuggestions);
  }



  private toTitleCase(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  private detectCaseType(inputText: string): CaseType {
    // Check if input is all lowercase
    if (inputText === inputText.toLowerCase()) {
      return CaseType.LOWER;
    }
    // Check if input is all uppercase
    if (inputText === inputText.toUpperCase()) {
      return CaseType.UPPER;
    }
    // Check if input is title case (first uppercase, rest lowercase)
    if (inputText[0] === inputText[0].toUpperCase() && inputText.slice(1) === inputText.slice(1).toLowerCase()) {
      return CaseType.TITLE;
    }
    // Otherwise it's mixed case
    return CaseType.MIXED;
  }


  private preserveUserPattern(baseName: string, userInput: string): string {
    if (userInput.length === 0) return baseName;
    
    let result = '';
    
    // First, apply the user's exact pattern for the length of their input
    for (let i = 0; i < Math.min(userInput.length, baseName.length); i++) {
      const char = baseName[i];
      const userChar = userInput[i];
      
      // Apply the user's exact casing
      if (userChar === userChar.toUpperCase() && userChar !== userChar.toLowerCase()) {
        result += char.toUpperCase();
      } else if (userChar === userChar.toLowerCase() && userChar !== userChar.toUpperCase()) {
        result += char.toLowerCase();
      } else {
        result += char;
      }
    }
    
    // Then, continue with alternating case pattern for the remaining characters
    if (baseName.length > userInput.length) {
      const lastUserChar = userInput[userInput.length - 1];
      const startsWithUpper = lastUserChar === lastUserChar.toUpperCase();
      for (let i = userInput.length; i < baseName.length; i++) {
        const char = baseName[i];
        const shouldBeUpper = (i - userInput.length) % 2 === (startsWithUpper ? 1 : 0);
        result += shouldBeUpper ? char.toUpperCase() : char.toLowerCase();
      }
    }
    
    return result;
  }

  private generateAlternatingCase(baseName: string, startWithLowercase: boolean): string {
    let result = '';
    for (let i = 0; i < baseName.length; i++) {
      if (startWithLowercase) {
        result += i % 2 === 0 ? baseName[i].toLowerCase() : baseName[i].toUpperCase();
      } else {
        result += i % 2 === 0 ? baseName[i].toUpperCase() : baseName[i].toLowerCase();
      }
    }
    return result;
  }

  private sortSuggestionsByCasing(suggestions: Suggestion[]): Suggestion[] {
    // Define casing group priority: lower > upper > title > mixed
    const getCasingGroup = (text: string): number => {
      if (text === text.toLowerCase()) {
        // Special generators get highest priority within lowercase group
        if (text === 'number' || text === 'special') {
          return 0; // Highest priority
        }
        return 1; // Lowercase
      }
      if (text === text.toUpperCase()) {
        return 2; // Uppercase
      }
      if (text[0] === text[0].toUpperCase() && text.slice(1) === text.slice(1).toLowerCase()) {
        return 3; // Title case
      }
      return 4; // Mixed case
    };

    return suggestions.sort((a, b) => {
      const groupA = getCasingGroup(a.text);
      const groupB = getCasingGroup(b.text);
      
      // First sort by casing group priority
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      
      // Within the same casing group, sort alphabetically
      return a.text.localeCompare(b.text);
    });
  }



  private getSettingsSuggestions(context: SuggestionContext): Suggestion[] {
    const { placeholderContent, cursorPosition, placeholderStart } = context;
    const colonIndex = placeholderContent.indexOf(':');
    const settingsContent = placeholderContent.substring(colonIndex + 1);
    const cursorInSettings = cursorPosition - placeholderStart - 1 - colonIndex - 1;
    
    // Check if we're in a dictionary selector
    if (this.isDictionarySelector(context)) {
      // Check if we're at the beginning of settings or after whitespace
      const beforeCursor = settingsContent.substring(0, cursorInSettings);
      
      // If we have a complete tag (ends with word), suggest next options
      if (beforeCursor.match(/[+-]\w+$/)) {
        return [
          this.createSuggestion('+', 'symbol', context, 'Include another tag'),
          this.createSuggestion('-', 'symbol', context, 'Exclude another tag'),
          this.createSuggestion('==', 'operator', context, 'Equal to'),
          this.createSuggestion('!=', 'operator', context, 'Not equal to'),
          this.createSuggestion('<', 'operator', context, 'Less than'),
          this.createSuggestion('<=', 'operator', context, 'Less than or equal to'),
          this.createSuggestion('>', 'operator', context, 'Greater than'),
          this.createSuggestion('>=', 'operator', context, 'Greater than or equal to'),
          this.createSuggestion('}', 'symbol', context, 'Close placeholder')
        ];
      }
      
      // If we have tags but no size constraints yet, suggest size operators
      if (beforeCursor.match(/[+-]\w+/) && !beforeCursor.match(/[<>=!]/)) {
        return [
          this.createSuggestion('==', 'operator', context, 'Equal to'),
          this.createSuggestion('!=', 'operator', context, 'Not equal to'),
          this.createSuggestion('<', 'operator', context, 'Less than'),
          this.createSuggestion('<=', 'operator', context, 'Less than or equal to'),
          this.createSuggestion('>', 'operator', context, 'Greater than'),
          this.createSuggestion('>=', 'operator', context, 'Greater than or equal to')
        ];
      }
      
      // Otherwise suggest all available options: tags, size constraints, or close
      return [
        this.createSuggestion('+', 'symbol', context, 'Include tag'),
        this.createSuggestion('-', 'symbol', context, 'Exclude tag'),
        this.createSuggestion('==', 'operator', context, 'Equal to'),
        this.createSuggestion('!=', 'operator', context, 'Not equal to'),
        this.createSuggestion('<', 'operator', context, 'Less than'),
        this.createSuggestion('<=', 'operator', context, 'Less than or equal to'),
        this.createSuggestion('>', 'operator', context, 'Greater than'),
        this.createSuggestion('>=', 'operator', context, 'Greater than or equal to'),
        this.createSuggestion('}', 'symbol', context, 'Close placeholder')
      ];
    }
    
    // Check if we're in a number generator
    if (this.isNumberGenerator(context)) {
      const hasSize = /\d+$/.test(placeholderContent);
      if (hasSize) {
        return [
          this.createSuggestion('d', 'base', context, 'Decimal base'),
          this.createSuggestion('x', 'base', context, 'Hexadecimal base (lowercase)'),
          this.createSuggestion('X', 'base', context, 'Hexadecimal base (uppercase)'),
          this.createSuggestion('r', 'base', context, 'Roman numerals (lowercase)'),
          this.createSuggestion('R', 'base', context, 'Roman numerals (uppercase)')
        ];
      }
      
      // Check if we have a complete base specification (e.g., "4x", "7d")
      const hasCompleteBase = /\d+[dxXrR]$/.test(placeholderContent);
      if (hasCompleteBase) {
        return [
          this.createSuggestion('}', 'symbol', context, 'Close placeholder')
        ];
      }
    }
    
    // Check if we're in a special generator
    if (this.isSpecialGenerator(context)) {
      const hasNumber = /\d+$/.test(placeholderContent);
      if (hasNumber) {
        // Check if we already have a complete range (e.g., "3-5")
        const hasCompleteRange = /\d+-\d+$/.test(placeholderContent);
        if (hasCompleteRange) {
          // Range is complete, only suggest close brace
          return [
            this.createSuggestion('}', 'symbol', context, 'Close placeholder')
          ];
        } else {
          // Single number, suggest both range start and close
          // because it can be either exact length or start of range
          return [
            this.createSuggestion('-', 'symbol', context, 'Start range'),
            this.createSuggestion('}', 'symbol', context, 'Close placeholder')
          ];
        }
      }
    }
    
    return [];
  }

  private async getTagSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    const { placeholderContent, cursorPosition, placeholderStart } = context;
    
    // Extract dictionary name from placeholder
    const colonIndex = placeholderContent.indexOf(':');
    if (colonIndex === -1) return [];
    
    const generatorName = placeholderContent.substring(0, colonIndex);
    
    // Get tags for this dictionary first
    const allTags = await this.slugkit.getDictionaryTags();
    const dictionaryTags = allTags.filter((tag: DictionaryTag) => tag.kind.toLowerCase() === generatorName.toLowerCase());
    
    // Filter out already used tags in this placeholder
    const usedTags = this.getUsedTags(placeholderContent);
    const availableTags = dictionaryTags.filter((tag: DictionaryTag) => !usedTags.includes(tag.tag));
    
    // Check if we're in the middle of typing a tag (after + or - but before space or end)
    const tagInputMatch = placeholderContent.match(/[+-]([a-zA-Z0-9_]*)$/);
    if (tagInputMatch) {
      const partialTag = tagInputMatch[1];
      
      if (partialTag === '') {
        // Just + or - operator, show all available tags
        return availableTags.map((tag: DictionaryTag) => 
          this.createSuggestion(tag.tag, 'tag', context, tag.description)
        );
      }
      
      // Check if the sequence after +/- exists as a complete tag in the dictionary
      const exactTagMatch = dictionaryTags.find((tag: DictionaryTag) => 
        tag.tag.toLowerCase() === partialTag.toLowerCase()
      );
      
      if (exactTagMatch) {
        // Tag is complete and exists - show operators and close
        return [
          this.createSuggestion('+', 'symbol', context, 'Include another tag'),
          this.createSuggestion('-', 'symbol', context, 'Exclude another tag'),
          this.createSuggestion('==', 'operator', context, 'Equal to'),
          this.createSuggestion('!=', 'operator', context, 'Not equal to'),
          this.createSuggestion('<', 'operator', context, 'Less than'),
          this.createSuggestion('<=', 'operator', context, 'Less than or equal to'),
          this.createSuggestion('>', 'operator', context, 'Greater than'),
          this.createSuggestion('>=', 'operator', context, 'Greater than or equal to'),
          this.createSuggestion('}', 'symbol', context, 'Close placeholder')
        ];
      } else {
        // Tag is partial or doesn't exist - show matching tag suggestions
        const matchingTags = availableTags.filter((tag: DictionaryTag) => 
          tag.tag.toLowerCase().startsWith(partialTag.toLowerCase())
        );
        return matchingTags.map((tag: DictionaryTag) => 
          this.createSuggestion(tag.tag, 'tag', context, tag.description)
        );
      }
    }
    
    // If no tag input, check for comparison operators
    const settingsContent = placeholderContent.substring(colonIndex + 1);
    const cursorInSettings = cursorPosition - placeholderStart - 1 - colonIndex - 1;
    const beforeCursor = settingsContent.substring(0, cursorInSettings);
    
    // If we're typing a single comparison operator character, suggest '=' to complete it
    if (beforeCursor.match(/^[=!<>]$/)) {
      return [
        this.createSuggestion('=', 'operator', context, 'Complete comparison operator')
      ];
    }
    
    // If we're typing the second character of a comparison operator (e.g., == or !=), suggest nothing
    if (beforeCursor.match(/[=!<>]{2}$/)) {
      return [];
    }
    
    // Check if we have a size constraint anywhere in the settings
    const hasAnySizeConstraint = settingsContent.match(/[=!<>]=?\s*\d+/);
    if (hasAnySizeConstraint) {
      // Size constraint exists, only suggest continuation options
      return [
        this.createSuggestion('+', 'symbol', context, 'Include tag'),
        this.createSuggestion('-', 'symbol', context, 'Exclude tag'),
        this.createSuggestion('}', 'symbol', context, 'Close placeholder')
      ];
    }
    
    // If no partial tag input, return all available tags
    return availableTags.map((tag: DictionaryTag) => 
      this.createSuggestion(tag.tag, 'tag', context, tag.description)
    );
  }

  private getLengthConstraintSuggestions(context: SuggestionContext): Suggestion[] {
    const { placeholderContent } = context;
    const colonIndex = placeholderContent.indexOf(':');
    if (colonIndex === -1) return [];
    
    const settingsContent = placeholderContent.substring(colonIndex + 1);
    
    // Check if we already have a size constraint (any comparison operator followed by a number)
    const hasSizeConstraint = settingsContent.match(/[=!<>]=?\s*\d+/);
    
    if (hasSizeConstraint) {
      // Size constraint already exists, suggest continuation options
      return [
        this.createSuggestion('+', 'symbol', context, 'Include tag'),
        this.createSuggestion('-', 'symbol', context, 'Exclude tag'),
        this.createSuggestion('}', 'symbol', context, 'Close placeholder')
      ];
    }
    
    // No size constraint yet, suggest comparison operators
    return [
      this.createSuggestion('==', 'operator', context, 'Equal to'),
      this.createSuggestion('!=', 'operator', context, 'Not equal to'),
      this.createSuggestion('<', 'operator', context, 'Less than'),
      this.createSuggestion('<=', 'operator', context, 'Less than or equal to'),
      this.createSuggestion('>', 'operator', context, 'Greater than'),
      this.createSuggestion('>=', 'operator', context, 'Greater than or equal to')
    ];
  }

  private getOptionsSuggestions(): Suggestion[] {
    // Options are not implemented yet, return empty array
    return [];
  }

  private isDictionarySelector(context: SuggestionContext): boolean {
    const { placeholderContent } = context;
    const colonIndex = placeholderContent.indexOf(':');
    if (colonIndex === -1) return false;
    
    const generatorName = placeholderContent.substring(0, colonIndex);
    return generatorName !== 'number' && generatorName !== 'special';
  }

  private isNumberGenerator(context: SuggestionContext): boolean {
    const { placeholderContent } = context;
    return placeholderContent.startsWith('number');
  }

  private isSpecialGenerator(context: SuggestionContext): boolean {
    const { placeholderContent } = context;
    return placeholderContent.startsWith('special');
  }

  private getUsedTags(placeholderContent: string): string[] {
    const tagMatches = placeholderContent.match(/[+-]([a-zA-Z0-9_]+)/g);
    if (!tagMatches) return [];
    
    return tagMatches.map(match => match.substring(1));
  }


}
