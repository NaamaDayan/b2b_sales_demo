/**
 * Shared flow state store so any server instance (or Lambda invocation) can load
 * the Important Feature Request flow state and reply correctly to Jordan.
 *
 * Backends (first that is configured wins):
 * - FLOW_STATE_S3_BUCKET: use S3 (simplest on Lambda; one bucket, one object).
 * - FLOW_STATE_FILE: use a file path (local or EFS).
 * - Otherwise: in-memory only (single process).
 */

import fs from 'fs';
import path from 'path';

const FLOW_ID = 'feature-request';
const STATE_FILE = process.env.FLOW_STATE_FILE || '';
const S3_BUCKET = process.env.FLOW_STATE_S3_BUCKET || '';
const S3_KEY = 'flow-state/feature-request.json';

// In-memory copy for file backend (or as cache)
let memoryState = null;

// ----- File backend -----
function getStatePath() {
  if (!STATE_FILE) return null;
  return path.isAbsolute(STATE_FILE) ? STATE_FILE : path.join(process.cwd(), STATE_FILE);
}

function readFromFile() {
  const p = getStatePath();
  if (!p) return null;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeToFile(data) {
  const p = getStatePath();
  if (!p) return;
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.warn('[flowStateStore] Failed to write state file:', err.message);
  }
}

// ----- S3 backend (async) -----
async function readFromS3() {
  if (!S3_BUCKET) return null;
  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY });
    const res = await client.send(cmd);
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    console.warn('[flowStateStore] S3 get failed:', err.message);
    return null;
  }
}

async function writeToS3(data) {
  if (!S3_BUCKET) return;
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: S3_KEY,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
      })
    );
  } catch (err) {
    console.warn('[flowStateStore] S3 put failed:', err.message);
  }
}

async function deleteFromS3() {
  if (!S3_BUCKET) return;
  try {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY }));
  } catch (err) {
    console.warn('[flowStateStore] S3 delete failed:', err.message);
  }
}

function getDataSync() {
  if (STATE_FILE) return readFromFile();
  return memoryState;
}

/**
 * Get stored state for the feature-request flow by channel and user.
 * Returns the full state object if this (channelId, userId) is a Jordan in a saved flow, else null.
 * @param {string} channelId
 * @param {string} userId
 * @returns {Promise<object|null>} state or null
 */
export async function getByChannel(channelId, userId) {
  const data = S3_BUCKET ? await readFromS3() : getDataSync();
  if (!data || !data.byChannel) return null;
  const key = `${channelId}:${userId}`;
  const state = data.byChannel[key];
  return state || null;
}

/**
 * Save feature-request flow state and index it by each Jordan's channel:userId.
 * @param {object} state - full state object (phase, jordans, jamesUserIds, events, moveTo, lastEventId)
 * @param {string[]} channelUserKeys - optional list of "channelId:userId"; if omitted, derived from state.jordans
 */
export async function save(state, channelUserKeys = null) {
  const keys = channelUserKeys || (state.jordans || []).map((j) => `${j.channelId}:${j.userId}`);
  const serializable = {
    roomId: state.roomId,
    phase: state.phase,
    jordans: state.jordans || [],
    jamesUserIds: state.jamesUserIds || [],
    events: state.events || [],
    moveTo: state.moveTo,
    lastEventId: state.lastEventId ?? 0,
  };
  const byChannel = {};
  for (const k of keys) {
    byChannel[k] = serializable;
  }
  const data = { byChannel, flowId: FLOW_ID, flowState: serializable };
  memoryState = data;
  if (S3_BUCKET) {
    await writeToS3(data);
  } else {
    writeToFile(data);
  }
}

/**
 * Get the current flow state (for polling). Used so any Lambda can return completed state.
 * @returns {Promise<object|null>} serialized state (phase, events, moveTo, ...) or null
 */
export async function getFlowState() {
  const data = S3_BUCKET ? await readFromS3() : getDataSync();
  if (!data || !data.flowState) return null;
  return data.flowState;
}

/**
 * Clear stored state for the given channel:userId keys (e.g. when flow is DONE).
 * @param {string[]} channelUserKeys - list of "channelId:userId"
 */
export async function clear(channelUserKeys) {
  if (!channelUserKeys || channelUserKeys.length === 0) {
    memoryState = null;
    if (S3_BUCKET) {
      await deleteFromS3();
    } else {
      const p = getStatePath();
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
    return;
  }
  const data = S3_BUCKET ? await readFromS3() : getDataSync();
  if (!data || !data.byChannel) return;
  for (const k of channelUserKeys) {
    delete data.byChannel[k];
  }
  if (Object.keys(data.byChannel).length === 0) {
    // Keep flowState so polling getState() can still return the completed state from any Lambda
    memoryState = { byChannel: {}, flowId: FLOW_ID, flowState: data.flowState || null };
    if (S3_BUCKET) {
      await writeToS3(memoryState);
    } else {
      const p = getStatePath();
      if (p) {
        try {
          writeToFile(memoryState);
        } catch (err) {
          console.warn('[flowStateStore] Failed to write after clear:', err.message);
        }
      }
    }
  } else {
    memoryState = data;
    if (S3_BUCKET) {
      await writeToS3(data);
    } else {
      writeToFile(data);
    }
  }
}

export function isUsingFile() {
  return !!STATE_FILE;
}

export function isUsingS3() {
  return !!S3_BUCKET;
}
