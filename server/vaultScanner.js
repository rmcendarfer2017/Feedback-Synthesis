import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

// Scan the root folder and return all discovered vaults
export async function scanVaults(rootPath) {
  const resolved = path.resolve(rootPath);

  let entries;
  try {
    entries = await fs.readdir(resolved, { withFileTypes: true });
  } catch {
    throw new Error(`Cannot read VAULT_ROOT at: ${resolved}`);
  }

  const vaults = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const vaultPath = path.join(resolved, entry.name);
    const mdFiles = await glob('**/*.md', {
      cwd: vaultPath,
      ignore: ['**/.obsidian/**', '**/node_modules/**'],
    });

    if (mdFiles.length === 0) continue;

    // Get most recent modification time across all notes
    let lastModified = null;
    for (const file of mdFiles.slice(0, 20)) {
      try {
        const stat = await fs.stat(path.join(vaultPath, file));
        if (!lastModified || stat.mtime > lastModified) {
          lastModified = stat.mtime;
        }
      } catch {
        // skip unreadable files
      }
    }

    vaults.push({
      name: entry.name,
      path: vaultPath,
      noteCount: mdFiles.length,
      lastModified: lastModified?.toISOString() || null,
    });
  }

  return vaults.sort((a, b) => a.name.localeCompare(b.name));
}

function evaluateNoteForFilters(frontmatter, body, filters = {}) {
  const { source, from, to, tags } = filters;
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { included: false, reason: 'empty' };
  }
  if (source && frontmatter.source !== source) {
    return { included: false, reason: 'source' };
  }
  if (from && frontmatter.date && new Date(frontmatter.date) < new Date(from)) {
    return { included: false, reason: 'date' };
  }
  if (to && frontmatter.date && new Date(frontmatter.date) > new Date(to)) {
    return { included: false, reason: 'date' };
  }
  if (tags) {
    const filterTags = tags.split(',').map((t) => t.trim());
    const noteTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const hasTag = filterTags.some((t) => noteTags.includes(t));
    if (!hasTag) return { included: false, reason: 'tags' };
  }

  return { included: true, reason: null };
}

function buildFileTree(files) {
  const root = { type: 'folder', name: '', path: '', children: [] };

  for (const file of files) {
    const segments = file.path.split('/');
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;

      if (isFile) {
        current.children.push({
          type: 'file',
          name: segment,
          path: file.path,
          source: file.source,
          date: file.date,
          tags: file.tags,
          included: file.included,
          excludeReason: file.excludeReason,
        });
      } else {
        const folderPath = segments.slice(0, i + 1).join('/');
        let folder = current.children.find(
          (c) => c.type === 'folder' && c.name === segment,
        );
        if (!folder) {
          folder = { type: 'folder', name: segment, path: folderPath, children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node) {
  if (node.type !== 'folder') return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    if (child.type === 'folder') sortTree(child);
  }
}

function countTree(node) {
  if (node.type === 'file') {
    return { total: 1, included: node.included ? 1 : 0 };
  }
  return node.children.reduce(
    (acc, child) => {
      const c = countTree(child);
      return { total: acc.total + c.total, included: acc.included + c.included };
    },
    { total: 0, included: 0 },
  );
}

async function loadVaultFileEntries(vaultPath, filters) {
  const mdFiles = await glob('**/*.md', {
    cwd: vaultPath,
    ignore: ['**/.obsidian/**', '**/node_modules/**'],
  });

  const files = [];

  for (const file of mdFiles) {
    const filePath = path.join(vaultPath, file);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const { data: frontmatter, content: body } = matter(raw);
    const { included, reason } = evaluateNoteForFilters(frontmatter, body, filters);

    const noteTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

    files.push({
      path: file.replace(/\\/g, '/'),
      source: frontmatter.source || null,
      date: frontmatter.date || null,
      tags: noteTags,
      included,
      excludeReason: reason,
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

// File tree + filter preview for a vault (no note bodies)
export async function getVaultInventory(rootPath, vaultName, filters = {}) {
  const vaultPath = path.join(path.resolve(rootPath), vaultName);
  const files = await loadVaultFileEntries(vaultPath, filters);
  const tree = buildFileTree(files);
  const { total, included } = countTree(tree);

  return {
    vaultName,
    totalFiles: total,
    includedFiles: included,
    hasActiveFilters: Boolean(
      filters.source || filters.from || filters.to || filters.tags,
    ),
    tree,
  };
}

// Parse all notes in a vault with optional filters
export async function getVaultNotes(rootPath, vaultName, filters = {}) {
  const vaultPath = path.join(path.resolve(rootPath), vaultName);

  const mdFiles = await glob('**/*.md', {
    cwd: vaultPath,
    ignore: ['**/.obsidian/**'],
  });

  const notes = [];

  for (const file of mdFiles) {
    const filePath = path.join(vaultPath, file);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const { data: frontmatter, content: body } = matter(raw);
    const { included } = evaluateNoteForFilters(frontmatter, body, filters);
    if (!included) continue;

    const trimmedBody = body.trim();
    notes.push({
      file: file.replace(/\\/g, '/'),
      date: frontmatter.date || null,
      source: frontmatter.source || 'unknown',
      sentiment: frontmatter.sentiment || null,
      tags: frontmatter.tags || [],
      participant: frontmatter.participant || null,
      body: trimmedBody,
    });
  }

  return notes.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
}

function resolveVaultFilePath(vaultPath, filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid file path');
  }
  const resolved = path.resolve(vaultPath, normalized);
  const vaultResolved = path.resolve(vaultPath);
  const relative = path.relative(vaultResolved, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid file path');
  }
  return { normalized, resolved };
}

// Unique tags across all notes in a vault
export async function getVaultTags(rootPath, vaultName) {
  const vaultPath = path.join(path.resolve(rootPath), vaultName);
  const mdFiles = await glob('**/*.md', {
    cwd: vaultPath,
    ignore: ['**/.obsidian/**', '**/node_modules/**'],
  });

  const tagCounts = new Map();

  for (const file of mdFiles) {
    try {
      const raw = await fs.readFile(path.join(vaultPath, file), 'utf-8');
      const { data: frontmatter } = matter(raw);
      const noteTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
      for (const tag of noteTags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    } catch {
      // skip
    }
  }

  return [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// Single note preview for the file tree
export async function getNotePreview(rootPath, vaultName, filePath) {
  const vaultPath = path.join(path.resolve(rootPath), vaultName);
  const { normalized, resolved } = resolveVaultFilePath(vaultPath, filePath);

  let raw;
  try {
    raw = await fs.readFile(resolved, 'utf-8');
  } catch {
    throw new Error(`Note not found: ${normalized}`);
  }

  const { data: frontmatter, content: body } = matter(raw);
  const trimmedBody = body.trim();

  return {
    path: normalized,
    date: frontmatter.date || null,
    source: frontmatter.source || null,
    sentiment: frontmatter.sentiment ?? null,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    participant: frontmatter.participant || null,
    body: trimmedBody,
    bodyLength: trimmedBody.length,
  };
}
