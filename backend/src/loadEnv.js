import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GLOBAL_ENV_LOADED_FLAG = '__SNAPKEEP_BACKEND_ENV_LOADED__';

function stripWrappingQuotes(value) {
  if (!value) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function applyEnvLine(line) {
  const text = String(line || '').trim();
  if (!text || text.startsWith('#')) return;

  const eqIndex = text.indexOf('=');
  if (eqIndex <= 0) return;

  const key = text.slice(0, eqIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;
  if (process.env[key] !== undefined) return;

  const rawValue = text.slice(eqIndex + 1).trim();
  process.env[key] = stripWrappingQuotes(rawValue);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    applyEnvLine(line);
  }
}

if (!globalThis[GLOBAL_ENV_LOADED_FLAG]) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(currentDir, '../.env');
  loadEnvFile(envPath);
  globalThis[GLOBAL_ENV_LOADED_FLAG] = true;
}
