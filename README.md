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
const slugkit = await SlugKit.fromBackend('https://your-backend.com', 'your-sdk-slug');
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
const slugs = await slugkit.getRandomSlugs('{noun}', 5);
console.log(slugs); // Array of 5 random nouns

// Get pattern info (includes capacity and more details)
const patternInfo = await slugkit.getPatternInfo('{noun}');
console.log(patternInfo.capacity); // Number of possible combinations
console.log(patternInfo.max_slug_length); // Maximum length of generated slugs
console.log(patternInfo.complexity); // Pattern complexity score
console.log(patternInfo.components); // Number of components in pattern
```

## API Reference

### PatternParser

- `parse(pattern: string): ParsedPattern` - Parse a pattern string
- `validate(pattern: string): boolean` - Validate a pattern without throwing

### SlugKit

- `fetchDictionaries(): Promise<DictionaryStats[]>` - Get dictionary statistics
- `fetchDictionaryTags(): Promise<DictionaryTag[]>` - Get dictionary tags
- `getRandomSlugs(pattern: string, count: number, seed?: string, sequence?: number): Promise<string[]>`
- `getPatternInfo(pattern: string): Promise<PatternInfo>`

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