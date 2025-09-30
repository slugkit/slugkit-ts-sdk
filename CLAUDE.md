# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **SlugKit SDK** - a TypeScript SDK for generating human-readable IDs using SlugKit patterns. The SDK provides pattern parsing, ID generation, dictionary management, and full TypeScript support.

## Development Commands

```bash
# Build the project
npm run build

# Development with watch mode
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Clean build artifacts
npm run clean
```

## Architecture

The SDK is organized into several key modules:

### Core Components

1. **SlugKit Class** (`src/slugkit.ts`) - Main SDK class providing:
   - JWT-based authentication with automatic key refresh
   - HTTP client with signed requests 
   - Dictionary and tag management with caching
   - Pattern generation and info retrieval
   - Pattern shortening/expansion

2. **Pattern Parser** (`src/pattern-parser.ts`) - EBNF-based pattern parser:
   - Validates SlugKit pattern syntax
   - Parses patterns into structured elements
   - Supports selectors, number generators, special characters, global settings
   - **Note**: Deprecated partial parsing functionality has been removed - use PartialParser instead

3. **Partial Parser** (`src/partial-parser.ts`) - Modern incremental parsing for editor support:
   - Parses incomplete patterns with detailed token position tracking
   - Uses bitmask-based token expectations for performance
   - Provides context-aware parsing state and suggestions
   - Enhanced with accurate token position information for editor integration

4. **Pattern Suggestions** (`src/pattern-suggestions.ts`) - Editor autocomplete system:
   - Context-aware suggestions for pattern editing
   - Integrates with PartialParser for accurate replacement ranges
   - Provides precise token position data for editor component integration
   - Handles different suggestion types (generators, tags, operators, symbols)
   - **Critical for editor functionality** - provides replacement ranges needed for proper autocomplete

### Type System

- **Parser Types** (`src/parser-types.ts`) - Core pattern AST structures
- **API Types** (`src/types.ts`) - API request/response interfaces
- **Constants** (`src/constants.ts`) - API endpoints and configuration

### Authentication Architecture

The SlugKit class uses JWT-based authentication with:
- ECDSA P-256 signatures
- Automatic key fetching from backend
- Scheduled key refresh with fallback support
- Request signing with timestamps

### Caching Strategy

- Dictionary stats and tags are cached in memory
- Cache is populated on first access
- No automatic invalidation (assumes stable dictionary data)

## Testing Strategy

- Tests are in `src/__tests__/` directory
- Uses Jest with ts-jest preset
- Test files follow `*.test.ts` naming convention
- **Core modules**: 190/190 tests passing ✅
- **Pattern suggestions**: 61/87 tests passing (26 failing due to suggestion logic, not range calculation)
- **Overall package health**: 298/325 tests passing

### Test Status by Module

- ✅ **Pattern Parser** (`pattern-parser.test.ts`): All tests passing - validates SlugKit pattern syntax
- ✅ **Partial Parser** (`partial-parser.test.ts`): All tests passing - handles incremental parsing with token positions
- ✅ **Constants & Types**: All tests passing - basic validation
- ⚠️ **Pattern Suggestions** (`pattern-suggestions.test.ts`): 61/87 passing
  - ✅ All replacement range tests passing (critical for editor integration)
  - ❌ Some suggestion logic issues remain (content filtering, suggestion types)
- ❌ **SlugKit Main Class** (`slugkit.test.ts`): Network mocking issues in test environment

## Pattern Grammar

The SDK supports the full SlugKit EBNF grammar:
- **Selectors**: `{noun@en:+formal -nsfw >3,case=lower}`
- **Number Generators**: `{number:5,hex}` or `{number:5d}`
- **Special Characters**: `{special:3-5}`
- **Global Settings**: `[@en +formal >3,case=lower]`

## Key Design Patterns

1. **Factory Pattern**: `SlugKit.fromBackend()` and `SlugKit.fromJwk()` static methods
2. **Strategy Pattern**: Different parser contexts and token expectations  
3. **Observer Pattern**: Automatic key refresh scheduling
4. **Template Method**: Common HTTP request handling with specialized endpoints
5. **Centralized Token Extraction**: All parsing methods use shared `extractToken()` for consistency

## Error Handling

The SDK provides structured error handling:
- Network errors are wrapped with descriptive messages
- Authentication failures trigger automatic key refresh
- Rate limiting and server errors are properly categorized
- Pattern validation errors include context information

## Recent Major Changes

### Pattern Parsing Refactoring
- **Removed deprecated partial parsing** from PatternParser class
- All partial parsing functionality now handled by dedicated PartialParser
- Improved token position tracking with `lastParsedTokenStart`/`lastParsedTokenEnd`
- Centralized token extraction to eliminate code duplication

### Editor Integration Improvements
- **Fixed replacement range calculations** in PatternSuggestions class
- Enhanced PartialParser integration for accurate token positioning
- All replacement range tests now passing (critical for editor autocomplete)
- Pattern suggestions provide precise data needed by editor components

### Code Quality
- ✅ Package builds successfully with TypeScript
- ✅ Core parsing functionality fully tested and working
- ✅ Token position tracking accurate and consistent
- ✅ Editor integration data properly formatted