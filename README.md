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

// Create a SlugKit instance with API key (recommended for MCP servers)
const slugkit = SlugKit.fromApiKey('https://your-backend.com', 'your-api-key');

// Or create from JWK for SDK authentication
const slugkit = await SlugKit.fromJwk('https://your-backend.com', 'your-sdk-slug', jwkObject);

// Or use automatic key fetching from backend
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
// Get dictionary statistics (cached after first call)
const stats = await slugkit.getDictionaries();
console.log(stats);
// [
//   { kind: 'noun', lang: 'en', word_count: 1000, tag_count: 15 },
//   { kind: 'adjective', lang: 'en', word_count: 500, tag_count: 12 }
// ]

// Get dictionary tags (cached after first call)
const tags = await slugkit.getDictionaryTags();
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

// Force fresh data (bypass cache)
const freshStats = await slugkit.fetchDictionaries();
const freshTags = await slugkit.fetchDictionaryTags();
```

### ID Generation

```typescript
// Generate random slugs using forge
const slugs = await slugkit.forgeSlugs('{noun}', 5);
console.log(slugs); // Array of 5 random nouns

// Generate with seed for reproducible results
const deterministicSlugs = await slugkit.forgeSlugs('{noun}', 3, 'my-seed');

// Generate with sequence offset
const offsetSlugs = await slugkit.forgeSlugs('{noun}', 2, undefined, 100);

// Mint slugs from a series (if available)
const mintedSlugs = await slugkit.mintSlugs('my-series', 5);

// Slice slugs (dry-run preview)
const slicedSlugs = await slugkit.sliceSlugs('my-series', 3, 1000, 0);

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

#### Static Factory Methods
- `SlugKit.fromApiKey(backend: string, apiKey: string): SlugKit` - Create instance with API key
- `SlugKit.fromJwk(backend: string, sdkSlug: string, jwk: JsonWebKey): Promise<SlugKit>` - Create from JWK
- `SlugKit.fromBackend(backend: string, sdkSlug: string): Promise<SlugKit>` - Create with auto key fetching

#### Dictionary Methods
- `getDictionaries(): Promise<DictionaryStats[]>` - Get dictionary statistics (cached)
- `getDictionaryTags(): Promise<DictionaryTag[]>` - Get dictionary tags (cached)
- `fetchDictionaries(): Promise<DictionaryStats[]>` - Get dictionary statistics (fresh)
- `fetchDictionaryTags(): Promise<DictionaryTag[]>` - Get dictionary tags (fresh)

#### Generation Methods
- `forgeSlugs(pattern: string, count: number, seed?: string, sequence?: number): Promise<string[]>` - Generate random slugs
- `mintSlugs(seriesSlug?: string, count: number, batchSize?: number): Promise<string[]>` - Mint from series
- `sliceSlugs(seriesSlug?: string, count: number, batchSize?: number, sequence?: number): Promise<string[]>` - Slice preview
- `getPatternInfo(pattern: string): Promise<PatternInfo>` - Get pattern analysis

## Types

### DictionaryStats
```typescript
interface DictionaryStats {
  kind: string;
  lang: string;
  word_count: number;
  tag_count: number;
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
  const result = await slugkit.getDictionaries();
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    // Handle auth errors - may trigger automatic key refresh
  } else if (error.message.includes('Network error')) {
    // Handle network errors
  } else if (error.message.includes('Rate limit')) {
    // Handle rate limiting
  }
}

// Pattern validation errors
try {
  const info = await slugkit.getPatternInfo('{invalid-pattern}');
} catch (error) {
  console.log('Pattern validation failed:', error.message);
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