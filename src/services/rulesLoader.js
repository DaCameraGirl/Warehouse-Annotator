import fs from 'fs';
import path from 'path';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Rules config validation error: ${message}`);
};

const isStringRecord = (value) => (
  !!value && !Array.isArray(value) && typeof value === 'object' && Object.values(value).every((v) => typeof v === 'string')
);

const isStringArrayRecord = (value) => (
  !!value && !Array.isArray(value) && typeof value === 'object' && Object.values(value).every((v) => Array.isArray(v) && v.every((i) => typeof i === 'string'))
);

const validateBase = (obj, label) => {
  assert(typeof obj.version === 'string' && obj.version.length > 0, `${label}.version must be a non-empty string`);
  assert(Array.isArray(obj.changelog), `${label}.changelog must be an array`);
};

const readJson = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Rules config file missing: ${absolutePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
};

export const loadRulesConfig = (baseDir = process.cwd()) => {
  const terminologyPath = path.join(baseDir, 'config', 'terminology.json');
  const validationPath = path.join(baseDir, 'config', 'validation-rules.json');

  const terminologyRaw = readJson(terminologyPath);
  const validationRaw = readJson(validationPath);

  validateBase(terminologyRaw, 'terminology');
  validateBase(validationRaw, 'validation-rules');

  assert(isStringArrayRecord(terminologyRaw.approvedTerms), 'terminology.approvedTerms must be Record<string, string[]>');
  assert(isStringRecord(terminologyRaw.incorrectTerms), 'terminology.incorrectTerms must be Record<string, string>');
  assert(Array.isArray(validationRaw.bannedWords) && validationRaw.bannedWords.every((v) => typeof v === 'string'), 'validation-rules.bannedWords must be string[]');

  return {
    terminology: terminologyRaw,
    validationRules: validationRaw
  };
};
