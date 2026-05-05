import fs from 'fs';
import path from 'path';

export type TerminologyConfig = {
  version: string;
  changelog: Array<{ version: string; date: string; notes: string }>;
  approvedTerms: Record<string, string[]>;
  incorrectTerms: Record<string, string>;
};

export type ValidationRulesConfig = {
  version: string;
  changelog: Array<{ version: string; date: string; notes: string }>;
  bannedWords: string[];
};

export type CaptionRules = {
  terminology: TerminologyConfig;
  validationRules: ValidationRulesConfig;
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`Rules config validation error: ${message}`);
};

const isStringRecord = (value: unknown): value is Record<string, string> => (
  !!value && !Array.isArray(value) && typeof value === 'object' && Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string')
);

const isStringArrayRecord = (value: unknown): value is Record<string, string[]> => (
  !!value && !Array.isArray(value) && typeof value === 'object' && Object.values(value as Record<string, unknown>).every((v) => Array.isArray(v) && v.every((i) => typeof i === 'string'))
);

const validateBase = (obj: Record<string, unknown>, label: string): void => {
  assert(typeof obj.version === 'string' && obj.version.length > 0, `${label}.version must be a non-empty string`);
  assert(Array.isArray(obj.changelog), `${label}.changelog must be an array`);
};

const readJson = (absolutePath: string): unknown => {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Rules config file missing: ${absolutePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
};

export const loadRulesConfig = (baseDir = process.cwd()): CaptionRules => {
  const terminologyPath = path.join(baseDir, 'config', 'terminology.json');
  const validationPath = path.join(baseDir, 'config', 'validation-rules.json');

  const terminologyRaw = readJson(terminologyPath) as Record<string, unknown>;
  const validationRaw = readJson(validationPath) as Record<string, unknown>;

  validateBase(terminologyRaw, 'terminology');
  validateBase(validationRaw, 'validation-rules');

  assert(isStringArrayRecord(terminologyRaw.approvedTerms), 'terminology.approvedTerms must be Record<string, string[]>');
  assert(isStringRecord(terminologyRaw.incorrectTerms), 'terminology.incorrectTerms must be Record<string, string>');
  assert(Array.isArray(validationRaw.bannedWords) && validationRaw.bannedWords.every((v) => typeof v === 'string'), 'validation-rules.bannedWords must be string[]');

  return {
    terminology: terminologyRaw as TerminologyConfig,
    validationRules: validationRaw as ValidationRulesConfig
  };
};
