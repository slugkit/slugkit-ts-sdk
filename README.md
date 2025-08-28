# SlugKit SDK

A TypeScript SDK for generating human-readable IDs using SlugKit patterns.

## Features

- **Pattern Parsing**: Parse and validate SlugKit patterns using the EBNF grammar
- **ID Generation**: Generate random slugs from patterns
- **Dictionary Management**: Fetch dictionary statistics and tags
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @slugkit/sdk
```

## Usage

### Basic Setup

```typescript
import { SlugKit } from '@slugkit/sdk';

// Create a SlugKit instance
const slugkit = await SlugKit.fromBackend('https://your-backend.com', 'your-sdk-slug', fallbackJwk);
```

### Pattern Parsing

```typescript
import { PatternParser } from '@slugkit/sdk';

// Parse a pattern
const parsed = PatternParser.parse('{noun} {adjective}');
console.log(parsed.elements); // Array of pattern elements

// Validate a pattern without throwing
const isValid = PatternParser.validate('{noun}');
console.log(isValid); // true/false
```

### Dictionary Management

```typescript
// Fetch dictionary statistics
const stats = await slugkit.fetchDictionaries();
console.log(stats);
// [
//   { kind: 'noun', count: 1000 },
//   { kind: 'adjective', count: 500 }
// ]

// Fetch dictionary tags
const tags = await slugkit.fetchDictionaryTags();
console.log(tags);
// [
//   {
//     kind: 'noun',
//     tag: 'formal',
//     description: 'Formal language',
//     opt_in: true,
//     word_count: 100
//   }
// ]
```

### ID Generation

```typescript
// Generate random slugs
const slugs = await slugkit.forgeSlugs('{noun}', 5, undefined, undefined);
console.log(slugs); // Array of 5 random nouns

// Get pattern info (includes capacity and more details)
const patternInfo = await slugkit.getPatternInfo('{noun}');
console.log(patternInfo.capacity); // Number of possible combinations
console.log(patternInfo.max_slug_length); // Maximum length of generated slugs
console.log(patternInfo.complexity); // Pattern complexity score
console.log(patternInfo.components); // Number of components in pattern
```

### Advanced Pattern Parsing

For building pattern editors, autocompletion, and suggestion systems:

```typescript
import { PatternParser } from '@slugkit/sdk';

// Parse partial patterns for autocompletion
const context = PatternParser.parsePartial('{noun:');
console.log(context.context); // 'expecting_tag_or_size_limit'
console.log(context.expectedNext); // ['tag_spec', 'comparison_op', 'option', 'close_brace']

// Check if pattern is complete
const isComplete = PatternParser.isComplete('{noun}');
console.log(isComplete); // true

const isIncomplete = PatternParser.isComplete('{noun:');
console.log(isIncomplete); // false

// Get the valid prefix of a potentially broken pattern
const validPrefix = PatternParser.getValidPrefix('{noun} {invalid-syntax}');
console.log(validPrefix); // '{noun} '

// Get expected tokens for suggestions
const expected = PatternParser.getExpectedNext('{number:5');
console.log(expected); // ['number_base', 'close_brace']
```

### Pattern Shortening and Sharing

```typescript
// Shorten a pattern to a shareable slug
const shortenRequest = {
  pattern: '{adjective@en:+positive} {noun@en:+animal}',
  seed: 'my-seed',
  sequence: 1
};

const shortened = await slugkit.shortenPattern(shortenRequest);
console.log(shortened.slug); // 'abc123'

// Expand the slug back to the original pattern
const expanded = await slugkit.expandPattern('abc123');
console.log(expanded.pattern); // '{adjective@en:+positive} {noun@en:+animal}'
console.log(expanded.seed); // 'my-seed'
console.log(expanded.sequence); // 1
```

## API Reference

### PatternParser

#### Basic Methods
- `parse(pattern: string): ParsedPattern` - Parse a pattern string
- `validate(pattern: string): boolean` - Validate a pattern without throwing

#### Advanced Parsing Helpers
- `parsePartial(pattern: string): ParserContextInfo` - Parse partial patterns and get context
- `isComplete(pattern: string): boolean` - Check if pattern is complete and valid
- `getValidPrefix(pattern: string): string` - Get the valid prefix of a pattern
- `getExpectedNext(pattern: string): ExpectedToken[]` - Get expected next tokens for suggestions

### SlugKit

#### Static Methods
- `fromBackend(backend: string, sdkSlug: string, fallbackJwk?: JsonWebKey): Promise<SlugKit>` - Create SlugKit instance from backend
- `fromJwk(backend: string, sdkSlug: string, jwk: JsonWebKey): Promise<SlugKit>` - Create SlugKit instance from JWK directly

#### Instance Methods
- `fetchDictionaries(): Promise<DictionaryStats[]>` - Get dictionary statistics
- `getDictionaries(): Promise<DictionaryStats[]>` - Get dictionary statistics with caching
- `fetchDictionaryTags(): Promise<DictionaryTag[]>` - Get dictionary tags
- `getDictionaryTags(): Promise<DictionaryTag[]>` - Get dictionary tags with caching
- `forgeSlugs(pattern: string, count: number, seed?: string, sequence?: number): Promise<string[]>` - Generate random slugs
- `getPatternInfo(pattern: string): Promise<PatternInfo>` - Get pattern information
- `checkCapacity(pattern: string): Promise<number>` - Check pattern capacity (deprecated)
- `shortenPattern(request: ShortenPatternRequest): Promise<ShortenPatternResponse>` - Shorten pattern to slug
- `expandPattern(slug: string): Promise<ShortenPatternRequest>` - Expand shortened slug
- `getStatsTotal(): Promise<StatsData[]>` - Get service-wide statistics

## Types

### DictionaryStats
```typescript
interface DictionaryStats {
  kind: string;
  count: number;
}
```

### DictionaryTag
```typescript
interface DictionaryTag {
  kind: string;
  tag: string;
  description: string;
  opt_in: boolean;
  word_count: number;
}
```

### PatternInfo
```typescript
interface PatternInfo {
  pattern: string;
  capacity: string;
  max_slug_length: number;
  complexity: number;
  components: number;
}
```

### ShortenPatternRequest
```typescript
interface ShortenPatternRequest {
  pattern: string;
  seed?: string;
  sequence?: number;
}
```

### ShortenPatternResponse
```typescript
interface ShortenPatternResponse {
  slug: string;
}
```

### ParserContextInfo
```typescript
interface ParserContextInfo {
  context: ParserContext;
  position: number;
  parsedSoFar: string;
  expectedNext: ExpectedToken[];
  lastParsedToken?: string;
  isValid: boolean;
  errorMessage?: string;
  partialElement?: any;
}
```

### ParsedPattern
```typescript
interface ParsedPattern {
  elements: PatternElement[];
  globalSettings?: GlobalSettings;
  textChunks: string[];
}
```

## Pattern Grammar

The SDK supports the full SlugKit EBNF grammar for patterns:

- **Selectors**: `{noun@en:+formal -nsfw >3,case=lower}`
- **Number Generators**: `{number:5,hex}` or `{number:5d}`
- **Special Characters**: `{special:3-5}`
- **Global Settings**: `[@en +formal >3,case=lower]`

## Error Handling

The SDK provides comprehensive error handling:

```typescript
try {
  const result = await slugkit.fetchDictionaries();
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    // Handle auth errors
  } else if (error.message.includes('Network error')) {
    // Handle network errors
  }
}
```

## Testing

```bash
npm test
```

## Building

```bash
npm run build
```