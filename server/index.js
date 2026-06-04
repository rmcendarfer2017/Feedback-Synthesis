import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  scanVaults,
  getVaultNotes,
  getVaultInventory,
  getVaultTags,
  getNotePreview,
} from './vaultScanner.js';
import { synthesize } from './synthesize.js';
import {
  getSetupStatus,
  saveSetup,
  looksLikeApiKey,
  testApiKey,
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
} from './config.js';
import { localDevCorsOptions } from './cors.js';

const app = express();
const PORT = 3001;

app.use(cors(localDevCorsOptions()));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/setup — onboarding / settings status (no secrets)
app.get('/api/setup', async (_req, res) => {
  try {
    const status = await getSetupStatus(scanVaults);
    res.json({ ...status, availableModels: AVAILABLE_MODELS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/setup — save API key and/or vault root to .env
app.post('/api/setup', async (req, res) => {
  try {
    const { apiKey, vaultRoot, model } = req.body ?? {};

    if (apiKey !== undefined && !looksLikeApiKey(apiKey)) {
      return res.status(400).json({
        error: 'API key should start with sk-ant-. Copy it from console.anthropic.com.',
      });
    }

    if (vaultRoot !== undefined && !String(vaultRoot).trim()) {
      return res.status(400).json({ error: 'Vault folder path cannot be empty.' });
    }

    if (model !== undefined && !AVAILABLE_MODELS.find((m) => m.id === model)) {
      return res.status(400).json({ error: 'Invalid model selection.' });
    }

    await saveSetup({ apiKey, vaultRoot, model });
    const status = await getSetupStatus(scanVaults);
    res.json({ ...status, availableModels: AVAILABLE_MODELS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/setup/test-key — verify Anthropic key (optional onboarding step)
app.post('/api/setup/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body ?? {};
    const key = apiKey?.trim() || process.env.ANTHROPIC_API_KEY;

    if (!looksLikeApiKey(key)) {
      return res.status(400).json({ error: 'Enter a valid Anthropic API key first.' });
    }

    const result = await testApiKey(key);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults — list all discovered vaults
app.get('/api/vaults', async (req, res) => {
  try {
    const root = process.env.VAULT_ROOT;
    if (!root) {
      return res.status(400).json({
        error: 'Vault folder not configured yet.',
        code: 'SETUP_REQUIRED',
      });
    }
    const vaults = await scanVaults(root);
    res.json(vaults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults/:name/tags — unique tags in vault
app.get('/api/vaults/:name/tags', async (req, res) => {
  try {
    const root = process.env.VAULT_ROOT;
    if (!root) {
      return res.status(400).json({ error: 'Vault folder not configured yet.' });
    }
    const tags = await getVaultTags(root, req.params.name);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults/:name/preview?path= — read one note
app.get('/api/vaults/:name/preview', async (req, res) => {
  try {
    const root = process.env.VAULT_ROOT;
    if (!root) {
      return res.status(400).json({ error: 'Vault folder not configured yet.' });
    }
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }
    const preview = await getNotePreview(root, req.params.name, filePath);
    res.json(preview);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/vaults/:name/inventory — folder tree + files included in synthesis
app.get('/api/vaults/:name/inventory', async (req, res) => {
  try {
    const root = process.env.VAULT_ROOT;
    if (!root) {
      return res.status(400).json({ error: 'Vault folder not configured yet.' });
    }
    const { name } = req.params;
    const { source, from, to, tags } = req.query;
    const inventory = await getVaultInventory(root, name, { source, from, to, tags });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults/:name/notes — get parsed notes for a vault
app.get('/api/vaults/:name/notes', async (req, res) => {
  try {
    const root = process.env.VAULT_ROOT;
    const { name } = req.params;
    const { source, from, to, tags } = req.query;
    const notes = await getVaultNotes(root, name, { source, from, to, tags });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/synthesize — run synthesis on a vault, streams response
app.post('/api/synthesize', async (req, res) => {
  const { vaultName, filters } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      error: 'Anthropic API key not configured. Open Settings to add one.',
      code: 'SETUP_REQUIRED',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const root = process.env.VAULT_ROOT;
    const notes = await getVaultNotes(root, vaultName, filters || {});

    if (notes.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'No notes found matching the current filters.' })}\n\n`);
      return res.end();
    }

    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    await synthesize(notes, vaultName, apiKey, model, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const server = app.listen(PORT, () => {
  console.log(`\nFeedback Synthesis server running at http://localhost:${PORT}`);
  const root = process.env.VAULT_ROOT;
  if (!root) {
    console.warn('  ⚠  VAULT_ROOT is not set — add it to your .env file');
  } else {
    console.log(`  Vault root: ${root}`);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  ⚠  ANTHROPIC_API_KEY is not set — add it to your .env file');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✗ Port ${PORT} is already in use.`);
    console.error('    Close the other terminal running Feedback Synthesis, or run:');
    console.error('    powershell -File scripts\\stop-ports.ps1\n');
    process.exit(1);
  }
  throw err;
});
