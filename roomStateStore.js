/**
 * Room-level state persistence so every browser tab (and every Lambda invocation)
 * sees the same demo state for a given room ID.
 *
 * Backends (first configured wins):
 * - FLOW_STATE_S3_BUCKET → S3 at room-state/{roomId}.json
 * - FLOW_STATE_FILE      → local directory (sibling JSON files)
 * - Otherwise            → in-memory map (single process only)
 */

import fs from 'fs';
import path from 'path';

const S3_BUCKET = process.env.FLOW_STATE_S3_BUCKET || '';
const STATE_FILE = process.env.FLOW_STATE_FILE || '';

const memoryStore = new Map();

function s3Key(roomId) {
  return `room-state/${roomId}.json`;
}

function filePath(roomId) {
  if (!STATE_FILE) return null;
  const dir = path.isAbsolute(STATE_FILE)
    ? path.dirname(STATE_FILE)
    : path.join(process.cwd(), path.dirname(STATE_FILE));
  return path.join(dir, `room-${roomId}.json`);
}

// ── S3 helpers ──────────────────────────────────────────────────────────────

async function readFromS3(roomId) {
  if (!S3_BUCKET) return null;
  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    const res = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key(roomId) }));
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    console.warn('[roomStateStore] S3 get failed:', err.message);
    return null;
  }
}

async function writeToS3(roomId, data) {
  if (!S3_BUCKET) return;
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key(roomId),
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }));
  } catch (err) {
    console.warn('[roomStateStore] S3 put failed:', err.message);
  }
}

// ── File helpers ────────────────────────────────────────────────────────────

function readFromFile(roomId) {
  const p = filePath(roomId);
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeToFile(roomId, data) {
  const p = filePath(roomId);
  if (!p) return;
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.warn('[roomStateStore] file write failed:', err.message);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Load the full room state. Returns null when no state has been saved yet.
 */
export async function load(roomId) {
  if (S3_BUCKET) return readFromS3(roomId);
  if (STATE_FILE) return readFromFile(roomId);
  return memoryStore.get(roomId) || null;
}

/**
 * Persist the full room state (shallow merge with existing).
 */
export async function save(roomId, partial) {
  const existing = (await load(roomId)) || {};
  const merged = { ...existing, ...partial, roomId, updatedAt: new Date().toISOString() };
  if (!merged.createdAt) merged.createdAt = merged.updatedAt;

  if (S3_BUCKET) {
    await writeToS3(roomId, merged);
  } else if (STATE_FILE) {
    writeToFile(roomId, merged);
  } else {
    memoryStore.set(roomId, merged);
  }
  return merged;
}
