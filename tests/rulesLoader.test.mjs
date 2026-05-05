import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadRulesConfig } from '../src/services/rulesLoader.js';

const createTempConfigDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rules-test-'));

test('loads valid config files', () => {
  const rules = loadRulesConfig(process.cwd());
  assert.ok(rules.terminology.version);
  assert.ok(Array.isArray(rules.validationRules.bannedWords));
});

test('throws explicit error when config file is missing', () => {
  const dir = createTempConfigDir();
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'config', 'terminology.json'), JSON.stringify({ version: '1', changelog: [], approvedTerms: {}, incorrectTerms: {} }));
  assert.throws(() => loadRulesConfig(dir), /Rules config file missing/);
});

test('throws explicit error on malformed config shape', () => {
  const dir = createTempConfigDir();
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'config', 'terminology.json'), JSON.stringify({ version: '1', changelog: [], approvedTerms: {}, incorrectTerms: [] }));
  fs.writeFileSync(path.join(dir, 'config', 'validation-rules.json'), JSON.stringify({ version: '1', changelog: [], bannedWords: ['ok'] }));
  assert.throws(() => loadRulesConfig(dir), /validation error/i);
});
