import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const ENV_PATH = path.join(PROJECT_ROOT, '.env');
export const SAMPLE_VAULTS_PATH = path.join(PROJECT_ROOT, 'sample-vaults');

function isPlaceholderApiKey(key) {
  if (!key?.trim()) return true;
  const v = key.trim();
  return v === 'your_key_here';
}

function isPlaceholderVaultRoot(root) {
  if (!root?.trim()) return true;
  const v = root.trim();
  return v.includes('/path/to/your/obsidian') || v.includes('path\\to\\your\\obsidian');
}

export function reloadEnv() {
  dotenv.config({ path: ENV_PATH, override: true });
}

function parseEnvContent(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

export async function readEnvFile() {
  try {
    const content = await fs.readFile(ENV_PATH, 'utf-8');
    return parseEnvContent(content);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

export const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Recommended — fast and capable' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', description: 'Most capable, slower' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fastest, most economical' },
];

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

export async function saveSetup({ apiKey, vaultRoot, model }) {
  const existing = await readEnvFile();
  const next = { ...existing };

  if (apiKey !== undefined) {
    next.ANTHROPIC_API_KEY = apiKey.trim();
  }
  if (vaultRoot !== undefined) {
    next.VAULT_ROOT = vaultRoot.trim();
  }
  if (model !== undefined) {
    next.ANTHROPIC_MODEL = model.trim();
  }

  const lines = [
    '# Feedback Synthesis — local configuration',
    `ANTHROPIC_API_KEY=${next.ANTHROPIC_API_KEY ?? ''}`,
    `VAULT_ROOT=${next.VAULT_ROOT ?? ''}`,
    `ANTHROPIC_MODEL=${next.ANTHROPIC_MODEL ?? DEFAULT_MODEL}`,
  ];

  await fs.writeFile(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
  reloadEnv();
  return next;
}

export async function getSetupStatus(scanVaults) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const vaultRoot = process.env.VAULT_ROOT;
  const apiKeySet = !isPlaceholderApiKey(apiKey);
  const vaultRootSet = !isPlaceholderVaultRoot(vaultRoot);

  let vaultRootValid = false;
  let vaultCount = 0;
  let vaults = [];
  let vaultRootResolved = null;

  if (vaultRootSet) {
    vaultRootResolved = path.resolve(vaultRoot);
    try {
      await fs.access(vaultRootResolved);
      vaultRootValid = true;
      vaults = await scanVaults(vaultRoot);
      vaultCount = vaults.length;
    } catch {
      vaultRootValid = false;
    }
  }

  const ready = apiKeySet && vaultRootSet && vaultRootValid;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  return {
    ready,
    apiKeySet,
    vaultRootSet,
    vaultRootValid,
    vaultRoot: vaultRootResolved,
    vaultCount,
    vaults,
    sampleVaultPath: SAMPLE_VAULTS_PATH,
    apiKeyHint: apiKeySet ? `…${apiKey.slice(-4)}` : null,
    model,
  };
}

export function looksLikeApiKey(key) {
  const v = key?.trim() ?? '';
  return v.startsWith('sk-ant-') && v.length > 20;
}

export async function testApiKey(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });

  if (response.ok) return { valid: true };
  if (response.status === 401) {
    return { valid: false, error: 'That API key was rejected. Check it in the Anthropic console.' };
  }
  if (response.status === 429) return { valid: true };

  let message = `Anthropic API returned ${response.status}`;
  try {
    const body = await response.json();
    if (body.error?.message) message = body.error.message;
  } catch {
    // ignore
  }
  return { valid: false, error: message };
}
