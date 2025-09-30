export enum CompareOperator {
  None = 'none',
  Eq = '==',
  Ne = '!=',
  Lt = '<',
  Le = '<=',
  Gt = '>',
  Ge = '>='
}

export enum NumberBase {
  Dec = 'dec',
  Hex = 'hex',
  HexUpper = 'HEX',
  Roman = 'roman',
  RomanLower = 'ROMAN'
}

export enum ShortNumberBase {
  Dec = 'd',
  Hex = 'x',
  HexUpper = 'X',
  Roman = 'r',
  RomanLower = 'R'
}

export namespace NumberBase {
  export function fromShort(short: ShortNumberBase): NumberBase {
    switch (short) {
      case ShortNumberBase.Dec: return NumberBase.Dec;
      case ShortNumberBase.Hex: return NumberBase.Hex;
      case ShortNumberBase.HexUpper: return NumberBase.HexUpper;
      case ShortNumberBase.Roman: return NumberBase.Roman;
      case ShortNumberBase.RomanLower: return NumberBase.RomanLower;
    }
  }

  export function fromString(str: string): NumberBase | undefined {
    switch (str) {
      case 'dec': return NumberBase.Dec;
      case 'hex': return NumberBase.Hex;
      case 'HEX': return NumberBase.HexUpper;
      case 'roman': return NumberBase.Roman;
      case 'ROMAN': return NumberBase.RomanLower;
      default: return undefined;
    }
  }
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

export interface EmojiGen {
  kind: 'emoji';
  includeTags: string[];
  excludeTags: string[];
  options: Record<string, string>;
}

export type PatternElement = Selector | NumberGen | SpecialCharGen | EmojiGen;

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
